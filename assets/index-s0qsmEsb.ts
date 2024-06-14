import { logger } from '@xtool/link';
import {
  CanvasItemType,
  CanvasMapItemType,
  Constructor,
  DEVICE_TYPE,
  DeviceExtConfig,
  DeviceExtContainer,
  PROCESSING_EVENT,
  ProcessingUploadData,
  SizeType,
  parseParams,
  requestCancelable,
} from '@xtool/xcs-logic';
import type { AxiosProgressEvent } from 'axios';
import { isFunction, template } from 'lodash-es';
import templates from '../src/config/gcode-template';
import { DEFAULT_D_PATH, P1CentralAxisPlugin } from './canvas-plugins';
import { deviceChecker } from './check';
import { config } from './config';
import { LASER_CYLINDER_CENTRAL_AXIS_PLUGIN } from './constant';
import {
  ExtEvents,
  PROCESSING_COMMAND,
  PROCESSING_MODE,
  statusMap,
} from './types';
import uiComponents, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';
import uiAppComponents from './ui-app';
import { ThicknessUtil, WriteByLine, calculateFocalLenParams } from './utils';
import {
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';
import { CameraP1Base, CameraP1Native, CameraP1Wasm } from './worker/correct';
const { OPEN_COVER, CLOSE_COVER } = PROCESSING_COMMAND;
const refreshProgressKey = 'device.status.taking_picture';
// 拍照取消
// 1.在弱网环境下，
// 2.如果多次点击wifi列表连接
// 3.captureImageCancelable作为class P1Ext私有属性，
// 结果：多次重新加载，会导致captureImageCancelable失效
// 所以 captureImageCancelable 放在外部
let captureImageCancelable: any;

export interface P1Ext extends DeviceExtContainer {
  takeGlobalPhoto: () => Promise<HTMLImageElement>;
}

export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class P1Ext extends Base {
    // 加工类型配置
    processingTypes = processingTypes;
    #isProcessCancel = false;

    hasCancelProcess = false;

    #cameraUtil!: CameraP1Base | null;

    #isReadyToProcess = false;
    #cancelable: () => void = () => {};

    // 是否正在刷新背景
    isrefreshingBg = false;

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

    /**
     * Creates an instance of DeviceExt.
     * @date 05/11/2022
     * @param {...any[]} args
     */
    constructor(...args: any[]) {
      super(config, ...args);
    }

    get ui() {
      return uiComponents;
    }

    get uiApp() {
      return uiAppComponents;
    }

    get processingAreaKey() {
      return '';
    }

    get cameraUtil() {
      if (!this.#cameraUtil) {
        // @ts-ignore
        if (window.MeApi?.wasmKit) {
          this.#cameraUtil = new CameraP1Native();
        } else {
          this.#cameraUtil = new CameraP1Wasm();
        }
      }

      return this.#cameraUtil;
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

    get subType() {
      return DEVICE_TYPE.DEVICE_ONE;
    }

    correct(formValues: CanvasMapItemType) {
      const { correct } = calculateFocalLenParams(formValues);
      return correct;
    }

    // 旧设备兼容接口
    setConfigs(data: any) {
      const handle = {
        setPurifierTimeout: (payload: { purifierTimeout: number }) => {
          this.apis.setPurifierContinue({
            params: { timeout: payload.purifierTimeout },
          });
        },
        setLaserPower: (payload: { laserPower: number }) => {
          this.apis.setLaserPower({
            params: { power: payload.laserPower },
          });
        },
        setPurifierCheck: (payload: { purifierCheck: boolean }) => {
          this.apis.setPurifierCheck({
            params: { action: payload.purifierCheck },
          });
        },
      };
      if (data.key && isFunction(handle[data.key])) {
        handle[data.key](data.data.kv);
      }
    }

    doUpdateFirmware(): Promise<boolean> {
      throw new Error('Method not implemented.');
    }

    getTotalSize(canvasData: CanvasItemType[], deviceData: CanvasMapItemType) {
      let [topLeftX, topLeftY, bottomRightX, bottomRightY] = [
        Number.MAX_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        0,
        0,
      ];
      for (const canvasItem of canvasData) {
        // 元素加工数据，这里包含所有的元素加工类型
        const elementProcessData = deviceData.displays.get(canvasItem.id);
        // 忽略加工则直接跳过
        if (elementProcessData?.processIgnore) {
          continue;
        }
        const {
          x: currentX,
          y: currentY,
          width: currentWidth,
          height: currentHeight,
        } = canvasItem;
        topLeftX = Math.min(currentX, topLeftX);
        topLeftY = Math.min(currentY, topLeftY);
        bottomRightX = Math.max(currentX + currentWidth, bottomRightX);
        bottomRightY = Math.max(currentY + currentHeight, bottomRightY);
      }
      return {
        x: Number(topLeftX.toFixed(3)),
        y: Number(topLeftY.toFixed(3)),
        width: bottomRightX - topLeftX,
        height: bottomRightY - topLeftY,
      };
    }

    // 注意：一代机没有 ready 状态，需要上传成功之后，主动触发
    @deviceChecker.uploadGCode()
    async uploadGCode(params?: ProcessingUploadData): Promise<boolean> {
      const { gcode: gcodePath, onProgress, isFullPath = false } = params || {};
      this.hasCancelProcess = false;
      // 区分网页上传，以及builder上传
      // @ts-ignore
      if (this.uploadGcodeHelper) {
        try {
          const {
            baseUrl,
            url,
            params: urlParams = {},
          } = await this.apis.uploadGcode({ method: 'info' });
          const uploadGcodeUrl = `${baseUrl}${url}${parseParams(urlParams)}`;
          const path = gcodePath
            ? gcodePath
            : this.taskManager.getTask(this.deviceInfo.snCode).gcode;
          const result = await super.uploadByBuilder({
            url: uploadGcodeUrl,
            path: <string>path,
            options: {
              isFullPath,
              onProgress: (percent: number) => {
                isFunction(onProgress) && onProgress(percent);
              },
              onCancel: (cancel) => {
                this.#cancelable = cancel;
              },
            },
          });
          if (result.result === 'ok') {
            this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
            return Promise.resolve(true);
          }
          return Promise.reject(false);
        } catch (err) {
          logger.log('uploadGcode by builder error', err);
          return Promise.reject(false);
        }
      } else {
        // TODO 从文件系统中读取 buffer
        const gcode = gcodePath
          ? await this.fileHelper.readGcode(gcodePath)
          : await this.fileHelper.readGcode(
              this.taskManager.getTask(this.deviceInfo.snCode).gcode,
            );
        const { signal, cancel } = requestCancelable();
        this.#cancelable = cancel;
        const result = await this.apis.uploadGcode({
          data: { gcode },
          signal: signal,
          onUploadProgress: (ev: any) => {
            const complete = ev.loaded / ev.total;
            logger.log({ complete });
            // gcode上传中
            isFunction(onProgress) && onProgress(complete);
          },
        });
        if (result) {
          this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
          return Promise.resolve(true);
        }
        return Promise.reject(false);
      }
    }

    @deviceChecker.measure()
    async measure(mode: PROCESSING_MODE, size: SizeType) {
      try {
        const { x, y, width, height } = size;
        const value = await this.apis.measureThick({
          params: {
            focus: `${x},${y},${width},${height}`,
          },
        });
        logger.log('p1 measure: ', value);
        const thicknessRes = new ThicknessUtil(mode, value, true);
        return thicknessRes.value;
      } catch (error) {
        return error;
      }
    }

    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
    }

    async takeGlobalPhoto(): Promise<HTMLImageElement | any> {
      // 先取消上一次图片下载
      this.cancelCaptureImage();
      const { signal, cancel } = requestCancelable();
      captureImageCancelable = cancel;
      const blob = await this.apis
        .captureImage({
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
                uniqueId: 'takeGlobalPhoto_progress_P1',
              },
            });
          },
        })
        .finally(() => {
          this.appContext.destroyMessage(refreshProgressKey);
        });
      const points = await this.apis.getCalibrationData();
      await this.cameraUtil.saveOriginSource(points, blob);

      const result = await this.calibrationGlobal();
      return result;
    }

    async calibrationGlobal() {
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

      const correctValue = this.correct(currentDeviceData);
      const correctImg = await this.cameraUtil.correct_p1(
        correctValue * 1,
        25.5,
        15.5,
      );

      return correctImg;
    }

    startProcessing(): Promise<boolean> {
      return this.uploadGCode();
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

    // 取消下载背景图
    cancelCaptureImage() {
      if (isFunction(captureImageCancelable)) {
        captureImageCancelable();
      }
    }

    // 手动刷新提示
    manualPicture() {
      return this.appContext.showMessage({
        type: 'info',
        options: {
          duration: 5000,
          keepAliveOnHover: !(window as any).VITE_PAD,
          uniqueId: 'manualPictureP1',
        },
        render: {
          textI18nKey: 'device.status.manual_picture',
          link: {
            labelI18nKey: 'device.status.immediately_refresh',
            onClick: async () => {
              this.refreshBg();
            },
          },
        },
      });
    }

    async refreshBg() {
      if (this.isrefreshingBg) {
        return;
      }
      try {
        this.isrefreshingBg = true;
        const img = await this.takeGlobalPhoto();
        this.appContext.updateBackImg(img, true, this.instanceId);
        this.appContext.showMessage({
          key: 'device.status.editor_page',
          contentI18nKey: 'device.status.take_picture_success',
          type: 'success',
          options: {
            uniqueId: 'takePictureSuccessP1',
            icon: 'success',
          },
        });
      } catch (error) {
        this.appContext.showMessage({
          key: 'device.status.editor_page',
          contentI18nKey: 'device.status.take_picture_fail',
          type: 'error',
          options: {
            uniqueId: 'takePictureFailP1',
          },
        });
      } finally {
        this.isrefreshingBg = false;
      }
    }

    async onConnected() {
      const statusCmd = await this.apis.status();
      const status = statusMap[statusCmd];
      if (status) {
        this.deviceInfo = { currentStatus: status };
      }
      console.log('status=>', status);
      if (status === PROCESSING_EVENT.IDLE) {
        this.appContext.resetProcessingState();
      }
      //await this.takePicture();
    }

    exportLog() {
      return super.exportLog('xcs_p1_log.gz');
    }

    // 监听socket信息
    deviceCmdParsing(cmd: string) {
      console.log('监听socket信息deviceCmdParsing:', cmd);
      let status = statusMap[cmd];
      if (this.#isReadyToProcess && cmd === OPEN_COVER) {
        status = PROCESSING_EVENT.CANCEL_PROCESS;
      }
      if (status === PROCESSING_EVENT.BEFORE_START) {
        this.#isReadyToProcess = true;
        this.#isProcessCancel = false;
      }
      if (status === PROCESSING_EVENT.CANCEL_PROCESS) {
        this.hasCancelProcess = true;
        this.#isProcessCancel = true;
      }
      if (status === PROCESSING_EVENT.FINISH_PROCESS) {
        if (this.#isProcessCancel) {
          status = PROCESSING_EVENT.CANCEL_PROCESS;
        }
      }
      if (status === PROCESSING_EVENT.START_PROCESS) {
        this.#isReadyToProcess = false;
      }
      if (status) {
        this.deviceInfo = { currentStatus: status };
        const handle = this.whenReceiveCmdResolveMap.get(status);
        if (isFunction(handle)) {
          handle(status);
        }
      }

      if (cmd === CLOSE_COVER) {
        if (this.instanceId === this.appContext.instanceId) {
          this.manualPicture();
        }
      }

      // 报警弹框
      const errorObj = config.deviceExceptions && config.deviceExceptions[cmd];
      if (errorObj) {
        logger.log('===设备报错===', errorObj.code);
        this.emit(ExtEvents.Error, errorObj);
        this.deviceInfo = { currentStatus: PROCESSING_EVENT.CANCEL_PROCESS };
      }
    }

    dispose() {
      this.cameraUtil.releaseSource();
      super.dispose();
      this.appContext.destroyMessage(refreshProgressKey);
      this.cancelCaptureImage();
      this.#cameraUtil = null;
    }

    handleDeviceFormValueChanged(
      _: any,
      nextValues: { mode: PROCESSING_MODE },
    ) {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        if (nextValues.mode === PROCESSING_MODE.LASER_CYLINDER) {
          let plugin = canvas.getPluginByName(
            LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
          );
          if (!plugin) {
            plugin = new P1CentralAxisPlugin(
              LASER_CYLINDER_CENTRAL_AXIS_PLUGIN,
            );
            canvas.registerPlugin(plugin);
          }
          // process.env为PC时
          plugin.updateCentralAxis([
            {
              icon: {
                dPath: DEFAULT_D_PATH,
                fillColor: 3380479,
                lineColor: 15658734,
              },
            },
          ]);
          // process.env为mobile和pad时;
          // plugin.updateCentralAxis([
          //   {
          //     icon: {
          //       dPath: DEFAULT_D_PATH,
          //     },
          //     width: 20,
          //     height: 20,
          //     y: 30,
          //     x: 1,
          //   },
          //   {
          //     icon: {
          //       dPath: DEFAULT_D_PATH,
          //       fillColor: 3380479,
          //       lineColor: 15658734,
          //     },
          //   },
          // ]);
        } else {
          canvas.unRegisterPluginByName(LASER_CYLINDER_CENTRAL_AXIS_PLUGIN);
        }
      }
    }

    // 处理 p1设备 gcode参数
    genProcessParams() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;

      transformProcessParams(
        {
          deviceData,
          processingArea,
          config: this.config,
        },
        this.dataParser,
      );
    }

    // 处理 p1设备 支持的元素参数
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
      const gcodeHead = template(templates.gCodeHead)();
      const gcodeTail = template(templates.gCodeTail)();
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
      this.generalGcodeHeadAndTail();
      await super.beforeGenGcode();
    }
  }
  return P1Ext;
}
