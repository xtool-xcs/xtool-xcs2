import { Uploader } from '@makeblock/upload';
import { useNetwork } from '@vueuse/core';
import {
  COMMON_VIEW_EVENT,
  appDataPath,
  fileHelper,
  logger,
  postMessageToMain,
  sliceImage,
  xcm,
} from '@xtool/link';
import {
  CanvasItemType,
  Constructor,
  DEVICE_CANVAS_PLUGIN_CONFIG,
  DEVICE_PROCESSING_MODE,
  DEVICE_TYPE,
  DataSource,
  DeviceExtContainer,
  DownloadFirmwareParam,
  ERROR_MESSAGE,
  EstimatedTime,
  MATERIAL_TYPE,
  MessageType,
  PROCESSING_EVENT,
  PROCESSING_MODE,
  ProcessingUploadData,
  RUNNING_STATUS,
  SYSTEM_EVENT,
  WalkBorder,
  blob2Image,
  cloudSmartFillBox,
  collision,
  copy,
  delay as delayFnc,
  generateFileName,
  getLocalUToken,
  getXCSStorage,
  loadImg,
  makeFramePath,
  parseParams,
  readFileToText,
} from '@xtool/xcs-logic';
import { CustomDataManager } from '@xtool/xcs-logic/src/ext-container/custom-data';
import {
  ObjectBoundingRect,
  TData,
} from '@xtool/xcs-logic/src/ext-container/gcode/preprocess';
import { downloadBlob } from '@xtool/xcs-logic/src/utils/download';
import { format } from 'date-fns';
import {
  assign,
  cloneDeep,
  filter,
  find,
  includes,
  isEmpty,
  isFunction,
  map,
  some,
  template,
} from 'lodash';
import { join } from 'path-browserify';
import { v4 as uuid } from 'uuid';
import { CurvePlugin } from './canvas-plugins/Curve';
import { F1UltraCentralAxisPlugin } from './canvas-plugins/centralAxis';
import { DEFAULT_D_PATH } from './canvas-plugins/centralAxisIcon';
import { F1UltraConveyorPlugin } from './canvas-plugins/conveyor';
import { DEVICE_KEY, deviceChecker } from './check';
import config, { calibration } from './config';
import templates from './config/gcode-template';

