import { COMMON_VIEW_EVENT, logger, postMessageToMain } from '@xtool/link';
import type { ObjectBoundingRect } from '@xtool/xcs-logic';
import {
  CanvasItemType,
  CanvasMapItemType,
  CheckUpdateResult,
  Constructor,
  DEVICE_PROCESSING_MODE,
  DEVICE_TYPE,
  DataSource,
  DeviceExtContainer,
  MessageType,
  PROCESSING_EVENT,
  PROCESSING_MODE,
  ProcessingUploadData,
  QUERY_PROCESSING_PROGRESS_TYPE,
  SYSTEM_EVENT,
  compareVersion,
  delay,
  image2ImageData,
  parseParams,
  request,
  requestCancelable,
} from '@xtool/xcs-logic';
import { filter, includes, isFunction, template } from 'lodash-es';
import { M1CentralAxisPlugin } from './canvas-plugins/centralAxis';
import { DEFAULT_D_PATH } from './canvas-plugins/centralAxisIcon';
import { DRAG_D_PATH } from './canvas-plugins/dragCentralAxisIcon';
import config from './config';
import templates from './config/gcode-template';
import { getProcessingSteps } from './config/processingStep';
import {
  CUT_PRINT_MAX_SIZE,
  IMG_CORRECT_HEIGHT,
  IMG_CORRECT_WIDTH,
  KNIFE_AREA_OFFSET,
  LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
  MAX_GCODE_SIZE,
  MAX_THICKNESS_UP_FLOOR,
  MODE_DEFALUT_KA_MSG,
  PHOTO_SIZE,
  WORK_TYPE,
} from './constant';
import gcodeTemplate from './gcode';
import {
  ELEMENT_TYPE,
  ExtEvents,
  IMAGE_TYPE,
  PROCESSING_COMMAND,
  SOCKET_CMD,
  THICK_PARAMS,
  statusMap,
} from './types';
import uiComponents, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';

import uiAppComponents from './ui-app';
import { calThickness } from './util';
import { cameraBaseUtils, cameraNativeUtils, cameraWasmUtils } from './utils';

