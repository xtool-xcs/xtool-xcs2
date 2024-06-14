import {
  COMMON_VIEW_EVENT,
  fileHelper,
  logger,
  postMessageToMain,
  xcm,
} from '@xtool/link';
import {
  Constructor,
  DEVICE_CANVAS_PLUGIN_CONFIG,
  DEVICE_TYPE,
  DataSource,
  DeviceExtConfig,
  DeviceExtContainer,
  DownloadFirmwareParam,
  EstimatedTime,
  PROCESSING_EVENT,
  PROCESSING_MODE,
  ProcessingAreaData,
  ProcessingUploadData,
  SYSTEM_EVENT,
  SizeType,
  WalkBorder,
  collision,
  makeFramePath,
  parseParams,
  requestCancelable,
} from '@xtool/xcs-logic';
import { ObjectBoundingRect } from '@xtool/xcs-logic/src/ext-container/gcode/preprocess/type';
import {
  find,
  includes,
  intersection,
  isFunction,
  isNumber,
  template,
} from 'lodash-es';
import { F1Plugin } from './canvas-plugins';
import { F1CentralAxisPlugin } from './canvas-plugins/centralAxis';
import { DEFAULT_D_PATH } from './canvas-plugins/centralAxisIcon';
import { DRAG_D_PATH } from './canvas-plugins/dragCentralAxisIcon';
import config from './config';
import templates from './config/gcode-template';
import {
  LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
  MODE_DEFALUT_KA_MSG,
  PLANE_LOW_LIMIT,
  PURIFIER_CMD_INFO,
} from './constant';
import { CHECK_ERROR, ExtEvents, PROCESSING_COMMAND, statusMap } from './types';
import uiComponents, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';

