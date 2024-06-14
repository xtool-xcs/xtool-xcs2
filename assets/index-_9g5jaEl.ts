import { Uploader } from '@makeblock/upload';
import {
  COMMON_VIEW_EVENT,
  appDataPath,
  fileHelper,
  logger,
  postMessageToMain,
} from '@xtool/link';
import {
  CanvasItemType,
  CheckUpdateResult,
  Constructor,
  DEVICE_CACHE_DATA,
  DEVICE_CANVAS_PLUGIN_CONFIG,
  DEVICE_PROCESSING_MODE,
  DIRECTION,
  DataSource,
  DeviceExtConfig,
  DeviceExtContainer,
  DownloadFirmwareParam,
  ELEMENT_PROCESSING_COLOR,
  ELEMENT_PROCESSING_MODE,
  EstimatedTime,
  ItemType,
  MessageType,
  PROCESSING_EVENT,
  ProcessingUploadData,
  RuleConfigTypeWrapperFunc,
  SYSTEM_EVENT,
  Storage,
  blackeningImageData,
  compareVersion,
  delay,
  // getGroupItemByKey,
  getXCSStorage,
  gtmBackgroundBright,
  gtmGetMechineFire,
  gtmGetProcess,
  parseParams,
  pieceSvg,
  requestCancelable,
} from '@xtool/xcs-logic';
import { CustomDataManager } from '@xtool/xcs-logic/src/ext-container/custom-data';
import { collision } from '@xtool/xcs-logic/src/ext-container/data-checker/ruleList';
import { AxiosProgressEvent } from 'axios';
import { format } from 'date-fns';
import { isFunction, isString, isUndefined, template } from 'lodash-es';
import templates from '../src/gcode-template';
import { P2Plugin } from './canvas-plugins';
import { P2CentralAxisPlugin } from './canvas-plugins/centralAxis';
import { DEFAULT_D_PATH } from './canvas-plugins/centralAxisIcon';
import { DRAG_D_PATH } from './canvas-plugins/dragCentralAxisIcon';
import { P2FeederPlugin } from './canvas-plugins/feeder';
import config, {
  LOCAL_PIC_SIZE,
  cameraConfig,
  defaultMaskOptions,
  maskLimitBoundsOptions,
  maskLimitBoundsOptionsV2,
  maskOptions,
  measureMaskOptions,
  measureMaskOptionsV2,
} from './config';
import { process } from './config/process';
import {
  CURVATURE,
  CURVE_ALLOW_MAX_Z,
  CURVE_BOUNDS_MIN_HEIGHT,
  CURVE_BOUNDS_MIN_WIDTH,
  CURVE_POINT_COLOR,
  DEFAULT_CURVE_DATA,
  DEFAULT_CURVE_TEMP_DATA,
  EXT_CURVE_ALLOW_MIN_Z,
  EXT_CURVE_X_MAX,
  EXT_CURVE_Y_MAX,
  EXT_IR_LED_OFFSET_X,
  EXT_IR_LED_OFFSET_Y,
  EXT_MAX_THICKNESS_DOWN_FLOOR,
  LASER_CONVEYOR_FEEDER_PLUGIN,
  LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
  LASER_CYLINDER_VIEWPORT_WIDTH,
  LASER_HEADER_DISTANCE,
  LASER_HEADER_MOVE_MAX_TIME,
  LASER_HEADER_SPEED,
  MODE_DEFALUT_KA_MSG,
  RECOMMEND_DISTANT,
  SAFE_DISTANT,
  SELECTION_PLUGIN,
  X_MAX,
  Y_MAX,
  Z_MAX,
  publicKey,
} from './constant';
import {
  CurveModelOptions,
  DensityPoint,
  EP2_MEASURE_RULES,
  EP2_TYPE,
  EXPOSURE_VALS,
  EXPOSURE_VALS_LOCAL,
  ExtEvents,
  IPositon,
  IPositon3d,
  PROCESSING_MODE,
  SOCKET_MODULE,
  statusMap,
} from './types';
import uiComponents, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';

import { CameraBaseUtils } from './utils/cameraUtils/cameraBaseUtils';
import { CameraNativeUtil } from './utils/cameraUtils/cameraNativeUtil';
import { CameraWasmUtil } from './utils/cameraUtils/cameraWasmUtil';
import { ThicknessUtil, calculateFocalLenParams } from './utils/thickness';
import {
  firmwareVersion,
  getExtType,
  getMeasureRule,
  localStoreKeyMac2SnCode,
  parseJSON,
  xyzStr2Position3d,
} from './utils/util';