import { deviceChecker } from './check';
import {
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';

// import { deviceChecker } from './check';

// 拍照取消
// 1.在弱网环境下，
// 2.如果多次点击wifi列表连接
// 3.takePictureCancelable作为class M1Ext私有属性，
// 结果：多次重新加载，会导致takePictureCancelable失效
// 所以 takePictureCancelable 放在外部
let takePictureCancelable: any;

export interface M1Ext extends DeviceExtContainer {
  emitErrorByCmd: (cmd: string) => void;
}

const isZero = (str: string) => {
  return Number(str) === 0;
};

export interface M1Ext extends DeviceExtContainer {
  canvasImgData: { width: number; height: number; url: string };
  automaticMeasurement: () => { measure: number; y: number };
  takePicture: (opts?: any) => Promise<boolean | HTMLImageElement>;
  uploadBacklashGcode: (param1: any, param2: any) => void;
  uploadCutPressGcode: (param1: any, param2: any) => void;
  uploadCameraCorrectGcode: (param1: any, param2: any) => void;
  cameraCalibrate: () => Promise<string>;
  setCalibrationData: () => Promise<boolean>;
  startMeasurement: () => Promise<any>;
  globalImg: HTMLImageElement | null;

  getAnchorParam(
    imgWidth: number,
    imgHeight: number,
  ): Promise<{ angle: number; x: number; y: number }>;
}

const refreshProgressKey = 'device.status.taking_picture';

export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class M1Ext extends Base {
    ignoreStatusInProcessing = ['Wx05', 'Wx04'];
    /**
     * 摄像头工具
     */
    #cameraUtil!: cameraBaseUtils | null;

    // 加工类型配置
    processingTypes = processingTypes;
    #isReadyToProcess = false;
    hasCancelProcess = false;
    globalImg: HTMLImageElement | null = null;
    // 拍照状态
    #isCapturing = false;
    // 取消上传
    #cancelable: any = null;
    // 走边框gcode
    #walkBorderGcode = '';
    // 画布位图数据，用于打印刀切
    canvasImgData = { width: 0, height: 0, url: '' };
    supportProcessingProgress = true;

    // 是否正在刷新背景
    isrefreshingBg = false;

    /**
     * Creates an instance of DeviceExt.
     * @date 05/11/2022
     * @param {...any[]} args
     */
    constructor(...args: any[]) {
      super(config, ...args);
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

    get cameraUtil() {
      if (!this.#cameraUtil) {
        if (window.MeApi?.wasmKit) {
          this.#cameraUtil = new cameraNativeUtils();
        } else {
          this.#cameraUtil = new cameraWasmUtils();
        }
      }

      return this.#cameraUtil;
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

    get updateQueryProcessingProcessType() {
      return QUERY_PROCESSING_PROGRESS_TYPE.ACTIVE_QUERY;
    }

    get subType() {
      return DEVICE_TYPE.DEVICE_ONE;
    }

    getProcessingSteps(mode: DEVICE_PROCESSING_MODE, info: any): any {
      return getProcessingSteps(this, mode, info);
    }

    uploadGCodeAbortController: AbortController | null = null;
    measureAbortController = new AbortController();

    emitErrorByCmd(cmd: string) {
      if (!this.exceptionsKeys.includes(cmd)) {
        return;
      }
      this.uploadGCodeAbortController?.abort(cmd);
      this.measureAbortController?.abort();
      this.emit(ExtEvents.Error, {
        ...this.getExceptionsByKey(cmd),
        msg: `device.s1.error.${cmd.toLowerCase().split(' ').join('_')}`,
      });
    }

    async queryProcessPercent() {
      const percent = await this.apis.queryProcessPercent();
      return percent;
    }

    // 加工中最小化时查询加工进度
    async continuedQueryProcessPercent() {
      try {
        let lastPercent = 0;
        const percent = await this.queryProcessPercent();
        this.updateDeviceInfo({
          processingPercent: Math.max(lastPercent, percent),
        });
        lastPercent = percent;
        if (this.deviceInfo.currentStatus !== PROCESSING_EVENT.START_PROCESS) {
          return false;
        }
        await delay(2000);
        await this.continuedQueryProcessPercent();
      } catch (error) {
        // 处理接口异常
        logger.info(['M1查询进度接口异常'], error);
      }
    }

    // 自动测量
    @deviceChecker.automaticMeasurement()
    async automaticMeasurement() {
      try {
        const { measure, y } = await this.apis.measureThick({
          params: { focus: `0,0,0,0` },
        });
        logger.log({ measure, y });
        if (Number.isNaN(measure)) {
          throw new Error('error');
        }
        return { measure, y };
      } catch (error) {
        return Promise.reject(error);
      }
    }

    startMeasurement(action = 'focalLengthMeasure') {
      return new Promise((resolve, reject) => {
        this.removeAllListeners('errorMeasure');
        this.removeAllListeners('finishMeasure');
        this.emit('startMeasure', action);
        this.once('finishMeasure', resolve);
        this.once('errorMeasure', reject);
      });
    }

    // 获取校准参数
    correct(formValues: CanvasMapItemType) {
      const res = calThickness(formValues);
      return res[THICK_PARAMS.CORRECT];
    }

    @deviceChecker.takePicture()
    async takePicture(opts?: any): Promise<boolean | HTMLImageElement> {
      return this.#takePicture(opts);
    }

    // 拍照
    async #takePicture(opts?: any): Promise<boolean | HTMLImageElement> {
      /**
       * ipad特殊处理
       * 临时解决方案*/
      // if ((window as any).VITE_PAD) {
      //   // ipad判断，默认不在编辑器页面
      //   const isOnEditorPage = isFunction(this.appContext.isOnEditorPage)
      //     ? this.appContext.isOnEditorPage()
      //     : false;
      //   if (!isOnEditorPage) {
      //     return Promise.reject(undefined);
      //   }
      // }
      if (this.#isCapturing) {
        return Promise.reject(undefined);
      }
      try {
        const { needCorrect = true } = opts || {};
        this.#isCapturing = true;
        await this.apis.turnLight();
        // 先取消上一次图片下载
        this.cancelTakePicture();
        const { signal, cancel } = requestCancelable();
        takePictureCancelable = cancel;
        // 获取照片
        const blob = await this.apis
          .captureImage({
            // TODO 无法向 preload 传递附带上下文的数据
            // signal: signal,
            onDownloadProgress: (evt: any) => {
              const percent = Math.floor((evt.loaded / evt.total) * 100);
              logger.log({ percent });
              this.appContext.showMessage({
                type: 'info',
                key: refreshProgressKey,
                contentI18nKey: refreshProgressKey,
                args: { percent },
                options: {
                  duration: 0,
                },
              });
            },
          })
          .finally(() => {
            this.appContext.destroyMessage(refreshProgressKey, true);
          });

        const points = await this.apis.getCalibrationData();
        await this.cameraUtil.saveOriginSource(points, blob);
        // 是否需要校准
        if (!needCorrect) {
          return true;
        }
        this.appContext.showMessage({
          key: 'device.status.editor_page',
          contentI18nKey: 'device.status.take_picture_success',
          type: 'success',
          options: {
            uniqueId: 'takePictureSuccessM1',
            icon: 'success',
          },
        });
        let currentDeviceData = this.dataSource?.currentDeviceData;
        if (!currentDeviceData) {
          currentDeviceData = {
            mode: PROCESSING_MODE.LASER_PLANE,
            display: [],
            data: {
              [PROCESSING_MODE.LASER_PLANE]:
                this.deviceDataValues[PROCESSING_MODE.LASER_PLANE],
            },
          };
        }
        const correct = this.correct(currentDeviceData);
        return this.correctPicture(correct as number);
      } catch (error: any) {
        logger.log(error);
        if (error.code === 'ERR_CANCELED') {
          return Promise.reject(false);
        }
        this.appContext.showMessage({
          key: 'device.status.editor_page',
          type: 'error',
          options: {
            keepAliveOnHover: true,
            duration: 5000,
          },
          render: {
            textI18nKey: 'device.status.take_picture_fail',
            link: {
              labelI18nKey: 'canvas.message.learn_more',
              href: this.config.supportUrls.pictureFaq,
            },
          },
        });
        return Promise.reject(false);
      } finally {
        this.#isCapturing = false;
      }
    }

    // 图片校准
    async correctPicture(thickness: number): Promise<HTMLImageElement> {
      const img = await this.cameraUtil.correctedImageNew(thickness);
      this.globalImg = img;
      return img;
    }

    // 固件下载
    @deviceChecker.downloadFirmware()
    async downloadFirmware(params: any) {
      const shellData = await request({
        url: params.url[1],
        timeout: 0,
        params: { t: +new Date() },
      });
      const firmwareData = await super.downloadFirmware(params);
      return { shellData, firmwareData };
    }

    // 固件更新
    async updateFirmware(params: any) {
      const { data, onUploadProgress = () => {} } = params;
      const { shellData, firmwareData } = data;
      const { sub_version, version } = this.info.versionObj;
      try {
        await this.apis.updateFirmwareHandshake({
          params: {
            machine_type: this.config.productID,
            sub_version: sub_version,
            version: JSON.stringify(version),
          },
        });
        onUploadProgress({ loaded: 10, total: 100 });

        await this.apis.uploadFirmwareScript({ data: shellData });
        onUploadProgress({ loaded: 20, total: 100 });

        await this.apis.uploadFirmwarePackage({
          data: firmwareData,
          onUploadProgress: (ev: any) => {
            const percent = Math.floor((ev.loaded / ev.total) * 30);
            onUploadProgress({ loaded: 20 + percent, total: 100 });
          },
        });

        await this.apis.uploadFirmwareBurn();
        onUploadProgress({ loaded: 60, total: 100 });
        return true;
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // 固件升级失败，清楚标志位
    removeTag() {
      return this.apis.removeUpdateTag();
    }

    // check固件版本
    async customCheckVersion(
      deviceFirmware: CheckUpdateResult,
    ): Promise<boolean> {
      try {
        const { version, sub_version = {} } = await this.apis.version();
        const { latestVersion, subVersions = {} } = deviceFirmware;
        const isPrimaryEqual = compareVersion(latestVersion, version) >= 0;

        let isCompleteUpdated = true;
        Object.keys(sub_version).forEach((key) => {
          if (sub_version[key] !== subVersions[key]) {
            isCompleteUpdated = false;
          }
        });
        logger.log('subVersion', { sub_version, subVersions });
        logger.log('customCheckVersion result', {
          isPrimaryEqual,
          isCompleteUpdated,
        });
        if (isPrimaryEqual && isCompleteUpdated) {
          return true;
        }
        return Promise.reject(false);
      } catch (error) {
        return Promise.reject(false);
      }
    }

    // 导出日志
    exportLog() {
      return super.exportLog('xcs_m1_log.gz');
    }

    // 上传新的校准文件 point.json
    async setCalibrationData() {
      const newPoints = this.cameraUtil.getNewPoints();
      if (!newPoints) {
        logger.error('No calibration file');
        return Promise.reject(false);
      }
      const result = this.apis.setCalibrationData({ data: newPoints });
      return result ? true : Promise.reject(false);
    }

    // 反向间隙gcode
    @deviceChecker.uploadGCode()
    async uploadBacklashGcode() {
      try {
        await this.apis.setWorkMode({
          params: { type: WORK_TYPE.LASER },
        });
        await this.apis.uploadGcode({
          data: gcodeTemplate.backlashGcode,
          params: { zip: false },
        });
        this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
        return true;
      } catch (error) {
        return Promise.reject(false);
      }
    }

    // 刀压校准gcode
    @deviceChecker.uploadGCode()
    async uploadCutPressGcode() {
      try {
        await this.apis.setWorkMode({
          params: { type: WORK_TYPE.KNIFE },
        });
        await this.apis.uploadGcode({
          data: gcodeTemplate.cutPressGcode,
          params: { zip: false },
        });
        this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
        return true;
      } catch (error) {
        return Promise.reject(false);
      }
    }

    // 摄像头校准gcode
    @deviceChecker.uploadGCode()
    async uploadCameraCorrectGcode() {
      try {
        const { power, speed } =
          this.config.cameraCorrectPowerConfig[this.info.power || 0];
        const gcode = gcodeTemplate.cameraCorrectGcode({ power, speed });
        await this.apis.setWorkMode({
          params: { type: WORK_TYPE.LASER },
        });
        await this.apis.uploadGcode({
          data: gcode,
          params: { zip: false },
        });
        this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
        return true;
      } catch (error) {
        return Promise.reject(false);
      }
    }

    // 摄像头校准
    async cameraCalibrate() {
      try {
        await this.#takePicture({ needCorrect: false });
        return this.cameraUtil.cameraCalibrate();
      } catch (error) {
        return Promise.reject('error');
      }
    }

    // 旧设备兼容接口
    setConfigs(data: any) {
      const handle = {
        setFillLight: (payload: { fillLightBrightness: number }) => {
          this.apis.setFillLight({
            params: { brightness: payload.fillLightBrightness },
          });
        },
        setPurifierTimeout: (payload: { purifierTimeout: number }) => {
          this.apis.setPurifierContinue({
            params: { timeout: payload.purifierTimeout },
          });
        },
        setOfflineModeEnable: (payload: any) => {
          const parse = (flag: boolean) => (flag ? '1' : '0');
          const { redVectorCutting, blackBitmapEngraving, blackVectorCutting } =
            payload;
          const value = `0${parse(redVectorCutting)}${parse(
            blackBitmapEngraving,
          )}${parse(blackVectorCutting)}`;
          this.apis.setLaserParameters({
            params: { mode: value },
          });
        },
      };
      if (data.key && isFunction(handle[data.key])) {
        handle[data.key](data.data.kv);
      }
    }

    async checkProcessData({
      canvasData,
      centralAxisPosition,
      isWalkBorder = false,
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
      const mode = dataSource.currentDeviceData.mode;
      if (mode === PROCESSING_MODE.KNIFE_CUT) {
        canvasData = filter(
          canvasData,
          (item) => item.type !== IMAGE_TYPE.BITMAP,
        );
        if (!canvasData.length) {
          return {
            type: MessageType.text,
            text: 'device.process.no_vector_elements',
          };
        }
      }
      const checkResult = await super.checkProcessData({
        canvasData: canvasData,
        centralAxisPosition,
        isWalkBorder,
        dataSource,
        isExportGcode,
        layerOrder,
      });
      // 平面模式下自定义材料的厚度大于最大厚度需要拦截
      const { thickness, cushion } = dataSource.currentDeviceModeData;
      if (
        mode === PROCESSING_MODE.LASER_PLANE &&
        thickness > MAX_THICKNESS_UP_FLOOR - (cushion || 0)
      ) {
        return {
          type: MessageType.text,
          text: 'device.measure_guide.materials_over_max_thick',
        };
      }
      // 打印刀切需要存储位图数据

      // 打印刀切需要存储位图数据
      if (mode === PROCESSING_MODE.PRINTER_KNIFE_CUT) {
        const { width: bitmapWidth, height: bitmapHeight } =
          this.dataParser.boundingRect;
        const { width: maxWidth, height: maxHeight } = CUT_PRINT_MAX_SIZE;
        // 判断超出限制
        if (
          Number(bitmapWidth.toFixed(1)) > maxWidth ||
          Number(bitmapHeight.toFixed(1)) > maxHeight
        ) {
          return {
            type: MessageType.text,
            text: 'device.process.cut_print_max_size_tip',
          };
        }
        // TODO: 这里为什么需要有url的存在
        const canvas = this.dataSource?.canvasManager.canvas;
        const { width, height, url } = await canvas.getDisplayLayerShot({
          include: 'BITMAP',
        });
        this.canvasImgData = { url, width, height };
      }
      return checkResult;
    }

    manualPicture() {
      if (!(window as any).VITE_PHONE) {
        return this.appContext.showMessage({
          type: 'info',
          options: {
            duration: 5000,
            keepAliveOnHover: !(window as any).VITE_PAD,
            uniqueId: 'manualPictureM1',
          },
          render: {
            textI18nKey: 'device.status.manual_picture',
            link: {
              labelI18nKey: 'device.status.immediately_refresh',
              onClick: async () => {
                try {
                  const img = await this.#takePicture();
                  this.appContext.updateBackImg(img, true, this.instanceId);
                } catch (e) {
                  console.log('cmd=> ==>take pic error ', e);
                }
              },
            },
          },
        });
      }
      return this.appContext.showMessage({
        contentI18nKey: 'device.status.manual_picture',
        options: {
          duration: 5000,
          keepAliveOnHover: !(window as any).VITE_PAD,
          scene: 2,
          bckWhiteColor: true,
          uniqueId: 'manualPictureM1',
          icon: 'photo-refresh',
          btnLabel: 'device.status.immediately_refresh',
          customCb: async () => {
            try {
              const img = await this.#takePicture();
              this.appContext.updateBackImg(img, true, this.instanceId);
            } catch (e) {
              console.log('cmd=> ==>take pic error ', e);
            }
          },
        },
      });
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
      try {
        this.isFirstConnectFourGroup();
        await this.apis.sleepWakeUp();
        const status = await this.apis.getStatus();
        this.deviceCmdParsing(status);
        if (status === SOCKET_CMD.FREE_TO_WORK) {
          this.apis.lockedLeaserHead();
          this.apis.resetLeaserHead();
          this.appContext.resetProcessingState();
        }
        const percent = await this.queryProcessPercent();
        this.updateDeviceInfo({ processingPercent: percent });
      } catch (error) {
        logger.log('M1连接生命周期出错', error);
      }
      super.onConnected();
    }

    async refreshBg() {
      if (this.isrefreshingBg) {
        return;
      }
      try {
        this.isrefreshingBg = true;
        const img = await this.#takePicture();
        this.appContext.updateBackImg(img, true, this.instanceId);
      } catch (error) {
        console.log('刷新失败', error);
      } finally {
        this.isrefreshingBg = false;
      }
    }

    // 监听socket信息
    deviceCmdParsing(cmd: string) {
      const { BEFORE_START, CANCEL_PROCESS, FINISH_PROCESS, START_PROCESS } =
        PROCESSING_EVENT;
      const { WORK_FINISHED, WORK_STOPED } = PROCESSING_COMMAND;
      logger.log('cmd=>', cmd);
      let status = statusMap[cmd];
      const isWalkBorder = this.dataParser?.isWalkBorder || false;
      if (this.#isReadyToProcess && cmd === SOCKET_CMD.OPEN_COVER) {
        status = CANCEL_PROCESS;
      }
      if (status === BEFORE_START) {
        this.#isReadyToProcess = true;
        this.hasCancelProcess = false;
      }
      if (status === CANCEL_PROCESS) {
        this.hasCancelProcess = true;
      }
      if (status === FINISH_PROCESS && this.hasCancelProcess) {
        if (isWalkBorder) {
          this.stopWalkBorder();
          this.changeWalkBorderModal(false);
          return;
        }
        status = CANCEL_PROCESS;
      }
      if (status === START_PROCESS) {
        this.#isReadyToProcess = false;
        this.continuedQueryProcessPercent();
      }
      if (status) {
        this.deviceInfo = {
          currentStatus:
            cmd === WORK_FINISHED && this.hasCancelProcess
              ? WORK_STOPED
              : status,
        };
      }

      // M1 开光盖，是否手动拍照
      if (cmd === SOCKET_CMD.CLOSE_COVER) {
        if (this.instanceId === this.appContext.instanceId) {
          if (this.info.isAutoRefresh) {
            this.#takePicture().then((img) => {
              this.appContext.updateBackImg(img, true, this.instanceId);
            });
          } else {
            this.manualPicture();
          }
        }
      }

      // 重复执行走边框
      if (isWalkBorder && cmd === PROCESSING_COMMAND.WORK_FINISHED) {
        this.#startWalkBorder(this.#walkBorderGcode);
      }

      // 报警弹框
      const errorObj = config.deviceExceptions && config.deviceExceptions[cmd];
      if (errorObj) {
        logger.log('===设备报错===', errorObj.code);
        this.emit(ExtEvents.Error, errorObj);
      }
    }

    getProcessingData(canvasId: string) {
      return this.projectData?.data.get(canvasId);
    }

    // 获取打印刀切中左上角十字基于照片的偏移及旋转角度
    async getAnchorParam(
      imgWidth: number,
      imgHeight: number,
    ): Promise<{ angle: number; x: number; y: number }> {
      const img = this.globalImg
        ? this.globalImg
        : ((await this.#takePicture()) as HTMLImageElement);
      if (!img) {
        return Promise.reject('img undefined');
      }
      const pngData = image2ImageData(img);
      const imagePath = 'task/current-bg.png';
      const dataPath = 'task/ajust-data.json';
      await this.fileHelper.writeData(imagePath, pngData.data, {
        width: img.width,
        height: img.height,
      });
      const result = await window?.xcm?.printCutJson({
        inputDir: imagePath,
        outputFile: dataPath,
      });
      const offsetData = JSON.parse(result.outputJson);
      // const offsetData = await this.fileHelper.readProcessParam(dataPath);
      const { angle, cx, cy } = offsetData;
      if ((isZero(angle) && isZero(cx) && isZero(cy)) || cx < 0) {
        return Promise.reject(false);
      }
      const xRation = PHOTO_SIZE.width / IMG_CORRECT_WIDTH;
      const yRation = PHOTO_SIZE.height / IMG_CORRECT_HEIGHT;
      return {
        angle: Number(angle),
        x: cx * xRation - imgWidth / 2 - KNIFE_AREA_OFFSET,
        y: cy * yRation - imgHeight / 2,
      };
    }

    // 终止上传gcode
    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
    }

    // 发送gcode前检测
    get uploadGcodeCheckKey() {
      return ['checkSize'];
    }

    async deviceChecker(list: string[]) {
      const checker = {
        checkSize: {
          func: async () => {
            // 1. 获取 gcode 文件路径
            const gcode = this.taskManager.getTask(
              this.deviceInfo.snCode,
            ).gcode;
            // 2. 检测 gcode 文件大小
            if (this.fileHelper && isFunction(this.fileHelper.getFileSize)) {
              const fileSize = await this.fileHelper.getFileSize(gcode);
              logger.log('gcode fileSize: ', fileSize);
              if (fileSize >= MAX_GCODE_SIZE) {
                return false;
              }
            }
            return true;
          },
          messageOption: {
            type: 'warning',
            options: {
              keepAliveOnHover: true,
              duration: 5000,
            },
            render: {
              textI18nKey: 'device.process.file_is_too_large',
              link: {
                labelI18nKey: 'canvas.message.learn_more',
                href: this.config.supportUrls.gcodeSizeLargeFaq,
              },
            },
          },
        },
      };
      let result = true;
      for (let i = 0; i < list.length; i++) {
        let args;
        const checkerConfig = checker[list[i]];
        if (!checkerConfig) {
          continue;
        }
        const res = await checkerConfig.func.bind(this)(args);
        if (!res) {
          result = false;
          if (checkerConfig.messageOption) {
            this.appContext.showMessage(checkerConfig.messageOption);
            break;
          }
        }
      }
      return result;
    }

    // 显示常驻提示条
    setKeepAliveMsg(keepAlive: any) {
      this.emit(SYSTEM_EVENT.SET_KEEP_ALIVE_MESSAGE, keepAlive);
    }

    // 上传gcode
    @deviceChecker.uploadGCode()
    async uploadGCode(params?: ProcessingUploadData): Promise<boolean> {
      const { onProgress, isFullPath = false } = params || {};
      const gcode = isFullPath
        ? params?.gcode
        : this.taskManager.getTask(this.deviceInfo.snCode).gcode;

      const { KNIFE_CUT, PRINTER_KNIFE_CUT } = DEVICE_PROCESSING_MODE;
      const mode = this.dataParser.source.params.processMode;
      const type = [KNIFE_CUT, PRINTER_KNIFE_CUT].includes(mode)
        ? WORK_TYPE.KNIFE
        : WORK_TYPE.LASER;

      // 设置加工模式，控制是否开启排风扇
      await this.apis.setWorkMode({
        params: {
          type,
        },
      });
      if (this.uploadGcodeHelper) {
        try {
          const {
            baseUrl,
            url,
            params: urlParams = {},
          } = await this.apis.uploadGcode({ method: 'info' });
          const uploadGcodeUrl = `${baseUrl}${url}${parseParams(urlParams)}`;
          const result = await super.uploadByBuilder({
            url: uploadGcodeUrl,
            path: gcode as string,
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
          if (result.result === 'ok') {
            await this.apis.cleanProcessingProgressCache();
            // 多请求一下，用于清理缓存
            await this.queryProcessPercent();
            this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
            return true;
          }
          return Promise.reject(false);
        } catch (err) {
          logger.log('uploadGcode by builder error', err);
          return Promise.reject(false);
        }
      } else {
        try {
          const { signal, cancel } = requestCancelable();
          this.#cancelable = cancel;
          await this.apis.uploadGcode({
            data: gcode,
            signal,
            params: { zip: false },
            onUploadProgress: (ev: any) => {
              const complete = ev.loaded / ev.total;
              isFunction(onProgress) && onProgress(complete);
            },
          });
          await this.apis.cleanProcessingProgressCache();
          // 多请求一下，用于清理缓存
          await this.queryProcessPercent();
          this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
          return true;
        } catch (error) {
          return Promise.reject(false);
        }
      }
    }

    @deviceChecker.walkBorder()
    async startWalkBorder(gcode: string) {
      return this.#startWalkBorder(gcode);
    }

    // 走边框
    async #startWalkBorder(gcode: string) {
      try {
        logger.log('上传走边框gcode', gcode);
        await this.apis.setWorkMode({
          params: { type: 'Laser' },
        });
        await this.apis.uploadGcode({
          data: gcode,
          params: { zip: false },
        });
        this.#walkBorderGcode = gcode;
        this.hasCancelProcess = false;
        this.dataParser.isWalkBorder = true;
        this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, true);
      } catch (error) {
        this.dataParser.isWalkBorder = false;
        logger.log('startWalkBorder error', error);
        throw error;
      }
    }

    async stopWalkBorder() {
      this.#walkBorderGcode = '';
      const result = await this.apis.cancelPrint();
      await this.whenReceiveCmd(PROCESSING_EVENT.CANCEL_PROCESS);
      this.dataParser.isWalkBorder = false;
      this.changeWalkBorderModal(false);
      return result;
    }

    changeWalkBorderModal(visible: boolean) {
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, visible);
    }

    @deviceChecker.restartProcessing()
    restartProcessing() {
      logger.info('点击继续加工');
    }

    @deviceChecker.cancelProcessing()
    async cancelProcessing() {
      return this.apis.cancelPrint();
    }

    @deviceChecker.pauseProcessing()
    async pauseProcessing() {
      return this.apis.setProcessPause();
    }

    onDisconnect(): void {
      super.onDisconnect();
      this.changeWalkBorderModal(false);
    }

    // 取消下载背景图
    cancelTakePicture() {
      if (isFunction(takePictureCancelable)) {
        takePictureCancelable();
      }
    }

    dispose() {
      this.#cameraUtil?.releaseSource();
      this.#cameraUtil = null;
      this.changeWalkBorderModal(false);
      this.cancelTakePicture();
      super.dispose();
    }

    toJSON() {
      return {
        info: this.info,
      };
    }

    handleDeviceFormValueChanged(
      _: any,
      nextValues: { mode: PROCESSING_MODE },
    ) {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        if (_.mode !== nextValues.mode) {
          this.setKeepAliveMsg(MODE_DEFALUT_KA_MSG[nextValues.mode]);
        }
        if (nextValues.mode === PROCESSING_MODE.LASER_CYLINDER) {
          let plugin = canvas.getPluginByName(
            LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
          );
          if (!plugin) {
            plugin = new M1CentralAxisPlugin(
              LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
            );
            canvas.registerPlugin(plugin);
          }
          if ((window as any).VITE_PHONE) {
            plugin.updateCentralAxis([
              {
                icon: {
                  dPath: DRAG_D_PATH,
                  fillColor: 46336,
                  lineColor: 15658734,
                },
                y: 10,
              },
            ]);
          } else {
            plugin.updateCentralAxis([
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
    }

    // 父类中调用
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

    genProcessParams(proload?: { isWalkBorder: boolean }) {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const isWalkBorder =
        proload?.isWalkBorder ?? this.dataParser.isWalkBorder;
      transformProcessParams(
        {
          deviceData,
          processingArea: { current, base },
          config: this.config.process,
        },
        this.dataParser,
        isWalkBorder,
        this.deviceInfo,
      );
    }

    // 父类中调用
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

    updateWalkBorderParams(value: { power: number; speed: number }) {
      this.walkBorderParams = {
        ...this.walkBorderParams,
        ...value,
      };
    }

    async beforeGenGcode() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      transformElements(
        {
          config: this.config.process,
          processingArea,
        },
        this.dataParser,
      );
      this.generalGcodeHeadAndTail();
      await super.beforeGenGcode();
    }
  }

  return M1Ext;
}