import { isUndefined } from 'lodash-es';
import { deviceChecker } from './check';
import uiAppComponents from './ui-app';
import {
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';

const CANVAS_PLUGIN_NAME = 'F1-canvas-plugin';

const AXIS_HOME_STATUS = ['AXIS_HOME_STARTED', 'AXIS_HOME_FINISHED'];

const lapse = 0.0999;
const delayTimeKeys = [
  'openLaserDelay',
  'closeLocationDelay',
  'closeLaserDelay',
  'cornerDelay',
  'jumpLocationDelay',
  'jumpDistanceDelay',
  'dotLocationFinish',
  'laserOffJumpSpeed',
];

export interface F1Ext extends DeviceExtContainer {
  currentData: any;
  config: any;
  updateWalkBorderParams(value: {
    mode: WalkBorder;
    speed: any;
    power: number;
    platformSpeed: any;
  }): unknown;
  focusControl: (data: {
    data: { action: string; Z: number; F: number };
  }) => void;
  updatePlatformSpeed: (speed: number) => void;
  walkBorderInRealTime: (data: any) => void;
}

export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class F1Ext extends Base {
    // 加工类型配置
    processingTypes = processingTypes;
    ignoreStatusInProcessing = [
      PROCESSING_EVENT.FRAME_WORKING,
      PROCESSING_EVENT.IDLE,
    ];

    #cancelable: any;

    // 扩幅走边框提示弹窗
    walkBorderTipVisible = false;

    // 走边框的gcode
    walkBorderGcode = '';

    // z轴目标高度
    zCoord: number | null = null;

    /**
     * 是否已经完成原点初始化(回过原点)
     */
    isInitiatedOrigin = false;

    /**
     * 正在原点初始化(回原点过程中)
     */
    isInitiatingOrigin = false;

    // 当前加工方式：正常加工 or 走边框
    printType: 'normal' | 'frame' = 'normal';

    // 是否使用新的加工流程监听方式，目前只有f1使用这套流程，用于解决断开重连后的加工状态延续
    isProcessV2 = true;

    // 当前是否处于加工就绪状态，若在，下位机控制走边框上报的socket不能修改currentStatus
    isWorkPrepare = false;

    // 当前需要加工的元素中是否有红光加工的位图
    elementUseRedLight = false;

    hasCancelProcess = false;

    // 计算F1预估时长
    // WorkingType:
    //     VectorCrave = 0,    // 矢量雕刻
    //     VectorFill = 1, // 矢量填充
    //     VectorCut = 2,  // 矢量切割
    //     BitMap = 3,     // 位图加工
    //     MixCrave = 4,   // 混合雕刻
    #workingType = 0;

    /**
     * Creates an instance of DeviceExt.
     * @date 05/11/2022
     * @param {...any[]} args
     */
    constructor(...args: any[]) {
      super(config, ...args);
      this.appContext.canvasSelectedChanged =
        this.walkBorderInRealTime.bind(this);
    }

    deviceDataValues = (() => {
      const data = {};
      processingModes.forEach((i) => {
        if (deviceDataValues[i.value]) {
          data[i.value] = { ...deviceDataValues[i.value] };
        }
      });
      return data;
    })();
    elementDataValues = elementDataValues;

    get ui() {
      return uiComponents;
    }

    get uiApp() {
      return uiAppComponents;
    }

    get centralAxis() {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        const plugin = canvas.getPluginByName(
          LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
        );
        return plugin;
      }
      return null;
    }

    get walkBorderParams() {
      return this._walkBorderParams;
    }

    set walkBorderParams(value) {
      this._walkBorderParams = value;
    }

    get subType() {
      return DEVICE_TYPE.DEVICE_FOUR;
    }

    doUpdateFirmware(): Promise<boolean> {
      throw new Error('Method not implemented.');
    }

    @deviceChecker.uploadGCode()
    async uploadGCode(params?: ProcessingUploadData): Promise<boolean> {
      // 走边框的状态中，点击开始上传gcode，不提示错误，自动取消走边框即可
      if (this.deviceInfo.currentStatus === PROCESSING_EVENT.FRAME_WORKING) {
        await this.apis.cancelPrint();
      }
      const { onProgress, isFullPath = false } = params || {};
      const { platformSpeed = 20 } = this._walkBorderParams;
      this.hasCancelProcess = false;
      if (this.dataParser) {
        const { processMode } = this.dataParser.source.params;
        const walkBorderParams: {
          loopPrint: string;
          operate?: string;
          gcodeType?: string;
          uMoveSpeed?: number;
        } = {
          loopPrint: processMode === PROCESSING_MODE.LASER_CYLINDER ? '0' : '1',
          gcodeType:
            processMode === PROCESSING_MODE.LASER_EXTENDER
              ? 'frameExt'
              : 'frame',
          operate: 'upload',
        };
        if (processMode === PROCESSING_MODE.LASER_EXTENDER) {
          walkBorderParams.uMoveSpeed = platformSpeed * 60;
        }
        await this.apis.uploadWalkBorder({
          data: { gcode: this.walkBorderGcode },
          params: walkBorderParams,
          onUploadProgress: ({ loaded, total }: any) => {
            const percent = Number((loaded / total).toFixed(2));
            logger.log({ percent });
          },
        });
      }
      if (this.uploadGcodeHelper) {
        const fileName = this.taskManager.getTask(this.deviceInfo.snCode).gcode;
        const {
          baseUrl,
          url,
          params: urlParams = {},
        } = await this.apis.uploadGcode({ method: 'info' });
        if (this.supportTaskId) {
          urlParams.taskId = this.taskManager.getTask(
            this.deviceInfo.snCode,
          ).id;
        }
        const uploadGcodeUrl = `${baseUrl}${url}${parseParams(urlParams)}`;
        try {
          const result = await super.uploadByBuilder({
            url: uploadGcodeUrl,
            path: fileName,
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
          return Promise.reject(false);
        } catch (err) {
          logger.log('uploadGcode by builder error', err);
          return Promise.reject(false);
        }
      } else {
        const gcode = this.taskManager.getTask(this.deviceInfo.snCode).gcode;
        const { signal, cancel } = requestCancelable();
        this.#cancelable = cancel;
        return this.apis.uploadGcode({
          data: gcode,
          signal: signal,
          onUploadProgress: (ev: any) => {
            const complete = ev.loaded / ev.total;
            isFunction(onProgress) && onProgress(complete);
          },
        });
      }
    }

    startProcessing(): Promise<boolean> {
      return this.uploadGCode();
    }

    @deviceChecker.restartProcessing()
    restartProcessing() {
      logger.info('点击继续加工');
    }

    async focusControl(data: {
      data: { action: string; Z: number; F: number };
    }) {
      if (this.apis?.focusControl) {
        await this.apis.focusControl(data);
      }
    }

    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
      if (window.MeApi && window.MeApi?.fileHelper?.cancelUploadGcode) {
        window.MeApi.fileHelper.cancelUploadGcode();
      }
    }

    // 显示常驻提示条
    setKeepAliveMsg(keepAlive: any) {
      this.emit(SYSTEM_EVENT.SET_KEEP_ALIVE_MESSAGE, keepAlive);
    }

    handleDeviceFormValueChanged(prev: any, next: any) {
      console.log('handleDeviceFormValueChanged', prev, next);
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        if (prev.mode !== next.mode) {
          this.setKeepAliveMsg(MODE_DEFALUT_KA_MSG[next.mode]);
        }
        if (next.mode === PROCESSING_MODE.LASER_PLANE) {
          let plugin = canvas.getPluginByName(CANVAS_PLUGIN_NAME);
          if (!plugin) {
            plugin = new F1Plugin(CANVAS_PLUGIN_NAME);
            canvas.registerPlugin(plugin);
          }
          const { current } = this.getCurrentArea('');
          const { width, height } = current;
          const {
            TIPS_TYPE: { fillColor, fillAlpha },
          } = DEVICE_CANVAS_PLUGIN_CONFIG;
          plugin.updateRoundRect({
            fillColor,
            fillAlpha,
            width,
            height,
            radius: 20,
          });
        } else {
          canvas.unRegisterPluginByName(CANVAS_PLUGIN_NAME);
        }
        if (next.mode === PROCESSING_MODE.LASER_CYLINDER) {
          let centralAxisPlugin = canvas.getPluginByName(
            LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
          );
          if (!centralAxisPlugin) {
            centralAxisPlugin = new F1CentralAxisPlugin(
              LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
            );
            canvas.registerPlugin(centralAxisPlugin);
          }
          if ((window as any).VITE_PHONE) {
            centralAxisPlugin.updateCentralAxis([
              {
                icon: {
                  dPath: DRAG_D_PATH,
                  fillColor: 46336,
                  lineColor: 15658734,
                },
              },
            ]);
          } else {
            centralAxisPlugin.updateCentralAxis([
              {
                icon: {
                  dPath: DEFAULT_D_PATH,
                  fillColor: 3380479,
                  lineColor: 15658734,
                },
              },
            ]);
          }
        } else {
          canvas.unRegisterPluginByName(LASER_CYLINDER_CENTRAL_AXIS_PLUGIN);
        }
      }

      if (prev.mode !== next.mode) {
        this.updateWalkBorderParams(
          this.config.process.walkBorder.defaultWalkBorderParams[next.mode],
        );
      }

      const { mode } = next;
      const { mode: prevMode } = prev;
      if (
        includes([mode, prevMode], PROCESSING_MODE.LASER_CYLINDER) &&
        !!intersection(
          [mode, prevMode],
          [
            '',
            PROCESSING_MODE.LASER_PLANE,
            PROCESSING_MODE.FREE_PLANE,
            PROCESSING_MODE.LASER_EXTENDER,
          ],
        ).length
      ) {
        const { defaultWalkBorderParams } = this.config.process.walkBorder;
        this.deviceInfo = {
          walkBorderParams: Object.assign(
            this.deviceInfo?.walkBorderParams || {},
            { ...defaultWalkBorderParams[mode || PROCESSING_MODE.LASER_PLANE] },
          ),
        };
      }
    }

    // 暂停加工
    @deviceChecker.pauseProcessing()
    pauseProcessing() {
      return this.apis.pausePrint();
    }

    // 取消加工
    @deviceChecker.cancelProcessing()
    cancelProcessing() {
      return this.apis.cancelPrint();
    }

    @deviceChecker.walkBorder()
    async startWalkBorder(gcode: string) {
      const { platformSpeed = 20 } = this._walkBorderParams;
      const { processMode } = this.dataParser.source.params;
      const params: {
        loopPrint: string;
        gcodeType?: string;
        uMoveSpeed?: number;
      } = {
        loopPrint: processMode === PROCESSING_MODE.LASER_CYLINDER ? '0' : '1',
        gcodeType:
          processMode === PROCESSING_MODE.LASER_EXTENDER ? 'frameExt' : 'frame',
      };
      if (processMode === PROCESSING_MODE.LASER_EXTENDER) {
        params.uMoveSpeed = platformSpeed * 60;
      }
      await this.apis.uploadWalkBorder({
        data: { gcode },
        params: params,
        onUploadProgress: ({ loaded, total }: any) => {
          const percent = Number((loaded / total).toFixed(2));
          logger.log({ percent });
        },
      });
      if (processMode === PROCESSING_MODE.LASER_EXTENDER) {
        const isNeverRemain =
          Number(localStorage.getItem('WALK_BORDER_TIP_MODAL_NEVER_REMAIN')) ||
          false;
        if (!isNeverRemain) {
          this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, true);
        }
      } else {
        this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
      }
      return;
    }

    async replaceWalkBorder(gcode: string) {
      const { mode } = this.dataSource?.currentDeviceData;
      const { platformSpeed = 20 } = this.walkBorderParams;
      const params: {
        fileType: string;
        loopPrint: number;
        uMoveSpeed?: number;
      } = {
        fileType: 'txt',
        loopPrint: 1,
      };
      if (mode === PROCESSING_MODE.LASER_EXTENDER) {
        params.uMoveSpeed = platformSpeed * 60;
      }
      return this.apis.replaceWalkBorder({
        data: { gcode },
        params: params,
        onUploadProgress: ({ loaded, total }: any) => {
          const percent = Number((loaded / total).toFixed(2));
          console.log({ percent });
        },
      });
    }

    stopWalkBorder() {
      // TODO: 移动端后续补充上阔幅配件加工走边框的提示框。
      if ((window as any).VITE_APP) {
        this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
      }
      return this.apis.stopWalkBorder();
    }

    async updateWalkBorderGcode(gcode: string) {
      this.walkBorderGcode = gcode;
    }

    updateOriginInitStatus(isInitiated: boolean, isInitiating: boolean) {
      this.isInitiatedOrigin = isInitiated;
      this.isInitiatingOrigin = isInitiating;
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

    async onConnected() {
      console.log('onConnected', this.walkBorderParams);
      this.isFirstConnectFourGroup();
      const statusData = await this.apis.getStatus();
      const currentStatus = this.handleCncStatus(statusData);
      const tempAddon = await this.apis.addonStatus();
      let isInitiatedOrigin = true;
      let zCoord = 0;
      try {
        isInitiatedOrigin = await this.checkIsHomed();
        zCoord = await this.getZCoord();
      } catch (err) {
        logger.log(err);
      }
      this.addonStatus = {
        ...this.addonStatus,
        ...tempAddon,
      };
      this.isInitiatedOrigin = isInitiatedOrigin;
      // 初始化走边框参数；断连重连设备需要保留上一次设置的参数；
      if (isUndefined(this.walkBorderParams.mode)) {
        const mode =
          this.dataSource?.currentDeviceData?.mode ||
          PROCESSING_MODE.LASER_PLANE;
        const { defaultWalkBorderParams } = this.config.process.walkBorder;
        this.walkBorderParams = Object.assign(
          this.deviceInfo?.walkBorderParams || {},
          { ...defaultWalkBorderParams[mode] },
        );
      }

      if (currentStatus === PROCESSING_EVENT.IDLE) {
        this.appContext.resetProcessingState();
      }
      // 更新processingModeForm 中的 厚度 UI
      this.emit(SYSTEM_EVENT.UPDATE_INIT_ORIGIN_STATUS, {
        isInitiatingOrigin: false,
        isInitiatedOrigin: this.isInitiatedOrigin,
      });
      this.emit(SYSTEM_EVENT.UPDATE_PROCESSING_MODE_DATA, {
        key: 'thickness',
        value: zCoord,
      });
      super.onConnected();
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

    exportLog() {
      return super.exportLog('xcs_f1_log.gz');
    }

    // 监听socket中的module
    moduleMonitor(module: string, type: string, info: any) {
      switch (module) {
        case 'GAP':
          this.addonStatus = {
            ...this.addonStatus,
            gapStatus: type === 'OPEN',
          };
          break;
        case 'MACHINE_LOCK':
          this.addonStatus = {
            ...this.addonStatus,
            UsbKeyLockStatus: type === 'CLOSE',
          };
          break;
        case 'WIFI':
          this.emit(
            SYSTEM_EVENT.UPDATE_WIFI_CONFIG_CONNECTED,
            type === 'CONNNECT',
          );
          break;
        case 'LASER_HEAD': {
          const { z } = info;
          if (isNumber(z)) {
            this.emit(SYSTEM_EVENT.UPDATE_PROCESSING_MODE_DATA, {
              key: 'thickness',
              value: info.z,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    /**
     * 监听socket中的info
     * */
    infoMonitor(info: string, type: string) {
      switch (info) {
        case PURIFIER_CMD_INFO:
          this.addonStatus = {
            ...this.addonStatus,
            purifierExist: type === 'CONNNECT',
          };
          break;
        default:
          break;
      }
    }

    /**
     * 对 socket 信息中 module 是 STATUS_CONTROLLER 的信息做解析
     * @param data
     */
    #parseStatusControllerModule(data: any) {
      const { info, type } = data;
      if (includes(AXIS_HOME_STATUS, type)) {
        const isStartedAxisHome = type === statusMap.AXIS_HOME_STARTED;
        const isFinishAxisHome = type === statusMap.AXIS_HOME_FINISHED;
        if (isStartedAxisHome) {
          this.updateOriginInitStatus(false, true);
        }
        if (isFinishAxisHome) {
          this.updateOriginInitStatus(true, false);
        }
        this.emit(SYSTEM_EVENT.UPDATE_INIT_ORIGIN_STATUS, {
          isInitiatingOrigin: isStartedAxisHome,
          isInitiatedOrigin: isFinishAxisHome,
        });

        this.emit(SYSTEM_EVENT.UPDATE_PROCESSING_MODE_DATA, {
          key: 'thickness',
          value: PLANE_LOW_LIMIT,
        });
      } else if (type !== PROCESSING_EVENT.MODE_CHANGE) {
        let status = '';
        if (includes(PROCESSING_COMMAND, type)) {
          if (
            includes(info, 'framing') &&
            includes(
              [
                PROCESSING_COMMAND.WORK_STARTED,
                PROCESSING_COMMAND.WORK_FINISHED,
                PROCESSING_COMMAND.WORK_STOPED,
              ],
              type,
            ) &&
            !this.isWorkPrepare
          ) {
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
          const currentStatus = statusMap[status] ?? status;
          if (status === statusMap.WORK_STOPED) {
            this.hasCancelProcess = true;
          }
          this.deviceInfo = { currentStatus: currentStatus };
        }
      } else {
        const taskId = info.taskId;
        this.deviceInfo = { taskId: taskId };
      }
    }

    // 监听socket信息
    deviceCmdParsing(cmd: string) {
      try {
        const data = JSON.parse(cmd);
        const { info, level, module, type } = data;
        logger.log(' socket 信息', level, module, type, info);
        this.infoMonitor(info, type);
        this.moduleMonitor(module, type, info);
        // 异常情况出现，目前有: 移动即停，火焰报警
        if (level === 'warnning') {
          const mayBeError = find(CHECK_ERROR, { code: module });
          if (mayBeError) {
            this.emit(ExtEvents.Error, mayBeError);
            this.emit(PROCESSING_EVENT.CANCEL_PROCESS);
            return;
          }
        }
        if (module === 'STATUS_CONTROLLER') {
          this.#parseStatusControllerModule(data);
        }
      } catch (error) {
        logger.error(`F1 socket 数据返回异常${error}`);
      }
    }

    handleCncStatus(info: {
      currentStatus: string;
      des: string;
      subMode: string;
    }) {
      let { currentStatus } = info;
      const { des, subMode } = info;
      if (des === 'frame' || des === 'frameExt') {
        currentStatus =
          currentStatus === 'Work' ? 'FRAME_WORKING' : currentStatus;
      } else {
        if (currentStatus === 'Work') {
          currentStatus = statusMap[subMode];
        } else {
          currentStatus = statusMap.IDLE;
        }
        this.deviceInfo = { currentStatus };
      }
      return currentStatus;
    }

    async initDeviceInfo() {
      const info = await this.apis.deviceInfo({}, false);
      const configInfo = await this.apis.getConfigs({
        data: {
          alias: 'config',
          type: 'user',
          kv: [
            'enablePreheat',
            'workingMode',
            'homeAfterPowerOn',
            'purifierTimeout',
            'flameAlarm',
            'gapCheck',
            'beepEnable',
            'taskId',
          ],
        },
      });
      let delayTimeData = {};
      try {
        const delayTimeConfig = await this.apis.motionDelayTime({
          data: {
            action: 'infoGet',
            data: [
              {
                type: 'red',
                params: delayTimeKeys,
              },
              {
                type: 'blue',
                params: delayTimeKeys,
              },
            ],
          },
        });
        delayTimeData = {
          red: { ...find(delayTimeConfig, { type: 'red' })?.para },
          blue: { ...find(delayTimeConfig, { type: 'blue' })?.para },
        };
      } catch (err) {
        logger.log(err);
      }
      // 各种延时数据的获取

      const currentStatus = this.handleCncStatus(info);
      // let { currentStatus } = info;
      // const { des, subMode } = info;
      // if (des === 'frame' || des === 'frameExt') {
      //   currentStatus =
      //     currentStatus === 'Work' ? 'FRAME_WORKING' : currentStatus;
      // } else {
      //   if (currentStatus === 'Work') {
      //     currentStatus = statusMap[subMode];
      //     this.deviceInfo = { currentStatus };
      //   } else {
      //     this.deviceInfo = { currentStatus: statusMap.IDLE };
      //   }
      // }
      const tempInfo = {
        ...info,
        ...configInfo,
        currentStatus,
        // 延时数据光源选择，默认蓝光
        motionDelayLightType: 'blue',
        delayTimeData,
      };
      this.deviceInfo = tempInfo || {};
      this.addonStatus = {
        ...this.addonStatus,
        gapCheck: configInfo.gapCheck,
      };
      return tempInfo;
    }

    updateWalkBorderTipShow(value: boolean, isNeverShow: boolean) {
      localStorage.setItem(
        'WALK_BORDER_TIP_MODAL_NEVER_REMAIN',
        isNeverShow ? '1' : '0',
      );
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
    }

    async reGeneralWalkBorderGcode(
      source: string,
      {
        minX,
        minY,
        maxX,
        maxY,
      }: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
      },
    ) {
      await xcm.killGcodeGenerate();
      await xcm.activeGcodeGenerate();
      const mode =
        this.dataSource?.currentDeviceData.mode || PROCESSING_MODE.LASER_PLANE;
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
          type: 'info',
          contentI18nKey: 'device.process.element_out_zoom',
        });
        return;
      }
      const { power, speed } = this.mapPower(this.walkBorderParams);
      if (mode === PROCESSING_MODE.LASER_EXTENDER) {
        // buildData.params.origin.x = minX;
        this.dataParser.source.params.start.x = minX;
      }
      this.dataParser.resetBounds([minX, minY, maxX, maxY]);

      await this.dataParser.createBorderElements(
        source,
        {
          power,
          speed,
        },
        [minX, minY, maxX, maxY],
      );
      this.genProcessElements();
      this.generalGcodeHeadAndTail();
      await this.dataParser.setup(undefined, 'border.json');
      const gcodeResult = await xcm?.genGCode({
        inputDir: this.taskManager.tempTask.originalData,
        manifestName: 'border.json',
        outputFile: this.taskManager.tempTask.border,
      });
      const gcode = await fileHelper?.readGcode(
        this.taskManager.tempTask.border,
      );
      // console.log('newGcode========', gcode);
      return this.replaceWalkBorder(gcode);
    }

    // 获取当前的Z轴坐标
    async getZCoord() {
      const result = await this.apis.focusControl({
        data: {
          action: 'coord',
        },
      });
      return result.value || 0;
    }

    // 检查是否已经完成回原点操作
    async checkIsHomed() {
      const result = await this.apis.focusControl({
        data: {
          action: 'has_homed',
        },
      });
      return !!result.state;
    }

    // 执行自动对焦到z轴指定位置
    @deviceChecker.moveZAxis()
    goToZCoord() {
      this.emit(SYSTEM_EVENT.UPDATE_AUTO_FOCUS_REMAIN_MODAL_VISIBLE, false);
      this.apis.focusControl({
        data: {
          action: 'goTo',
          autoHome: 1,
          z: this.zCoord,
          stopFirst: 1,
          F: 300,
        },
      });
      return;
    }

    @deviceChecker.moveZAxis()
    async autoFocus(zCoord: number) {
      const isHomed = await this.checkIsHomed();
      this.zCoord = zCoord;
      if (!isHomed) {
        this.emit(SYSTEM_EVENT.UPDATE_AUTO_FOCUS_REMAIN_MODAL_VISIBLE, true);
        return;
      }
      this.goToZCoord();
      return;
    }

    // 走边框功率映射，F1 走边框实际功率百分比range是 4% ～ 10%
    mapPower(data: any) {
      const { power } = data;
      const temp = {
        ...data,
        power: power * 0.6 + 4,
      };
      return temp;
    }

    preHeat() {
      this.apis?.setConfigs({
        data: {
          alias: 'config',
          type: 'user',
          kv: {
            needPreheat: this.elementUseRedLight,
          },
        },
      });
    }

    async buildProcessGcode(...args: any) {
      const processGcodeResult = await super.buildProcessGcode(args);
      this.elementUseRedLight = false;
      this.dataParser.source.elements.forEach((elementItem: any) => {
        if (elementItem.processingLightSource === 'red') {
          this.elementUseRedLight = true;
        }
      });
      this.preHeat();
      if (this.elementUseRedLight) {
        this.apis?.focusControl({
          data: {
            action: 'light_source',
            switch: 'red',
            power: 0,
          },
        });
      }
      // 生成走边框gcode
      this.dataParser.isWalkBorder = true;
      await this.beforeGenWalkBorderGcode();
      await xcm?.genGCode({
        inputDir: this.taskManager.tempTask.originalData,
        manifestName: 'border.json',
        outputFile: this.taskManager.tempTask.border,
      });
      this.dataParser.isWalkBorder = false;
      const walkBorderGcode = await fileHelper?.readGcode(
        this.taskManager.tempTask.border,
      );
      this.updateWalkBorderGcode(walkBorderGcode);
      return processGcodeResult;
    }

    // 获取生成走边框gcode的参数，包括功率，速度，模式，元素信息等
    async beforeGenWalkBorderGcode() {
      const { mode, power, speed } = this.mapPower(this.walkBorderParams);
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
      if (mode === WalkBorder.OUTLINE) {
        source =
          (await this.dataSource?.canvasManager.extractContours(
            activeElementIds,
          )) ||
          makeFramePath({
            x: brLeft,
            y: brTop,
            width: brWidth,
            height: brHeight,
          });
      }
      await this.dataParser.createBorderElements(source, {
        power,
        mode,
        speed,
      });
      this.genProcessParams();
      this.genProcessElements();
      this.generalGcodeHeadAndTail();
      await this.dataParser.setup(undefined, 'border.json');
    }

    queryProcessingRightSideBarCom(status: PROCESSING_EVENT) {
      const { rightSideBar = {} } = this.config.process;
      return rightSideBar[status];
    }

    // 更新设备设置 -- 需要做状态检测
    @deviceChecker.isProcessing()
    async setConfigsWithChecker(data: { data: any; key?: string }) {
      console.log('setConfigsWithChecker');
      await this.apis.setConfigs(data);
    }

    // 配置各种延时参数
    @deviceChecker.isProcessing()
    async motionDelayTimeUpdate(data: Record<string, any>) {
      await this.apis.motionDelayTime({
        data: data,
      });
      const delayTimeConfig = await this.apis.motionDelayTime({
        data: {
          action: 'infoGet',
          data: [
            {
              type: 'red',
              params: delayTimeKeys,
            },
            {
              type: 'blue',
              params: delayTimeKeys,
            },
          ],
        },
      });
      const delayTimeData = {
        red: { ...find(delayTimeConfig, { type: 'red' })?.para },
        blue: { ...find(delayTimeConfig, { type: 'blue' })?.para },
      };
      return delayTimeData;
    }

    // 走边框过程中更新扩幅配件刀条板移动速度
    async updatePlatformSpeed(value: number) {
      const { num: selectedNum } = this.appContext.canvasSelectedData;
      if (!selectedNum) {
        return;
      }
      return this.apis.replaceWalkBorder({
        params: {
          uMoveSpeed: value * 60,
        },
      });
    }

    // 因更新选择元素内容而生成新的走边框gcode
    async updateWalkBorderGcodeBySelected(
      walkBorderMode: WalkBorder,
      vaildElementIds: string[],
    ) {
      let source = '';
      const { minX, minY, maxX, maxY } =
        await this.calculateWalkBorderBoundary(vaildElementIds);
      if (walkBorderMode === WalkBorder.OUTLINE) {
        source =
          (await this.dataSource?.canvasManager.extractContours(
            vaildElementIds,
          )) ||
          makeFramePath({
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          });
      } else {
        source = makeFramePath({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
      }
      return {
        source,
        minX,
        minY,
        maxX,
        maxY,
      };
    }

    // 因更新走边框配置生成新的走边框gcode
    async updateWalkBorderGcodeByParams(
      newParams: { power: number; speed: number; mode?: WalkBorder },
      // selectedData: Record<string, string | number>[],
      // elementsData: Record<string, string | number>[],
      vaildElementIds: string[],
    ) {
      const { mode = WalkBorder.RECT } = newParams;
      let source = '';
      // const { vaildElementIds, minX, minY, maxX, maxY } =
      //   await this.calculateVaildBorderElements(selectedData, elementsData);
      const { minX, minY, maxX, maxY } =
        await this.calculateWalkBorderBoundary(vaildElementIds);
      if (mode === WalkBorder.OUTLINE) {
        source =
          (await this.dataSource?.canvasManager.extractContours(
            vaildElementIds,
          )) ||
          makeFramePath({
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          });
      } else {
        source = makeFramePath({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
        });
      }
      return {
        source,
        minX,
        minY,
        maxX,
        maxY,
      };
    }

    // 计算有效的走边框元素
    async calculateVaildBorderElements(
      selectedData: Record<string, string | number>[],
      elementsData: Record<string, string | number>[],
    ) {
      const vaildElementIds: string[] = [];
      selectedData.forEach((selectedItem: any) => {
        const data = elementsData[selectedItem.id];
        if (!data || !data.processIgnore) {
          vaildElementIds.push(selectedItem.id);
        }
      });
      return {
        vaildElementIds,
      };
    }

    // 计算有效走边框元素的边界
    async calculateWalkBorderBoundary(elementIds: string[]) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      const elementsData =
        await this.dataSource?.canvasManager.canvas.getCanvasData({
          imageData: false,
          path: false,
          ids: elementIds,
          clearSelected: false,
        });
      elementsData.forEach((data: any) => {
        const { x, y, width, height } = data;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      });
      return {
        minX,
        minY,
        maxX,
        maxY,
      };
    }

    async walkBorderInRealTime(data: any) {
      const { currentStatus } = this.deviceInfo;
      const { mode = PROCESSING_MODE.LASER_PLANE } =
        this.dataSource?.currentDeviceData;
      // (加工模式为圆柱 or 不处于走边框和连接中) 这两种状况不进行实时走边框
      if (
        !(
          includes(
            [PROCESSING_EVENT.FRAME_READY, PROCESSING_EVENT.FRAME_WORKING],
            currentStatus,
          ) && this.connected
        ) ||
        mode === PROCESSING_MODE.LASER_CYLINDER
      ) {
        logger.log('no framing');
        return;
      }
      const { isUpdateWalkBorderParams = false } = data;
      const { canvasId, data: dataSourceData } = this.dataSource as DataSource;
      const elementsData = dataSourceData[canvasId].displays;
      if (isUpdateWalkBorderParams) {
        const { num: selectedNum, data: selectedData } =
          this.appContext.canvasSelectedData;
        const { power, mode, speed } = this.mapPower(data);
        if (selectedNum) {
          const { vaildElementIds } = await this.calculateVaildBorderElements(
            selectedData,
            elementsData,
          );
          // 若没有符合需要更新gcode的元素，后续的操作无需再继续了
          if (!vaildElementIds.length) {
            return;
          }
          const { source, minX, minY, maxX, maxY } =
            await this.updateWalkBorderGcodeByParams(
              {
                power,
                speed,
                mode,
              },
              vaildElementIds,
            );
          return this.reGeneralWalkBorderGcode(source, {
            minX,
            minY,
            maxX,
            maxY,
          });
        }
      } else {
        const { selectedLength, selectedJSON } = data;
        // const {
        //   walkBorderParams: { mode },
        // } = this.deviceInfo;
        const { mode = WalkBorder.RECT } = this.walkBorderParams;
        if (selectedLength) {
          const { vaildElementIds } = await this.calculateVaildBorderElements(
            selectedJSON,
            elementsData,
          );
          if (!vaildElementIds.length) {
            return;
          }
          const { source, minX, minY, maxX, maxY } =
            await this.updateWalkBorderGcodeBySelected(mode, vaildElementIds);
          return this.reGeneralWalkBorderGcode(source, {
            minX,
            minY,
            maxX,
            maxY,
          });
        }
      }
    }

    /**
     * 生成gcode的头部分
     * @param data
     * @returns
     */
    generalGcodeHeadAndTail() {
      const isWalkBorder = this.dataParser.isWalkBorder;
      const { processMode, uMultiple } = this.dataParser.source.params;
      const compiledHead = template(templates.gCodeHead);
      const compiledTail = template(templates.gCodeTail);
      const useUAxis = includes(
        [PROCESSING_MODE.LASER_CYLINDER, PROCESSING_MODE.LASER_EXTENDER],
        processMode,
      );
      const gcodeHead = compiledHead({
        isWalkBorder,
        laserOffJumpSpeed:
          (this.deviceInfo?.delayTimeData?.blue?.laserOffJumpSpeed || 3000) *
          60,
        isExpand: processMode === PROCESSING_MODE.LASER_EXTENDER,
        useUAxis,
        uMultipleCommand: useUAxis ? `M535U${uMultiple}` : null,
        startU: (this.dataParser.boundingRect as ObjectBoundingRect).left,
      });
      const gcodeTail = compiledTail({
        useUAxis,
        reset: includes([PROCESSING_MODE.LASER_CYLINDER], processMode),
      });
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
      return;
    }

    genProcessParams() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      transformProcessParams(
        {
          deviceData,
          processingArea,
          config: this.config.process,
        },
        this.dataParser,
      );
    }

    genProcessElements() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      return transformElements(
        {
          config: this.config.process,
          processingArea,
        },
        this.dataParser,
      );
    }

    async beforeGenGcode() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      const { workingType } = transformElements(
        {
          config: this.config.process,
          processingArea,
        },
        this.dataParser,
      );
      this.#workingType = workingType;
      this.generalGcodeHeadAndTail();
      await super.beforeGenGcode();
    }

    beforeRepeat() {
      this.preHeat();
    }

    // 矫正加工时间
    async correctionProcessingTime() {
      const res = await this.apis.processing();
      return res;
    }

    // check固件版本
    @deviceChecker.downloadFirmware()
    async downloadFirmware(data: DownloadFirmwareParam) {
      return super.downloadFirmware(data);
    }

    // 检测设备是否在空闲状态
    @deviceChecker.isIdle()
    checkDeviceIdle() {
      return true;
    }

    dispose() {
      super.dispose();
    }

    async estimatedTime() {
      const id = EstimatedTime[this.id];
      const time = await super.calCulateEstimatedTime(id, this.#workingType);
      return time;
    }
  }

  return F1Ext;
}