import {
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';

import { deviceChecker } from './check';

import uiAppComponents from './ui-app';
// const { PASS_THROUGH } = DEVICE_PROCESSING_MODE;
const storage = Storage();

const refreshProgressKey = 'device.status.taking_picture';
// 远景图片下载请求取消
// 1.在弱网环境下，
// 2.如果多次点击wifi列表连接
// 3.globalImageCancelable作为class P2Ext私有属性，
// 结果：多次重新加载，会导致globalImageCancelable失效
// 所以 globalImageCancelable 放在外部
let globalImageCancelable: any;

export interface P2Ext extends DeviceExtContainer {
  subType: EP2_TYPE;
  firmwareVersion: number;
  maxThicknessDownFloor: number;
  lastMaskPosition: IPositon;
  takeGlobalPhoto: () => Promise<HTMLImageElement>;
  getLocalOption: () => Record<string, number>;
  getCurrentStatus: () => Promise<{ status: string; alarmArr: any }>;
  takeLocalPhoto: (isRefresh: boolean) => Promise<{
    img: HTMLImageElement;
    option: Record<string, number>;
    lastMaskPosition: IPositon;
  }>;
  isCheckDrawer: boolean;
  isFinishReset: boolean;
  isExposureIncrease: boolean;
  airPumpConfig: any;
  setKeepAliveMsg: (keepAlive: any) => void;
  resetLaserHead: () => void;
  resetCurveLaserHead: () => void;
  beforeCurveMeasure: () => void;
  moveCurveLaserPosition: (
    direction: DIRECTION,
    distance: number,
  ) => Promise<boolean>;
  curveMeasurePoint: (options: any) => Promise<IPositon3d>;
  isExtType: (type: EP2_TYPE) => boolean;
  getMaxThicknessDownFloor: (type: EP2_TYPE) => number;
  setWorkDown2Idle: () => void;
  correctCurveBounds: () => boolean;
  flammabilityCheck: () => Promise<boolean>;
  deviceDrawerCheck: () => {
    func: () => boolean;
    msg: string;
  };
}

export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class P2Ext extends Base {
    // 加工类型配置
    processingTypes = processingTypes;
    // 保存近景摄像头上一次的坐标s (canvasid, postion)，方便刷新的时候使用
    #canvasMaskPositions = new Map<string, IPositon>();
    // 近景图像数据
    #cancelable: any;
    #isCancelProcess = false;
    hasCancelProcess = false;
    customData = new CustomDataManager();
    #cameraUtil!: CameraBaseUtils | null;
    // curveMaxRow = Math.ceil(CURVE_Y_MAX / RECOMMEND_DISTANT);
    // 曲率提示和预览图颜色范围设定
    curvature = CURVATURE;
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

    #measureActions = {
      [EP2_MEASURE_RULES.RULE_ONE]: this.measureByRuleOne,
      [EP2_MEASURE_RULES.RULE_TWO]: this.measureByRuleTwo,
    };

    uploader!: Uploader;
    #uploadFlameFileIng = false;
    /**
     * Creates an instance of DeviceExt.
     * @date 05/11/2022
     * @param {...any[]} args
     */

    constructor(...args: any[]) {
      super(config, ...args);
      this.addonStatus = {
        drawerStatus: 'CLOSE',
        isCheckDrawer: this.isCheckDrawer,
      };
      this.uploader = new Uploader(getXCSStorage());
    }

    get cameraDataFileName() {
      return `${this.deviceInfo.snCode}_cameraData.gz`;
    }

    // 获取当前p2设备类型
    get subType(): EP2_TYPE {
      return getExtType(this.snCode) as EP2_TYPE;
    }

    get maxThicknessDownFloor(): number {
      return EXT_MAX_THICKNESS_DOWN_FLOOR[this.subType];
    }

    get maxCurveAllowMinZ(): number {
      return EXT_CURVE_ALLOW_MIN_Z[this.subType];
    }

    get uploadGcodeCheckKey(): string[] {
      return ['drawer', 'gapClose', 'flammability'];
    }

    get restartProcessingCheckKey(): string[] {
      return ['drawer'];
    }

    // 精确测量配置数据
    get measureMaskOptions() {
      const mode = this.dataSource?.currentDeviceData.mode;
      // p2中期改款
      const isRuleTwo =
        EP2_MEASURE_RULES.RULE_TWO === getMeasureRule(this.snCode);
      const maskOption = Object.assign(
        {},
        isRuleTwo ? measureMaskOptionsV2 : measureMaskOptions,
        (isRuleTwo
          ? maskLimitBoundsOptionsV2[mode]
          : maskLimitBoundsOptions[mode]) || {},
      );
      logger.log(maskOption);
      return maskOption;
    }

    get curveXMax() {
      return EXT_CURVE_X_MAX[getMeasureRule(this.snCode)];
    }

    get curveYMax() {
      return EXT_CURVE_Y_MAX[getMeasureRule(this.snCode)];
    }

    // 默认10mm测量一个点
    get curveMaxCol() {
      return Math.ceil(this.curveXMax / RECOMMEND_DISTANT);
    }

    // 默认10mm测量一个点
    get curveMaxRow() {
      return Math.ceil(this.curveYMax / RECOMMEND_DISTANT);
    }

    get cameraUtil() {
      if (!this.#cameraUtil) {
        if (window.MeApi?.wasmKit) {
          this.#cameraUtil = new CameraNativeUtil(this.apis);
        } else {
          this.#cameraUtil = new CameraWasmUtil(this.apis);
        }
      }
      return this.#cameraUtil;
    }

    getMaxThicknessDownFloor(type: EP2_TYPE): number {
      return EXT_MAX_THICKNESS_DOWN_FLOOR[type];
    }

    // queryProcessingRightSideBarCom(status: PROCESSING_EVENT) {
    //   const { rightSideBar = {} } = this.config.process;
    //   return rightSideBar[status];
    // }

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

    get snCode() {
      return this.deviceInfo.snCode ?? '';
    }

    get firmwareVersion() {
      return firmwareVersion(this.deviceInfo.version ?? '');
    }

    // 当前画幅 近景摄像头上一次的坐标
    get lastMaskPosition() {
      const lmp = this.#canvasMaskPositions.get(this.canvasId);
      return lmp;
    }

    get airPumpConfig() {
      const snCode = this.snCode;
      const defaultValue = { engrave: 100, cut: 100 };
      if (!snCode) {
        return defaultValue;
      }
      const dataList = storage.get(DEVICE_CACHE_DATA);
      return dataList?.[snCode]?.airPumpConfig || defaultValue;
    }

    set airPumpConfig(value: any) {
      const snCode = this.snCode;
      if (snCode) {
        const dataList = storage.get(DEVICE_CACHE_DATA, {
          [snCode]: { airPumpConfig: { engrave: 100, cut: 100 } },
        });
        dataList[snCode] = { ...dataList[snCode], airPumpConfig: value };
        storage.set(DEVICE_CACHE_DATA, dataList);
        this.deviceInfo = { airPumpConfig: value };
      }
    }

    get isCheckDrawer(): boolean {
      // 一类必须检测抽屉关闭
      if (this.isExtType(EP2_TYPE.P2_ONE)) {
        return true;
      }
      const snCode = this.snCode;
      if (!snCode) {
        return true;
      }
      const dataList = storage.get(DEVICE_CACHE_DATA);
      if (dataList?.[snCode] && !isUndefined(dataList[snCode].drawerCheck)) {
        return dataList[snCode].drawerCheck;
      }
      return true;
    }

    set isCheckDrawer(value: boolean) {
      const snCode = this.snCode;
      if (snCode) {
        const defaultValue = { [snCode]: { drawerCheck: true } };
        const dataList = storage.get(DEVICE_CACHE_DATA, defaultValue);
        dataList[snCode] = { ...dataList[snCode], drawerCheck: value };
        storage.set(DEVICE_CACHE_DATA, dataList);
        this.deviceInfo = { isCheckDrawer: value };
        this.addonStatus = {
          ...this.addonStatus,
          isCheckDrawer: value,
        };
      }
    }

    get isFinishReset(): boolean {
      const snCode = this.snCode;
      if (!snCode) {
        return true;
      }
      const dataList = storage.get(DEVICE_CACHE_DATA);
      if (dataList?.[snCode] && !isUndefined(dataList[snCode].finishReset)) {
        return dataList[snCode].finishReset;
      }
      return true;
    }

    set isFinishReset(value: boolean) {
      const snCode = this.snCode;
      if (snCode) {
        const defaultValue = { [snCode]: { finishReset: true } };
        const dataList = storage.get(DEVICE_CACHE_DATA, defaultValue);
        dataList[snCode] = { ...dataList[snCode], finishReset: value };
        storage.set(DEVICE_CACHE_DATA, dataList);
        this.deviceInfo = { isFinishReset: value };
      }
    }

    get isExposureIncrease(): boolean {
      const snCode = this.snCode;
      if (!snCode) {
        return false;
      }
      const dataList = storage.get(DEVICE_CACHE_DATA);
      if (
        dataList?.[snCode] &&
        !isUndefined(dataList[snCode].exposureIncreas)
      ) {
        return dataList[snCode].exposureIncreas;
      }
      return false;
    }

    set isExposureIncrease(value: boolean) {
      gtmBackgroundBright({ on: value });
      const snCode = this.snCode;
      if (snCode) {
        const defaultValue = { [snCode]: { exposureIncreas: false } };
        const dataList = storage.get(DEVICE_CACHE_DATA, defaultValue);
        dataList[snCode] = { ...dataList[snCode], exposureIncreas: value };
        storage.set(DEVICE_CACHE_DATA, dataList);
        this.deviceInfo = { isExposureIncrease: value };
      }
    }

    // 判断是否是传入参数对应的设备
    isExtType(type: EP2_TYPE): boolean {
      return this.subType === type;
    }

    // 获取IR_LE x轴方向上的偏移 中期改款默认从下位机读取
    irLedOffsetX(): number {
      const rule = getMeasureRule(this.snCode);
      const offsetX =
        rule === EP2_MEASURE_RULES.RULE_TWO &&
        this.deviceInfo.laserMeasureOffset
          ? xyzStr2Position3d(this.deviceInfo.laserMeasureOffset).x
          : EXT_IR_LED_OFFSET_X[rule];
      return offsetX;
    }

    // 获取IR_LE y轴方向上的偏移 中期改款默认从下位机读取
    irLedOffsetY(): number {
      const rule = getMeasureRule(this.snCode);
      const offsetY =
        rule === EP2_MEASURE_RULES.RULE_TWO &&
        this.deviceInfo.laserMeasureOffset
          ? xyzStr2Position3d(this.deviceInfo.laserMeasureOffset).y
          : EXT_IR_LED_OFFSET_Y[rule];
      return offsetY;
    }

    doUpdateFirmware(): Promise<boolean> {
      throw new Error('Method not implemented.');
    }

    @deviceChecker.uploadGCode()
    async uploadGCode(params?: ProcessingUploadData): Promise<boolean> {
      const { gcode: gcodePath, isFullPath = false, onProgress } = params || {};
      this.hasCancelProcess = false;
      console.log(['uploadGCode=>', params, onProgress]);
      const path = await this.builder.gcode();
      const filePath = gcodePath || path;

      // 区分网页上传，以及builder上传
      if (this.uploadGcodeHelper) {
        try {
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
          console.log(['uploadGcodeUrl=>', uploadGcodeUrl]);
          const result = await super.uploadByBuilder({
            url: uploadGcodeUrl,
            path: filePath as string,
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
        const { signal, cancel } = requestCancelable();
        this.#cancelable = cancel;
        return this.apis.uploadGcode({
          data: filePath as File,
          signal: signal,
          onUploadProgress: (ev: any) => {
            const complete = ev.loaded / ev.total;
            isFunction(onProgress) && onProgress(complete);
          },
        });
      }
    }

    // 取消下载远景背景图
    cancelCaptureGlobalImage() {
      if (isFunction(globalImageCancelable)) {
        globalImageCancelable();
      }
    }

    // 终止上传gcode
    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
    }

    @deviceChecker.restartProcessing()
    restartProcessing() {
      logger.info('点击继续加工');
    }

    // 暂停加工
    @deviceChecker.pauseProcessing()
    async pauseProcessing() {
      await this.apis.pausePrint();
      await this.whenReceiveCmd(PROCESSING_EVENT.PAUSE_PROCESS);
    }

    // 取消加工
    @deviceChecker.cancelProcessing()
    async cancelProcessing() {
      await this.apis.cancelPrint();
      await this.whenReceiveCmd(PROCESSING_EVENT.CANCEL_PROCESS);
    }

    async turnLocalIrLed(onOff: boolean) {
      if (onOff) {
        await this.apis.turnOnLocalIrLed();
      } else {
        await this.apis.turnOffLocalIrLed();
      }
    }

    setKeepAliveMsg(keepAlive: any) {
      this.emit(SYSTEM_EVENT.SET_KEEP_ALIVE_MESSAGE, keepAlive);
    }

    // 开灯 0：所有 1：近景  2：远景右 3: 远景左
    async turnLightAction(on: boolean, idx: number) {
      const data = { action: 'set_bri', idx: idx, value: on ? 255 : 0 };
      // 旧版固件接口 idx:3 会返回“idx invalid”（实际上是设置调用成功，固件bug）
      try {
        await this.apis.turnLight({ data });
      } catch (error) {}
    }

    // 开关近景补光灯
    async turnLocalLight(on: boolean) {
      await this.turnLightAction(on, 1);
    }

    // 开关远景灯
    async turneGlobalLight(on: boolean) {
      await Promise.all([
        this.turnLightAction(on, 2),
        this.turnLightAction(on, 3),
      ]);
    }

    @deviceChecker.takePhoto()
    async takeGlobalPhoto() {
      const img = await this.#takeGlobalPhoto();
      return img;
    }

    // 远景拍照
    async #takeGlobalPhoto() {
      console.time('#takeGlobalPhoto');
      // 取消前一次请求
      this.cancelCaptureGlobalImage();
      // 拍全景的时候近景按钮禁止
      await this.turneGlobalLight(true);
      const { signal, cancel } = requestCancelable();
      globalImageCancelable = cancel;
      await this.setExposure();
      const blob = await this.apis
        .captureGlobalImage({
          // signal: signal,
          onDownloadProgress: (evt: AxiosProgressEvent) => {
            const percent = Math.floor((evt.loaded / <number>evt.total) * 100);
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
      await this.cameraUtil?.saveOriginSource(blob, false);
      const img = await this.calibrationGlobal();

      console.timeEnd('#takeGlobalPhoto');
      return img;
    }

    // 由画布上的坐标得到激光头运动坐标
    #canvasPosToLaser(option: {
      x: number;
      y: number;
      width: number;
      height: number;
      mode: DEVICE_PROCESSING_MODE;
    }) {
      const { x, y, width, height, mode } = option;
      const {
        current: { offsetX = 0, offsetY = 0 },
      } = this.getCurrentArea(mode);
      const { localCameraOffset } = cameraConfig;

      if (mode === DEVICE_PROCESSING_MODE.LASER_CYLINDER) {
        const cx = y + height / 2;
        const cy = x + width / 2;
        return {
          x: cx - localCameraOffset.x + Math.abs(offsetY),
          y: LASER_CYLINDER_VIEWPORT_WIDTH - cy - localCameraOffset.y,
        };
      }
      const cx = x + width / 2;
      const cy = y + height / 2;
      return {
        x: cx - localCameraOffset.x + Math.abs(offsetX),
        y: cy - localCameraOffset.y + Math.abs(offsetY),
      };
    }

    @deviceChecker.takePhoto()
    async takeLocalPhoto(isRefresh = false) {
      console.log('近景刷新[takeLocalPhoto]-isRefresh', this.isRefresh);
      if (this.isRefresh) {
        return;
      }
      return this.#takeLocalPhoto(isRefresh);
    }

    async #takeLocalPhoto(isRefresh = false) {
      const deviceData = this.dataSource?.currentDeviceData;
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
      return new Promise(async (resolve) => {
        // // TODO: 目前下位机socket没有实时同步是否在曲面测量中，需要调用接口判断。后续需要去掉该方式
        // const isMeasuring = await this.apis.isMeasuring();
        // if (isMeasuring) {
        //   this.appContext.showMessage({
        //     contentI18nKey: 'device.measure.busy_tip',
        //   });
        //   return resolve(null);
        // }

        if (!this.lastMaskPosition && isRefresh === true) {
          return resolve(null);
        }
        const mode = deviceData.mode;
        const maskOption = Object.assign(
          {},
          defaultMaskOptions,
          maskOptions[mode],
        );
        if (isRefresh === false) {
          if ((window as any).VITE_PAD) {
            const msg = 'ipad.editor.select_take_local_img';
            this.setKeepAliveMsg({
              content: msg,
              scene: 1,
            });
          } else {
            const msg = 'device.pass_through.select_take_local_img';
            this.setKeepAliveMsg({
              content: msg,
            });
          }
          this.emit(SYSTEM_EVENT.MARK_POSITION, maskOption);
        }
        this.once(
          SYSTEM_EVENT.MARK_POSITION_DONE,
          async (option: {
            x: number;
            y: number;
            isCancel: boolean;
            mode: DEVICE_PROCESSING_MODE;
          }) => {
            this.setKeepAliveMsg(MODE_DEFALUT_KA_MSG[mode]);
            if (option.isCancel) {
              resolve(null);
              return;
            }
            const { x, y } = option;
            logger.log('近景拍照捕获画布位置', `x:${x}`, `y:${y}`);
            const laserPosition = this.#canvasPosToLaser({
              x,
              y,
              mode,
              width: maskOption.width,
              height: maskOption.height,
            });
            logger.log(
              '近景拍照激光头移动位置',
              `x:${laserPosition.x}`,
              `y:${laserPosition.y}`,
            );

            try {
              const lightLaserAction = async () => {
                await this.turnLightAction(true, 0);
                await this.apis.setLaserHead({
                  data: { x: laserPosition.x, y: laserPosition.y },
                });
              };
              // 设置曝光值会有等待时间，这里并行发送setExposureLocal用来减少等待时间(setLaserHead等待时间较长)
              await Promise.all([lightLaserAction(), this.setExposureLocal()]);
              const blob = await this.apis.captureLocalImage({
                onDownloadProgress: (evt: AxiosProgressEvent) => {
                  const percent = Math.floor(
                    (evt.loaded / <number>evt.total) * 100,
                  );
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
              });
              this.appContext.destroyMessage(refreshProgressKey, true);

              this.turnLocalLight(false);
              await this.apis.resetLaserHead();
              // 近景图片校准
              await this.cameraUtil?.saveOriginSource(blob, true);
              const img = await this.calibrationLocal();

              this.appContext.showMessage({
                key: 'device.status.editor_page',
                contentI18nKey: 'device.status.take_picture_success',
                type: 'success',
                options: {
                  uniqueId: 'takePictureSuccessP2',
                  icon: 'success',
                },
              });
              const maskPosition = { x, y };
              this.#canvasMaskPositions.set(this.canvasId, maskPosition);
              resolve(img);
            } catch (error) {
              this.appContext.showMessage({
                key: 'device.status.editor_page',
                contentI18nKey: 'device.status.take_picture_fail',
                type: 'error',
              });
              resolve(null);
            }
          },
        );
        if (isRefresh) {
          this.emit(SYSTEM_EVENT.MARK_POSITION_DONE, {
            x: this.lastMaskPosition?.x,
            y: this.lastMaskPosition?.y,
            isCancel: false,
            mode: mode,
          });
        }
      });
    }

    delLocalPic() {
      this.#canvasMaskPositions.delete(this.canvasId);
      this.appContext.updateLocalImg(null, null, this.instanceId);
    }

    getLocalOption() {
      const mode = this.dataSource?.currentDeviceData.mode;
      const { x: cx, y: cy } = this.lastMaskPosition || { x: 0, y: 0 };
      const {
        current: { angle },
      } = this.getCurrentArea(mode);
      let x = cx;
      // 针对旋转情况特殊处理
      if (angle === 90) {
        x = cx + LOCAL_PIC_SIZE.height;
      }
      const option = {
        angle: angle,
        width: LOCAL_PIC_SIZE.width,
        height: LOCAL_PIC_SIZE.height,
        x: x,
        y: cy,
        boundColor: 0xffffff,
        boundAlpha: 0.5,
      };
      return option;
    }

    // 近景图像校准
    async calibrationLocal() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { correct } = calculateFocalLenParams(deviceData, this.subType);
      const points = await this.cameraUtil.getLocalCalibrationData();
      const { width, height } = cameraConfig.localCorrectImgSize;
      return this.cameraUtil.correct_P2(points, correct, width, height, true);
    }

    // 远景图像校准
    async calibrationGlobal() {
      let deviceData = this.dataSource?.currentDeviceData;
      if (!deviceData) {
        deviceData = {
          mode: PROCESSING_MODE.LASER_PLANE,
          display: [],
          data: {
            [PROCESSING_MODE.LASER_PLANE]:
              deviceDataValues[PROCESSING_MODE.LASER_PLANE],
          },
        };
      }
      const { correct } = calculateFocalLenParams(deviceData, this.subType);
      const points = await this.cameraUtil.getGlobalCalibrationData();
      const { width, height } = cameraConfig.globalCorrectImgSize;
      return this.cameraUtil.correct_P2(points, correct, width, height, false);
    }

    resetLaserHead() {
      this.apis.resetLaserHead();
      this.apis.turnOffLocalIrLed();
    }

    async moveLaserPosition(
      direction: DIRECTION,
      distance: number = LASER_HEADER_DISTANCE,
      limitRange: {
        minX?: number;
        maxX?: number;
        minY?: number;
        maxY?: number;
      } = {},
    ) {
      if (distance === 0) {
        return;
      }
      const { x = 0, y = 0 } = await this.apis.getLaserPosition();
      const directionMap = {
        [DIRECTION.TOP]: { x, y: y - distance },
        [DIRECTION.BOTTOM]: { x, y: y + distance },
        [DIRECTION.LEFT]: { x: x - distance, y },
        [DIRECTION.RIGHT]: { x: x + distance, y },
      };
      let hasMaxX = false;
      let hasMaxY = false;
      const { minX = 0, maxX = X_MAX, minY = 0, maxY = Y_MAX } = limitRange;
      let targetX = directionMap[direction].x;
      if (targetX < minX) {
        targetX = minX;
      } else if (targetX > maxX) {
        // TODO 下位机返回浮点数据会有精度误差
        hasMaxX = Math.abs(targetX - maxX) < 0.1 ? false : true;
        targetX = maxX;
      }
      let targetY = directionMap[direction].y;
      if (targetY < minY) {
        targetY = minY;
      } else if (targetY > maxY) {
        // TODO 下位机返回浮点数据会有精度误差
        hasMaxY = Math.abs(targetY - maxY) < 0.1 ? false : true;
        targetY = maxY;
      }
      const hasMax = hasMaxX || hasMaxY;
      await this.apis.setLaserHead({
        data: { x: targetX, y: targetY, s: 0, f: LASER_HEADER_SPEED },
      });
      await this.waitLaserHeadReach(LASER_HEADER_MOVE_MAX_TIME, {
        x: targetX,
        y: targetY,
        z: 0,
      });
      return { hasMax };
    }

    // 等待激光头到达指定位置
    async waitLaserHeadReach(times: number, targetPosition?: any) {
      let isReturn = false;
      let current = times;
      while (!isReturn) {
        if (!current) {
          return Promise.resolve(false);
        }
        current--;
        try {
          const laserPosition = await this.apis.getLaserPosition();
          const { x, y, z } = laserPosition;
          const { x: tx, y: ty, z: tz } = targetPosition;
          const isEqualX = Math.abs(tx - x) < 0.1;
          const isEqualY = Math.abs(ty - y) < 0.1;
          const isEqualZ = Math.abs(tz - z) < 0.1;
          if (isEqualX && isEqualY && isEqualZ) {
            isReturn = true;
          }
        } catch (err) {
          return Promise.resolve(false);
        }
        if (!isReturn) {
          await delay(500);
        }
      }
      return Promise.resolve(true);
    }

    async measureByRuleOne(isCurve: boolean): Promise<IPositon3d> {
      const blob = await this.apis.captureLocalImage();
      if (!blob) {
        throw new Error('no origin image data');
      }
      if (!isCurve) {
        await this.apis.turnOffLocalIrLed();
        await this.turneGlobalLight(true);
        await this.apis.resetLaserHead();
      }
      const points = await this.cameraUtil.getLocalCalibrationData();
      const irText = await this.cameraUtil.getLocalIrData();
      const result = await this.cameraUtil.measurement(
        blob,
        points,
        irText,
        true,
      );
      return result as IPositon3d;
    }

    async measureByRuleTwo(isCurve: boolean): Promise<IPositon3d> {
      const measureResult = {} as IPositon3d;
      try {
        const result = await this.apis.irMeasureDistance();
        measureResult.x = result.coord_x;
        measureResult.y = result.coord_y;
        measureResult.z = result.distance;
      } catch (error) {
      } finally {
        if (!isCurve) {
          await this.apis.turnOffLocalIrLed();
          await this.turneGlobalLight(true);
          await this.apis.resetLaserHead();
        }
      }
      return measureResult;
    }

    measureLaserPosition(x: number, y: number, offsetX: number): IPositon {
      const measureRule = getMeasureRule(this.snCode);
      if (EP2_MEASURE_RULES.RULE_TWO === measureRule) {
        // 垂直光源
        // 画布返回坐标为取景框左上顶点在画布上的位置 68为激光头到红点到光源的距离
        return {
          x:
            x -
            this.irLedOffsetX() +
            Math.abs(offsetX) +
            measureMaskOptions.width / 2,
          y: y + measureMaskOptions.height / 2,
        };
      }
      // 斜角光源
      // 画布返回坐标为取景框左上顶点在画布上的位置 55为激光头到红点到光源的距离
      // 摄像头中心点需要和取景框中心点对齐
      // x轴需要向负方向偏移 取景框宽度 / 2
      // y轴暂未处理
      return {
        x:
          x -
          this.irLedOffsetX() +
          Math.abs(offsetX) -
          measureMaskOptions.width / 2,
        y: y,
      };
    }
    @deviceChecker.measure()
    accurateMeasure() {
      return new Promise((resolve) => {
        const mode = this.dataSource?.currentDeviceData.mode;
        this.emit(SYSTEM_EVENT.MARK_POSITION, this.measureMaskOptions);
        this.once(
          SYSTEM_EVENT.MARK_POSITION_DONE,
          async ({ x, y, isCancel }) => {
            if (isCancel) {
              return resolve({ isCancel: true });
            }
            const {
              current: { offsetX = 0 },
            } = this.getCurrentArea(mode);

            const laserPosition = this.measureLaserPosition(x, y, offsetX);
            try {
              const measureRule = getMeasureRule(this.snCode);
              const lightLaserIrLedAction = async () => {
                await this.apis.setLaserHead({
                  data: {
                    x: laserPosition.x,
                    y: laserPosition.y,
                  },
                });
                await this.apis.offLight();
                await this.apis.turnOnLocalIrLed();
                // 拍照前确保灯完全关闭（offLight），延时100ms
                await delay(100);
              };
              // 设置曝光值会有等待时间，这里并行发送setExposureLocal用来减少等待时间(setLaserHead等待时间较长)
              await Promise.all([
                lightLaserIrLedAction(),
                measureRule === EP2_MEASURE_RULES.RULE_ONE &&
                  this.setExposureLocal(true),
              ]);
              const result =
                await this.#measureActions[measureRule].bind(this)(false);
              const { z } = result;
              const thicknessRes = new ThicknessUtil(
                mode,
                z,
                true,
                this.subType,
              );
              const { result: res, reason } = thicknessRes.isValid;
              if (res) {
                resolve({
                  isSuccess: true,
                  value: <number>thicknessRes.value,
                });
              } else {
                resolve({ isFail: true, reason: reason });
              }
            } catch (error) {
              resolve({ isFail: true });
            }
          },
        );
      });
    }

    @deviceChecker.measure()
    async quickMeasure(mode: DEVICE_PROCESSING_MODE) {
      try {
        await this.apis.resetLaserHead();
        await this.apis.offLight();
        await this.apis.turnOnGlobalIrLed();
        await this.setExposure(true);
        const blob = await this.apis.captureGlobalImage();
        this.apis.turnOffGlobalIrLed();
        this.turneGlobalLight(true);
        const points = await this.cameraUtil.getGlobalCalibrationData();
        const irText = await this.cameraUtil.getGlobalIrData();
        const result = await this.cameraUtil.measurement(
          blob,
          points,
          irText,
          false,
        );
        const { z: thick, y } = result;
        const thicknessRes = new ThicknessUtil(mode, thick, true, this.subType);
        const { result: res, reason } = thicknessRes.isValid;
        if (res) {
          return { isSuccess: true, value: <number>thicknessRes.value, y };
        }
        return { isFail: true, reason: reason };
      } catch (error) {
        return { isFail: true };
      }
    }

    // check固件版本
    @deviceChecker.downloadFirmware()
    async downloadFirmware(data: DownloadFirmwareParam) {
      return super.downloadFirmware(data);
    }
    async customCheckVersion(
      deviceFirmware: CheckUpdateResult,
    ): Promise<boolean> {
      try {
        const { version, sub_version = {} } = await this.apis.version();
        const { latestVersion, subVersions = {} } = deviceFirmware;
        const isPrimaryEqual = compareVersion(version, latestVersion) >= 0;

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
          return Promise.resolve(true);
        }
        return Promise.reject(false);
      } catch (error) {
        return Promise.reject(error);
      }
    }

    exportLog() {
      return super.exportLog('xcs_p2_log.gz');
    }

    async getCurrentStatus() {
      const result = await this.apis.queryRunningStatus();
      const mode = result?.curMode?.mode;
      const subMode = result?.curMode?.subMode;
      const alarmArr = result?.curAlarmInfo?.alarm || [];
      const key = `${mode}.${subMode}`;
      const map = {
        'P_SLEEP.': 'SLEEP',
        'P_IDLE.': 'IDLE',
        'Work.workReady': 'WORK_PREPARED',
        'Work.working': 'WORK_STARTED',
        'Work.workPause': 'WORK_PAUSED',
        'P_WORK_DONE.': 'WORK_FINISHED',
      };

      for (const item of alarmArr) {
        const infos = item.info.split(':');
        // 包含多条相同类型的错误信息
        if (infos.length > 1) {
          const itemsWithInfo = infos.reduce((res: any, cur: string) => {
            const curItem = {
              info: cur,
              level: item.level,
              module: item.module,
              type: item.type,
            };
            return [...res, curItem];
          }, []);
          alarmArr.push(...itemsWithInfo);
        }
      }

      return { status: map[key], alarmArr };
    }

    async setExposure(measure?: boolean) {
      const value = measure
        ? EXPOSURE_VALS.MEASURE
        : this.isExposureIncrease
          ? EXPOSURE_VALS.HIGH
          : EXPOSURE_VALS.LOW;
      const data = {
        value,
      };
      await this.apis.setExposure({ data });
      // TODO 设置生效需要等待时间
      await delay(1000);
    }

    async setExposureLocal(measure?: boolean) {
      const value = measure
        ? EXPOSURE_VALS_LOCAL.MEASURE
        : this.isExposureIncrease
          ? EXPOSURE_VALS_LOCAL.HIGH
          : EXPOSURE_VALS_LOCAL.LOW;
      const dataLocal = {
        value,
      };
      await this.apis.setExposureLocal({ data: dataLocal });
      // TODO 设置生效需要等待时间
      await delay(1000);
    }

    async saveCameraData() {
      try {
        if (!fileHelper.exists(`${appDataPath}/${this.cameraDataFileName}`)) {
          await this.apis.zipCameraData();
          const cameraData = await this.apis.getCameraData();
          await fileHelper.writeData(this.cameraDataFileName, cameraData);
        }
      } catch (error) {
        logger.error('存储摄像头备份数据失败', error);
      }
    }

    // 上传火焰报警文件
    async uploadFlameFile() {
      if (this.#uploadFlameFileIng) {
        return;
      }
      try {
        this.#uploadFlameFileIng = true;
        const file = await this.apis.getFireMsg();
        if (file.size === 0) {
          this.#uploadFlameFileIng = false;
          return;
        }
        const fileName = `${this.snCode}_${new Date()
          .toString()
          .replace(/\s+/g, '_')}`;
        this.uploader.uploadToPublic(
          publicKey,
          file,
          `xcs/flame/${fileName}.tar.gz`,
          {
            callback: {
              onError: (error) => {
                logger.error('火焰报警数据上传云端失败=>', error);
              },
              onSuccess: (url: string) => {
                console.log('火焰报警数据上传云端成功=>', url);
                // 上传神策数据
                gtmGetMechineFire({ msg: url });
                // 通知下位机删除相关数据
                this.apis.delFireMsg();
              },
            },
          },
        );
      } catch (error) {
        logger.error('火焰报警数据上传云端失败=>', error);
      } finally {
        this.#uploadFlameFileIng = false;
      }
    }

    async updateWorkInfo() {
      try {
        const workInfo = await this.apis.getWorkMsg();
        if (workInfo) {
          gtmGetProcess({ sn: this.snCode, msg: workInfo });
        }
      } catch (error) {
        logger.error('workInfo =>', error);
      }
    }

    // 更新设备时间
    async syncTime() {
      try {
        const time = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
        const data = {
          syncTime: time,
        };
        this.apis.setMachineInfo({ data });
      } catch (error) {}
    }

    // 是否首次连接四类机判断
    isFirstConnectFourGroup() {
      const deviceType = this.subType;
      if (deviceType === EP2_TYPE.P2_FOUR) {
        const learningStatus = localStorage.getItem('learningStatus');
        if (learningStatus === null) {
          postMessageToMain(COMMON_VIEW_EVENT.showLearningGuide);
          localStorage.setItem('learningStatus', 'false');
        }
      }
    }

    async onConnected() {
      localStoreKeyMac2SnCode(storage, this.snCode, this.deviceInfo.mac ?? '');
      this.deviceInfo = {
        airPumpConfig: this.airPumpConfig,
        isFinishReset: this.isFinishReset,
        isCheckDrawer: this.isCheckDrawer,
        isExposureIncrease: this.isExposureIncrease,
      };
      const { status, alarmArr } = await this.getCurrentStatus();
      // 睡眠/空闲/加工完成 可以做交互相关的操作（移动激光头，拍照）
      const isFreeStatus = ['SLEEP', 'IDLE', 'WORK_FINISHED'].includes(status);
      if (PROCESSING_EVENT.IDLE === status) {
        // IDLE状态重置预览界面
        this.appContext.resetProcessingState();
      }

      this.deviceCmdParsing(
        JSON.stringify({
          module: SOCKET_MODULE.STATUS_CONTROLLER,
          type: status,
        }),
      );

      this.isFirstConnectFourGroup();

      this.cameraUtil.apis = this.apis;

      this.turnLocalLight(false);
      this.syncTime();

      const drawerStatus = await this.apis.drawerStatus();
      this.addonStatus = {
        ...this.addonStatus,
        drawerStatus: drawerStatus ? 'CLOSE' : 'OPEN',
        isCheckDrawer: this.isCheckDrawer,
      };

      alarmArr.forEach((item: any) => {
        // 重连只弹 fatal 级别错误
        if (item.level === 'fatal') {
          this.deviceCmdParsing(JSON.stringify(item));
        }
      });
      if (isFreeStatus) {
        this.resetLaserHead();
      }
      //await this.takePicture();
      const deviceData = this.dataSource?.currentDeviceData;
      const mode = deviceData.mode;
      if (mode !== PROCESSING_MODE.CURVE_PROCESS) {
        this.appContext.updateBackVisible(true);
      }
      await this.saveCameraData();

      this.updateWorkInfo();
      this.uploadFlameFile();
      super.onConnected();
    }
    // 刷新状态加锁
    isRefresh = false;
    async refreshBg() {
      console.log('刷新前[refreshBg]-isRefresh', this.isRefresh);
      if (this.isRefresh) {
        return;
      }
      this.isRefresh = true;
      console.log('刷新中[refreshBg]-isRefresh', this.isRefresh);
      try {
        const img = await this.#takeGlobalPhoto();
        this.appContext.updateBackImg(img, true, this.instanceId);
        this.appContext.showMessage({
          key: 'device.status.editor_page',
          contentI18nKey: 'device.status.take_picture_success',
          type: 'success',
          options: {
            uniqueId: 'takePictureSuccessP2',
            icon: 'success',
          },
        });
        this.isRefresh = false;
        console.log('刷新成功后[refreshBg]-isRefresh', this.isRefresh);
      } catch (error) {
        this.isRefresh = false;
        this.appContext.showMessage({
          key: 'device.status.editor_page',
          contentI18nKey: 'device.status.take_picture_fail',
          type: 'error',
        });
        console.log('刷新失败后[refreshBg]-isRefresh', this.isRefresh);
      }
    }

    #handleProcessingStatusChange(cmd: string) {
      let status = statusMap[cmd];
      if (status === PROCESSING_EVENT.CANCEL_PROCESS) {
        this.hasCancelProcess = true;
        this.#isCancelProcess = true;
      }
      if (status === PROCESSING_EVENT.BEFORE_START) {
        this.#isCancelProcess = false;
      }
      if (this.#isCancelProcess && status === PROCESSING_EVENT.FINISH_PROCESS) {
        status = PROCESSING_EVENT.CANCEL_PROCESS;
      }
      if (status) {
        this.deviceInfo = { currentStatus: status };
        const handle = this.whenReceiveCmdResolveMap.get(status);
        if (isFunction(handle)) {
          handle(status);
        }
      }
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
        if (nextValues.mode === PROCESSING_MODE.LASER_CONVEYOR_FEEDER) {
          let plugin = canvas.getPluginByName(LASER_CONVEYOR_FEEDER_PLUGIN);
          if (!plugin) {
            plugin = new P2FeederPlugin(LASER_CONVEYOR_FEEDER_PLUGIN);
            canvas.registerPlugin(plugin);
          }
          const { current } = this.getCurrentArea(
            PROCESSING_MODE.LASER_CONVEYOR_FEEDER,
          );
          const { width, startY = 0 } = current;
          const {
            LIMIT_TYPE: { fillAlpha, fillColor },
          } = DEVICE_CANVAS_PLUGIN_CONFIG;
          plugin.updateMask({
            fillColor,
            fillAlpha,
            width,
            height: startY,
          });
        } else {
          canvas.unRegisterPluginByName(LASER_CONVEYOR_FEEDER_PLUGIN);
        }

        if (nextValues.mode === PROCESSING_MODE.LASER_CYLINDER) {
          // p2一类机切换到圆柱模式 会出发两次handleDeviceFormValueChanged
          if (_?.mode !== PROCESSING_MODE.LASER_CYLINDER) {
            let plugin = canvas.getPluginByName(
              LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
            );
            if (!plugin) {
              plugin = new P2CentralAxisPlugin(
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
          }
        } else {
          canvas.unRegisterPluginByName(LASER_CYLINDER_CENTRAL_AXIS_PLUGIN);
        }

        if (nextValues.mode === PROCESSING_MODE.CURVE_PROCESS) {
          this.appContext.updateBackVisible(false);
        } else {
          if (_.mode === PROCESSING_MODE.CURVE_PROCESS) {
            this.appContext.updateBackVisible(true);
          }
          canvas.unRegisterPluginByName(SELECTION_PLUGIN);
        }
      }
    }

    // 监听socket信息
    deviceCmdParsing(cmd_ori: string) {
      const cmdObj = parseJSON(cmd_ori, {});
      const { module = '', info = '', type = '' } = cmdObj;
      const cmd = type || cmd_ori;
      const errorKey = [module, type, info].join('.');
      // 报警弹框
      const errorObj = config.deviceExceptions?.[errorKey];
      if (errorObj) {
        logger.log('===设备报错===', errorObj.code);
        this.emit(ExtEvents.Error, errorObj);
        errorObj.receiveHandler?.(this);
      }
      if (module === SOCKET_MODULE.DRAWER) {
        this.addonStatus = {
          ...this.addonStatus,
          drawerStatus: cmd,
        };
      }
      if (module === SOCKET_MODULE.GAP) {
        this.toggleGap(type);
      }

      if (module === SOCKET_MODULE.STATUS_CONTROLLER) {
        if (cmd === PROCESSING_EVENT.MODE_CHANGE) {
          const taskId = cmdObj.info.taskId;
          this.deviceInfo = { taskId: taskId };
        } else {
          this.#handleProcessingStatusChange(cmd);
        }
      }
    }

    toggleGap(type: string) {
      if (type === 'CLOSE') {
        const deviceData = this.dataSource?.currentDeviceData;
        const mode = deviceData.mode;
        const data = this.customData.getData(this.canvasId);
        if (mode === PROCESSING_MODE.CURVE_PROCESS) {
          if (data && data[mode]?.curveData?.previewDisabled === false) {
            this.appContext.showMessage({
              contentI18nKey: 'device.measure.move_tip',
            });
          }
          return;
        }
        if (this.instanceId === this.appContext.instanceId) {
          this.appContext.showMessage({
            type: 'info',
            options: {
              duration: 5000,
              keepAliveOnHover: !(window as any).VITE_PAD,
              uniqueId: 'manualPictureP2',
            },
            render: {
              textI18nKey: 'device.status.manual_picture',
              link: {
                labelI18nKey: 'device.status.immediately_refresh',
                onClick: async () => {
                  if (
                    (window as any).VITE_PAD &&
                    isFunction(this.appContext.cancelTakeLocalPicture)
                  ) {
                    // pad端取消近景拍照，否则在激光圆柱模式下开关盖手动刷新背景之后，左侧的蒙版显示异常
                    this.appContext.cancelTakeLocalPicture();
                  }
                  const img = await this.#takeGlobalPhoto();
                  this.appContext.updateBackImg(img, true, this.instanceId);
                  const localImg = await this.#takeLocalPhoto(true);
                  if (localImg) {
                    const localOption = this.getLocalOption();
                    this.appContext.updateLocalImg(
                      localImg,
                      localOption,
                      this.instanceId,
                    );
                  }
                  this.appContext.showMessage({
                    key: 'device.status.editor_page',
                    contentI18nKey: 'device.status.take_picture_success',
                    type: 'success',
                    options: {
                      uniqueId: 'takePictureSuccessP2',
                      icon: 'success',
                    },
                  });
                },
              },
            },
          });
        }
      }
    }

    // 固件017开始支持 P_WORK_DONE => P_IDLE
    async setWorkDown2Idle() {
      try {
        const result = await this.apis.processingMode();
        if (result === 'P_WORK_DONE') {
          await this.apis.modeSwitch({ data: { state: 'P_IDLE' } });
        }
      } catch (error) {
        logger.error(error);
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
      const checkResult = await super.checkProcessData({
        canvasData: canvasData,
        centralAxisPosition,
        isWalkBorder,
        dataSource,
        isExportGcode,
        extSecondaryType: this.subType,
        layerOrder,
      });
      if (mode === DEVICE_PROCESSING_MODE.CURVE_PROCESS) {
        const modeData = this.customData?.getModeData(
          this.canvasId,
          PROCESSING_MODE.CURVE_PROCESS,
        );
        if (
          !modeData?.curveData ||
          (modeData?.curveData && !modeData?.curveData.densityArea)
        ) {
          return {
            type: MessageType.text,
            text: 'device.measure.curve_process_mode_data_tip',
          };
        }
      }
      return checkResult;
    }

    // 矫正加工时间
    async correctionProcessingTime() {
      const res = await this.apis.processing();
      return res;
    }

    createFireproofVNode() {
      const FlammabilityTips1 = this.appContext.createElement(
        'div',
        this.appContext.formatMsg('device.p2.fireproof_tips_1'),
      );
      const FlammabilityTips2 = this.appContext.createElement(
        'div',
        `1.${this.appContext.formatMsg('device.p2.fireproof_tips_2')}`,
      );
      const FlammabilityTips3 = this.appContext.createElement(
        'div',
        `2.${this.appContext.formatMsg('device.p2.fireproof_tips_3')}`,
      );
      return {
        content: this.appContext.createElement('div', [
          FlammabilityTips1,
          FlammabilityTips2,
          FlammabilityTips3,
        ]),
      };
    }

    // 易燃检测
    flammabilityCheck() {
      return new Promise((resolve) => {
        //TODO: 设置导入gcode this.dataParser 不存在的情况
        const elements = this.dataParser?.source?.elements ?? [];
        let isFlammability = false;
        for (const el of elements) {
          if (el.power / 10 >= 90 && el.speed / 60 <= 10) {
            isFlammability = true;
            break;
          }
        }
        console.log('flammabilityCheck', elements);
        if (isFlammability) {
          // fireproof_tips
          if ((window as any).VITE_PHONE || (window as any).VITE_PAD) {
            this.appContext.dialog.warning({
              closable: false,
              title: this.appContext.formatMsg('device.p2.fireproof_title'),
              content: this.appContext.formatMsg('device.p2.fireproof_tips'),
              positiveText: this.appContext.formatMsg('device.p2.ok_process'),
              negativeText: this.appContext.formatMsg('device.common.cancel'),
              onPositiveClick: () => {
                resolve(true);
              },
              onNegativeClick: () => {
                resolve(false);
              },
            });
          } else {
            this.appContext.dialog.warning({
              closable: false,
              title: this.appContext.formatMsg('device.p2.fireproof_title'),
              content: this.createFireproofVNode().content,
              positiveText: this.appContext.formatMsg('device.p2.ok_process'),
              negativeText: this.appContext.formatMsg('device.common.cancel'),
              onPositiveClick: () => {
                resolve(true);
              },
              onNegativeClick: () => {
                resolve(false);
              },
            });
          }
        } else {
          resolve(true);
        }
      });
    }

    // 处理 p2设备 gcode参数
    genProcessParams() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;

      const isFinishReset =
        deviceData.mode === PROCESSING_MODE.LASER_CONVEYOR_FEEDER
          ? this.isFinishReset
          : true;
      transformProcessParams(
        {
          deviceData,
          processingArea,
          config: this.config,
          snCode: this.snCode,
          airPumpConfig: this.airPumpConfig,
          isFinishReset,
        },
        this.dataParser,
      );
    }

    // 处理 p2设备 支持的元素参数
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

    // 生成全局gcode头尾
    generalGcodeHeadAndTail() {
      const params = this.dataParser.source.params;
      const isFeeder =
        params.processMode === DEVICE_PROCESSING_MODE.LASER_CONVEYOR_FEEDER;

      const { data, displays, mode } = this.dataSource?.currentDeviceData;
      const focalLen = params.focalLen;
      const material = data[mode].material;
      // 目前获取第一个元素的速度和功率
      const firstdDisplays = displays.values().next().value;
      const { processingType, data: displayData } = firstdDisplays;
      const firstEle = displayData[processingType];
      const { speed, power } = firstEle.parameter.customize;

      const gWorkInfo = template(templates.gWorkInfo)({
        mode,
        focalLen,
        material,
        speed,
        power,
      });

      const headParams = {
        gWorkInfo,
        isFeeder,
        ...params,
      };
      const tailParams = {
        isFinishReset: params.isFinishReset,
      };
      const gcodeHead = template(templates.gCodeHead)(headParams);
      const gcodeTail = template(templates.gCodeTail)(tailParams);
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
    }

    // 生成曲面gcode头尾
    generalCurveGcodeHeadAndTail() {
      const curveHeadCompiled = template(templates.curveHead);
      const curveTailCompiled = template(templates.curveTail);
      const params = this.dataParser.source.params;
      const { engrave = 100 } = params.airPumpConfig;
      const gcodeHead = curveHeadCompiled({
        focalLen: params.focalLen,
        motionConfig: `{"color": ${ELEMENT_PROCESSING_COLOR.VECTOR_ENGRAVING}}`,
        airPumpValue: Math.round(engrave * 2.55),
      });
      const gcodeTail = curveTailCompiled();
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
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
      const params = this.dataParser.source.params;
      const isCurve =
        params.processMode === DEVICE_PROCESSING_MODE.CURVE_PROCESS;
      if (isCurve) {
        this.generalCurveGcodeHeadAndTail();
      } else {
        this.generalGcodeHeadAndTail();
      }

      await super.beforeGenGcode();
    }

    async buildProcessGcode(processMode: PROCESSING_MODE) {
      // if (processMode === PROCESSING_MODE.CURVE_PROCESS) {
      //   // if (!this.curveWorker) {
      //   // 	await this.getCurveData();
      //   // }
      //   await this.beforeGenGcode();
      //   return this.buildCurveGcode();
      // }
      return super.buildProcessGcode(processMode);
    }

    dispose() {
      super.dispose();
      this.cameraUtil?.clean();
      this.cancelCaptureGlobalImage();
      this.appContext.destroyMessage(refreshProgressKey, true);
      this.#cameraUtil = null;
    }

    // 获取原来在配置里的区域信息
    getOriginCurrentArea(prefixKey: string) {
      const data = super.getCurrentArea(prefixKey);
      return data;
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

    deviceDrawerCheck() {
      const mode = this.dataSource?.currentDeviceData.mode;
      const addonStatusRules = (
        this.config.checkRules as RuleConfigTypeWrapperFunc
      )(this.subType)[mode]?.addonStatusRules;
      if (addonStatusRules?.addonCheckLists.includes('drawer')) {
        const func = () => {
          const correctStatus = addonStatusRules.rules.drawer.correctStatus;
          const res = addonStatusRules.rules.drawer.func(
            this.addonStatus,
            this.connected,
          );
          return correctStatus === res || !res;
        };
        const msg = addonStatusRules.rules.drawer.handler().text;
        return {
          func,
          msg,
        };
      }
      return {
        func: () => true,
        msg: '',
      };
    }

    async deviceChecker(list: string[] | { name: string; args: any }[]) {
      const deviceDrawerCheck = this.deviceDrawerCheck();
      const checker = {
        connect: {
          func: () => this.connected,
          msg: 'device.connect.connect_break',
        },
        measure_connect: {
          func: () => this.connected,
          msg: 'device.measure.measure_fail_disconnect',
        },
        idle: {
          func: this.apis.isIdle,
          msg: 'device.measure.busy_tip',
        },
        measuring: {
          func: async () => {
            const res = await this.apis.isMeasuring();
            return !res;
          },
          msg: 'device.measure.exit_measure',
        },
        curveBounds: {
          func: this.correctCurveBounds,
          msg: 'device.measure.measure_min_error',
        },
        drawer: {
          func: deviceDrawerCheck.func,
          msg: deviceDrawerCheck.msg,
        },
        flammability: {
          func: () => {
            return this.flammabilityCheck();
          },
        },
        gapClose: {
          func: this.apis.isCover,
          msg: 'device.p2.close_gap_process',
        },
      };
      let result = true;
      for (let i = 0; i < list.length; i++) {
        let args;
        let checkName = '';
        const item = list[i];
        if (isString(item)) {
          checkName = item;
        } else {
          checkName = item.name;
          args = item.args;
        }

        const checkerConfig = checker[checkName];
        if (!checkerConfig) {
          continue;
        }
        const res = await checkerConfig.func.bind(this)(args);
        if (!res) {
          result = false;
          if (checkerConfig.msg) {
            this.appContext.showMessage({
              contentI18nKey: checkerConfig.msg,
            });
          }

          break;
        }
      }
      return result;
    }

    // 曲面流程开始
    async beforeCurveMeasure() {
      await this.turneGlobalLight(true);
      await this.apis.turnOnLocalIrLed();
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      if (!data || !data[mode]?.curveData) {
        this.customData.setModeData(this.canvasId, mode, DEFAULT_CURVE_DATA());
        return;
      }
      data[mode].curveData.tempData = DEFAULT_CURVE_TEMP_DATA();
      data[mode].curveData.remeasurePoints = [];
    }

    // 曲面流程结束
    async afterCurveMeasure() {
      await this.apis.resetLaserHead();
      await this.apis.turnOffLocalIrLed();
      await this.turneGlobalLight(true);
      await this.apis.modeSwitch({ data: { state: 'P_IDLE' } });
    }

    // 重置曲面的激光头位置
    @deviceChecker.resetCurveLaserHead()
    async resetCurveLaserHead() {
      // 曲面模式在选择测量密度区域页，设备断开重连后近景红外会关闭
      await this.apis.turnOnLocalIrLed();
      await this.apis.resetLaserHead();
      await this.waitLaserHeadReach(LASER_HEADER_MOVE_MAX_TIME, {
        x: 0,
        y: 0,
        z: 0,
      });
    }

    // 移动曲面的激光头位置
    @deviceChecker.moveCurveLaserPosition()
    async moveCurveLaserPosition(direction: DIRECTION, distance: number) {
      // 曲面模式在选择测量密度区域页，设备断开重连后近景红外会关闭
      await this.apis.turnOnLocalIrLed();
      console.log(direction, distance);
      return await this.moveLaserPosition(direction, distance, {
        maxX: this.curveXMax,
        maxY: this.curveYMax,
      });
    }

    // 曲面测量边界点(开始点、结束点)
    private async curveMeasureBoundsPoint(data?: any) {
      await this.apis.offLight();
      await this.apis.turnOnLocalIrLed();
      const measureRule = getMeasureRule(this.deviceInfo.snCode);
      if (measureRule === EP2_MEASURE_RULES.RULE_ONE) {
        await this.setExposureLocal(true);
      } else {
        // TODO: 临时处理，中期改款关灯瞬间会有几率测量失败
        await delay(100);
      }
      const position = await this.curveMeasurePoint(data);
      await this.turneGlobalLight(true);
      return position;
    }

    // 记录曲面开始点和结束点的前置行为
    @deviceChecker.beforeRecordCurvePosition()
    async beforeRecordCurvePosition() {
      await this.turneGlobalLight(true);
      await this.turnLocalIrLed(true);
      this.resetCurveTempData();
      return true;
    }

    // 记录完开始点和结束点后的结束行为
    @deviceChecker.afterRecordCurvePosition()
    async afterRecordCurvePosition() {
      // 自动关灯关红外
      await this.turneGlobalLight(true);
      await this.turnLocalIrLed(false);
      return true;
    }

    // 记录曲面开始激光头坐标和红外坐标
    @deviceChecker.recordCurveStartPosition()
    async recordCurveStartPosition() {
      // 曲面模式在选择测量密度区域页，设备断开重连后近景红外会关闭
      await this.apis.turnOnLocalIrLed();
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const laserPosition = await this.apis.getLaserPosition();
      // const laserPosition = {
      //   a: 0,
      //   u: 0,
      //   x: 167.8500061035156,
      //   y: 57.839996337890625,
      //   z: 0,
      // };
      const position = {
        ox: laserPosition.x,
        oy: laserPosition.y,
        x: 0,
        y: 0,
        z: 0,
      };
      const irLedPosition = await this.curveMeasureBoundsPoint(position);
      // const irLedPosition = {
      //   color: 'green',
      //   ox: 167.8500061035156,
      //   oy: 57.839996337890625,
      //   result: 'success',
      //   x: 264.45000610351565,
      //   y: 63.839996337890625,
      //   z: -14.72,
      // };
      console.log('position', position, 'irLedPosition', irLedPosition);
      tempData.laserStartPosition = laserPosition;
      tempData.irLedStartPosition = irLedPosition;
      return {
        result: irLedPosition.result,
        position,
      };
    }

    // 记录曲面结束激光头坐标和红外坐标
    @deviceChecker.recordCurveEndPosition()
    async recordCurveEndPosition() {
      // 曲面模式在选择测量密度区域页，设备断开重连后近景红外会关闭
      await this.apis.turnOnLocalIrLed();
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const laserPosition = await this.apis.getLaserPosition();
      // const laserPosition = {
      //   a: 0,
      //   u: 0,
      //   x: 289.8000183105469,
      //   y: 106.74000549316406,
      //   z: 0,
      // };
      const position = {
        ox: laserPosition.x,
        oy: laserPosition.y,
        x: 0,
        y: 0,
        z: 0,
      };
      const irLedPosition = await this.curveMeasureBoundsPoint(position);
      // const irLedPosition = {
      //   color: 'green',
      //   ox: 289.8000183105469,
      //   oy: 106.74000549316406,
      //   result: 'success',
      //   x: 386.50001831054686,
      //   y: 112.74000549316406,
      //   z: -15.22,
      // };
      tempData.laserEndPosition = laserPosition;
      tempData.irLedEndPosition = irLedPosition;
      return {
        result: irLedPosition.result,
        position,
      };
    }

    // 矫正曲面的点边界
    correctCurveBounds() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      if (!tempData.laserStartPosition || !tempData.laserEndPosition) {
        return false;
      }
      const { x: lStartX, y: lStartY } = tempData.laserStartPosition;
      const { x: lEndX, y: lEndY } = tempData.laserEndPosition;
      tempData.laserStartPosition = {
        x: Math.min(lStartX, lEndX),
        y: Math.min(lStartY, lEndY),
      };
      tempData.laserEndPosition = {
        x: Math.max(lStartX, lEndX),
        y: Math.max(lStartY, lEndY),
      };
      const { x: startX, y: startY } = tempData.irLedStartPosition;
      const { x: endX, y: endY } = tempData.irLedEndPosition;
      tempData.irLedStartPosition = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
      };
      tempData.irLedEndPosition = {
        x: Math.max(startX, endX),
        y: Math.max(startY, endY),
      };
      const start = tempData.irLedStartPosition;
      const end = tempData.irLedEndPosition;
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);
      //测量区域最小10*10 步长1 下位机移动存在误差，所以这里减去0.2 容错处理
      if (
        width - CURVE_BOUNDS_MIN_WIDTH < -0.2 ||
        height - CURVE_BOUNDS_MIN_HEIGHT < -0.2
      ) {
        return false;
      }
      tempData.densityArea = { x: start.x, y: start.y, width, height };
      return true;
    }

    // 设置测点推荐行列
    setRecommendAttr() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const { width, height } = tempData.densityArea;
      let recommendRow = Math.ceil(height / RECOMMEND_DISTANT);
      let recommendCol = Math.ceil(width / RECOMMEND_DISTANT);
      recommendRow = recommendRow < 3 ? 3 : recommendRow;
      recommendCol = recommendCol < 3 ? 3 : recommendCol;
      tempData.curveRange = {
        row: recommendRow > this.curveMaxRow ? this.curveMaxRow : recommendRow,
        col: recommendCol > this.curveMaxCol ? this.curveMaxCol : recommendCol,
      };
    }

    // 曲面按照Z字形排列要测量的点
    calCurveDensityPoints(options: {
      width: number;
      height: number;
      pointSize: number;
    }) {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const { row, col } = tempData.curveRange;
      const points: DensityPoint[] = [];
      const start = tempData.laserStartPosition;
      const end = tempData.laserEndPosition;
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
    }

    // 进入到曲面测量密度点过程的前置行为
    @deviceChecker.beforeCurveMeasuring()
    beforeCurveMeasuring() {
      console.log('beforeCurveMeasuring');
    }

    // 曲面测量密度点的前置行为
    async beforeCurveMeasureAllPoints() {
      await this.apis.offLight();
      await this.apis.turnOnLocalIrLed();
      await this.apis.modeSwitch({ data: { state: 'P_MEASURE' } });
      // await this.apis.lockCover({ data: { action: 'on' } });
      const measureRule = getMeasureRule(this.snCode);
      if (measureRule === EP2_MEASURE_RULES.RULE_ONE) {
        await this.setExposureLocal(true);
      } else {
        // TODO: 临时处理，中期改款关灯瞬间会有几率测量失败
        await delay(100);
      }
    }

    // 曲面测量密度点后的结束行为
    async afterCurveMeasureAllPoints() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode].curveData;
      curveData.remeasurePoints = [];
      await this.apis.resetLaserHead();
      await this.apis.turnOffLocalIrLed();
      await this.turneGlobalLight(true);
      await this.apis.modeSwitch({ data: { state: 'P_IDLE' } });
      // await this.apis.lockCover({ data: { action: 'off' } });
    }

    // 计算建模需要的xyz
    calculateModePoint(data: any, irLedPosition: IPositon3d): IPositon3d {
      if (EP2_MEASURE_RULES.RULE_TWO === getMeasureRule(this.snCode)) {
        // 中期改款
        const x = data.ox + this.irLedOffsetX();
        const y = data.oy + this.irLedOffsetY();
        const z = irLedPosition.z;
        return { x, y, z };
      }
      return {
        x: data.ox + (irLedPosition.x || 0) + this.irLedOffsetX(),
        y: data.oy + (irLedPosition.y || 0) + this.irLedOffsetY(),
        z: irLedPosition.z,
      };
    }

    // 曲面测量密度点
    async curveMeasurePoint(data?: any) {
      try {
        // 设定一个颜色表示测量中
        data.color = CURVE_POINT_COLOR.BLUE;
        await this.apis.setLaserHead({
          data: {
            ...data,
            x: data.ox,
            y: data.oy,
            z: 0,
            s: 0,
            f: LASER_HEADER_SPEED,
          },
        });
        const res = await this.waitLaserHeadReach(LASER_HEADER_MOVE_MAX_TIME, {
          x: data.ox,
          y: data.oy,
          z: 0,
        });
        if (!res) {
          throw new Error('unReach position');
        }
        /**
         const blob = await this.apis.captureLocalImage({
          onDownloadProgress: (evt: any) => {
            const percent = Math.floor((evt.loaded / evt.total) * 100);
            logger.log({ percent });
          },
        });
         const points = await this.cameraUtil.getLocalCalibrationData();
         const irText = await this.cameraUtil.getLocalIrData();
         if (!blob) {
          throw new Error('no origin image data');
        }

         const irLedPosition = await this.cameraUtil.measurement(
         blob,
         points,
         irText,
         true,
         );
         */
        const irLedPosition =
          await this.#measureActions[getMeasureRule(this.snCode)].bind(this)(
            true,
          );
        if (
          irLedPosition.z > CURVE_ALLOW_MAX_Z ||
          irLedPosition.z < this.maxCurveAllowMinZ
        ) {
          throw new Error(`invalid irLedPosition z: ${irLedPosition.z}`);
        }
        // 这里要获取的是红外点的位置，但要按照激光头的坐标进行测量再加上红外的距离
        // 建模需要的是红外点的物理坐标
        // return {
        //   ...data,
        //   x: data.ox + (irLedPosition.x || 0) + this.irLedOffsetX(),
        //   y: data.oy + (irLedPosition.y || 0) + EXT_IR_LED_OFFSET_Y,
        //   z: irLedPosition.z,
        //   color: CURVE_POINT_COLOR.GREEN,
        //   result: 'success',
        // };
        return {
          ...data,
          ...this.calculateModePoint(data, irLedPosition),
          color: CURVE_POINT_COLOR.GREEN,
          result: 'success',
        };
      } catch (err: any) {
        logger.log('curveMeasure err: ', err);
        if (
          ['timeout of 30000ms exceeded', 'Network Error'].includes(err.message)
        ) {
          throw new Error('disconnected');
        }
        return {
          ...data,
          z: data.z ?? 0,
          color: CURVE_POINT_COLOR.RED,
          result: 'fail',
        };
      }
    }

    // 进入到曲面重测的前置行为
    @deviceChecker.beforeCurveRemeasure()
    beforeCurveRemeasure() {
      console.log('beforeCurveRemeasure');
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
          dp.result = '';
        } else {
          dp.color = CURVE_POINT_COLOR.SILVERY;
          dp.skipMeasure = true;
        }
      });
      return curveData.densityPoints;
    }

    // wasm只保存一种曲面模型，画布切换需要更新wasm中曲面模型
    updateCurveData() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data?.[mode]?.curveData;
      if (curveData) {
        const size = curveData.curveRange;
        const densityPoints = curveData.densityPoints;
        const info = {
          tension: curveData?.tension || 3,
          smoothness: curveData?.smoothness || 3,
          size,
          densityPoints,
        };
        this.genSurface(info);
      }
    }

    async getCurveData(options?: CurveModelOptions) {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode].curveData;
      const size = curveData.curveRange;
      const densityPoints = curveData.densityPoints;
      const info = {
        tension: options?.tension || curveData?.tension || 3,
        smoothness: options?.smoothness || curveData?.smoothness || 3,
        size,
        densityPoints,
      };
      const modelData = await this.genSurface(info);
      console.log('getCurveData=>', modelData);
      // 判断是否有危险的角度要进行撞头提示
      const dangerAngle = this.curvature.large.angle[0];
      const hasDangerPoint = modelData.points.some(
        (p: any) => p.a > dangerAngle,
      );

      // //保存建模数据
      // // this.dataParser.source.surfaceJson = modelData.measureJson;
      // curveData.surfaceJson = modelData.measureJson;

      return { densityPoints, modelData, hasDangerPoint };
    }

    // 移除曲面的temp数据
    resetCurveTempData() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      data[mode].curveData.tempData = DEFAULT_CURVE_TEMP_DATA();
    }

    // 设置最终的曲面数据
    setFinalCurveData(exactPoints: DensityPoint[], replaceCurveData = true) {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode].curveData;
      if (replaceCurveData) {
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

    // 控制曲面舞台插件开关
    toggleCurveCanvasPlugin = (dataSource: any, status: boolean) => {
      const canvas = dataSource.canvasManager.canvas;
      let canvasPlugin = canvas.getPluginByName(SELECTION_PLUGIN);
      if (status) {
        if (!canvasPlugin) {
          canvasPlugin = new P2Plugin(SELECTION_PLUGIN);
        }
        canvas.registerPlugin(canvasPlugin);
      } else {
        logger.log('[ 插件销毁 ] >');
        canvas.unRegisterPlugin(canvasPlugin);
        canvasPlugin = null;
      }
      return canvasPlugin;
    };

    // 完成曲面预览
    finishCurvePreview() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode]?.curveData;
      const { data: areaData } = this.processingArea;
      const _curveArea = areaData.find(
        (d: any) => d.key === PROCESSING_MODE.CURVE_PROCESS,
      );
      const offsetX = _curveArea?.offsetX ?? 0;
      const offsetY = _curveArea?.offsetY ?? 0;
      const start = {
        x: curveData.irLedStartPosition.x + offsetX,
        y: curveData.irLedStartPosition.y + offsetY,
      };
      const end = {
        x: curveData.irLedEndPosition.x + offsetX,
        y: curveData.irLedEndPosition.y + offsetY,
      };
      curveData.remeasurePoints = [];
      const plugin = this.toggleCurveCanvasPlugin(this.dataSource, true);
      if (plugin) {
        plugin.updateRect({
          width: _curveArea?.width,
          height: _curveArea?.height,
        });
        plugin.updateHole({
          x: start.x,
          y: start.y,
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        });
      }
    }

    // 计算预估时长
    async estimatedTime() {
      const rule = getMeasureRule(this.snCode);
      const id = EstimatedTime[`P2_${rule}`];
      const time = await super.calCulateEstimatedTime(id);
      return time;
    }
  }
  return P2Ext;
}
