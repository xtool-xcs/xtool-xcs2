import {
  CanvasItemType,
  Constructor,
  CurveProcessHelper,
  DEVICE_CANVAS_PLUGIN_CONFIG,
  DEVICE_PROCESSING_MODE,
  DEVICE_TYPE,
  DIRECTION,
  DataSource,
  DeviceExtContainer,
  DownloadFirmwareParam,
  ELEMENT_PROCESSING_COLOR,
  ELEMENT_PROCESSING_MODE,
  GetProcessingTypesData,
  MessageType,
  PROCESSING_EVENT,
  PROCESSING_MODE,
  PROCESSING_TYPE,
  ProcessingAreaData,
  ProcessingUploadData,
  SYSTEM_EVENT,
  SizeType,
  UI_EVENT,
  UploadFirmwareParam,
  blackeningImageData,
  compareVersion,
  gtmLaserSwitch,
  pieceSvg,
  requestCancelable,
} from '@xtool/xcs-logic';
import { CustomDataManager } from '@xtool/xcs-logic/src/ext-container/custom-data';
import {
  clone,
  cloneDeep,
  includes,
  isArray,
  isEmpty,
  isFunction,
  isString,
  omit,
  round,
  set,
  template,
} from 'lodash-es';
import { CacheData } from './cacheData';
import { ScreenPrintPlugin } from './canvas-plugins/screenPrint';
import config from './config';
import {
  AIR_ASSIST_KEY,
  CURVATURE,
  CURVE_CANVAS_PLUGIN_NAME,
  CURVE_MAX_COL,
  CURVE_MAX_ROW,
  CURVE_MIN_COL,
  CURVE_MIN_LENGTH,
  CURVE_MIN_ROW,
  CURVE_POINT_COLOR,
  CUT_AIR_ASSIST,
  DEFAULT_CURVE_DATA,
  DEFAULT_CURVE_TEMP_DATA,
  DEVICE_CHECKER,
  FEEDER_BACK_TO_ORIGIN_KEY,
  LASER_CONVEYOR_FEEDER_PLUGIN,
  LASER_HEADER_DISTANCE,
  MODE_DEFALUT_KA_MSG,
  RECOMMEND_DISTANT,
  SAFE_DISTANT,
  SCORE_AIR_ASSIST,
  SCREEN_PRINT_PLUGIN,
  XTOUCH_TO_FOCAL_DISTANCE,
  Z_MAX,
  Z_SPEED,
  updateLaserHeadRedCross,
} from './constant';
import {
  CurveModelOptions,
  DensityPoint,
  ExtEvents,
  LOCATE_MODE,
  ModeWithCustomPlugin,
  PluginDefinition,
  Position,
} from './types';
import components, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';

import uiAppComponents from './ui-app';
import {
  calculateMD5Hash,
  getAirGear,
  parseData,
  parseMultiPointCmd,
  parserTaskIdString,
} from './utils';
import { STATUS_CMD_PREFIX, UPDATE_FIRMWARE_RESULT_CMD } from './utils/status';

import svgPath from 'svgpath';
import { wait } from 'ts-retry';
import templates from '../src/config/gcode-template';
import {
  CurvePlugin,
  FeederPlugin,
  MULTI_POINT_PLUGIN_NAME,
  MultiPointPlugin,
} from './canvas-plugins';