import { AxiosProgressEvent } from 'axios';
import { isUndefined } from 'lodash-es';
import { getProcessingSteps } from './config/processingStep';
import {
  CONVEYOR_EXTENSION_PLUGIN,
  CURVATURE,
  CURVE_CANVAS_PLUGIN_NAME,
  CURVE_DISTANCE_1,
  CURVE_DISTANCE_2,
  CURVE_MAX_COL,
  CURVE_MAX_ROW,
  CURVE_MIN_COL,
  CURVE_MIN_ROW,
  CURVE_POINT_COLOR,
  DEFAULT_CURVE_DATA,
  DEFAULT_CURVE_TEMP_DATA,
  MODE_DEFALUT_KA_MSG,
  POSITION_CENTER,
  RECOMMEND_DISTANT,
  messageTypeHandler,
} from './constant';
import { calibrationPreviewPng } from './res';
// import { beforeSendGcode } from './decorate';
import {
  AUTO_FOCUS_FAIL,
  AxisMapType,
  BatchProcessDataType,
  CONVEYOR_BELT_WORKER,
  Coincide_Measure_Worker,
  CurveModelOptions,
  DensityPoint,
  ElementXyType,
  ErrorStatusType,
  ExtEvents,
  GS002EXT,
  LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
  LightMapType,
  MAX_Z,
  MEASURE_Z_ERROR,
  PHOTO_RATIO,
  PLANE_LOW_LIMIT,
  PROCESSING_COMMAND,
  PROCESSING_STEP_NAMES,
  PROCESSING_TYPE,
  Position,
  SOCKET_MODULE,
  SmartFillDataPoints,
  TRUE_OR_FALSE,
  TarFileOrder,
  WaitForEventNames,
  WorkFileStatusType,
  XfFileCheck,
  statusMap,
} from './types';
import uiComponent, {
  deviceDataValues,
  elementDataValues,
  processingTypes,
} from './ui';
import uiAppComponents from './ui-app';
import {
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';
import {
  calculateValidBorderElements,
  calculateWalkBorderBoundary,
  convertingLight,
  fixNum,
  getAxisUsed,
  getProcessCanvas,
  isInRectangle,
  processingCanvas,
  requestPreviewImage,
} from './utils/util';
/**
 * 第二版扩展实现
 */
export const v2 = true;
// const lapse = 0.0999;

// 加工文件 tar 包的顺序
const tarFileOrder = [
  TarFileOrder.Preview,
  TarFileOrder.Border,
  TarFileOrder.Motion,
  TarFileOrder.Description,
];

// tar 包的上级路径
const tarDir = 'tar/';

// tar 包名称
const tarName = 'task/xtool.xf';

const calibJsonPath = 'task/global_calib.json';
const irJsonPata = 'task/global_ir.json';
const measurePath = 'task/gs002_measure.png';
// 填充的照片
const batchSmartFillSuccess = 'task/gs002_batch_success.png';
// todo 后续算法处理 进行删除
const compressBatchSuccess = 'task/gs002_batch_success.jpg';
// todo 后续算法处理 进行删除
const compressCalibImgPath = 'task/background.jpg';
// 刷新背景进度key
const refreshProgressKey = 'device.status.taking_picture';

export function DeviceExt(
  Base: Constructor<DeviceExtContainer>,
): Constructor<GS002EXT> {
  class F1UltraExt extends Base {
    processingTypes = processingTypes;

    compressCalibImgPath = compressCalibImgPath;

    // 走边框的gcode
    walkBorderGcode = '';

    #cancelable: any;
    uploader!: Uploader;

    // 当前是否处于加工就绪状态，若在，下位机控制走边框上报的socket不能修改currentStatus
    isWorkPrepare = false;

    constructor(...args: any[]) {
      super(config, ...args);
      this.appContext.canvasSelectedChanged =
        this.walkBorderInRealTime.bind(this);
      this.uploader = new Uploader(getXCSStorage());
      // 写入传送带校准参数默认值
      this.deviceInfo = {
        ConveyorURate: calibration.ConveyorURate[0](100 as never),
        ConveyorAngleCompensate: calibration.ConveyorAngleCompensate[0](
          0.0 as never,
        ),
      };
    }

    deviceDataValues = deviceDataValues;
    elementDataValues = elementDataValues;

    /** 使用的激光 */
    lightUsed: LightMapType = new Map();
    /** 使用到的轴 */
    axisUsed: AxisMapType = new Map();
    /** 显示弹窗的错误状态 */
    errorStatus: ErrorStatusType = {};

    imagePath = 'task/gs002bg.png';
    // calibImgPath = 'task/background.png';
    // 批量加工中的照片
    processingPath = 'task/gs002_processing.png';

    inBatchMode = false;
    // 批量加工的数据
    batchProcessData: BatchProcessDataType = {
      // 批量加工初始元素数据
      batchInitDisplayJSON: {},
      // 批量加工初始元素中心点
      batchInitCenter: {},
      // 批量加工智能填充的缩放比例
      scaleW: 1,
      scaleH: 1,
      // 批量加工第一步 点击开始后需要变为false
      batchProcessFirstStep: true,
      firstStepSuccess: false,
      // 断链主动退出 用来判断本位机是否主动退出
      isBreakCloseBatch: false,

      inBatchProcess: false,
      stopConveyorBelt: false,
      inOnline: false,
      batchKey: '',
      id: uuid(),
      // 框选到的背景位图中材料的区域
      bgMaterialArea: [],

      // 背景上传到云端的路径
      bgOSSURL: undefined,
    };

    hasCancelProcess = false;

    customData = new CustomDataManager();
    // 曲率提示和预览图颜色范围设定
    curvature = CURVATURE;
    //曲面测量矫正距离
    #curveCorrectionDistance = CURVE_DISTANCE_1 + PLANE_LOW_LIMIT;

    //曲面测量最高点
    #curveMAxZ = 0;

    #workingType = 0;

    noRoute = false;

    calibrationLoading = {
      redBlueZRest: false,
      redBlueZRestTo83: false,
      thicknessZRest: false,
    };

    // 不包含走边框的加工
    get isInGrave() {
      const inProcessingStatus = [
        PROCESSING_EVENT.PAUSE_PROCESS,
        PROCESSING_EVENT.BEFORE_START,
        PROCESSING_EVENT.START_PROCESS,
      ];
      return (
        inProcessingStatus.includes(this.deviceInfo.currentStatus) ||
        (this.connected && this.inBatchMode)
      );
    }

    get isFrame() {
      return [
        PROCESSING_EVENT.FRAME_READY,
        PROCESSING_EVENT.FRAME_WORKING,
      ].includes(this.deviceInfo.currentStatus);
    }

    get isInProcessing() {
      return this.isInGrave || this.isFrame;
    }

    get noResetTaskId() {
      return (
        this.batchProcessData.inBatchProcess &&
        !this.batchProcessData.batchProcessFirstStep
      );
    }

    get ui() {
      return uiComponent;
    }

    get uiApp() {
      return uiAppComponents;
    }

    get centralAxis() {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        const plugin = canvas?.getPluginByName(
          LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
        );
        return plugin;
      }
      return null;
    }

    get hasRelief() {
      return some(this.dataParser?.source.elements, [
        'processingType',
        PROCESSING_TYPE.RELIEF,
      ]);
    }

    updateWorkFileStatus = (status: WorkFileStatusType) => {
      this.deviceInfo = {
        workFileStatus: {
          ...this.deviceInfo.workFileStatus,
          ...status,
        },
      };
    };

    onActive() {
      const mode = this.dataSource?.currentDeviceData?.mode;
      if (mode === PROCESSING_MODE.CURVE_PROCESS) {
        this.finishCurvePreview();
      }
    }

    /**
     * 设置常驻的提示栏
     */
    setKeepAliveMsg(processMode: any) {
      const content = MODE_DEFALUT_KA_MSG[processMode];
      this.emit(SYSTEM_EVENT.SET_KEEP_ALIVE_MESSAGE, content);
    }

    handleDeviceFormValueChanged(prev: any, next: any) {
      console.log('handleDeviceFormValueChanged', { prev, next });
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        if (prev.mode !== next.mode) {
          this.setKeepAliveMsg(next.mode);
        }
        if (next.mode === PROCESSING_MODE.CONVEYOR_EXTENSION) {
          // 大幅面
          let plugin = canvas.getPluginByName(CONVEYOR_EXTENSION_PLUGIN);
          if (!plugin) {
            plugin = new F1UltraConveyorPlugin(CONVEYOR_EXTENSION_PLUGIN);
            canvas.registerPlugin(plugin);
          }
          const {
            current: { height, startX },
          } = this.getCurrentArea(PROCESSING_MODE.CONVEYOR_EXTENSION);
          const {
            LIMIT_TYPE: { fillAlpha, fillColor },
          } = DEVICE_CANVAS_PLUGIN_CONFIG;
          plugin.updateMask({
            fillColor,
            fillAlpha,
            width: startX,
            height,
          });
        } else {
          canvas.unRegisterPluginByName(CONVEYOR_EXTENSION_PLUGIN);
        }
        if (next.mode === PROCESSING_MODE.LASER_CYLINDER) {
          // 圆柱
          let plugin = canvas.getPluginByName(
            LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
          );
          if (!plugin) {
            plugin = new F1UltraCentralAxisPlugin(
              LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
            );
            canvas.registerPlugin(plugin);
            // 只有在创建插件时初始化为默认值
            plugin.updateCentralAxis(
              [
                {
                  icon: {
                    dPath: DEFAULT_D_PATH,
                    fillColor: 3380479,
                    lineColor: 15658734,
                  },
                },
              ],
              {
                startY: 110,
                minY: 0,
                maxY: 220,
              },
            );
          }
        } else {
          canvas.unRegisterPluginByName(LASER_CYLINDER_CENTRAL_AXIS_PLUGIN);
        }

        if (next.mode === PROCESSING_MODE.CURVE_PROCESS) {
          // 曲面
          this.appContext.updateBackVisible(false);
        } else {
          if (prev.mode === PROCESSING_MODE.CURVE_PROCESS) {
            this.appContext.updateBackVisible(true);
          }
          canvas.unRegisterPluginByName(CURVE_CANVAS_PLUGIN_NAME);
        }
        if (prev.mode !== next.mode) {
          this.updateWalkBorderParams(
            this.config.process.walkBorder.defaultWalkBorderParams[next.mode],
          );
        }
      }
    }

    async waitForEvent(
      eventName: string,
      opt: {
        fn?: (resolve: any, reject: any) => void;
        time?: number;
      },
    ) {
      const { fn, time } = opt || {};
      return new Promise((resolve, reject) => {
        this.once(eventName, () => {
          fn && fn(resolve, reject);
          resolve(true);
        });
        time && setTimeout(() => reject(false), time);
      });
    }

    // todo 设备状态相关 ===>

    async init(device: any, type: any) {
      this.errorStatus = {};
      return super.init(device, type);
    }

    async onConnected() {
      this.isFirstConnectFourGroup();
      const { syncTime, batchMode, addonStatus, powerResume } = this.apis;
      // 一些信息
      Promise.all([
        syncTime({
          data: { date: format(new Date(), 'yyyy-MM-dd HH:mm:ss') },
        }),
        this.getError(),
      ]);
      console.log('=======syncTime done');
      const [batchStatus, tempAddon, outage] = await Promise.all([
        batchMode({
          params: {
            action: 'query',
          },
        }),
        addonStatus(),
        powerResume({ params: { action: 'query' } }),
        // 设备配置 需要保证下载完毕
        this.downLoadConfig(),
      ]);

      this.batchReconnect(batchStatus.status);
      this.inBatchMode = batchStatus.status;

      const mode =
        this.dataSource?.currentDeviceData?.mode || PROCESSING_MODE.LASER_PLANE;
      const { defaultWalkBorderParams } = this.config.process.walkBorder;
      this.addonStatus = {
        ...this.addonStatus,
        ...tempAddon,
      };
      this.deviceInfo = {
        autoFocusLoading: false,
        zResetLoading: false,
        purifierExist: this.addonStatus?.purifierExist,
      };
      // 初始化走边框参数；断连重连设备需要保留上一次设置的参数；
      if (isUndefined(this.walkBorderParams.mode)) {
        this.walkBorderParams = Object.assign(this.walkBorderParams || {}, {
          ...defaultWalkBorderParams[mode],
        });
      }
      if (this.deviceInfo.secondOffsetFlag === false) {
        this.deviceInfo = {
          redBlueWarn: true,
        };
      }
      // 断电续打
      outage.status === true && this.powerResume();
    }

    onDisconnect(): void {
      super.onDisconnect();
      this.deviceInfo = {
        redBlueShow: false,
        redBlueWarn: false,
      };
      if (this.deviceInfo.autoFocusLoading) {
        this.emit('focusStop');
        this.deviceInfo = {
          autoFocusLoading: false,
        };
      }
      // 批量中关闭识别框
      if (this.batchProcessData.inBatchProcess) {
        this.closeBatchDialog();
      }
    }

    async initDeviceInfo() {
      const { deviceInfo, getConfigs, getMotionDelayTimeData } = this.apis;
      const [info, configInfo, delayTimeData] = await Promise.all([
        deviceInfo({}, false),
        getConfigs(),
        getMotionDelayTimeData(),
      ]);
      logger.log('gs002 initDeviceInfo', { configInfo });
      const { des, subMode } = info;
      let { currentStatus } = info;

      // 状态转换
      const isWork = currentStatus === 'Work';
      // 状态保护
      const stateProtection = [
        RUNNING_STATUS.P_AUTOFOCUS,
        RUNNING_STATUS.P_MEASURE,
      ].includes(currentStatus);

      if (!stateProtection) {
        //加工、走边框状态
        if (['frame', 'frameExt'].includes(des)) {
          currentStatus = isWork ? 'FRAME_WORKING' : currentStatus;
        } else {
          currentStatus = isWork ? statusMap[subMode] : 'IDLE';
          this.emit(SYSTEM_EVENT.UPDATE_DEVICE_INFO, {
            currentStatus: isWork ? currentStatus : statusMap[currentStatus],
          });
        }
      } else {
        currentStatus = statusMap[currentStatus];
      }

      const tempInfo = {
        ...info,
        ...configInfo,
        currentStatus,
        workFileStatus: {
          backup: false,
        },
        // 延时数据光源选择，默认蓝光
        motionDelayLightType: 'blue',
        delayTimeData,
      };
      this.addonStatus = {
        ...this.addonStatus,
        gapCheck: configInfo.gapCheck,
      };
      this.deviceInfo = tempInfo || {};
      return tempInfo;
    }

    // 下载每个设备的配置文件
    async downLoadConfig() {
      const { downLoadConfig } = this.apis;
      const [calib, measure] = await Promise.all([
        downLoadConfig({
          params: {
            filename: 'global_calib.json',
          },
        }),
        downLoadConfig({
          params: {
            filename: 'global_ir.json',
          },
        }),
      ]);
      await Promise.all([
        fileHelper.writeData(calibJsonPath, JSON.stringify(calib), {}, true),
        fileHelper.writeData(irJsonPata, JSON.stringify(measure), {}, true),
      ]);
    }

    // 修改 errorStatus
    async getError() {
      const data = await this.apis.getError();
      map(data?.alarm, ({ level, module, type }) => {
        const mayBeError = this.config.socketInfo?.[level]?.[module]?.[type];
        isFunction(mayBeError) && mayBeError(this);
      });
    }

    /**
     * 配件使用情况
     * 走边框时不需要关注浮雕类型 hasRelief，且只能是蓝光
     * 错误提醒处统一处理、不考虑走边框的局限性
     * @param param0
     */
    async getAccessoriesUsage(data?: {
      light?: LightMapType;
      hasRelief?: boolean;
    }) {
      const currentDeviceData = this.dataSource?.currentDeviceData;
      this.axisUsed = getAxisUsed(currentDeviceData?.mode!, {
        hasRelief: data?.hasRelief,
      });
      if (data?.light) {
        this.lightUsed = data?.light;
        return;
      }
      const lightMap = new Map();
      const processCanvas = await getProcessCanvas(this);
      processCanvas.map(({ data, processingType }) => {
        const { materialType, parameter } = data[processingType];
        const materialParams =
          parameter[materialType] ?? parameter[MATERIAL_TYPE.CUSTOMIZE];
        const light = materialParams?.processingLightSource;
        lightMap.set(light, true);
      });
      this.lightUsed = lightMap;
    }

    @deviceChecker.checkBy([DEVICE_KEY.connect, DEVICE_KEY.isWorking], false)
    checkDeviceIdle() {
      return true;
    }

    // check固件版本
    @deviceChecker.checkBy([DEVICE_KEY.connect, DEVICE_KEY.isWorking], false)
    async downloadFirmware(data: DownloadFirmwareParam) {
      return super.downloadFirmware(data);
    }

    /** 检查更新是否完成 */
    async checkFirmwareUpdated(version: string) {
      // 延迟 30s 在获取固件版本对比
      // 检测 9.30分钟
      const delay = 1000 * 30;
      const loopCount = 270;
      logger.info(['=> checkFirmwareUpdated', version]);
      await delayFnc(delay);
      logger.info(['=> checkFirmwareUpdated delay done.', delay]);

      for (let index = 0; index < loopCount; index++) {
        try {
          console.log([
            '=> checkFirmwareUpdated compare version count',
            index + 1,
          ]);
          const { master_h3_img, master_h3_laserservice, motion_gd470_app } =
            await this.apis.version();
          if (master_h3_img && master_h3_laserservice && motion_gd470_app) {
            return true;
          }
        } catch (error) {
          logger.error(['=> checkFirmwareUpdated', error]);
        }
        await delayFnc(2000);
      }
      return Promise.reject('checkFirmwareUpdated can not match the version.');
    }

    controlLaserHead = (data: any) => {
      return this.apis.controlLaserHead({
        data,
      });
    };

    /** 控制曝光 */
    controlExposure = (value?: number) => {
      const light = value || this.deviceInfo.exposureValue || 500;
      return this.apis.exposure({
        data: { value: light },
      });
    };

    async turnLightAction(value: number) {
      const data = {
        action: 'set_bri',
        idx: 0,
        value: convertingLight(value),
      };
      await this.apis.turnLight({ data });
    }

    powerResume() {
      this.appContext.dialog.warning({
        title: this.appContext.formatMsg('device.gs002.power_resume'),
        content: this.appContext.formatMsg('device.gs002.power_resume_content'),
        positiveText: this.appContext.formatMsg('device.process.continue'),
        negativeText: this.appContext.formatMsg('device.gs002.give_up'),
        onPositiveClick: () => {
          this.apis.powerResume({ params: { action: 'start' } });
        },
        onNegativeClick: () => {
          this.apis.powerResume({ params: { action: 'cancel' } });
        },
      });
    }

    setLaserOffset = (data?: {
      redX: number;
      redY: number;
      blueX: number;
      blueY: number;
    }) => {
      const { redX = 0, redY = 0, blueX = 0, blueY = 0 } = data || {};
      const kv = {
        laserOffsetRed: `M531X${-redX}Y${redY}R}`,
        laserOffsetBlue: `M531X${-blueX}Y${blueY}B}`,
      };
      this.apis.setUserConfigs({
        data: {
          kv,
        },
      });
      this.deviceInfo = {
        laserOffsetRed: {
          x: redX,
          y: redY,
        },
        laserOffsetBlue: {
          x: blueX,
          y: blueY,
        },
      };
    };

    // todo socket 相关
    /**
     * 对 socket 信息中 module 是 STATUS_CONTROLLER 的信息做解析
     * @param data
     */
    #parseStatusControllerModule(data: any) {
      const { info, type } = data;
      if (type === PROCESSING_EVENT.MODE_CHANGE) {
        return;
      }

      let status = '';
      if (includes(PROCESSING_COMMAND, type)) {
        const isFraming = includes(info, 'framing');
        const isWorkEvent = includes(
          [
            PROCESSING_COMMAND.WORK_STARTED,
            PROCESSING_COMMAND.WORK_FINISHED,
            PROCESSING_COMMAND.WORK_STOPED,
          ],
          type,
        );
        if (isFraming && isWorkEvent && !this.isWorkPrepare) {
          status =
            type === PROCESSING_COMMAND.WORK_STARTED
              ? statusMap.FRAME_WORKING
              : statusMap.IDLE;
        } else if (includes(info, 'working')) {
          status = statusMap[type];
          this.isWorkPrepare = !!(status === statusMap.WORK_PREPARED);
        }
      }

      if (status) {
        if (status === statusMap.WORK_STOPED) {
          this.hasCancelProcess = true;
        }
        this.generateProcessingTask(this.handleProcessingTaskStatus(status));
        this.deviceInfo = { currentStatus: status };
        // if (this.batchProcessData.inBatchProcess) {
        //   this.batchStateChange(status as PROCESSING_EVENT);
        // }
        this.emit(SYSTEM_EVENT.UPDATE_DEVICE_INFO, {
          currentStatus: status,
        });
      }
    }

    handleProcessingTaskStatus(status: string) {
      let modalStatus = status;
      /**批量完成状态为暂停 */
      if (this.batchProcessData.inBatchProcess) {
        if (status === PROCESSING_EVENT.FINISH_PROCESS) {
          modalStatus = PROCESSING_EVENT.PAUSE_PROCESS;
        }
      }
      return modalStatus;
    }

    // 监听socket信息
    deviceCmdParsing(cmd: string) {
      try {
        const data = JSON.parse(cmd);
        const { info, level, module, type } = data;
        logger.log(' socket 信息', level, module, type, info);
        this.moduleMonitor(data);
        this.handleSocketInfo(data);
      } catch (error) {
        logger.error(`F1 ultra socket 数据返回异常${error}`);
      }
    }

    // socket 信息处理
    handleSocketInfo(data: any) {
      const { info, level, module, type } = data;
      const moduleInfo = this.config.socketInfo?.[level]?.[module];
      const socketInfo = isFunction(moduleInfo)
        ? moduleInfo(this, { type, info })
        : moduleInfo?.[type];

      if (!socketInfo) {
        return;
      }
      const socketResult = isFunction(socketInfo)
        ? socketInfo(this, { info })
        : socketInfo;

      if (!socketResult) {
        return;
      }
      this.emit(ExtEvents.Error, socketResult);
      if (this.batchProcessData.inBatchProcess && socketResult?.cancelProcess) {
        this.cancelBatchWithMachine();
      }
    }

    moduleMonitor(data: any) {
      const { module } = data;
      switch (module) {
        case SOCKET_MODULE.STATUS_CONTROLLER:
          this.#parseStatusControllerModule(data);
          break;
        default:
          break;
      }
    }
    getProcessingSteps(mode: DEVICE_PROCESSING_MODE, info: any): any {
      this.deviceInfo = { previewData: null };
      return getProcessingSteps(this, mode, info);
    }

    async checkProcessData({
      canvasData,
      centralAxisPosition,
      isWalkBorder,
      dataSource,
      isExportGcode = false,
      layerOrder,
    }: {
      canvasData: CanvasItemType[];
      centralAxisPosition: number;
      isWalkBorder: boolean;
      dataSource: DataSource;
      isExportGcode: boolean;
      layerOrder: string[];
    }) {
      const deviceData = dataSource.currentDeviceData;

      const mode = dataSource.currentDeviceData.mode;
      if (mode === PROCESSING_MODE.CURVE_PROCESS) {
        const modeData = this.customData?.getModeData(
          this.canvasId,
          PROCESSING_MODE.CURVE_PROCESS,
        );
        if (isEmpty(modeData?.curveData?.densityPoints)) {
          return {
            type: MessageType.text,
            text: 'device.measure.curve_process_mode_data_tip',
          };
        }
      }

      const { canvasData: transformCanvasData, displays } = processingCanvas(
        canvasData,
        deviceData?.displays as unknown as Map<string, any>,
        mode,
      );

      return super.checkProcessData({
        canvasData: transformCanvasData,
        centralAxisPosition,
        isWalkBorder,
        dataSource,
        isExportGcode,
        layerOrder,
        currentDeviceData: {
          ...deviceData,
          displays: displays as any,
        },
      });
    }

    // 取消加工
    @deviceChecker.checkBy([DEVICE_KEY.connect], false)
    cancelProcessing() {
      if (this.batchProcessData.inBatchProcess) {
        this.batchFinish();
        // 不一定会上报该状态 手动改
        this.deviceInfo = { currentStatus: PROCESSING_EVENT.CANCEL_PROCESS };
      }
      return this.apis.cancelPrint();
    }

    // 暂停加工
    @deviceChecker.checkBy([DEVICE_KEY.connect], false)
    pauseProcessing() {
      return this.apis.pausePrint();
    }

    @deviceChecker.checkBy(
      [DEVICE_KEY.connect, DEVICE_KEY.gapClose, DEVICE_KEY.usbKeyLock],
      false,
    )
    restartProcessing() {
      logger.info('点击继续加工');
    }

    // 终止上传gcode
    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
      if (window.MeApi && window.MeApi?.fileHelper?.cancelUploadGcode) {
        window.MeApi.fileHelper.cancelUploadGcode();
      }
      this.killGcodeWorker();
    }

    async checkOnlineLogin() {
      const { formatMsg, message, checkLogin } = this.appContext;
      // 前置 是否有网络
      try {
        const { isOnline } = useNetwork();
        if (isOnline) {
          // 登录判断
          await checkLogin();
        } else {
          message.error(formatMsg('editor.operation.shape_match_cloud'));
        }
      } catch (error) {
        return false;
      }
      return true;
    }

    async checkerStart() {
      const { mode = PROCESSING_MODE.LASER_PLANE } =
        this.dataSource?.currentDeviceModeData || {};
      this.noRoute = false;
      const { formatMsg, message } = this.appContext;
      if (mode === PROCESSING_MODE.BATCH_PROCESS) {
        this.batchProcessData.batchProcessFirstStep = true;

        const bgMaterialArea = this.batchProcessData.bgMaterialArea;
        // 有标注的材料区域
        if (bgMaterialArea && bgMaterialArea.length > 0) {
          // 如果有标注的材料区域，画布对象超出材料区域，提示用户
          const centerPoint = await this.getCanvasDisplaysCenterPoint();
          const [start = [], end = []] = bgMaterialArea;

          if (start.length > 1 && end.length > 1) {
          }
          const width = start[0] - end[0];
          const height = start[1] - end[1];
          const isOut = isInRectangle(centerPoint, {
            width,
            height,
            x: start[0],
            y: start[1],
          });
          if (isOut) {
            message.info(formatMsg('editor.alert.canvas_out_of_material'));
            return false;
          }
        }

        const result = await deviceChecker.uploadGCodeInStart(this);
        if (!result[0]) {
          return false;
        }
        if (!this.appContext.backgroundEnabled) {
          message.info(formatMsg('editor.alert.take_picture_first'));
          return false;
        }

        if (!(await this.checkOnlineLogin())) {
          return false;
        }
        await this.stopWalkBorderInProcess();
      }
      if (mode === PROCESSING_MODE.LASER_PLANE) {
        const processData = await getProcessCanvas(this);
        const hasRelief = some(processData, [
          'processingType',
          PROCESSING_TYPE.RELIEF,
        ]);
        if (hasRelief) this.noRoute = true;
      }
      return true;
    }

    updateWalkBorderGcode(gcode: string) {
      this.walkBorderGcode = gcode;
    }

    updateWalkBorderParams(value: {
      power: number;
      speed: number;
      mode: WalkBorder;
      platformSpeed?: number;
    }) {
      this.walkBorderParams = {
        ...this.walkBorderParams,
        ...value,
      };
    }

    // tar包内的文件预处理，包括内容生成，名字修改等
    async createTarFile(time?: number) {
      const generateTotalTime = time || this.appContext.generateTotalTime;
      const currentDeviceData = this.dataSource?.currentDeviceData;
      const light = [...this.lightUsed.keys()];
      const description: any = {
        mode: currentDeviceData?.mode,
        light: light.length === 2 ? 'mixed' : light[0],
        create_time: format(new Date(), 'yyyy/MM/dd HH:mm:ss'),
        axis: [...this.axisUsed.keys()].join(','),
      };
      if (
        generateTotalTime !== -1 &&
        config.countTimeModes.includes(currentDeviceData?.mode!)
      ) {
        description.time = Math.round(generateTotalTime).toString();
      }
      const content = JSON.stringify(description);
      await Promise.all([
        // 预览图
        fileHelper?.copyFileToNewFile({
          oldFile: 'task/preview.png',
          newFile: `${tarDir}${TarFileOrder.Preview}`,
          isResizeImg: true,
          size: { width: 200, height: 200 },
        }),
        // 走边框
        fileHelper?.copyFileToNewFile({
          oldFile: 'task/border.txt',
          newFile: `${tarDir}${TarFileOrder.Border}`,
        }),
        // gcode
        fileHelper?.copyFileToNewFile({
          oldFile: 'task/gcode.txt',
          newFile: `${tarDir}${TarFileOrder.Motion}`,
        }),
        // 描述文件
        fileHelper?.writeData(
          `${tarDir}${TarFileOrder.Description}`,
          content,
          {},
          true,
        ),
      ]);

      // 预览图生成时间若是小于gcode说明是之前的预览图或者没生成 不下发
      const [previewStat, gcodeState] = await Promise.all([
        fileHelper.statFile('task/preview.png'),
        fileHelper.statFile('task/gcode.txt'),
      ]);
      const noPreview = gcodeState?.mtime > previewStat?.mtime;
      await fileHelper.createTarFile(
        noPreview
          ? filter(tarFileOrder, (item) => item !== TarFileOrder.Preview)
          : tarFileOrder,
        tarDir,
        tarName,
      );
    }

    // 上传gcode，文件需要按顺序生成一个tar包
    // @beforeSendGcode
    @deviceChecker.uploadGCode()
    async uploadGCode(params?: ProcessingUploadData): Promise<boolean> {
      await this.stopWalkBorderInProcess();
      const {
        onProgress,
        isFullPath = false,
        autoStart = 0,
        hasTaskId = true,
      } = params || {};
      this.hasCancelProcess = false;
      if (this.dataParser) {
        const { processMode } = this.dataParser.source.params;
        const walkBorderParams: {
          loopPrint: string;
          operate?: string;
          gcodeType?: string;
          uMoveSpeed?: number;
        } = {
          loopPrint: includes(
            [
              PROCESSING_MODE.LASER_CYLINDER,
              PROCESSING_MODE.CONVEYOR_EXTENSION,
            ],
            processMode,
          )
            ? '0'
            : '1',
          gcodeType:
            processMode === PROCESSING_MODE.CONVEYOR_EXTENSION
              ? 'frameExt'
              : 'frame',
          operate: 'upload',
        };
        await this.apis.uploadWalkBorder({
          data: { gcode: this.walkBorderGcode },
          params: walkBorderParams,
          onUploadProgress: ({ loaded, total }: any) => {
            const percent = Number((loaded / total).toFixed(2));
            logger.log({ percent });
          },
        });
      }
      // @ts-ignore
      if (this.uploadGcodeHelper) {
        await this.createTarFile();
        try {
          const {
            baseUrl,
            url,
            params: urlParams = {},
          } = await this.apis.uploadGcode({ method: 'info' });
          //批量后续上传不穿taskId
          if (this.supportTaskId && hasTaskId) {
            this.batchProcessData.batchProcessFirstStep = false;
            urlParams.taskId = this.taskManager.getTask(
              this.deviceInfo.snCode,
            ).id;
          }
          const uploadGcodeUrl = `${baseUrl}${url}${parseParams(
            assign(urlParams, { autoStart }),
          )}`;
          console.log(tarName, uploadGcodeUrl);
          const result = await super.uploadByBuilder({
            url: uploadGcodeUrl,
            path: tarName,
            options: {
              isFullPath,
              onProgress: (percent: number) => {
                isFunction(onProgress) && onProgress(percent);
              },
              onCancel: (cancel: any) => {
                this.#cancelable = cancel;
              },
            },
          });
          if (result.code === 0) {
            return Promise.resolve(true);
          }
          logger.log('F1 ultra upload gcode error ==>', result);
          return Promise.reject(false);
        } catch (err) {
          logger.log('uploadGcode by builder error', err);
          return Promise.reject(false);
        }
      } else {
        return Promise.reject(false);
      }
    }

    async beforeWalkBorder() {
      await this.getAccessoriesUsage({ light: new Map([['blue', true]]) });
    }

    mapPower(data: any) {
      const { power } = data;
      const temp = {
        ...data,
        power: config.process.convertLightPower(power),
      };
      return temp;
    }

    /** 走边框 */
    @deviceChecker.walkBorder()
    async startWalkBorder(gcode: string) {
      const { processMode } = this.dataParser?.source.params ?? {
        processMode: PROCESSING_MODE.LASER_PLANE,
      };
      /** 圆柱 */
      const isLoopPrint = includes(
        [PROCESSING_MODE.LASER_CYLINDER, PROCESSING_MODE.CONVEYOR_EXTENSION],
        processMode,
      );

      const params: {
        loopPrint: string;
        gcodeType?: string;
        uMoveSpeed?: number;
      } = {
        loopPrint: isLoopPrint ? TRUE_OR_FALSE.false : TRUE_OR_FALSE.true,
        gcodeType:
          processMode === PROCESSING_MODE.CONVEYOR_EXTENSION
            ? 'frameExt'
            : 'frame',
      };
      console.log('走边框参数=>', gcode);
      await this.apis.uploadWalkBorder({
        data: { gcode },
        params: params,
        onUploadProgress: ({ loaded, total }: any) => {
          const percent = Number((loaded / total).toFixed(2));
          logger.log({ percent });
        },
      });
      return;
    }

    /**
     *  走边框的状态中，点击开始上传gcode或者批量前，不提示错误，自动取消走边框即可
     */
    async stopWalkBorderInProcess() {
      if (this.deviceInfo.currentStatus === PROCESSING_EVENT.FRAME_WORKING) {
        await this.stopWalkBorder();
      }
    }

    //矫正z轴焦平面
    correctCurveControlZ(speed: number) {
      return `G0Z${this.#curveMAxZ}F600\nG0 F${speed}`;
    }

    /**
     * 生成gcode的头部分
     * @param data
     * @returns
     */
    async generalGcodeHeadAndTail(isWalkBorder = this.dataParser.isWalkBorder) {
      const { processMode, uMultiple } = this.dataParser.source.params;
      const ConveyorURate = calibration.ConveyorURate[0](
        this.deviceInfo.ConveyorURate as never,
      );
      const ConveyorAngleCompensate = calibration.ConveyorAngleCompensate[0](
        this.deviceInfo.ConveyorAngleCompensate as never,
      );
      const speed =
        (this.deviceInfo?.delayTimeData?.blue?.laserOffJumpSpeed || 3000) * 60;
      const compiledHead = template(templates.gCodeHead);
      const compiledTail = template(templates.gCodeTail);
      const useUAxis = includes(
        [PROCESSING_MODE.LASER_CYLINDER, PROCESSING_MODE.CONVEYOR_EXTENSION],
        processMode,
      );
      const isCurve = processMode === PROCESSING_MODE.CURVE_PROCESS;
      const isExpand = [PROCESSING_MODE.CONVEYOR_EXTENSION].includes(
        processMode,
      );
      const correctZ =
        isCurve && !isWalkBorder ? this.correctCurveControlZ(speed) : '';
      const gcodeHead = compiledHead({
        isWalkBorder,
        laserOffJumpSpeed: speed,
        useUAxis,
        useZAxis: isCurve,
        correctZ: correctZ,
        uSpeed: this.config.process.buildParams.speed?.[processMode],
        uMultipleCommand: useUAxis && !isExpand ? `M535U${uMultiple}` : null,
        startU: (this.dataParser.boundingRect as ObjectBoundingRect).left,
        calibrationCommand: isExpand
          ? `M535U${ConveyorURate}\nM536U${ConveyorAngleCompensate}`
          : null,
      });
      const gcodeTail = compiledTail({
        useUAxis,
        useZAxis: isCurve,
        reset: includes(
          [PROCESSING_MODE.LASER_CYLINDER, PROCESSING_MODE.CONVEYOR_EXTENSION],
          processMode,
        ),
      });
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
      return;
    }

    getCurrentArea(prefixKey: string) {
      const { base, current } = super.getCurrentArea(prefixKey);
      const mode = this.dataSource?.currentDeviceData?.mode;
      if (mode === PROCESSING_MODE.CURVE_PROCESS) {
        const data = this.customData.getData(this.canvasId);
        if (data?.[mode]?.curveData?.densityArea) {
          const densityArea = data[mode]?.curveData?.densityArea;
          const { offsetX = 0, offsetY = 0 } = current;
          return {
            base,
            current: {
              ...current,
              startX: densityArea.x + offsetX,
              startY: densityArea.y + offsetY,
              // 需要通过可加工区域的宽高计算出可加工区域的有右下角坐标，目前只有曲面需要，其余模式默认为画幅宽高
              endX: densityArea.x + offsetX + densityArea.width,
              endY: densityArea.y + offsetY + densityArea.height,
            },
          };
        }
      }
      return { base, current };
    }

    genProcessParams(proload?: { isWalkBorder: boolean }) {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData?.mode!);
      const processingArea = current || base;
      transformProcessParams(
        {
          deviceData,
          processingArea,
          config: this.config.process,
          isWalkBorder: proload?.isWalkBorder ?? this.dataParser.isWalkBorder,
        },
        this.dataParser,
      );
    }

    genProcessElements() {
      return transformElements(
        {
          config: this.config.process,
        },
        this.dataParser,
      );
    }

    // 生成切片后图片的加工元素参数 => this.dataParser.source.elements
    makeSliceElementsData(originalImageId: string, sliceNumber: number) {
      const elementTemplate = find(this.dataParser.source.elements, {
        id: originalImageId,
      });
      //todo 支持多个浮雕的时候 需要获取所有elementTemplate 在进行清理
      this.dataParser.source.filterElementData([originalImageId]);
      //todo 多个浮雕需要叠加layers
      const layers = this.dataParser.source.elements.length + 1;
      const {
        processDirectionWithAngle,
        processDirection,
        processAngle,
        tail,
        zLayers,
      } = elementTemplate as TData;
      for (let i = 1; i <= sliceNumber; i++) {
        const angle = ((i - 1) * processAngle) % 360;
        const id = `${originalImageId}-${i}`;
        console.log(angle);
        const elementData: TData = {
          ...elementTemplate,
          filename: `${originalImageId}-${i}.png`,
          id,
          processDirection: {
            ...cloneDeep(processDirection),
            angle: processDirectionWithAngle ? angle : 0,
          },
          tail: i % zLayers === 0 ? tail : '',
          layer_id: layers,
          merge_id: i,
        };
        // if (processDirectionWithAngle) {
        //   elementData.processDirection.angle = angle;
        // }
        console.log(elementData);
        this.dataParser.source.updateElementData(elementData, true, false);
      }
    }

    // 切片
    async sliceImage() {
      // 需要先确保浮雕的原始图片保存成功
      await this.dataParser.finishImgSave();
      // TODO: 如果后续支持一个画布上有多个浮雕时，需要修改这里的获取文件名逻辑
      const {
        filename: originImageName,
        id: originalImageId,
        sliceNumber,
      } = this.dataParser.source.elements[0];
      const inputImagePath = `task/originalData/${originImageName}`;
      const outputPath = 'task/originalData';
      await sliceImage(
        sliceNumber,
        inputImagePath,
        outputPath,
        originalImageId,
      );
      this.makeSliceElementsData(originalImageId, sliceNumber);
    }

    async beforeGenGcode() {
      const { workingType } = transformElements(
        {
          config: this.config.process,
        },
        this.dataParser,
      );
      this.#workingType = workingType;
      const hasRelief = this.hasRelief;
      if (hasRelief) {
        await this.sliceImage();
      }
      this.generalGcodeHeadAndTail();

      await this.getAccessoriesUsage({ hasRelief });
      await super.beforeGenGcode();
    }

    /**
     * 生成gcode
     * createBorderElements会改变ElementData 走边框需要放在gcode生成之后
     * @param processMode
     */
    async buildProcessGcode(
      processMode: PROCESSING_MODE,
      {
        isExportGcode = false,
      }: {
        isExportGcode?: boolean;
      } = {},
    ) {
      // 加工中需要的操作
      if (!isExportGcode) {
        if (
          processMode === PROCESSING_MODE.BATCH_PROCESS &&
          this.batchProcessData.batchProcessFirstStep
        ) {
          if (!(await this.conveyorBeltProcess())) return;
          // 用于检验重连后的初次识别是否走完
          this.batchProcessData.firstStepSuccess = true;
        }
      }

      const processGcodeResult = await super.buildProcessGcode(processMode);
      //border会影响dataParser
      const noPreview = this.hasRelief;
      requestPreviewImage(this).then((res) => {
        if (isExportGcode) {
          return;
        }
        this.deviceInfo = { previewData: res };
        noPreview &&
          window.postMessage({
            type: 'renderImage',
            data: {
              imgUrl: `file://${appDataPath}/task/preview.png`,
            },
          });
      });
      await this.processCreateBorder();
      return {
        ...processGcodeResult,
        noPreview,
      };
    }

    /**批量加工上传gcode */
    async batchUpdateGcode() {
      this.emit(ExtEvents.UpdateStep, PROCESSING_STEP_NAMES.UPLOAD);
      await Promise.race([
        this.uploadGCode({
          autoStart: 1,
          hasTaskId: false,
          skipCheck: true,
          onProgress: (percent: number) => {
            this.emit(ExtEvents.UpdateGcodePercent, percent * 100);
          },
        }),
        new Promise((_resolve, reject) =>
          this.on(ExtEvents.Disconnected, () => {
            reject('disConnect');
          }),
        ),
      ]);
      // gcode上传完毕 socket获取没那么及时 手动改变状态
      this.deviceInfo = { currentStatus: PROCESSING_EVENT.START_PROCESS };
      this.emit(ExtEvents.UpdateStep, PROCESSING_STEP_NAMES.PROCESSING);
    }

    /** 实时走边框 */
    async walkBorderInRealTime() {
      const { mode = PROCESSING_MODE.LASER_PLANE } =
        this.dataSource?.currentDeviceData!;
      if (
        !(this.isFrame && this.connected) ||
        !config.usePermissions.realTimeWalkBorder.includes(mode)
      ) {
        logger.log('no framing');
        return;
      }

      const { num: selectedNum, data: selectedData } =
        this.appContext.canvasSelectedData;
      if (!selectedNum) {
        return;
      }

      const { canvasId, data: dataSourceData } = this.dataSource as DataSource;
      const elementsData = dataSourceData[canvasId].displays;

      const validElementIds = calculateValidBorderElements(
        selectedData,
        elementsData as any,
      );
      // 若没有符合需要更新gcode的元素，后续的操作无需再继续了
      if (!validElementIds.length) {
        return;
      }
      const { source, ...xyInfo } = await this.updateWalkBorderGcodeByRealTime(
        validElementIds,
        this.walkBorderParams.mode,
      );

      const { minX, minY, maxX, maxY } = xyInfo;
      const {
        current: { width, height },
      } = this.getCurrentArea(mode);
      const checkResult = collision(
        {
          left: minX,
          top: minY,
          bottom: maxY,
          right: maxX,
          width: maxX - minX,
          height: maxY - minY,
        },
        {
          x: 0,
          y: 0,
          width,
          height,
        },
      );
      if (!checkResult) {
        this.appContext.showMessage({
          contentI18nKey: 'device.process.element_out_zoom',
        });
        return;
      }
      const gcode = await this.reGeneralWalkBorderGcode(source);
      return this.replaceWalkBorder(gcode);
    }

    // 因更新走边框配置生成新的走边框gcode
    async updateWalkBorderGcodeByRealTime(
      validElementIds: string[],
      mode = WalkBorder.RECT,
    ): Promise<{ source: string } & ElementXyType> {
      const { minX, minY, maxX, maxY } = await calculateWalkBorderBoundary(
        this,
        validElementIds,
      );
      let source = makeFramePath({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
      if (mode === WalkBorder.OUTLINE) {
        source =
          (await this.dataSource?.canvasManager.extractContours(
            validElementIds,
          )) || source;
      }
      return {
        source,
        minX,
        minY,
        maxX,
        maxY,
      };
    }

    async reGeneralWalkBorderGcode(source: string) {
      const { power, speed } = this.walkBorderParams;
      await this.dataParser.createBorderElements(source, {
        power: config.process.convertLightPower(power),
        speed,
        mode: this.walkBorderParams.mode || WalkBorder.RECT,
      });
      this.genProcessParams({ isWalkBorder: true });
      this.genProcessElements();
      this.generalGcodeHeadAndTail(true);
      await this.dataParser.setup(undefined, 'border.json');
      await xcm?.genGCode({
        inputDir: 'task/originalData/',
        manifestName: 'border.json',
        outputFile: 'task/border.txt',
      });
      const gcode = await fileHelper.readGcode('task/border.txt');
      return gcode;
    }

    /** 加工前生成走边框gcode */
    async processCreateBorder() {
      const processMode = this.dataSource?.currentDeviceData?.mode;
      const {
        boundingRect: {
          left: brLeft,
          top: brTop,
          width: brWidth,
          height: brHeight,
        },
        activeElementIds = [],
      } = this.dataParser;
      let source = makeFramePath({
        x: brLeft,
        y: brTop,
        width: brWidth,
        height: brHeight,
      });
      if (this.walkBorderParams.mode === WalkBorder.OUTLINE) {
        source =
          (await this.dataSource?.canvasManager.extractContours(
            activeElementIds,
          )) || source;
      }
      const gcode = await this.reGeneralWalkBorderGcode(source);
      this.updateWalkBorderGcode(gcode);
    }

    async replaceWalkBorder(gcode: string) {
      const params: {
        fileType: string;
        loopPrint: number;
        uMoveSpeed?: number;
      } = {
        fileType: 'txt',
        loopPrint: 1,
      };
      return this.apis.replaceWalkBorder({
        data: { gcode },
        params: params,
      });
    }

    async machinableElementsBoundary() {
      const canvasIds =
        await this.dataSource?.canvasManager.canvas.getCanvasData({
          excludeOutSide: true,
        });
      return calculateWalkBorderBoundary(this, map(canvasIds, 'id'));
    }

    async killGcodeWorker() {
      const { mode = PROCESSING_MODE.LASER_PLANE } =
        this.dataSource?.currentDeviceModeData || {};
      if (mode === PROCESSING_MODE.BATCH_PROCESS) {
        // 预览页的返回操作
        this.batchFinish({ completeExit: true, exit: true });
      }
      await super.killGcodeWorker();
    }

    async exportXf() {
      try {
        let time = -1;
        const result = await this.appContext.checkProcess({
          isExportGcode: true,
        });
        if (result) {
          return messageTypeHandler[result.type](this, result);
        }
        const processMode = this.dataSource?.currentDeviceData?.mode;
        await this.buildProcessGcode(processMode!, { isExportGcode: true });

        if (config.countTimeModes.includes(processMode)) {
          time = await this.estimatedTime();
        }
        await this.createTarFile(time);

        if ((window as any).VITE_APP) {
          /** iPad 端工作日志导出适配
           * 使用download模式 ，通过文件分享模式导出*/
          const fileName = `${this.id}-${format(
            new Date(),
            'yyyy-MM-dd HH-mm-ss',
          )}.xf`;
          const sourceUrl = join(appDataPath, tarName);
          const xfData = await fileHelper.read2Buffer(sourceUrl);
          downloadBlob(fileName, new Blob([xfData]));
        } else {
          await copy({
            opts: {
              filters: [],
              defaultPath: `${this.id}-${format(
                new Date(),
                'yyyy-MM-dd HH-mm-ss',
              )}.xf`,
            },
            sourcePath: tarName,
            check: (fileName) => {
              if (fileName.length > 30) {
                return XfFileCheck.nameTooLong;
              }
              const specialChars = /[&]/g;
              if (specialChars.test(fileName)) {
                return XfFileCheck.specialCharacters;
              }
              return '';
            },
          });
          this.appContext.showMessage({
            type: 'success',
            contentI18nKey: 'device.setting.export_success',
          });
        }
      } catch (err) {
        // 取消save弹框，不提示成功失败
        if (err === ERROR_MESSAGE.CANCEL) {
          return;
        }
        this.appContext.showMessage({
          type: 'error',
          contentI18nKey: Object.values(XfFileCheck).includes(err as any)
            ? `device.gs002.${err}`
            : 'device.setting.export_fail',
        });
      }
    }

    async estimatedTime() {
      const id = EstimatedTime[this.id];
      const time = await super.calCulateEstimatedTime(id, this.#workingType);
      return time;
    }

    // todo 拍照相关

    async takeProcessingPhoto() {
      const { mode } = this.dataSource?.currentDeviceData!;
      if (!config.usePermissions.saveProcessPhoto.includes(mode)) {
        return true;
      }
      await Promise.allSettled([
        this.controlExposure(0),
        // this.controlLaserHead({
        //   action: 'power',
        //   ctrl: 'set',
        //   value: 0,
        // }),
        // this.apis.controlLed({
        //   data: {
        //     action: 'off',
        //     index: 0,
        //   },
        // }),
        this.apis.ircutControl({
          params: {
            ircut: 'disable',
          },
        }),
      ]);
      await delayFnc(1000);
      const blob = await this.takeGlobalPhoto({
        width: '1920',
        height: '1080',
      });
      this.updateWorkFileStatus({ processingImage: blob });
      await this.apis.ircutControl({
        params: {
          ircut: 'enable',
        },
      });
      return true;
    }

    /** 使用catch捕获 */
    async takeGlobalPhoto(params?: {
      width?: string;
      height?: string;
      timeOut?: number;
    }): Promise<Blob | null> {
      const blob = await this.apis
        .captureGlobalImage({
          params: {
            width: PHOTO_RATIO.width,
            height: PHOTO_RATIO.height,
            ...params,
          },
          timeout: params?.timeOut || 60000,
          onDownloadProgress: (evt: AxiosProgressEvent) => {
            const percent = Math.floor((evt.loaded / <number>evt.total) * 100);
            console.log('takeGlobalPhoto percent', percent);
            if ((window as any).VITE_APP) {
              if (this.deviceInfo.autoFocusLoading) {
                return;
              }
              this.appContext.showMessage({
                type: 'info',
                key: refreshProgressKey,
                contentI18nKey: refreshProgressKey,
                args: { percent },
                options: {
                  duration: 0,
                },
              });
            }
          },
        })
        .finally(() => {
          this.appContext.destroyMessage(refreshProgressKey, true);
        });
      const result = await readFileToText(blob);
      // 摄像头异常
      if (
        result.includes('result') &&
        JSON.parse(result)?.result === 'failed'
      ) {
        throw new Error('摄像头异常');
      }
      return blob;
    }

    @deviceChecker.checkBy([
      DEVICE_KEY.connect,
      DEVICE_KEY.focus,
      DEVICE_KEY.measure,
      DEVICE_KEY.isWorking,
    ])
    async setBackGroundImg() {
      const { calibImgPath } = config.imagePath;
      try {
        this.deviceInfo = { cameraLoading: true };
        const path = await this.onlyGetBgImg({ timeOut: 30000 });
        if ((window as any).VITE_APP) {
          // todo 后续算法处理 进行删除
          const compressedPath = await fileHelper?.compress(
            calibImgPath,
            compressCalibImgPath,
          );
          const blobImage =
            await window.MeApi.fileHelper.read2Blob(compressedPath);
          const bdImg = await blob2Image(blobImage);
          this.appContext.updateBackImg(bdImg, true);
        } else {
          // todo 后续算法处理 进行删除
          await fileHelper?.compress(calibImgPath, compressCalibImgPath);
          const bdImg = await loadImg(`file://${path}?tempid=${Math.random()}`);
          this.appContext.updateBackImg(bdImg, true);
        }
        this.appContext.showMessage({
          type: 'success',
          contentI18nKey: 'device.gs002.take_photo_success',
        });
      } catch (_) {
        this.appContext.showMessage({
          contentI18nKey: 'device.gs002.take_photo_fail',
          type: 'error',
        });
      } finally {
        //批量下的操作
        this.deviceInfo = { hasSelectArea: false, cameraLoading: false };
        this.batchProcessData = {
          ...this.batchProcessData,
          batchKey: undefined,
          bgMaterialArea: undefined,
          bgOSSURL: undefined,
        };
      }
    }

    /**
     * 获取裁剪后的照片
     * @param imgPath
     * @returns
     */
    async onlyGetBgImg(data?: {
      inPath?: string;
      outPath?: string;
      timeOut?: number;
      QUALITY?: number;
      waitTime?: number;
    }) {
      const { capture, calibImgPath } = config.imagePath;
      const {
        inPath = capture,
        outPath = calibImgPath,
        QUALITY = 80,
        waitTime,
      } = data || {};
      await this.controlExposure();
      if (waitTime) {
        await delayFnc(waitTime);
      }
      const blob = await this.takeGlobalPhoto({ timeOut: data?.timeOut });
      await fileHelper?.writeData(inPath, blob, {}, true);
      const path = await xcm.correctImage({
        imagePath: inPath,
        calibPath: outPath,
        jsonPath: calibJsonPath,
        QUALITY: QUALITY,
      });
      return path;
    }

    async calibrationCompose(zoomFactor: number) {
      const canvasData = {
        height: 14.375806485079238,
        width: 27.700000762939652,
        x: 96.30000000000003,
        y: 103.30000000000001,
      };
      const { calibImgPath, calibrationPreview } = config.imagePath;
      await this.onlyGetBgImg({
        // timeOut: 10000,
        QUALITY: 95,
      });
      const arrayBuffer = await fetch(calibrationPreviewPng).then((res) =>
        res.arrayBuffer(),
      );
      let calibrationPreviewPath = undefined;
      if ((window as any).VITE_APP) {
        calibrationPreviewPath = 'task/calibration_preview.png';
        fileHelper?.writeData(calibrationPreviewPath, arrayBuffer, {}, true);
      }
      // todo
      await this.fileHelper.processImages({
        path1: calibImgPath,
        path2: calibrationPreviewPath ?? arrayBuffer,
        outPut: calibrationPreview,
        width: canvasData.width * 10,
        height: canvasData.height * 10,
        x: canvasData.x * 10,
        y: canvasData.y * 10,
        zoomFactor,
      });
      return true;
    }

    async refreshPreview({
      inPath,
      outPath,
    }: {
      inPath?: string;
      outPath?: string;
    }) {
      const path = await this.onlyGetBgImg({ inPath, outPath });
      window.postMessage({
        type: 'previewImage',
        data: `file://${path}?tempid=${Math.random()}`,
      });
    }

    // todo 传送带相关
    async uploadImgToClouds(imagePath: string): Promise<string> {
      const blob = await fileHelper.read2Buffer(imagePath, false);
      // 上传图片
      const file = new File([blob], imagePath, {
        type: 'image/png',
      });
      return new Promise((res, rej) => {
        this.uploader.upload(
          getLocalUToken(),
          'xcs-storage',
          file,
          `${this.appContext.userInfo?.uid || 'uid'}/${generateFileName()}`,
          {
            callback: {
              onSuccess: async (url: string) => {
                console.log('url', url);
                res(url);
              },
            },
          },
        );
      });
    }

    /**
     * 移动传送带
     */
    async moveBelt(length: number) {
      return this.apis.moveBelt({
        data: {
          u: length,
          action: 'goto',
          speed:
            this.config.process.buildParams?.speed?.[
              PROCESSING_MODE.CONVEYOR_EXTENSION
            ],
        },
      });
    }

    batchProcessStepStatus(key: string) {
      this.deviceInfo = {
        batchProcessStepStatus: {
          ...this.deviceInfo.batchProcessStepStatus,
          [key]: true,
        },
      };
    }

    throwError(id: string) {
      if (
        this.batchProcessData.stopConveyorBelt ||
        id !== this.batchProcessData.id
      ) {
        throw new Error('Operation was stopped');
      }
    }
    /**
     * 传送带批量加工逻辑
     * 1. 移动，拍照，校准，保存图片
     * 2. 传输图片给算法，进行智能填充计算
     * 3. 若有填充结果，生成gcode，加工
     * 4. 若无，计算无填充结果的次数，满5次退出
     */
    async conveyorBeltBatch(
      firstIdentify = false, //第一次识别的第一步 只会用到一次
      index = 0,
    ): Promise<boolean> {
      this.batchProcessData = {
        ...this.batchProcessData,
        stopConveyorBelt: false,
        id: uuid(),
      };
      const {
        batchProcessFirstStep,
        inOnline,
        batchKey,
        id: batchId,
      } = this.batchProcessData;

      logger.info('批量填充-index', index);
      if (index === 5) {
        await this.batchFinish({ completeExit: true });
        this.appContext.showMessage({
          contentI18nKey: 'device.gs002.batch_identify_failed',
        });
        //五次之后 任务列表需要刷新
        this.generateProcessingTask(PROCESSING_EVENT.FINISH_PROCESS);
        logger.info('批量填充-结束');
        return false;
      }
      this.deviceInfo = {
        batchProcessStepStatus: {
          isFinishMove: false,
          isFinishCapture: false,
          isFinishSmartFill: false,
        },
      };
      this.appContext.onUpdateModalVisible(
        'setBatchProcessStepModalVisible',
        true,
      );
      try {
        if (!firstIdentify) {
          this.moveBelt(220);
          //只触发当前批次 非当前的等待20s自动销毁
          // todo 需要下位机上报id 不然会有移动问题
          await this.waitForEvent('uMoveFinish', {
            fn: (_res, rej) => {
              if (this.batchProcessData.id !== batchId) {
                rej('miss match');
              }
            },
            time: 20 * 1000,
          });
        }
        this.throwError(batchId);
        this.batchProcessStepStatus('isFinishMove');

        // 1. 拍照，校准，保存图片
        const imgPath = await this.onlyGetBgImg({
          outPath: batchSmartFillSuccess,
        });
        // todo 后续算法处理 进行删除
        await fileHelper?.compress(batchSmartFillSuccess, compressBatchSuccess);
        this.throwError(batchId);
        this.batchProcessStepStatus('isFinishCapture');
        const image_url = await this.uploadImgToClouds(compressBatchSuccess);
        // 2. 传送图片给算法， 进行智能填充
        const smartFillResult = await cloudSmartFillBox({
          image_url,
          process_tag: batchKey,
          match_thresh: 0.75,
          scene: 'belt',
        });
        this.throwError(batchId);
        this.batchProcessStepStatus('isFinishSmartFill');

        // 若当前智能填充结果返回为空，移动传送带220，且计数+1
        if (isEmpty(smartFillResult?.points)) {
          return await this.conveyorBeltBatch(false, ++index);
        }
        logger.info('批量填充总数', smartFillResult?.points?.length);
        this.appContext.onUpdateModalVisible(
          'setBatchProcessStepModalVisible',
          false,
        );
        this.throwError(batchId);
        !batchProcessFirstStep &&
          window.postMessage({
            type: 'renderImage',
            data: {
              imgUrl: `file://${appDataPath}/${compressBatchSuccess}`,
            },
          });
        // 3. 若有填充结果，生成gcode，加工
        await this.batchProcess(smartFillResult?.points!);
      } catch (error) {
        return false;
      }
      return true;
    }

    /**
     * 收到智能填充结果后，开始批量加工
     */
    async batchProcess(smartFillResult: SmartFillDataPoints) {
      const { canvas } = this.dataSource?.canvasManager;
      const { scaleW, scaleH, batchInitDisplayJSON, batchInitCenter } =
        this.batchProcessData;
      // 1. 将当前画布上的所有元素删除
      await canvas.selectAll();
      await canvas.removeSelected();

      const displayResult: any[] = [];
      smartFillResult.forEach((shape) => {
        const cx = Number(shape.point_x / scaleW);
        const cy = Number(shape.point_y / scaleH);
        const angle = Number(shape.angle);
        const rotation = (angle * Math.PI) / 180;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const cloneJSON: any = { ...batchInitDisplayJSON };
        const x = cloneJSON.x - batchInitCenter.x;
        const y = cloneJSON.y - batchInitCenter.y;
        cloneJSON.x = x * cos - y * sin + cx;
        cloneJSON.y = y * cos + x * sin + cy;
        cloneJSON.angle += angle;
        displayResult.push(cloneJSON);
      });
      // 3. 往画布上添加元素
      await canvas.addShapeMatchResult([displayResult]);
      // 4. 生成gcode
      const canvasData = await canvas.getCanvasData({
        vectorScaleNum: 30,
        excludeOutSide: true,
        exportVectorPathWhenFill: true,
      });
      await this.dataParser.parse(
        canvasData,
        this.dataSource?.currentDeviceData,
        [],
        false,
      );
      this.genProcessParams();
      return displayResult;
    }

    batchReconnect(status: boolean) {
      const { inBatchProcess, isBreakCloseBatch } = this.batchProcessData;
      //上位机退出了页面
      if (status && isBreakCloseBatch) {
        this.apis.batchMode({
          params: {
            action: 'exit',
          },
        });
        this.apis.cancelPrint();
        this.batchProcessData.isBreakCloseBatch = false;
        return;
      }

      //上位机器还未退出页面的情况
      if (inBatchProcess) {
        // 休眠10分钟下位机自动断开
        if (!status) {
          this.cancelBatchWithMachine();
          return;
        }
        //识别中断
        if (
          status &&
          [PROCESSING_EVENT.FINISH_PROCESS, PROCESSING_EVENT.IDLE].includes(
            this.deviceInfo.currentStatus,
          )
        ) {
          //后续识别中断
          if (
            this.batchProcessData.firstStepSuccess &&
            !this.batchProcessData.batchProcessFirstStep
          ) {
            this.conveyorBeltAfterProcess();
            return;
          }
          //初次识别并且在识别前中断
          if (!this.batchProcessData.firstStepSuccess) {
            const win = window.parent || window;
            win.postMessage({ type: 'previewPageReady' });
          }
        }
      }
    }

    batchStateChange(status: PROCESSING_EVENT) {
      if (status === PROCESSING_EVENT.FINISH_PROCESS) {
        this.conveyorBeltAfterProcess();
      }
    }

    /**
     * 同步下位机的取消
     */
    cancelBatchWithMachine() {
      //在第一次就续前 都需要退到编辑器
      this.batchFinish({
        completeExit: this.batchProcessData.batchProcessFirstStep,
      });
      this.deviceInfo = { currentStatus: PROCESSING_EVENT.CANCEL_PROCESS };
    }

    /**
     * @param closeView 是否关闭视图 需要初始化
     */
    async batchFinish(data?: { completeExit?: boolean; exit?: boolean }) {
      this.apis.batchMode({
        params: {
          action: 'exit',
        },
      });
      this.batchProcessData = {
        ...this.batchProcessData,
        isBreakCloseBatch: data?.exit || false,
        inBatchProcess: false,
      };
      // 在退出清除事件
      this.removeAllListeners('uMoveFinish');
      // xcm.smartFill({
      //   action: 'destroyWorker',
      //   methodKey: CONVEYOR_BELT_WORKER,
      // });
      this.closeBatchDialog();
      if (data?.completeExit) {
        this.appContext.resetProcessingState(true);
        // 下位机不一定会改变状态 主动改变
        this.deviceInfo = { currentStatus: PROCESSING_EVENT.IDLE };
      }
    }

    closeBatchDialog() {
      this.batchProcessData.stopConveyorBelt = true;
      this.appContext.onUpdateModalVisible(
        'setBatchProcessStepModalVisible',
        false,
      );
    }

    // 获取画布对象的中心点 -- 相对于位图的坐标系
    async getCanvasDisplaysCenterPoint() {
      const { width: workAreaWidth, height: workAreaHeight } =
        find(this.config.processingArea.data, [
          'key',
          PROCESSING_MODE.BATCH_PROCESS,
        ]) || this.config.processingArea.base;
      // const { width: bgImgWidth, height: bgImgHeight } =
      //   await fileHelper.getImgSize(this.calibImgPath);
      // const scaleW = bgImgWidth / workAreaWidth;
      // const scaleH = bgImgHeight / workAreaHeight;

      const bgImgWidth = 2200;
      const bgImgHeight = 2200;
      const scaleW = bgImgWidth / workAreaWidth;
      const scaleH = bgImgHeight / workAreaHeight;
      // const { width, height } = this.dataParser.boundingRect;

      const { canvas } = this.dataSource?.canvasManager;
      await canvas.selectAll();
      const { options, displaysJSON } = await canvas.getShapeMatchData();

      this.batchProcessData = {
        ...this.batchProcessData,
        scaleW: bgImgWidth / workAreaWidth,
        scaleH: bgImgHeight / workAreaHeight,
        batchInitDisplayJSON: cloneDeep(displaysJSON[0]),
        batchInitCenter: cloneDeep(options),
      };

      return { x: options.x * scaleW, y: options.y * scaleH };
    }

    /**
     * 初始化传送带批量加工
     * 1. 将canvas画布上的背景图和元素提交给智能填充算法
     */
    async initBatchSmartFill() {
      const centerPoint = await this.getCanvasDisplaysCenterPoint();
      const refer_points = [[centerPoint.x, centerPoint.y]];

      //有key和box才不需要重新走
      if (
        !this.batchProcessData.batchKey &&
        !this.batchProcessData.bgMaterialArea
      ) {
        const url = await this.uploadImgToClouds(compressCalibImgPath);
        const result = await cloudSmartFillBox({
          image_url: url,
          refer_points,
          scene: 'get_box',
        });
        this.batchProcessData = {
          ...this.batchProcessData,
          bgMaterialArea: result?.refer_box,
          batchKey: result?.process_tag,
        };
      }
      const { bgMaterialArea, batchKey } = this.batchProcessData;
      await cloudSmartFillBox({
        refer_points,
        match_thresh: 0.75,
        refer_box: bgMaterialArea?.flat(),
        process_tag: batchKey,
        scene: 'get_points',
      });
    }

    /**
     * 传送带逻辑
     */
    async conveyorBeltProcess() {
      this.batchProcessData = {
        ...this.batchProcessData,
        inBatchProcess: true,
        firstStepSuccess: false,
        isBreakCloseBatch: false,
      };
      this.apis.batchMode({
        params: {
          action: 'start',
        },
      });

      await Promise.race([
        this.initBatchSmartFill(),
        new Promise(() =>
          this.on(ExtEvents.Disconnected, () => {
            throw new Error('disConnect');
          }),
        ),
      ]);
      // 返回时停止后续操作 此时弹窗还没拉起 在这里做处理
      if (!this.batchProcessData.inBatchProcess) return false;
      // 第一次批量加工填充, 第一次不需要移动传送带且不需要弹出步骤弹窗
      return await this.conveyorBeltBatch(true);
    }

    /** 传送带后续加工下发流程 */
    async conveyorBeltAfterProcess() {
      if (!(await this.conveyorBeltBatch())) {
        return;
      }
      logger.info('批量填充-结束-test');
      await this.buildProcessGcode(PROCESSING_MODE.BATCH_PROCESS);
      await this.batchUpdateGcode();
    }

    checkSmartFill(mode: PROCESSING_MODE) {
      return !config.usePermissions.smartFill.includes(mode);
    }

    async coincideMeasure() {
      return Promise.race([
        xcm.gs002CoincideMeasure({
          urlIp: this.device?.connectIdentity,
          methodKey: Coincide_Measure_Worker,
        }),
        this.waitForEvent('focusStop', {
          fn: (_res, reject) => {
            xcm.gs002CoincideMeasure({
              action: 'destroyWorker',
              methodKey: Coincide_Measure_Worker,
            });
            reject(new Error('autoFocus stop'));
          },
        }),
      ]);
    }

    // todo 对焦相关
    /**
     * 三角测距
     * @returns
     */
    async triangulation(x = 110, y = 110) {
      if (this.deviceInfo.autoFocusLoading === false) {
        throw new Error('autoFocus stop');
      }
      await Promise.allSettled([
        this.controlExposure(10),
        this.turnLightAction(0),
        this.apis.controlLed({
          data: {
            action: 'off',
            index: 0,
          },
        }),
      ]);
      await delayFnc(1000);
      let measure_z;
      try {
        const blob = await this.takeGlobalPhoto();
        await fileHelper.writeData(measurePath, blob, {}, true);
        const measureZJson = await (window as any).xcm.gs002Measure({
          measurePath,
          irJsonPata,
          floatGX: x,
          floatGY: y,
        });
        measure_z =
          measureZJson === 'NON'
            ? MEASURE_Z_ERROR
            : JSON.parse(measureZJson).measure_z;
      } catch (error) {
        measure_z = MEASURE_Z_ERROR;
      }
      if (this.deviceInfo.autoFocusLoading === false) {
        throw new Error('autoFocus stop');
      }
      // 开启 退出对焦状态会自动开启
      Promise.allSettled([
        this.controlExposure(0),
        this.turnLightAction(this.deviceInfo.fillLight),
        this.apis.controlLed({
          data: {
            action: 'on',
            index: 0,
          },
        }),
      ]);
      if (measure_z === MEASURE_Z_ERROR) {
        throw new Error(AUTO_FOCUS_FAIL);
      }
      return measure_z;
    }

    //获取z轴坐标
    async getZ() {
      const result = await this.apis.focusControl({
        data: {
          action: 'coord',
        },
      });
      return result.value || 0;
    }

    async controlZ(thickness: number) {
      const result = await this.getZ();
      const moveZ = +(result + thickness).toFixed(3);
      if (moveZ >= MAX_Z) {
        throw new Error(AUTO_FOCUS_FAIL);
      }
      this.deviceInfo = {
        autoFocusLoading: true,
      };
      if (this.deviceInfo.autoFocusLoading === false) {
        throw new Error('autoFocus stop');
      }
      await this.apis.focusControl({
        data: {
          action: 'goTo',
          z: moveZ,
          stopFirst: 1,
          F: 300,
        },
      });
      const offsetZ = moveZ - PLANE_LOW_LIMIT;
      return offsetZ < 0 ? 0 : offsetZ;
    }

    @deviceChecker.checkBy([
      DEVICE_KEY.connect,
      DEVICE_KEY.isWorking,
      DEVICE_KEY.focus,
      DEVICE_KEY.measure,
      DEVICE_KEY.zAxisAbnormality,
    ])
    async autoFocus() {
      let thickness = null;
      try {
        this.deviceInfo = { autoFocusLoading: true };
        this.apis.modeSwitch({ data: { state: RUNNING_STATUS.P_AUTOFOCUS } });
        await this.coincideMeasure();
        const offset = await this.triangulation();
        thickness = await this.controlZ(offset);
      } catch (err: any) {
        if (
          err.message === AUTO_FOCUS_FAIL &&
          this.deviceInfo.autoFocusLoading === true
        ) {
          this.handleFocusError();
          this.apis.modeSwitch({ data: { state: RUNNING_STATUS.P_IDLE } });
        }
      } finally {
        this.removeAllListeners('focusStop');
      }
      return thickness;
    }

    handleFocusError(info = { isManualMeasure: false }) {
      this.deviceInfo = { autoFocusLoading: false };
      //  画布上显示了背景照片,为避免重复toast提示，因手动对焦导致的自动对焦失败，删除提示自动对焦失败。
      if (this.appContext.isBackgroundDisplay && info.isManualMeasure) {
        return;
      }
      this.appContext.showMessage({
        type: 'error',
        options: {
          keepAliveOnHover: true,
          duration: 5000,
          bckWhiteColor: (window as any).VITE_PHONE ? true : false,
        },
        render: {
          textI18nKey: 'device.gs002.focusing_fail',
          link: {
            labelI18nKey: 'canvas.message.learn_more',
            href: this.config.supportUrls.firmware,
          },
        },
      });
    }

    @deviceChecker.checkBy([
      DEVICE_KEY.connect,
      DEVICE_KEY.isWorking,
      DEVICE_KEY.zAxisAbnormality,
    ])
    async reset() {
      return new Promise((resolve) => {
        this.appContext.dialog.warning({
          title: this.appContext.formatMsg('device.gs002.rest_note'),
          content: this.appContext.formatMsg('device.gs002.z_reset'),
          positiveText: this.appContext.formatMsg('device.gs002.rest_confirm'),
          negativeText: this.appContext.formatMsg('device.gs002.rest_cancel'),
          closable: false,
          onPositiveClick: async () => {
            if (this.deviceInfo.currentStatus === PROCESSING_EVENT.AUTOFOCUS) {
              await this.apis.modeSwitch({
                data: { state: RUNNING_STATUS.P_IDLE },
              });
            }
            this.deviceInfo = { zResetLoading: true };
            this.apis.focusControl({
              data: {
                action: 'goTo',
                autoHome: 1,
                stopFirst: 1,
                F: 300,
                Z: PLANE_LOW_LIMIT,
              },
            });
            resolve(true);
          },
          onNegativeClick: () => {
            this.deviceInfo = { zResetLoading: false };
            resolve('cancel');
          },
        });
      });
    }

    /////////////曲面相关/////////////////
    // 控制曲面舞台插件开关

    toggleCurveCanvasPlugin = (dataSource: any, status: boolean) => {
      const canvas = dataSource.canvasManager.canvas;
      let canvasPlugin = canvas.getPluginByName(CURVE_CANVAS_PLUGIN_NAME);
      if (status) {
        if (!canvasPlugin) {
          canvasPlugin = new CurvePlugin(CURVE_CANVAS_PLUGIN_NAME);
        }
        canvas.registerPlugin(canvasPlugin);
      } else {
        canvas.unRegisterPlugin(canvasPlugin);
        canvasPlugin = null;
      }
      return canvasPlugin;
    };

    @deviceChecker.beforeCurveMeasure()
    beforeCurveMeasure() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      if (!data || !data[mode]?.curveData) {
        this.customData.setModeData(this.canvasId, mode, DEFAULT_CURVE_DATA());
        return;
      }
      data[mode].curveData.tempData = DEFAULT_CURVE_TEMP_DATA();
      data[mode].curveData.remeasurePoints = [];
    }

    //TODO: 走边框gcode临时处理，后续统一处理
    genBorderGcode(start: Position, end: Position) {
      const compiledHead = template(templates.gCodeHead);
      const compiledTail = template(templates.gCodeTail);

      const gcodeHead = compiledHead({
        isWalkBorder: true,
        laserOffJumpSpeed: 180000,
        uMultipleCommand: null,
        useUAxis: false,
        useZAxis: false,
        correctZ: '',
        calibrationCommand: '',
      });
      const gcodeTail = compiledTail({
        reset: false,
        useUAxis: false,
        useZAxis: false,
      });
      return `${gcodeHead}\nG21\nG90\nG0X${start.x}Y${start.y}\nG1X${end.x}Y${start.y}S64F1440000\nG1X${end.x}Y${end.y}\nG1X${start.x}Y${end.y}\nG1X${start.x}Y${start.y}\n${gcodeTail}\n\n`;
    }

    // 曲面:测量获取实时走边框(测量)
    async genCurveMeasureRealTime(
      start: Position,
      end: Position,
      first: boolean,
    ) {
      const gcode = this.genBorderGcode(start, end);
      console.log('genCurveMeasureRealTime\n', gcode);
      if (first) {
        return this.startWalkBorder(gcode);
      }
      return this.replaceWalkBorder(gcode);
    }

    //曲面:记录开始结束点
    async recordPosition(start: Position, end: Position, first: boolean) {
      console.log('recordPosition', start, end);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const z = await this.getZ();
      tempData.start = { ...start, z };
      tempData.end = { ...end, z };
      tempData.densityArea = { x: start.x, y: start.y, width, height };

      this.genCurveMeasureRealTime(start, end, first);
    }

    async recordBoundsNext() {
      await this.stopWalkBorder();
      //TODO: socket上报较慢
      this.deviceInfo = { currentStatus: PROCESSING_EVENT.IDLE };
    }

    // 记录曲面开始点和结束点的前置行为 /
    @deviceChecker.beforeRecordCurvePosition()
    async beforeRecordCurvePosition() {
      // await this.toggleCurveIrLed(true);
      this.resetCurveTempData();
      return true;
    }

    //曲面:记录完开始点和结束点后的结束行为
    @deviceChecker.afterRecordCurvePosition()
    async afterRecordCurvePosition() {
      return true;
    }

    //曲面:设置测点推荐行列
    setRecommendAttr() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const { width, height } = tempData.densityArea;
      const row = Math.ceil(height / RECOMMEND_DISTANT);
      const col = Math.ceil(width / RECOMMEND_DISTANT);
      // const recommendRow =
      //   height < RECOMMEND_DISTANT
      //     ? CURVE_MIN_ROW
      //     : CURVE_MIN_ROW +
      //       Math.ceil((height - RECOMMEND_DISTANT) / RECOMMEND_DISTANT);
      // const recommendCol =
      //   width < RECOMMEND_DISTANT
      //     ? CURVE_MIN_COL
      //     : CURVE_MIN_COL +
      //       Math.ceil((width - RECOMMEND_DISTANT) / RECOMMEND_DISTANT);
      tempData.curveRange = {
        row: fixNum(row, CURVE_MIN_ROW, CURVE_MAX_ROW),
        col: fixNum(col, CURVE_MIN_COL, CURVE_MAX_COL),
      };
    }

    //曲面:按照Z字形排列要测量的点
    calCurveDensityPoints = (options: {
      width: number;
      height: number;
      pointSize: number;
    }) => {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const { row, col } = tempData.curveRange;
      const points: DensityPoint[] = [];
      const start = tempData.start;
      const end = tempData.end;
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      const widthSpace = width / (col - 1);
      const heightSpace = height / (row - 1);
      // 根据窗口组件容器换算对应点的显示位置，需要左右各减半个点的位置来显示完全
      const pWidth = options.width - options.pointSize;
      const pHeight = options.height - options.pointSize;
      const pWidthSpace = pWidth / (col - 1);
      const pHeightSpace = pHeight / (row - 1);
      let pointsLength = row * col;
      let isForward = true;
      let x = 0;
      let y = 0;
      while (pointsLength > 0) {
        points.push({
          ox: start.x + widthSpace * x,
          oy: start.y + heightSpace * y,
          x: 0,
          y: 0,
          z: 0,
          colIndex: x,
          rowIndex: y,
          left: pWidthSpace * x + options.pointSize / 2,
          top: pHeightSpace * y + options.pointSize / 2,
          color: CURVE_POINT_COLOR.GRAY,
        });
        if (isForward && x < col - 1) {
          x++;
        } else if (!isForward && x > 0) {
          x--;
        } else if (y < row - 1) {
          y++;
          isForward = !isForward;
        }
        pointsLength--;
      }
      tempData.densityPoints = points;
      return tempData.densityPoints;
    };

    // 设置完行和列之后，开始测量的事件
    @deviceChecker.beforeCurveMeasuring()
    beforeCurveMeasuring() {
      return true;
    }

    async setControlZ(moveZ: number) {
      await this.apis.focusControl({
        data: {
          action: 'goTo',
          z: moveZ,
          stopFirst: 1,
          F: 600,
        },
      });
    }

    //是否是重新测量
    isRemeasure() {
      const curveData = this.customData.getModeData(
        this.canvasId,
        PROCESSING_MODE.CURVE_PROCESS,
      )?.curveData;
      return curveData?.remeasurePoints?.length > 0;
    }

    async setCurveCorrectionDistance(first: boolean) {
      if (this.isRemeasure()) {
        if (first) {
          const currentZ = await this.getZ();
          const isDistance1 =
            Math.abs(currentZ - (CURVE_DISTANCE_1 + PLANE_LOW_LIMIT)) < 0.1;
          const isDistance2 =
            Math.abs(currentZ - (CURVE_DISTANCE_2 + PLANE_LOW_LIMIT)) < 0.1;
          if (isDistance1) {
            this.#curveCorrectionDistance = CURVE_DISTANCE_1 + PLANE_LOW_LIMIT;
          } else if (isDistance2) {
            this.#curveCorrectionDistance = CURVE_DISTANCE_2 + PLANE_LOW_LIMIT;
          } else {
            this.#curveCorrectionDistance = CURVE_DISTANCE_1 + PLANE_LOW_LIMIT;
          }
        } else {
          if (
            this.#curveCorrectionDistance ===
            CURVE_DISTANCE_1 + PLANE_LOW_LIMIT
          ) {
            this.#curveCorrectionDistance = CURVE_DISTANCE_2 + PLANE_LOW_LIMIT;
          } else {
            this.#curveCorrectionDistance = CURVE_DISTANCE_1 + PLANE_LOW_LIMIT;
          }
        }
      } else {
        const distance = first
          ? CURVE_DISTANCE_1 + PLANE_LOW_LIMIT
          : CURVE_DISTANCE_2 + PLANE_LOW_LIMIT;
        this.#curveCorrectionDistance = distance;
      }
    }

    async beforeMeasure() {
      this.#curveMAxZ = 0;
      this.apis.modeSwitch({ data: { state: RUNNING_STATUS.P_MEASURE } });
      await this.setCurveCorrectionDistance(true);
      await this.setControlZ(this.#curveCorrectionDistance);
      const eventName =
        this.#curveCorrectionDistance === CURVE_DISTANCE_1 + PLANE_LOW_LIMIT
          ? WaitForEventNames.zMoveFinish1
          : WaitForEventNames.zMoveFinish2;
      await this.waitForEvent(eventName, {
        fn: (_res, rej) => {},
        time: 20 * 1000,
      });

      await Promise.allSettled([
        this.controlExposure(10),
        this.turnLightAction(0),
        this.apis.controlLed({
          data: {
            action: 'off',
            index: 0,
          },
        }),
      ]);
      await delayFnc(1000);
    }

    // 曲面: 移除曲面的temp数据
    resetCurveTempData() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      data[mode].curveData.tempData = DEFAULT_CURVE_TEMP_DATA();
    }

    // 曲面测量密度点的前置行为
    async beforeCurveMeasureAllPoints() {
      await this.beforeMeasure();
    }

    async beforeSecondMeasure() {
      await this.setCurveCorrectionDistance(false);
      await this.setControlZ(this.#curveCorrectionDistance);
      const eventName =
        this.#curveCorrectionDistance === CURVE_DISTANCE_1 + PLANE_LOW_LIMIT
          ? WaitForEventNames.zMoveFinish1
          : WaitForEventNames.zMoveFinish2;
      await this.waitForEvent(eventName, {
        fn: (_res, rej) => {},
        time: 20 * 1000,
      });
    }

    // 曲面正常测量完所有密度点后的结束行为
    async afterCurveMeasureAllPoints() {
      // 关闭
      this.turnLightAction(this.deviceInfo.fillLight);
      this.apis.controlLed({
        data: {
          action: 'on',
          index: 0,
        },
      });

      // TODO:
      // laserMeasureStartPosition 表示的是测量第一个点的激光头目标坐标
      // 这里要回到的是记录的第一个点的激光头所在的坐标
      const curveData = this.customData.getModeData(
        this.canvasId,
        PROCESSING_MODE.CURVE_PROCESS,
      )?.curveData;
      const startPos = curveData?.tempData?.start || curveData?.start || {};
      curveData.remeasurePoints = [];

      this.afterMeasure();
    }

    async afterMeasure() {
      this.apis.modeSwitch({ data: { state: RUNNING_STATUS.P_IDLE } });
    }

    async triangulationCurve(x: number, y: number) {
      let measure_z;
      try {
        const blob = await this.takeGlobalPhoto();
        await fileHelper.writeData(measurePath, blob, {}, true);
        const measureZJson = await (window as any).xcm.gs002Measure({
          measurePath,
          irJsonPata,
          floatGX: x,
          floatGY: y,
        });
        measure_z =
          measureZJson === 'NON'
            ? MEASURE_Z_ERROR
            : JSON.parse(measureZJson).measure_z +
              this.#curveCorrectionDistance;
      } catch (error) {
        measure_z = MEASURE_Z_ERROR;
      }
      return measure_z;
    }

    //设置蓝光的位置
    async setBlueLightPosition(position: Position) {
      await this.apis.command({
        params: {
          cmd: `G0X${position.x}Y${position.y}F60000`,
        },
      });
      await delayFnc(300);
      await this.apis.command({
        params: {
          cmd: `M3S${this.deviceInfo.focusPower}`,
        },
      });
      await delayFnc(300);
    }

    async curveMeasurePoint(data: any) {
      console.log('curveMeasurePoint', data);
      try {
        data.color = CURVE_POINT_COLOR.BLUE;
        await this.setBlueLightPosition({ x: data.ox, y: data.oy });

        const z = await this.triangulationCurve(data.ox, data.oy);
        if (z === MEASURE_Z_ERROR) {
          throw new Error('测量失败');
        }
        console.log('curveMeasurePoint z', z);

        this.#curveMAxZ = Math.max(this.#curveMAxZ, z);

        return {
          ...data,
          x: data.ox,
          y: data.oy,
          z: z,
          color: CURVE_POINT_COLOR.GREEN,
          result: 'success',
        };
      } catch (error: any) {
        logger.log('curveMeasure err: ', error);
        if (
          ['timeout of 3000ms exceeded', 'Network Error'].includes(
            error.message,
          )
        ) {
          throw new Error('disconnected');
        }
        if (error.message === 'Aborted') {
          // ui界面接收 suspend err
          logger.log('[ curveMeasurePoint err ] >');
          throw new Error('suspend');
        }

        return {
          ...data,
          x: data.ox,
          y: data.oy,
          z: 0,
          color: CURVE_POINT_COLOR.RED,
          result: 'fail',
        };
      }
    }

    // 曲面: 设置最终的曲面数据
    setFinalCurveData(exactPoints: DensityPoint[], replaceCurveData = true) {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode].curveData;

      if (replaceCurveData) {
        // 在最终所有店测量完成之前所有的数据保存在 curveData.tempData 中
        // 测量完成之后 将数据移动至 curveData 中
        Object.assign(curveData, curveData.tempData);
        this.resetCurveTempData();
      }
      curveData.remeasurePoints = [];
      curveData.densityPoints = exactPoints;
      curveData.smoothness = 3;
      curveData.tension = 3;
      curveData.previewDisabled = false;
      curveData.needDangerTip = false;
    }

    cancelCurveMeasure() {}

    // 获取曲面模型数据
    async getCurveData(options: CurveModelOptions) {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode].curveData;
      const size = curveData.curveRange;
      const densityPoints = curveData.densityPoints;
      const info = {
        tension: options.tension || 3,
        smoothness: options.smoothness || 3,
        size,
        densityPoints,
      };
      const modelData = await this.genSurface(info);
      // 判断是否有危险的角度要进行撞头提示
      const dangerAngle = this.curvature.large.angle[0];
      const hasDangerPoint = modelData.points.some(
        (p: any) => p.a > dangerAngle,
      );
      return { densityPoints, modelData, hasDangerPoint };
    }

    // 完成曲面预览
    finishCurvePreview() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode]?.curveData;

      const plugin = this.toggleCurveCanvasPlugin(this.dataSource, true);
      if (plugin) {
        plugin.updateRect({
          x: curveData.start.x,
          y: curveData.start.y,
          width: Math.abs(curveData.end.x - curveData.start.x),
          height: Math.abs(curveData.end.y - curveData.start.y),
        });
      }
    }

    // 更新曲面密度点的状态
    updateCurveDensityPoints() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode].curveData;
      curveData.densityPoints.forEach((dp: DensityPoint) => {
        const targetIndex = curveData.remeasurePoints.findIndex(
          (rp: DensityPoint) =>
            dp.rowIndex === rp.rowIndex && dp.colIndex === rp.colIndex,
        );
        if (targetIndex !== -1) {
          dp.color = CURVE_POINT_COLOR.BLUE;
          dp.skipMeasure = false;
          dp.z = 0;
          dp.result = '';
        } else {
          dp.color = CURVE_POINT_COLOR.SILVERY;
          dp.skipMeasure = true;
        }
      });
      return curveData.densityPoints;
    }

    // 进入到曲面重测的前置行为
    @deviceChecker.beforeCurveRemeasure()
    beforeCurveRemeasure() {
      return true;
    }

    get subType() {
      return DEVICE_TYPE.DEVICE_FOUR;
    }

    // 是否首次连接四类机判断
    isFirstConnectFourGroup() {
      const deviceType = this.subType;
      if (deviceType === DEVICE_TYPE.DEVICE_FOUR) {
        const learningStatus = localStorage.getItem('learningStatus');
        if (learningStatus === null) {
          postMessageToMain(COMMON_VIEW_EVENT.showLearningGuide);
          localStorage.setItem('learningStatus', 'false');
        }
      }
    }

    // showMessage防抖
    notShowMessage = false;
    debounceShowMessage = (...args: any[]) => {
      if (this.notShowMessage) {
        return;
      }
      this.notShowMessage = true;
      this.appContext.showMessage(...args);
      setTimeout(() => {
        this.notShowMessage = false;
      }, 5000);
    };
  }

  return F1UltraExt;
}