import { COMMON_VIEW_EVENT, logger, postMessageToMain } from '@xtool/link';
import type { ExtDeviceInfo, ObjectBoundingRect } from '@xtool/xcs-logic';
import { dataChecker, deviceChecker } from './check';
import {
  USB_OUT,
  XTOUCH_DROP,
  XTOUCH_HARDWARE_ERR,
  XTOUCH_UN_RESET,
} from './config/errors';
import { FIRMWARE_METADATA } from './config/firmware';
import { process } from './config/process';
import {
  calLocationPos,
  getLaserHeadInfo,
  getRedCrossOffset,
  getXTouchOffsetByGMode,
  getXTouchOffsetByLaserLight,
} from './utils/calculateOffset';
import { fixNum, getRetangle, isInRetangle } from './utils/curve';
import {
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';
const { RED_CROSS } = LOCATE_MODE;

import { RedCrossPlugin } from './canvas-plugins';

const { LASER_CONVEYOR_FEEDER, SCREEN_PRINT, LASER_CYLINDER } =
  DEVICE_PROCESSING_MODE;
export interface D2Ext extends DeviceExtContainer {
  emitErrorByCmd: (cmd: string) => void;
  measureChecker: () => boolean;
  correctCurveBounds(): () => boolean;
  flammabilityCheck: () => Promise<boolean>;
}

const PLUGIN_NAME = 'd2-canvas-plugin';

export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class D2Ext extends Base {
    ignoreStatusInProcessing = [
      'S2',
      'S4',
      'S7',
      'S9',
      'S10',
      'S16',
      'S20',
      'S21',
      'S22',
      'S23',
      'S24',
    ];

    get deviceInfoKeyShouldSaveToFile() {
      return super.deviceInfoKeyShouldSaveToFile.concat([
        'shouldShowHeadClean',
      ]);
    }

    _walkBorderParams = {
      xyDistance: 50,
      zDistance: 10,
      xySpeed: 100,
      speed: 160,
      power: 0.8,
    };

    hasCancelProcess = false;

    //
    abortRestWhenMesureSuspend = true;
    // 立即响应
    closeModalImmediately = true;

    measureAbortController = new AbortController();
    deviceDataValues = (() => {
      const data = {};
      processingModes.forEach((i) => {
        if (deviceDataValues[i.value]) {
          data[i.value] = { ...deviceDataValues[i.value] };
        }
      });
      return data;
    })();

    // 是否符合弹出易燃提醒的条件
    isFlammability = false;

    elementDataValues() {
      const power = this.deviceInfo?.power || 0;
      // 2W激光头位图模式默认值为 Jarvis
      if (power === 2) {
        const newElementDataValues = cloneDeep(elementDataValues);
        set(
          newElementDataValues,
          `${PROCESSING_TYPE.BITMAP_ENGRAVING}.bitmapMode`,
          'Jarvis',
        );
        return newElementDataValues;
      }
      return elementDataValues;
    }

    processingTypes = processingTypes;
    uploadGCodeAbortController: AbortController | null = null;

    set walkBorderParams({ speed, xyDistance, zDistance, xySpeed }) {
      this._walkBorderParams.xyDistance = xyDistance;
      this._walkBorderParams.zDistance = zDistance;
      this._walkBorderParams.xySpeed = xySpeed;
      this._walkBorderParams.speed = speed;
      this.notifyWatchers('walkBorderParams');
    }

    get walkBorderParams() {
      if (
        this.dataSource?.currentDeviceData?.mode ===
          DEVICE_PROCESSING_MODE.LASER_CONVEYOR_FEEDER &&
        this._walkBorderParams.speed > 160
      ) {
        this._walkBorderParams.speed = 100;
      }
      return {
        ...this._walkBorderParams,
        power: this.deviceInfo.gMode === LOCATE_MODE.RED_CROSS ? 0 : 0.8,
      };
    }

    get airAssistConfigLocalKey() {
      return `${this.deviceInfo.snCode}${AIR_ASSIST_KEY}`;
    }

    get feederBackToOriginKey() {
      return `${this.deviceInfo.snCode}${FEEDER_BACK_TO_ORIGIN_KEY}`;
    }

    get subType() {
      return this.deviceInfo.hasRiseUp === 2
        ? DEVICE_TYPE.DEVICE_FOUR
        : DEVICE_TYPE.DEVICE_ONE;
    }

    handleProjectOpened() {
      this.customData.clear();
    }

    get isNewThen011() {
      const version = this.deviceInfo.version;
      if (!version) {
        return false;
      }
      let mainBoardVersion = '';
      if (isString(version)) {
        mainBoardVersion = version;
      }
      if (Array.isArray(version)) {
        mainBoardVersion = version.find(
          (item) => item.contentId === 'xcs-d2-0x20',
        )?.contentVersion;
      }
      const [x, y, z] = mainBoardVersion.split('.');
      return z >= '011';
      // return true;
    }

    getExceptionsByKey(key: string) {
      const config = super.getExceptionsByKey(key);
      if (!config) {
        return;
      }
      const extractConfigs = {
        [XTOUCH_UN_RESET]: {
          confirmLabelKey: 'device.s1.to_reset',
          closable: true,
          type: 'default',
          confirmAction: async () => {
            await this.beforeMeasure();
            const { laserPosition } = await this.measurePoint(true);
            await this.afterMeasure({ x: laserPosition.x, y: laserPosition.y });
          },
        },
      };
      const extraConfig = extractConfigs[key];

      const result = {
        ...config,
        ...extraConfig,
      };
      logger.log('[ result ] >', result);
      return result;
    }

    /**
     * Creates an instance of DeviceExt.
     * @date 05/11/2022
     * @param {...any[]} args
     */
    constructor(...args: any[]) {
      super(config, ...args);
      this.cacheData = new CacheData(this.apis);
      this.deviceInfo.ableLaserSpot = false;
      this.deviceInfo = {
        [AIR_ASSIST_KEY]: {
          cut: CUT_AIR_ASSIST,
          score: SCORE_AIR_ASSIST,
        },
        shouldShowHeadClean: false,
      };
      this.on(ExtEvents.Disconnected, () => {
        this.isEnableMeasure = false;
      });
    }

    get ui() {
      return components;
    }

    get uiApp() {
      return uiAppComponents;
    }

    // 走边框 检测
    get walkBorderCheckKey() {
      let extraCheckKeys: string[] = [];
      // 走边框不需要检测开盖和地板异常
      const ignoreKeys = ['floor', 'cover', 'tempter'];
      const mode = this.dataSource?.currentDeviceData?.mode;
      if (mode !== PROCESSING_MODE.CURVE_PROCESS) {
        // 非曲面模式才检测焦距
        extraCheckKeys = [DEVICE_CHECKER.FOCAL_LENGTH];
      }
      const keys = [...this.uploadGcodeCheckKey, ...extraCheckKeys].filter(
        (item) => !ignoreKeys.includes(item),
      );
      logger.log(`walkBorderCheckKey===${keys}`);
      return keys;
    }

    // 测量加工区域的检测
    get multiPointCheckKey() {
      return [
        DEVICE_CHECKER.USB_KEY,
        DEVICE_CHECKER.DEVICE_STATUS,
        DEVICE_CHECKER.FOCAL_LENGTH,
      ];
    }

    get usbKey() {
      return ['usbKey'];
    }

    get checkFirmwareKey() {
      return [DEVICE_CHECKER.DEVICE_STATUS, 'firmware'];
    }

    get uploadGcodeCheckKey() {
      const extraCheckKeys = [];
      const mode = this.dataSource?.currentDeviceData?.mode;
      if (mode === PROCESSING_MODE.LASER_CONVEYOR_FEEDER) {
        extraCheckKeys.push('heightening_four');
      }
      return [
        DEVICE_CHECKER.DEVICE_STATUS,
        ...this.usbKey,
        'isReadyToUpload',
        'sdCard',
        'floor',
        'tempter',
        DEVICE_CHECKER.X_TOUCH_NO_MEASURE,
        ...extraCheckKeys,
      ];
    }

    get restartProcessingCheckKey(): string[] {
      return [
        DEVICE_CHECKER.DEVICE_STATUS,
        ...this.usbKey,
        'cover',
        'sdCard',
        'isPause',
        'floor',
        DEVICE_CHECKER.X_TOUCH_NO_MEASURE,
        'tempter',
      ];
    }

    // 自动测量检测
    get measureDistanceCheckKey() {
      return [
        DEVICE_CHECKER.DEVICE_STATUS,
        ...this.usbKey,
        DEVICE_CHECKER.X_TOUCH,
      ];
    }

    // 曲面测量检测
    get curveMeasureCheckKey() {
      return [
        DEVICE_CHECKER.DEVICE_STATUS,
        DEVICE_CHECKER.X_TOUCH,
        ...this.usbKey,
      ];
    }

    flammabilityCheck() {
      return new Promise((resolve) => {
        const createFireproofVNode = () => {
          const FlammabilityTips1 = this.appContext.createElement(
            'div',
            this.appContext.formatMsg('device.s1.fireproof_tips_1'),
          );
          const FlammabilityTips2 = this.appContext.createElement(
            'div',
            `1.${this.appContext.formatMsg('device.s1.fireproof_tips_2')}`,
          );
          const FlammabilityTips3 = this.appContext.createElement(
            'div',
            `2.${this.appContext.formatMsg('device.s1.fireproof_tips_3')}`,
          );
          return {
            content: this.appContext.createElement('div', [
              FlammabilityTips1,
              FlammabilityTips2,
              FlammabilityTips3,
            ]),
          };
        };
        if (
          !this.isFlammability ||
          this.deviceInfo.power === 2 ||
          this.deviceInfo.power === 10
        ) {
          resolve(true);
          return;
        }
        const content = `${this.appContext.formatMsg(
          'device.s1.fireproof_tips_1',
        )}
        </br>1.${this.appContext.formatMsg('device.s1.fireproof_tips_2')}
        </br>2.${this.appContext.formatMsg('device.s1.fireproof_tips_3')}`;
        const isApp = (window as any).VITE_APP;

        this.appContext.dialog.warning({
          closable: false,
          name: 'fireWarning',
          title: this.appContext.formatMsg('device.s1.fireproof_title'),
          content: !isApp ? () => createFireproofVNode().content : content,
          positiveText: this.appContext.formatMsg('device.s1.ok_process'),
          negativeText: this.appContext.formatMsg('device.common.cancel'),
          onPositiveClick: () => {
            resolve(true);
          },
          onNegativeClick: () => {
            resolve(false);
          },
        });
      });
    }

    // 获取对象支持的加工类型
    getProcessingTypes({ mode, imageType }: GetProcessingTypesData) {
      const list = super.getProcessingTypes({ mode, imageType });
      const power = this.deviceInfo.power;
      const res = list.filter((i: any) => {
        return !(i?.ignorePower || []).includes(power);
      });
      return res;
    }

    get processingAreaKey() {
      const mode = this.dataSource?.currentDeviceData?.mode;
      if (mode === LASER_CONVEYOR_FEEDER) {
        return LASER_CONVEYOR_FEEDER;
      }
      const power = this.deviceInfo.power
        ? this.deviceInfo.power
        : this.config.defaultPower;
      if (mode === LASER_CYLINDER) {
        return `${power}${LASER_CYLINDER}`;
      }
      return `${power}`;
    }

    // 获取原来在配置里的区域信息
    getOriginCurrentArea() {
      const data = super.getCurrentArea('');
      return data;
    }

    getCurrentArea() {
      // 复写基类的方法，不需要拼接 加工模式查找幅面配置
      const data = cloneDeep(super.getCurrentArea(''));
      const headInfo = getLaserHeadInfo(this.deviceInfo.power);
      const redCrossOffset = getRedCrossOffset(headInfo);
      const startY =
        this.deviceInfo.gMode === RED_CROSS ? Math.abs(redCrossOffset.y) : 0;
      const mode = this.dataSource?.currentDeviceData?.mode;
      // 送料模式startY 为定值，不可被复写
      // 仅走边框需要限制
      if (mode !== LASER_CONVEYOR_FEEDER && this.dataParser?.isWalkBorder) {
        data.base.startY = startY;
        data.current.startY = startY;
      }
      if (mode === PROCESSING_MODE.CURVE_PROCESS) {
        const curveModeData = this.customData.getData(
          `${this.canvasId}.${mode}`,
        );
        const densityArea = curveModeData?.curveData?.densityArea;
        if (densityArea) {
          const { base, current } = data;
          const { offsetX = 0, offsetY = 0 } = current;
          return {
            base,
            current: {
              ...current,
              startX: densityArea.x + offsetX,
              startY: densityArea.y + offsetY,
              endX: densityArea.x + offsetX + densityArea.width,
              endY: densityArea.y + offsetY + densityArea.height,
            },
          };
        }
      }
      return data;
    }

    setKeepAliveMsg(keepAlive: any) {
      this.emit(SYSTEM_EVENT.SET_KEEP_ALIVE_MESSAGE, keepAlive);
    }

    updateDeviceInfo(info: Partial<ExtDeviceInfo>) {
      const oldInfo = this.deviceInfo;
      // 检测到激光头瓦数有改变后需要更新丝网
      // if (oldInfo.power !== info?.power) {
      //   const currentMode = this.dataSource?.currentDeviceData?.mode;
      //   const canvas = this.dataSource?.canvasManager.canvas;
      //   this.handleProcessModeCanvasPlugin(canvas, currentMode);
      // }
      super.updateDeviceInfo(info);
    }

    isSupportTaskId() {
      try {
        const versions = ((<unknown>this.deviceInfo.version) as any[]).reduce(
          (acc, cur) => {
            acc[cur.contentId] = cur.contentVersion;
            return acc;
          },
          {},
        );
        const mainBoardVersionNo = Number(
          versions['xcs-d2-0x20'].split('.')[2],
        );
        const wifiBoardVersionNo = Number(
          versions['xcs-d2-0x22'].split('.')[2],
        );
        if (mainBoardVersionNo >= 9 && wifiBoardVersionNo >= 9) {
          return true;
        }
        return false;
      } catch (error) {}

      return false;
    }

    // ------------------------- START 加工相关 ----------------------- //
    async checkProcessData({
      canvasData,
      centralAxisPosition,
      isWalkBorder = false,
      dataSource,
      isExportGcode = false,
      layerOrder,
    }: {
      canvasData: CanvasItemType[];
      canvasId: string;
      centralAxisPosition: number;
      isWalkBorder: boolean;
      dataSource: DataSource;
      isExportGcode: boolean;
      layerOrder: string[];
    }) {
      let laserPosition = { x: 0, y: 0 };
      let hardWareAirAssist = false;
      try {
        if (this.connected) {
          laserPosition = await this.apis?.getLaserCoord();
          if (!isWalkBorder) {
            hardWareAirAssist = await this.apis?.queryAirAssist();
          }
        }
      } catch (error) {
        logger.error('获取激光头位置错误', error);
        laserPosition = { x: 0, y: 0 };
      }
      this.deviceInfo = {
        laserPosition,
        hardWareAirAssist,
      };
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
      return super.checkProcessData({
        canvasData: canvasData,
        centralAxisPosition,
        isWalkBorder,
        dataSource,
        isExportGcode,
        layerOrder,
      });
    }

    genProcessElements(proload?: { isWalkBorder: boolean }) {
      const { current, base } = this.getCurrentArea();
      const processingArea = current || base;
      return transformElements(
        {
          config: this.config.process,
          processingArea,
          deviceInfo: this.deviceInfo,
          isWalkBorder: proload?.isWalkBorder,
        },
        this.dataParser,
      );
    }

    async measureChecker() {
      const laserPosition = await this.apis.getLaserCoord();
      const { x, y } = this.calLaserPosByMeasurePos(laserPosition);
      const { current } = this.getOriginCurrentArea();
      return isInRetangle({ x, y }, current);
    }

    // 标定加工区域
    @dataChecker.multiPoint()
    @deviceChecker.multiPoint()
    multiPoint() {}

    // 上传走边框 GCode
    async httpUploadFrameGCode(name: string, gcode: string) {
      const { signal } = requestCancelable();
      const options = {
        // signal,
        data: { gcode },
        params: { filename: name },
      };
      await this.apis.uploadGcode(options);
      await this.afterWriteFile(false, false);
    }

    async httpUploadGCode(
      name: string,
      gcode: string,
      onProgress?: (...args: any) => void,
    ) {
      const options = {
        method: 'info',
        params: { filename: name },
      };
      const uploadCfg = await this.apis.uploadGcode(options);
      const paramStr = new URLSearchParams({ filename: name }).toString();
      const url = new URL(
        `${uploadCfg.url}?${paramStr}`,
        uploadCfg.baseUrl,
      ).toString();
      try {
        await this.uploadGCodeByNative({
          url,
          path: gcode,
          options: {
            mode: 'text',
            isFullPath: false,
            onProgress: (percent: number) => {
              isFunction(onProgress) && onProgress(percent);
            },
            onCancel: (cancel: any) => {
              this.uploadGcodeCancelable = cancel;
            },
          },
        });
      } catch (error: any) {
        logger.info('S1 uploadGCodeByNative error', error.toString());
        throw new Error(error);
      }
    }

    // 串口上传 GCode
    async serialUploadGCode(
      name: string,
      gcode: string,
      onProgress: (...args: any) => void,
      tabId: string,
    ) {
      // 进入上传文件模式
      // const enterRes = await this.apis.setFileTransferStatus('S0');
      // logger.log(['进入上传文件模式', enterRes]);
      // this.on('UploadFileProgress', (percent: number) => {
      //   isFunction(onProgress) && onProgress(percent);
      // });
      await this.device.uploadFile({
        data: { gcode, name },
        tabId,
        // TODO: 临时添加用于测试上传
        // @ts-ignore
        limit: window.UPLOAD_LIMIT,
        isWalkBorder: name === 'frame.gcode',
        onProgress: (ev: number) => {
          // const complete = ev.loaded / ev.total;
          // logger.debug(['d2 serial upload gcode progress', complete]);
          isFunction(onProgress) && onProgress(ev);
        },
        onCancel: (cancel: any) => {
          // logger.debug('=> on cancel', cancel);
          this.uploadGcodeCancelable = cancel;
        },
      });
    }

    // 上传 GCode
    @deviceChecker.uploadGCode()
    async uploadGCode(opts?: ProcessingUploadData) {
      this.uploadGCodeAbortController = new AbortController();
      this.hasCancelProcess = false;
      try {
        console.log(['supportTaskId=>', this.supportTaskId]);
        this.apis.setTaskId(
          this.taskManager.getTask(this.deviceInfo.snCode).id,
        );
        await Promise.race([
          // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
          new Promise(async (resolve, reject) => {
            try {
              const gcode = this.taskManager.getTask(
                this.deviceInfo.snCode,
              ).gcode;
              const { onProgress } = opts || {};
              if (this.serialportMode) {
                await this.serialUploadGCode(
                  'tmp.gcode',
                  gcode,
                  onProgress,
                  opts.tabId,
                );
              } else {
                await this.httpUploadGCode('tmp.gcode', gcode, onProgress);
              }
              resolve(true);
            } catch (error) {
              reject(error);
            }
          }),
          new Promise((resolve, reject) => {
            this.uploadGCodeAbortController?.signal.addEventListener(
              'abort',
              (error: any) => {
                logger.log(
                  '[ 上传过程中下位机状态异常 ] >',
                  error.target.reason,
                );
                this.cancelUploadGCode && this.cancelUploadGCode();
                reject(new Error(error.target.reason));
              },
            );
          }),
        ]);
      } catch (error: any) {
        throw new Error(error);
      } finally {
        logger.log('销毁===>uploadGCodeAbortController');
        this.uploadGCodeAbortController = null;
      }
      return true;
    }

    // 开始加工
    startProcessing(): Promise<boolean> {
      return this.uploadGCode();
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

    // 开始走边框
    @deviceChecker.buildWalkBorder()
    async startWalkBorder(gcode: string, opts?: any) {
      if (this.serialportMode) {
        await this.serialUploadGCode('frame.gcode', gcode);
      } else {
        await this.httpUploadFrameGCode('frame.gcode', gcode);
      }
      const { autoStart = false } = opts ?? {};
      // 进入走边框模式
      await this.apis.setFrameStatus('S0');
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, true);
      if (autoStart) {
        await this.apis.setFrameStatus('S1');
      }
    }

    // 停止走边框
    async stopWalkBorder() {
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
      this.apis.setFrameStatus('S2');
    }

    // 取消 axios
    uploadGcodeCancelable: any;

    // 终止上传 gcode
    cancelUploadGCode() {
      logger.log(['=> cancelUploadGCode']);
      if (isFunction(this.uploadGcodeCancelable)) {
        this.uploadGcodeCancelable();
      }
    }

    // ------------------------- END 加工相关 ----------------------- //
    @deviceChecker.downloadFirmware()
    async downloadFirmware(params: DownloadFirmwareParam): Promise<any> {
      if (this.serialportMode) {
        const { url, ...rest } = params;
        return this.device.downloadFirmware({
          ...rest,
          url: isArray(url) ? url[0] : clone(url),
        });
      }
      const { url, onDownloadProgress } = params;
      const res: Record<string, string> = {};
      let index = 0;
      const count = Object.values(url).length;
      for (const key in url) {
        res[key] = await super.downloadFirmware({
          url: [url[key]],
          onDownloadProgress(data) {
            const { loaded, total } = data;
            isFunction(onDownloadProgress) &&
              onDownloadProgress({
                total: total,
                loaded: loaded,
                index,
                count,
              });
          },
        });
        index++;
      }
      return res;
    }

    async updateFirmware(opts: UploadFirmwareParam) {
      const { data, ...rest } = opts;
      const config = cloneDeep(FIRMWARE_METADATA);
      for (const key in data) {
        const fp: string | Blob = data[key];
        const meta = config.board.find((b) => b.key === key);
        if (meta) {
          if (fp instanceof Blob) {
            meta.source = fp;
          } else {
            meta.fpath = fp;
          }
        }
      }
      if (this.serialportMode) {
        const restData = omit(rest, 'md5List');
        return this.device.updateFirmware({
          ...restData,
          config,
          useF0f7: true,
          connectIdentity: this.device.connectIdentity,
        });
      }
      // 关闭连接
      // this.device.close();
      return this.httpUploadFirmware({ ...rest, ...config });
    }

    async httpUploadFirmware(data: any) {
      try {
        const { onUploadProgress, board: boards, md5List } = data;
        const burnTypeArg = [];
        for (const index in boards) {
          const board = boards[index];
          const { source, key, params } = board;
          if (source) {
            const md5 = md5List[key];
            const md5file = await calculateMD5Hash(source);
            if (md5 !== md5file) {
              return Promise.reject(`S1 固件${key}签名对比失败`);
            }
            if (params?.burnType) {
              burnTypeArg.push(params.burnType);
            }
            const updateRet = await this.apis.uploadFirmware({
              data: source,
              name: 'uploadFirmware',
              params: { ...params, md5 },
            });
            if (updateRet !== true) {
              throw new Error(`S1 固件${key}上传失败`);
            }
          }
        }
        // 2个以上的固件升级传0，单个固件升级传对应的code
        const startRet = await this.apis.startUpdateFirmware({
          params: { code: burnTypeArg.length === 1 ? burnTypeArg.join() : 0 },
        });
        if (startRet !== true) {
          throw new Error(`S1 固件启动更新失败`);
        }
        let isFinish = false;
        const FirmwareAbortController = new AbortController();
        await Promise.race([
          // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
          new Promise<void>(async (resolve, reject) => {
            let errorCount = 0;
            try {
              let updatePercent = 0;
              while (isFinish === false) {
                const ret = await this.apis.updateFirmWareProgress({}, true);
                logger.log(`wifi模式固件更新进度===> ${ret}`);
                // biome-ignore lint/suspicious/noGlobalIsFinite: <explanation>
                if (isFinite(ret)) {
                  updatePercent = ret;
                  onUploadProgress({
                    percent: updatePercent,
                  });
                }
                await wait(2000);
              }
              resolve();
            } catch (error) {
              errorCount++;
              // 5次获取不到进度判定为更新失败
              if (errorCount === 5) {
                reject('5次请求更新进度失败');
              }
            }
          }),
          new Promise((resolve, reject) => {
            this.on(ExtEvents.Disconnected, () => {
              logger.log('disConnect on wifi updateFirmware');
              isFinish = true;
              FirmwareAbortController.abort('disConnect');
              reject('disConnect on wifi updateFirmware');
            });
          }),
          // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
          new Promise<void>(async (resolve, reject) => {
            try {
              const cmd = await this.whenReceiveCmd(
                UPDATE_FIRMWARE_RESULT_CMD,
                1000 * 60 * 10,
                FirmwareAbortController,
              );
              isFinish = true;
              const [, a, b] = cmd.split(' ');
              // wifi 模式下固件升级成功后，不会退出固件升级状态，这里通过 M108 让其退出固件升级模式
              await this.apis.toIdleMode();
              logger.log('固件升级结果', cmd);
              const messageResultMap = {
                A2: '打开或读取升级文件失败',
                A3: '文件类型不匹配',
                A4: 'CRC校验不匹配',
                A5: '升级文件版本与当前版本一致错误',
                A6: '读取固件处于boot或APP超时',
                A7: '读取传输文件头超时',
                A8: '读取传输文件体超时',
                A9: '读取升级结果超时',
              };
              const typeResultMap = {
                B1: '主控',
                B2: '激光器',
                B3: 'wifi模组',
                B4: '净化器',
                B5: '气泵',
              };
              if (a === 'A1') {
                resolve();
              } else {
                const type = typeResultMap[b];
                const message = messageResultMap[a];
                reject(`${type}${message}`);
              }
            } catch (error: any) {
              isFinish = true;
              reject(error.toString());
            }
          }),
        ]);
      } catch (error: any) {
        logger.error('固件更新错误', error.toString());
        throw new Error(error.toString());
      }
    }

    afterUpdateFirmWare() {
      if (this.serialportMode) {
        return;
      }
      return this.afterWriteFile(false, false);
    }

    afterWriteFile(isProcess: boolean, isAbort: boolean) {
      if (isAbort) {
        this.apis.afterWriteFile();
        return;
      }
      // if(this.serialportMode && isAbort)
      return this.apis.afterWriteFile(isProcess ? 'S1' : 'S0');
    }

    async commonCheckVersion(version: string) {
      // let checkVal = 0;
      const newVersions = await this.apis.version();
      const [, , aWifiVer] = version.split(',');
      const [bWifiVer] = newVersions.split(',');
      const cv = compareVersion(bWifiVer?.replace('V', ''), aWifiVer);

      // for (let index = 0; index < vers.length; index++) {
      //   const av = vers[index];
      //   const bv = nvers[index]?.replace('V', '');
      //   const cv = compareVersion(av, bv);
      //   logger.log({ cv, av, bv });
      //   checkVal += cv;
      // }
      // logger.log({ vers, nvers, checkVal });
      if (cv >= 0) {
        return true;
      }
      return Promise.reject(`commonCheckVersion error ${newVersions}`);
    }

    async checkFirmwareUpdated(version: string) {
      // 串口模式下不用对比固件版本号等待3秒以后自动成功(上传成功后)
      if (this.serialportMode) {
        await wait(3000);
        return Promise.resolve(true);
      }
      return super.checkFirmwareUpdated(version, {
        delay: 1000,
        loopCount: 20,
      });
    }

    exportLog() {
      return super.exportLog('xcs_s1_log.txt');
    }

    async resetCurveLaserHead() {
      await this.apis?.moveLaserToZero();
    }

    @deviceChecker.moveCurveLaserPosition()
    async moveCurveLaserPosition(
      direction: DIRECTION,
      distance: number = LASER_HEADER_DISTANCE,
    ) {
      const { x, y } = await this.apis.getLaserCoord();
      const directionMap = {
        [DIRECTION.TOP]: { x, y: y - distance },
        [DIRECTION.BOTTOM]: { x, y: y + distance },
        [DIRECTION.LEFT]: { x: x - distance, y },
        [DIRECTION.RIGHT]: { x: x + distance, y },
      };
      await this.moveLaserToPoint({
        ...directionMap[direction],
      });
      // TODO: 移动边界检测
      return { hasMax: false };
    }

    async moveLaserToPoint(
      point: { x: number; y: number; z?: number },
      speed = 3600,
      abortController?: AbortController,
    ) {
      await this.apis?.moveToPoint({
        x: point.x,
        y: point.y,
        z: point.z,
        speed,
      });
      await this.whenReceiveCmd('M22', 30000, abortController);
    }

    async beforeMeasure() {
      logger.info(['1. 进入测量模式']);
      await this.apis?.toIdleMode();
      await this.apis?.enterMeasureMode();
      logger.info(['1-1. 进入测量模式成功']);
      this.measureAbortController = new AbortController();
    }

    async afterMeasure(resetPos?: Position) {
      // 还在正常测量阶段，执行复位平台复位
      // 发生异常后执行到此处直接退出对焦模式
      if (this.isEnableMeasure) {
        await this.apis.moveZToPoint({ z: -2, speed: Z_SPEED * 60 });
        await this.apis.moveToResetFocusModel({
          ...this.deviceInfo.xTouchResetPos,
          speed: LASER_HEADER_DISTANCE,
        });

        await this.whenReceiveCmd('M22', 30000, this.measureAbortController);
        await this.apis.resetFocusModel();
        logger.info('2. 重置对焦模块完成');

        // 回到原来位置
        if (resetPos) {
          // 回到原来的位置时，软件主动让z轴回0，如果不加，固件在此时会移到-2导致探针会伸出
          await this.moveLaserToPoint(
            { x: resetPos.x, y: resetPos.y, z: 0 },
            LASER_HEADER_DISTANCE,
          );
        }
      }

      logger.info(['3. 退出测量模式']);
      // 这里使用同步来调用，在 M222 S1 和 S3 时做等待处理
      // 解决注册 监听器时 M222 S1 已经返回的问题
      this.apis?.exitMeasureMode();
      logger.info(['3-1. 退出测量模式成功']);
      logger.log('[ afterMeasure] >');
    }

    // z 表示xtouch下探的距离
    async measure() {
      logger.log('启动测量');
      await this.apis.startMeasure();
      if (!this.isEnableMeasure) {
        throw new Error('suspend');
      }
      const [m313, m311] = await Promise.all([
        // this.whenReceiveCmd('M313', 10000, this.measureAbortController),
        this.whenReceiveCmd('M313', 10000, this.measureAbortController),
        // M311 指令的超时时间由测距的极限距离决定
        this.whenReceiveCmd('M311', 15000, this.measureAbortController),
      ]);
      const z = parseData(m313, 'Z') ?? NaN;
      const res = parseData(m311, 'S');
      const result = { z, valid: res === 2 };
      logger.log(['完成测量', result]);
      return result;
    }

    handleProcessModeCanvasPlugin(
      canvas: any,
      currentMode: DEVICE_PROCESSING_MODE,
    ) {
      if (!canvas) {
        return;
      }
      const pluginMap: Record<ModeWithCustomPlugin, PluginDefinition> = {
        [LASER_CONVEYOR_FEEDER]: {
          name: LASER_CONVEYOR_FEEDER_PLUGIN,
          createPluginInstance: FeederPlugin,
          update: (plugin, current) => {
            const { width, startY = 0 } = current;
            const {
              LIMIT_TYPE: { fillAlpha, fillColor },
            } = DEVICE_CANVAS_PLUGIN_CONFIG;
            plugin.updateMask({ fillColor, fillAlpha, width, height: startY });
          },
        },
        [SCREEN_PRINT]: {
          name: SCREEN_PRINT_PLUGIN,
          createPluginInstance: ScreenPrintPlugin,
          update: (plugin) => {
            const { mode, data } = this.dataSource?.currentDeviceData;
            const { meshSize } = data[mode];
            const { screenPrintArea, meshSize: meshSizeMap } = this.config;
            const { x, y } = screenPrintArea[meshSize][
              this.deviceInfo.power
            ] || {
              x: 0,
              y: 0,
            };
            const { width, height } = meshSizeMap[meshSize];
            const {
              LIMIT_AREA_TYPE: { lineWidth, lineColor },
            } = DEVICE_CANVAS_PLUGIN_CONFIG;
            plugin.updateRoundRect({
              lineWidth,
              lineColor,
              width,
              height,
              y,
              x,
            });
          },
        },
      };
      // 注销插件
      Object.keys(pluginMap).forEach((mode) => {
        if (mode !== currentMode) {
          canvas.unRegisterPluginByName(pluginMap[mode].name);
        }
      });
      // 注册插件
      if (pluginMap[currentMode]) {
        const { name, createPluginInstance, update } = pluginMap[currentMode];
        let plugin = canvas.getPluginByName(name);
        if (!plugin) {
          plugin = new createPluginInstance(name);
          canvas.registerPlugin(plugin);
        }
        const { current } = this.getCurrentArea();
        update(plugin, current);
      }
    }

    handleDeviceFormValueChanged(
      _: any,
      nextValues: { mode: DEVICE_PROCESSING_MODE },
    ) {
      const currentMode = nextValues.mode;
      const canvas = this.dataSource?.canvasManager.canvas;
      if (!canvas) {
        return;
      }
      if (_.mode !== currentMode) {
        // 常驻提示(旋转附件模式需要弹出)
        this.setKeepAliveMsg(MODE_DEFALUT_KA_MSG[currentMode]);
      }
      // 不同加工模式下处理插件
      this.handleProcessModeCanvasPlugin(canvas, currentMode);
    }

    // 测量距离
    @deviceChecker.measurePoint()
    async measureDistance() {
      return await this.measurePoint();
    }

    /**
     * 测量单个点
     * 1. 移动激光头
     * 2. 启动测距 M311 S0
     * 3. 收到测距完成或失败 M311 S(1|2)
     * 4. 收到 M22 S0 移动停止（包括不仅限激光头或者测距传感器移动）
     * @date 14/03/2023
     * @param {{
     *       x: number;
     *       y: number;
     *     }} point
     * @return {*}  {Promise<{ z: number; valid: boolean }>}
     */
    async measurePoint(
      onlyResetXtouch = false,
      originLaserPosition?: Position,
      ready = false,
    ): Promise<{ z: number; valid: boolean; laserPosition: Position }> {
      this.isEnableMeasure = true;
      const laserPosition =
        originLaserPosition || (await this.apis.getLaserCoord());

      const { x, y } = this.calLaserPosByMeasurePos(laserPosition);

      const res = { z: -1, valid: false, laserPosition: { x: 0, y: 0 } };

      if (!onlyResetXtouch) {
        // const pass = await this.measureChecker(laserPosition);
        // if (!pass) {
        //   return res;
        // }
        if (!ready) {
          await this.beforeMeasure();
        }
        await this.moveLaserToPoint({ x, y });
        const { z } = await this.measure();
        res.z = z;
        res.valid = true;
      }
      res.laserPosition = laserPosition;
      return res;
    }

    toggleMultiPointPlugin(data: any, status = true) {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (!canvas) {
        return;
      }
      let canvasPlugin = canvas.getPluginByName(MULTI_POINT_PLUGIN_NAME);
      if (status) {
        if (!canvasPlugin) {
          canvasPlugin = new MultiPointPlugin(MULTI_POINT_PLUGIN_NAME);
          canvas.registerPlugin(canvasPlugin);
        }
        canvasPlugin.updateMeasureArea(data);
      } else {
        canvas.unRegisterPlugin(canvasPlugin);
      }
    }

    emitErrorByCmd(cmd: string) {
      const config = this.getExceptionsByKey(cmd);
      if (!config) {
        return;
      }
      const shouldIgnore = config?.shouldIgnore?.(this);
      if (shouldIgnore) {
        logger.info(`收到错误消息 ${cmd} 但不展示`);
        return;
      }
      this.uploadGCodeAbortController?.abort(cmd);
      this.measureAbortController?.abort();
      this.emit(ExtEvents.Error, {
        ...this.getExceptionsByKey(cmd),
        msg: `device.s1.error.${cmd.toLowerCase().split(' ').join('_')}`,
      });
      config.receiveHandler?.(this);
    }

    getConvertedCmdValue(cmd: string) {
      const { processingStateMap = {} } = this.config.process;
      return isEmpty(processingStateMap[cmd]) ? cmd : processingStateMap[cmd];
    }

    // 监听socket信息
    deviceCmdParsing(cmd: string) {
      // console.log('收到指令', cmd);
      // logger.log('收到指令', cmd);
      if (isString(cmd)) {
        cmd = cmd.replace(/[\r\n]/g, '');
      }
      if (
        [XTOUCH_UN_RESET, XTOUCH_HARDWARE_ERR, XTOUCH_DROP, USB_OUT].includes(
          cmd,
        )
      ) {
        this.isEnableMeasure = false;
      }
      // TODO 此问题待下位机处理，送料配件只会有增高架异常
      if (
        this.dataSource?.currentDeviceModeData.mode === LASER_CONVEYOR_FEEDER
      ) {
        if (['M53 C1', 'M53 C2'].includes(cmd)) {
          return;
        }
      }
      this.emitErrorByCmd(cmd);

      //任务id
      if (cmd.includes('M810')) {
        const taskId = parserTaskIdString(cmd.split(' ')[1].replace(/"/g, ''));
        this.deviceInfo = { taskId: taskId };
      }
      if (cmd.includes(STATUS_CMD_PREFIX)) {
        // 处理固件返回乱码
        cmd = cmd.replace(/.+M/, 'M');
        if (this.whenReceiveCmdResolveMap.has(cmd)) {
          const handle = this.whenReceiveCmdResolveMap.get(cmd);
          if (isFunction(handle)) {
            handle(cmd);
          }
        }
        const convertedCmd = this.getConvertedCmdValue(cmd);
        this.deviceInfo = { currentStatus: cmd };

        // 处理走边框过程中，因为下位机操作导致的走边框被取消的问题
        if (convertedCmd === PROCESSING_EVENT.CANCEL_PROCESS) {
          this.hasCancelProcess = true;
          this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
        }
        // TODO
        this.emit(SYSTEM_EVENT.DEVICE_STATE_CHANGE, convertedCmd);
      } else if (cmd.startsWith('M')) {
        const [mCmd, val] = cmd.split(' ');

        if (mCmd === 'M372') {
          this.emit('handleReceiveMultiPoint', parseMultiPointCmd(val));
          this.handleReceiveStickerPoint(parseMultiPointCmd(val));
        }
        // 温度上报
        if (mCmd === 'M1104') {
          const tempter = parseData(val, 'T');

          this.deviceInfo = { tempter: tempter };
          if (
            <number>tempter >= 38 &&
            <number>tempter < 40 &&
            ['M222 S14', PROCESSING_EVENT.START_PROCESS].includes(
              this.deviceInfo.currentStatus,
            )
          ) {
            this.emitErrorByCmd('M53 W0');
          }
        }
        // USB 钥匙
        if (mCmd === 'M53') {
          if (['S0', 'S1'].includes(val)) {
            const usbKey = parseData(val, 'S') === 1;
            this.deviceInfo = { usbKey: usbKey };
          }
          if (['T0', 'T1'].includes(val)) {
            const sdCard = parseData(val, 'T') === 1;
            this.deviceInfo = { sdCard: sdCard };
          }
          if (['B0', 'B1'].includes(val)) {
            const coverIsClose = parseData(val, 'B') === 0;
            this.deviceInfo = { coverIsClose: coverIsClose };
          }
          if (['C0', 'C1', 'C2'].includes(val)) {
            const floor = Number(parseData(val, 'C'));
            this.deviceInfo = { floor: floor };
          }
        }
        if (this.whenReceiveCmdResolveMap.has(mCmd)) {
          const handle = this.whenReceiveCmdResolveMap.get(mCmd);
          if (isFunction(handle)) {
            if (mCmd !== UPDATE_FIRMWARE_RESULT_CMD) {
              handle(val);
            } else {
              // 固件更新状态 socket 返回标志为 M811 Ax Bx，这里直接将命令返回业务层做处理
              handle(cmd);
            }
          }
        }
      }
    }

    // 拍照对位上报贴纸坐标
    async handleReceiveStickerPoint(pos: any) {
      console.log('handleReceiveStickerPoint', pos);
      const { x, y } = pos;
      const { power, gMode } = this.deviceInfo;
      const locationPos = calLocationPos({ x, y }, power, gMode);
      // const currentRedCrossOffset =
      //   await props.ext.apis?.getCurrentRedCrossOffset();
      // logger.log('[ currentRedCrossOffset ] >', currentRedCrossOffset);
      const item: Position = {
        x: round(locationPos.x, 1),
        y: round(locationPos.y, 1),
      };
      this.emit('handleReceiveStickerPoint', item);
    }

    // 处理软件 Mqtt信息
    // 场景1：拍照传输  https://makeblock.feishu.cn/docx/XRjRdOhJToU1NOxGhV0cImLTnie
    handleMqttMessage(data: any) {
      // console.log('[ s1 handleMqttMessage] >', data);
      const { module = '' } = data || {};
      if (module === 'ext:photo_transfer') {
        this.emit('handlePhotoTransfer', data);
      }
    }

    // ------------------   曲面测量逻辑 -----------------
    // TODO: 将曲面测量逻辑抽离

    customData = new CustomDataManager();
    cacheData: CacheData;

    curveWorker: CurveProcessHelper | undefined;
    // 曲率提示和预览图颜色范围设定
    curvature = CURVATURE;

    get curveModeDataPath() {
      return `${this.canvasId}.${PROCESSING_MODE.CURVE_PROCESS}`;
    }

    // 曲面流程开始
    @deviceChecker.beforeCurveMeasure()
    async beforeCurveMeasure() {
      this.isEnableMeasure = true;
      const curveModeData = this.customData.getData(this.curveModeDataPath);

      if (!curveModeData || !curveModeData?.curveData) {
        this.customData.setData(this.curveModeDataPath, DEFAULT_CURVE_DATA());
        return true;
      }
      curveModeData.curveData.tempData = DEFAULT_CURVE_TEMP_DATA();
      curveModeData.curveData.remeasurePoints = [];

      const { power, redCrossInfo } = this.deviceInfo;
      const { maxZ } = redCrossInfo;
      if (!redCrossInfo) {
        logger.error('redCrossInfo 缺失， 可能获取设备信息时出错');
      }

      // 曲面时取1/2处的偏移
      updateLaserHeadRedCross(power, redCrossInfo, maxZ / 2);
      return true;
    }

    // 完成曲面预览
    finishCurvePreview() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const curveData = data[mode]?.curveData;

      const { current: _curveArea } = this.getCurrentArea();

      const offsetX = _curveArea?.offsetX ?? 0;
      const offsetY = _curveArea?.offsetY ?? 0;
      const start = {
        x: curveData.locationStartPos.x + offsetX,
        y: curveData.locationStartPos.y + offsetY,
      };
      const end = {
        x: curveData.locationEndPos.x + offsetX,
        y: curveData.locationEndPos.y + offsetY,
      };
      const plugin = this.toggleSelectionPlugin(this.dataSource, true);
      if (plugin) {
        plugin.updateRect({
          x: start.x,
          y: start.y,
          width: Math.abs(end.x - start.x),
          height: Math.abs(end.y - start.y),
        });
      }
    }

    // 激光头位置展示类插件
    toggleLaserPosInCanvas = (status: boolean) => {
      this.customData?.setData(`${this.canvasId}.showCoord`, status);

      const canvas = this.dataSource?.canvasManager.canvas;
      let canvasPlugin = canvas.getPluginByName(PLUGIN_NAME);
      gtmLaserSwitch({ status: status ? 'on' : 'off' });
      if (status) {
        if (!canvasPlugin) {
          canvasPlugin = new RedCrossPlugin(PLUGIN_NAME);
        }
        canvas.registerPlugin(canvasPlugin);
      } else {
        canvas.unRegisterPlugin(canvasPlugin);
        canvasPlugin = null;
      }
    };

    onActive() {
      const mode = this.dataSource?.currentDeviceData?.mode as PROCESSING_MODE;
      this.toggleLaserPosInCanvas(
        this.customData?.getData(`${this.canvasId}.showCoord`),
      );
      if (mode === PROCESSING_MODE.CURVE_PROCESS) {
        this.finishCurvePreview();
      }
      const canvas = this.dataSource?.canvasManager.canvas;

      this.handleProcessModeCanvasPlugin(canvas, mode);
      // if (mode === PROCESSING_MODE.SCREEN_PRINT) {
      //   this.finishCurvePreview();
      // }
    }

    cancelCurveMeasure() {
      this.measureAbortController.abort();
    }

    // 中途取消曲面测量
    async afterCurveMeasure(isMeasuing: boolean) {
      if (isMeasuing) {
        // 如果是测量中取消，需要退出复位并退出测量模式
        await this.afterCurveMeasureAllPoints();
      }
      // await this.apis.turnOffLocalIrLed();
      // await this.apis.turnLight();
    }

    // 记录曲面开始点和结束点的前置行为 /
    @deviceChecker.beforeRecordCurvePosition()
    async beforeRecordCurvePosition() {
      // await this.toggleCurveIrLed(true);
      this.resetCurveTempData();
      return true;
    }

    // 记录完开始点和结束点后的结束行为
    @deviceChecker.afterRecordCurvePosition()
    async afterRecordCurvePosition() {
      // 自动关灯关红外
      // await this.toggleCurveIrLed(false);
      return true;
    }

    // 曲面测量边界点(开始点、结束点)
    // async curveMeasureBoundsPoint(_?: any) {
    //   // const position = await this.curveMeasurePoint(data);
    //   // return position;
    // }

    // 是否允许测量，当xtouch发生异常时置为false
    isEnableMeasure = true;

    // measurePromis.stop();
    // 曲面测量密度点
    async curveMeasurePoint(data?: any) {
      if (!this.isEnableMeasure) {
        throw new Error('suspend');
      }
      try {
        await this.apis.moveZToPoint({ z: -2, speed: Z_SPEED * 60 });
        await this.moveLaserToPoint(
          { x: data.ox, y: data.oy },
          3600,
          this.measureAbortController,
        );

        logger.log('[ 移动激光头 ] >');
        if (!this.isEnableMeasure) {
          throw new Error('suspend');
        }
        const { z } = await this.measure();

        logger.log('[ curveMeasurePoint z ] >', z);
        const laserPosition = {
          x: data.ox,
          y: data.oy,
          z: Z_MAX - (z + XTOUCH_TO_FOCAL_DISTANCE),
        };
        // if (
        //   laserPosition.z > CURVE_ALLOW_MAX_Z ||
        //   laserPosition.z < CURVE_ALLOW_MIN_Z
        // ) {
        //   throw new Error(`invalid irLedPosition z: ${laserPosition.z}`);
        // }
        // 这里要获取的是红外点的位置，但要按照激光头的坐标进行测量再加上红外的距离
        // 建模需要的是红外点的物理坐标
        // return {
        //   ...data,
        //   x: data.ox + (irLedPosition.x || 0) + IR_LED_OFFSET_X,
        //   y: data.oy + (irLedPosition.y || 0) + IR_LED_OFFSET_Y,
        //   z: irLedPosition.z,
        //   color: CURVE_POINT_COLOR.GREEN,
        //   result: 'success',
        // };
        const xtouchOffset = getXTouchOffsetByLaserLight(this.deviceInfo.power);
        return {
          ...data,
          x: data.ox + xtouchOffset.x, // 探针测量的坐标
          y: data.oy + xtouchOffset.y,
          z: laserPosition.z,
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
        if (err.message === 'Aborted') {
          // ui界面接收 suspend err
          logger.log('[ curveMeasurePoint err ] >');
          throw new Error('suspend');
        }
        return {
          ...data,
          z: 0,
          color: CURVE_POINT_COLOR.RED,
          result: 'fail',
        };
      }
    }

    updateLaserHeadRedCross(forcalLength: number) {
      const { power, redCrossInfo } = this.deviceInfo;
      // 更新当前z轴的偏移信息
      updateLaserHeadRedCross(power, redCrossInfo, forcalLength);
    }

    // 记录点时测量z轴
    async measureMarkPoint(laserPosition: Position, ready = false) {
      const { z, valid } = await this.measurePoint(false, laserPosition, ready);
      if (valid) {
        // const { power, redCrossInfo } = this.deviceInfo;
        // // 更新当前z轴的偏移信息
        // updateLaserHeadRedCross(
        //   power,
        //   redCrossInfo,
        //   z + XTOUCH_TO_FOCAL_DISTANCE,
        // );
        this.updateLaserHeadRedCross(z + XTOUCH_TO_FOCAL_DISTANCE);
      }
      return { z, valid };
    }

    needMeasureDistance = true;

    // 记录曲面开始激光头坐标和红外坐标
    @deviceChecker.recordCurveStartPosition()
    async recordCurveStartPosition() {
      const laserPosition = await this.apis.getLaserCoord();

      // const pass = await this.measureChecker(laserPosition);
      // if (!pass) {
      //   return false;
      // }

      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      if (this.needMeasureDistance) {
        await this.measureMarkPoint(laserPosition);
        const { z, valid } = await this.measureMarkPoint(laserPosition, true);
        await this.afterMeasure({
          x: laserPosition.x,
          y: laserPosition.y,
        });

        // 记录初始位置的z距离,结束所有测量后要将偏移更新到这个位置
        if (valid) {
          tempData.curveStartZ = z;
        }
      }

      const measureLaserPosition = this.calLaserPosByMeasurePos(laserPosition);
      // const laserPosition = {
      //   a: 0,
      //   u: 0,
      //   x: 167.8500061035156,
      //   y: 57.839996337890625,
      //   z: 0,
      // };
      const position = {
        ox: measureLaserPosition.x,
        oy: measureLaserPosition.y,
        x: 0,
        y: 0,
        z: 0,
      };

      // const irLedPosition = await this.curveMeasureBoundsPoint(position);
      // this.affter
      // const irLedPosition = {
      //   color: 'green',
      //   ox: 167.8500061035156,
      //   oy: 57.839996337890625,
      //   result: 'success',
      //   x: 264.45000610351565,
      //   y: 63.839996337890625,
      //   z: -14.72,
      // };
      const { power, gMode } = this.deviceInfo;
      tempData.laserMeasureStartPosition = measureLaserPosition;
      tempData.laserStartPosition = laserPosition;
      tempData.locationStartPos = calLocationPos(laserPosition, power, gMode);

      logger.log('[ 开始点 ] >', position);
      return {
        result: 'success',
        position,
      };
    }

    // 使用xtouch测量时，根据定位方式，与当前激光头所在的位置，计算若要xtouch要到达当前定位点标记的位置，激光头需要到达的位置
    calLaserPosByMeasurePos(curLaserPos: { x: number; y: number }) {
      const { power, gMode } = this.deviceInfo;
      const laserHeadInfo = getLaserHeadInfo(power);
      const offset = getXTouchOffsetByGMode(gMode, laserHeadInfo);
      logger.log('[ 对焦模块的偏移 ] >', offset);
      return {
        x: curLaserPos.x - offset.x,
        y: curLaserPos.y - offset.y,
      };
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

    // calCurveGcodeOffest() {}

    // 记录曲面结束激光头坐标和红外坐标
    @deviceChecker.recordCurveEndPosition()
    async recordCurveEndPosition() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const laserPosition = await this.apis.getLaserCoord();

      // const pass = await this.measureChecker(laserPosition);
      // if (!pass) {
      //   return false;
      // }
      if (this.needMeasureDistance) {
        await this.measureMarkPoint(laserPosition);
        await this.measureMarkPoint(laserPosition, true);
        await this.afterMeasure({
          x: laserPosition.x,
          y: laserPosition.y,
        });
      }
      const measureLaserPosition = this.calLaserPosByMeasurePos(laserPosition);

      // const laserMeasureEndPosition = {
      //   a: 0,
      //   u: 0,
      //   x: 289.8000183105469,
      //   y: 106.74000549316406,
      //   z: 0,
      // };
      const position = {
        ox: measureLaserPosition.x,
        oy: measureLaserPosition.y,
        x: 0,
        y: 0,
        z: 0,
      };
      // const irLedPosition = await this.curveMeasureBoundsPoint(position);
      // const locationEndPos = {
      //   color: 'green',
      //   ox: 289.8000183105469,
      //   oy: 106.74000549316406,
      //   result: 'success',
      //   x: 386.50001831054686,
      //   y: 112.74000549316406,
      //   z: -15.22,
      // };
      const { power, gMode } = this.deviceInfo;

      tempData.laserMeasureEndPosition = measureLaserPosition;
      tempData.laserEndPosition = laserPosition;

      tempData.locationEndPos = calLocationPos(laserPosition, power, gMode);
      logger.log('[ 结束点 ] >', position);
      return {
        result: 'success',
        position,
      };
    }

    // 矫正曲面的点边界, 并检测记录的点激光头是否可到达
    correctCurveBounds = () => {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      if (
        !tempData.laserMeasureStartPosition ||
        !tempData.laserMeasureEndPosition
      ) {
        return false;
      }

      // TODO: 优化左上角的计算
      const { topLeft, buttonRight } = getRetangle(
        tempData.laserMeasureStartPosition,
        tempData.laserMeasureEndPosition,
      );
      tempData.laserMeasureStartPosition = topLeft;
      tempData.laserMeasureEndPosition = buttonRight;

      const retangle = getRetangle(
        tempData.laserMeasureStartPosition,
        tempData.laserMeasureEndPosition,
      );
      tempData.laserMeasureStartPosition = retangle.topLeft;
      tempData.laserMeasureEndPosition = retangle.buttonRight;

      // getCurrentArea 会被改写，获取的是可加工区域（如果已有曲面区域，返回的就是曲面的区域），
      const { current } = this.getOriginCurrentArea();

      const { x: startX, y: startY } = tempData.locationStartPos;
      const { x: endX, y: endY } = tempData.locationEndPos;
      tempData.locationStartPos = {
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
      };
      tempData.locationEndPos = {
        x: Math.max(startX, endX),
        y: Math.max(startY, endY),
      };
      // const start = tempData.locationStartPos;
      // const end = tempData.locationEndPos;
      const start = tempData.locationStartPos;
      const end = tempData.locationEndPos;
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      // TODO: 抽离边界检测
      if (
        start.x < 0 ||
        start.y < 0 ||
        end.x > current.width ||
        end.y > current.height
      ) {
        return false;
      }

      //测量区域最小10*10 步长1 下位机移动存在误差，所以这里减去0.2 容错处理
      if (width - CURVE_MIN_LENGTH < -0.2 || height - CURVE_MIN_LENGTH < -0.2) {
        return false;
      }
      tempData.densityArea = { x: start.x, y: start.y, width, height };

      logger.log('[ 模型的尺寸 ] >', tempData.densityArea);
      return true;
    };

    // 设置测点推荐行列
    setRecommendAttr() {
      const data = this.customData.getData(this.canvasId);
      const mode = PROCESSING_MODE.CURVE_PROCESS;
      const tempData = data[mode].curveData.tempData;
      const { width, height } = tempData.densityArea;
      // 10-20 mm 使用 CURVE_MIN_ROW， 20mm以上每20mm加 1
      const recommendRow =
        height < RECOMMEND_DISTANT
          ? CURVE_MIN_ROW
          : CURVE_MIN_ROW +
            Math.ceil((height - RECOMMEND_DISTANT) / RECOMMEND_DISTANT);
      const recommendCol =
        width < RECOMMEND_DISTANT
          ? CURVE_MIN_COL
          : CURVE_MIN_COL +
            Math.ceil((width - RECOMMEND_DISTANT) / RECOMMEND_DISTANT);
      tempData.curveRange = {
        row: fixNum(recommendRow, CURVE_MIN_ROW, CURVE_MAX_ROW),
        col: fixNum(recommendCol, CURVE_MIN_COL, CURVE_MAX_COL),
      };
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

    async initDeviceInfo() {
      const info = await this.apis.deviceInfo(this.isNewThen011 ? 'M2008' : '');
      const newInfo = info || {};
      this.updateDeviceInfo(newInfo);
      return newInfo;
    }

    async onConnected() {
      const status = await this.apis.getDeviceStatus();
      if (status) {
        this.deviceInfo = { currentStatus: `M222 ${status}` };
      }
      const isIdle = ['M222 S0', 'M222 S3', PROCESSING_EVENT.IDLE].includes(
        this.deviceInfo.currentStatus,
      );
      this.isFirstConnectFourGroup();
      if (!this.serialportMode && !(window as any).VITE_PHONE) {
        // 连接时判断机器是否超过3台
        try {
          const socketConnNum = await this.apis.socketConnNum();
          if (socketConnNum > 3) {
            this.appContext.showMessage({
              contentI18nKey: 'device.s1.many_device_tip',
            });
          }
        } catch (error) {
          logger.error('获取连接机器数量出错', error);
        }
      }
      if (localStorage.getItem(this.airAssistConfigLocalKey)) {
        try {
          const data = JSON.parse(
            localStorage.getItem(this.airAssistConfigLocalKey) as string,
          );
          this.deviceInfo = { [AIR_ASSIST_KEY]: data };
        } catch (error) {
          logger.error('读取档位设置出错', error);
        }
      } else {
        this.deviceInfo = {
          [AIR_ASSIST_KEY]: {
            score: SCORE_AIR_ASSIST,
            cut: CUT_AIR_ASSIST,
          },
        };
      }
      if (localStorage.getItem(this.feederBackToOriginKey)) {
        try {
          const data = localStorage.getItem(this.feederBackToOriginKey);
          this.deviceInfo = { [FEEDER_BACK_TO_ORIGIN_KEY]: data };
        } catch (error) {
          logger.error('读取送料回原点配置出错', error);
        }
      } else {
        localStorage.setItem(this.feederBackToOriginKey, '1');
        this.deviceInfo = { [FEEDER_BACK_TO_ORIGIN_KEY]: '1' };
      }
      if (isIdle) {
        this.appContext.resetProcessingState();
        // 红光激光头连接后，默认开启红十字
        await this.apis.setGMode(0);
      }
      const { current } = this.getOriginCurrentArea();
      this.emit(UI_EVENT.UPDATE_PROCESSING_AREA, {
        canvasId: this.dataSource?.canvasId,
        option: {
          ...current,
        },
      });
      // 连上时将 isEnableMeasure 状态重置
      this.isEnableMeasure = true;
      super.onConnected();
    }

    // 曲面测量密度点的前置行为
    async beforeCurveMeasureAllPoints() {
      await this.beforeMeasure();
    }

    // 曲面正常测量完所有密度点后的结束行为
    async afterCurveMeasureAllPoints() {
      // TODO:
      // laserMeasureStartPosition 表示的是测量第一个点的激光头目标坐标
      // 这里要回到的是记录的第一个点的激光头所在的坐标
      const curveData = this.customData.getModeData(
        this.canvasId,
        PROCESSING_MODE.CURVE_PROCESS,
      )?.curveData;
      const startPos =
        curveData?.tempData?.laserStartPosition ||
        curveData?.laserStartPosition ||
        {};
      curveData.remeasurePoints = [];
      this.afterMeasure({ x: startPos.x, y: startPos.y });

      // 测量完成所有点后 将偏移更新为初始点的 z 距离处的偏移
      const curveStartZ =
        curveData?.tempData?.curveStartZ || curveData?.curveStartZ;
      if (curveStartZ) {
        this.updateLaserHeadRedCross(curveStartZ + XTOUCH_TO_FOCAL_DISTANCE);
      }
    }

    // 曲面按照Z字形排列要测量的点
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
      const start = tempData.laserMeasureStartPosition;
      const end = tempData.laserMeasureEndPosition;
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

    // 进入到曲面重测的前置行为
    @deviceChecker.beforeCurveRemeasure()
    beforeCurveRemeasure() {
      return true;
      // return this.deviceChecker(['connect', 'idle', 'xTouch']);
    }

    // 设置完行和列之后，开始测量的事件
    @deviceChecker.beforeCurveMeasuring()
    beforeCurveMeasuring() {
      return true;
      // return this.deviceChecker(['connect', 'idle', 'xTouch']);
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

      // 在最终所有店测量完成之前所有的数据保存在 curveData.tempData 中
      // 测量完成之后 将数据移动至 curveData 中
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

    toggleSelectionPlugin = (dataSource: any, status: boolean) => {
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

    // 获取曲面模型数据
    async getCurveData(options: CurveModelOptions) {
      // api
      // curve,\......
      //
      // TODO: 这里要确定是否多画布多worker
      // if (!this.curveWorker) {
      //   this.curveWorker = new CurveProcessHelper();
      // }
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

    buildProcessGcode(processMode: PROCESSING_MODE) {
      // if (processMode === PROCESSING_MODE.CURVE_PROCESS) {
      //   return this.buildCurveGcode();
      // }
      return super.buildProcessGcode(processMode);
    }

    generalCurveGcodeHeadAndTail() {
      const params = this.dataParser.source.params;
      const compiledHead = template(templates.curveHead);
      const compiledTail = template(templates.curveTail);

      const { score: scoreAirAssist, cut: cutAirAssist } =
        this.deviceInfo[AIR_ASSIST_KEY];
      const { hardWareAirAssist, power } = this.deviceInfo;
      const [, engrave] = getAirGear(
        hardWareAirAssist && power !== 2,
        scoreAirAssist,
        cutAirAssist,
      );

      const gcodeHead = compiledHead({
        focalLen: params.focalLen,
        motionConfig: `{"color": ${ELEMENT_PROCESSING_COLOR.VECTOR_ENGRAVING}}`,
        position: this.deviceInfo.laserPosition,
        gear: engrave,
      });
      const gcodeTail = compiledTail({
        position: this.deviceInfo.laserPosition,
      });
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
    }

    /**
     * 生成gcode的头部分
     * @param data
     * @returns
     */
    generalGcodeHeadAndTail(proload?: { isWalkBorder: boolean }) {
      const isWalkBorder =
        proload?.isWalkBorder ?? this.dataParser.isWalkBorder;
      const { processMode, uMultiple } = this.dataParser.source.params;
      const compiledHead = template(templates.gCodeHead);
      const compiledTail = template(templates.gCodeTail);
      const useUAxis = includes(
        [PROCESSING_MODE.LASER_CYLINDER, PROCESSING_MODE.LASER_CONVEYOR_FEEDER],
        processMode,
      );
      const { size, start } = this.dataParser.source.params;
      const originPoint = this.deviceInfo.laserPosition || { x: 0, y: 0 };
      const isFeeder = processMode === LASER_CONVEYOR_FEEDER;
      let UAxisShouldBack = true;
      if (isFeeder && this.deviceInfo[FEEDER_BACK_TO_ORIGIN_KEY] === '0') {
        UAxisShouldBack = false;
      }
      const gcodeHead = compiledHead({
        isOpenCross: isWalkBorder && this.deviceInfo?.gMode === 0,
        isWalkBorder,
        size,
        laserOffJumpSpeed:
          (this.deviceInfo?.delayTimeData?.blue?.laserOffJumpSpeed || 3000) *
          60,
        isExpand: processMode === PROCESSING_MODE.LASER_EXTENDER,
        useUAxis,
        uMultipleCommand: useUAxis ? `M535U${uMultiple}` : null,
        originPoint,
        isFeeder,
        start,
        startU: (this.dataParser.boundingRect as ObjectBoundingRect).left,
      });
      const gcodeTail = compiledTail({
        UAxisShouldBack,
        originPoint,
      });
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
      return;
    }

    async beforeGenGcode() {
      const { current, base } = this.getCurrentArea();
      const processingArea = current || base;
      const { isFlammability, isWalkBorder } = transformElements(
        {
          config: this.config.process,
          deviceInfo: this.deviceInfo,
          processingArea,
        },
        this.dataParser,
      );
      if (!isWalkBorder) {
        this.isFlammability = isFlammability;
      }
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

    genProcessParams(proload?: { isWalkBorder: boolean }) {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea();
      const processingArea = current || base;
      console.log('this.deviceInfo=>', this.deviceInfo);
      transformProcessParams(
        {
          deviceData,
          processingArea,
          config: this.config.process,
          deviceInfo: this.deviceInfo,
          isWalkBorder: proload?.isWalkBorder,
        },
        this.dataParser,
      );
    }

    // 矫正加工时间
    async correctionProcessingTime() {
      const res = await this.apis.getTaskTime();
      const timeStr = res.substring(1);
      return {
        time: Number(timeStr),
      };
    }

    // @deviceChecker.buildWalkBorder()
    // buildWalkBorder(buildData: any) {
    //   return this.builder.border(buildData);
    // }

    @deviceChecker.restartProcessing()
    restartProcessing() {
      logger.info('点击继续加工');
    }

    // TODO 前置数据检测
    // exportGcode() {
    //   return super.exportGcode();
    // }

    @deviceChecker.moveLaser()
    moveLaser(...args: any[]) {
      return this.apis.moveLaser(...args);
    }
  }

  return D2Ext;
}
