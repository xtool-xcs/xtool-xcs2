import { COMMON_VIEW_EVENT, logger, postMessageToMain } from '@xtool/link';
import {
  CONNECT_TYPE,
  CanvasItemType,
  CheckResultType,
  CommonProcessDataCheckTip,
  Constructor,
  DEVICE_PROCESSING_MODE,
  DEVICE_TYPE,
  DataSource,
  DeviceExtContainer,
  DownloadFirmwareParam,
  ExtDeviceInfo,
  GetProcessingTypesData,
  MessageType,
  PROCESSING_EVENT,
  PROCESSING_MODE,
  ProcessingAreaData,
  ProcessingAreaType,
  ProcessingUploadData,
  QUERY_PROCESSING_PROGRESS_TYPE,
  SYSTEM_EVENT,
  compareVersion,
  delay,
  parseParams,
} from '@xtool/xcs-logic';
import { isFunction, template } from 'lodash-es';
import { deviceChecker } from './check';
import config from './config';
import templates from './config/gcode-template';
import { getProcessingSteps } from './config/processingStep';
import { MODE_DEFALUT_KA_MSG } from './constant';
import {
  CHECK_ERROR,
  CHECK_TEMP_ERROR,
  ExtEvents,
  LASER_HEAD_DIRECTION,
  LOCATE_MODE,
  PROCESSING_COMMAND,
  PROCESSING_STATUS,
  PROCESS_START_POINT,
  SettingLowLightParamsType,
  SettingParamsType,
  statusMap,
} from './types';
import uiComponents, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';
import uiAppComponents from './ui-app';
import {
  getStartPoint,
  transformElements,
  transformProcessParams,
} from './utils/genGcodeUtil';
// 下位机返回指令
const { CANCEL, ERROR, IDLE, WORKING_OFFLINE, WORKING_ONLINE, WORKING } =
  PROCESSING_STATUS;
const {
  CANCEL_PROCESS,
  BEFORE_START,
  PAUSE_PROCESS,
  START_PROCESS,
  FINISH_PROCESS,
} = PROCESSING_EVENT;
const { RED_CROSS, RED_DOT, LOW_LIGHT } = LOCATE_MODE;

export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class D1Ext extends Base {
    // 加工类型配置
    processingTypes = processingTypes;
    // TODO 下位机待修改
    #isCancel = false;
    #isError = false;
    // 取消axios
    #cancelable: any;
    // 是否开始加工(用于终止发送gcode)
    #isStart = false;
    supportProcessingProgress = true;
    settingParams = {
      moveSpeed: 50,
      lightPower: 3,
      distance: 20,
    };

    // 预览页设置参数
    previewDataSettings = {
      startPointId: 0,
      lowLightPower: 0,
      lowLightOpen: false,
      isWalkBorder: false,
      isMovingLaserHead: false,
    };

    hasCancelProcess = false;

    // 走边框 检测
    get walkBorderCheckKey() {
      return ['TFCard'];
    }

    // 获取当前 激光头功率 和 激光头类型 下的画幅大小
    get getProcessingArea(): ProcessingAreaType {
      const base = this.config.processingArea.base;
      const data: ProcessingAreaData[] = [];
      this.processingModes.forEach((mode) => {
        const item = this.config.processingArea.data.find(
          (item) =>
            item.key ===
            `${mode.value}${this.info.isRedLight ? RED_DOT : this.info.gMode}${
              this.info.power
            }`,
        );
        if (item) {
          data.push({ ...item, key: mode.value });
        }
      });
      return { base, data };
    }

    get processingAreaKey() {
      const { gMode = 0, power = 0, isRedLight } = this.deviceInfo;
      return `${isRedLight ? RED_DOT : gMode}${power}`;
    }

    get uploadGcodeCheckKey() {
      return ['TFCard'];
    }

    // 获取当前状态下的 processingTypes
    get getProcessingModes() {
      return this.processingModes.map((i: any) => {
        return {
          ...i,
          processingTypes: isFunction(i.processingTypes)
            ? i.processingTypes(this.info.isRedLight)
            : i.processingTypes,
        };
      });
    }

    get subType() {
      return DEVICE_TYPE.DEVICE_FOUR;
    }

    /**
     * Creates an instance of DeviceExt.
     * @date 05/11/2022
     * @param {...any[]} args
     */
    constructor(...args: any[]) {
      super(config, ...args);
      // this.addonStatus = Object.assign({}, super.addonStatus, {
      //   TFCardStatus: true,
      // });
    }

    get useSocket() {
      const supportSocketVersion = '40.30.010';
      const { version = '' } = this.deviceInfo;
      const support = compareVersion(version, supportSocketVersion) > 0;
      return support;
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

    async checkDeviceOnline() {
      const isOnline = super.checkDeviceOnline();
      if (isOnline) {
        return isOnline;
      }
      const isNoWorking = await this.apis.getWorkingSta();
      if (!isNoWorking) {
        return {
          type: MessageType.text,
          text: CommonProcessDataCheckTip.device_is_working,
        };
      }
    }

    //  40w的时候需要公式转换(后面移到自身设备代码中)
    mapPower(data: any) {
      const { power } = data;
      const { lowLightPower, walkBorder } = this.config.process;
      let powerVal = 0;
      const laserHeadPower = this.deviceInfo.power;
      if (this.deviceInfo?.gMode !== 0) {
        powerVal = power || walkBorder[laserHeadPower]?.power?.default;
      }
      if (
        lowLightPower &&
        lowLightPower[laserHeadPower] &&
        isFunction(lowLightPower[laserHeadPower].formula)
      ) {
        powerVal = lowLightPower[laserHeadPower].formula(powerVal);
      }
      const temp = {
        ...data,
        power: powerVal,
      };
      return temp;
    }

    @deviceChecker.exportGcode()
    async exportGcode(path: string, isFullPath: boolean) {
      this.previewDataSettings.isWalkBorder = false;
      this.previewDataSettings.isMovingLaserHead = false;
      if (this.fileHelper) {
        await this.generalGcodeHeadAndTail();
        await this.fileHelper.writeWithHeadTail(
          this.dataParser.source.head,
          path,
          this.dataParser.source.tail,
          isFullPath,
        );
      }
      return super.exportGcode(path, isFullPath);
    }

    checkProcessData({
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
    }): Promise<CheckResultType | null | undefined> {
      const mode = dataSource.currentDeviceData.mode;
      const { power, gMode } = this.deviceInfo;
      const processingKey = `${mode}${power}${gMode}`;
      // this.addonStatus = { ...this.addonStatus, processingKey };
      this.previewDataSettings.isWalkBorder = isWalkBorder;
      // 缓存定位方式给再次加工用
      localStorage.setItem(
        'last_processing_location',
        this.isAbsoluteLocation ? '1' : '0',
      );
      return super.checkProcessData({
        canvasData: canvasData,
        centralAxisPosition,
        isWalkBorder,
        dataSource,
        isExportGcode,
        layerOrder,
      });
    }

    // 模式切换时更新走边框功率
    changeWalkBorderParams = () => {
      const defaultSpeed = this.walkBorderParams.speed;
      const defaultWalkBorderParams = this.config.process.walkBorder;
      const { power, speed } =
        defaultWalkBorderParams[this.deviceInfo.power] ??
        defaultWalkBorderParams.default;
      this.walkBorderParams = {
        speed: defaultSpeed || speed.default,
        power: this.deviceInfo.gMode === RED_CROSS ? 0 : power.default,
      };
    };

    // 改变激光头功率或者gMode
    async updateDeviceInfo(info: Partial<ExtDeviceInfo>) {
      const oldInfo = this.deviceInfo;
      const { power: infoPower, gMode: infoGMode } = info || {};
      const { power: oldInfoPower, gMode: oldInfoGMode } = this.deviceInfo;
      const gMode = infoGMode ?? oldInfoGMode;
      const isRedLight = infoPower
        ? infoPower === RED_DOT
        : oldInfoPower === RED_DOT;
      super.updateDeviceInfo(
        Object.assign(info || {}, {
          isRedLight,
          gMode: isRedLight ? 0 : gMode,
        }),
      );
      localStorage.setItem('deviceInfo', JSON.stringify(this.deviceInfo));
      // 红光激光头时需要手动开光
      if (info?.power && isRedLight) {
        const isNoWorking = await this.apis.getWorkingSta();
        if (isNoWorking) {
          this.apis?.toRedCrossMode();
          this.apis.setLaserPower(`S0 N0`);
        }
      }
      // 设置弱光默认功率
      const setLowLightDefaultPower = () => {
        this.settingParams.lightPower =
          this.config.process.lowLightPower[this.deviceInfo.power]?.value || 3;
      };
      if (oldInfo.power !== this.deviceInfo.power) {
        logger.log(
          '激光头功率发生改变',
          oldInfo.power,
          '=>',
          this.deviceInfo.power,
        );
        this.emit(SYSTEM_EVENT.BATCH_UPDATE_PROCESSING_AREA);
        setLowLightDefaultPower();
        if (this.deviceInfo.power === 2) {
          this.dataSource?.checkProcessingType();
        }
      }
      if (oldInfo.gMode !== this.deviceInfo.gMode) {
        logger.log(
          '定位方式发生改变',
          oldInfo.gMode,
          '=>',
          this.deviceInfo.gMode,
        );
        this.emit(SYSTEM_EVENT.BATCH_UPDATE_PROCESSING_AREA);
        this.changeWalkBorderParams();
      }
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

    get isWifiConnect() {
      return this.connectType === CONNECT_TYPE.WIFI;
    }

    get updateQueryProcessingProcessType() {
      if (this.connectType === CONNECT_TYPE.WIFI) {
        return QUERY_PROCESSING_PROGRESS_TYPE.SIMULATE;
      }
      return QUERY_PROCESSING_PROGRESS_TYPE.PASSIVE_RECEPTION;
    }

    getProcessingSteps(mode: DEVICE_PROCESSING_MODE, info: any): any {
      return getProcessingSteps(this, mode, info);
    }

    // 结束走边框后需要判断是否开启弱光
    async stopWalkBorder() {
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
      await super.stopWalkBorder();
      await this.setLowLight({
        isLowLight: this.deviceInfo.isLowLight,
        lightPower: this.settingParams.lightPower,
      });
    }
    @deviceChecker.downloadFirmware()
    downloadFirmware(params: DownloadFirmwareParam): Promise<any> {
      if (this.connectType === CONNECT_TYPE.SERIAL) {
        return this.device.downloadFirmware({
          ...params,
          url: params.url[0],
        });
      }
      return super.downloadFirmware(params);
    }

    updateFirmware(params: any): Promise<any> {
      if (this.connectType === CONNECT_TYPE.SERIAL) {
        return this.device.updateFirmware({
          ...params,
          firmwarePath: params.data,
          baud: 115200,
          connectIdentity: this.device?.connectIdentity,
        });
      }
      return super.updateFirmware(
        { ...params, name: 'uploadFirmware' },
        this.config?.firmware?.shouldHandshake,
      );
    }

    async checkFirmwareUpdated(version: string) {
      // 串口模式下不用对比固件版本号等待3秒以后自动成功(上传成功后)
      if (this.connectType === CONNECT_TYPE.SERIAL) {
        await delay(3000);
        return Promise.resolve(true);
      }
      return super.checkFirmwareUpdated(version, {
        delay: 1000,
        loopCount: 20,
      });
    }

    // async checkDeviceIsReadyToUpload() {
    //   if (this.isWifiConnect) {
    //     return this.deviceChecker(['TFCard']);
    //   }
    //   return true;
    // }

    // async deviceChecker(list: string[]) {
    //   const checker = {
    //     TFCard: {
    //       func: () => {
    //         return this.addonStatus?.TFCardStatus === true;
    //       },
    //       msg: 'device.process.no_tf_card',
    //     },
    //   };
    //   let result = true;
    //   for (let i = 0; i < list.length; i++) {
    //     let args;
    //     const checkerConfig = checker[list[i]];
    //     if (!checkerConfig) {
    //       continue;
    //     }
    //     const res = await checkerConfig.func.bind(this)(args);
    //     if (!res) {
    //       result = false;
    //       if (checkerConfig.msg) {
    //         this.appContext.showMessage({
    //           contentI18nKey: checkerConfig.msg,
    //         });
    //       }
    //       break;
    //     }
    //   }
    //   return result;
    // }

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
      this.deviceInfo = { currentStatus: PROCESSING_EVENT.IDLE };
      this.appContext.resetProcessingState();
      this.isFirstConnectFourGroup();
      const isNoWorking = await this.apis.getWorkingSta();
      // 检测TF卡是否存在
      if (this.isWifiConnect) {
        const isTFCardExist = await this.apis.getSDCardStatus();
        // this.addonStatus = { ...this.addonStatus, TFCardStatus: isTFCardExist };
      }
      // D系列重新连接后无法获取到机器的加工状态需要重置状态
      if (!isNoWorking) {
        this.deviceCmdParsing(PROCESSING_COMMAND.WORK_OFFLINE);
      }
      super.onConnected();
    }

    get isAbsoluteLocation(): boolean {
      const deviceData = this.dataSource?.currentDeviceData;
      const { mode, data } = deviceData;
      return data[mode]?.processStartPoint === PROCESS_START_POINT.ABSOLUTE;
    }

    async headCode() {
      const head = await this.taskManager.readHeadAndTailCode(
        this.deviceInfo.snCode,
        'head',
      );
      return this.againProcess ? head : this.dataParser.source.head;
    }

    async tailCode() {
      const tail = await this.taskManager.readHeadAndTailCode(
        this.deviceInfo.snCode,
        'tail',
      );
      return this.againProcess ? tail : this.dataParser.source.tail;
    }

    async uploadGCodeByHttp(params?: ProcessingUploadData): Promise<boolean> {
      const { onProgress, isFullPath = false } = params || {};
      if (window?.MeApi) {
        const {
          baseUrl,
          url,
          params: urlParams = {},
        } = await this.apis.uploadGcode({ method: 'info' });
        // const { finishInOneTime = true } = this.config.process.buildParams;
        // const filePath = await this.builder.gcode(param, finishInOneTime);
        const uploadGcodeUrl = `${baseUrl}${url}${parseParams({
          ...urlParams,
          filetype: 1,
        })}`;
        const path = this.taskManager.getTask(this.deviceInfo.snCode).gcode;
        // const gcodeHeadAndTail = await this.builder.gcodeHeadAndTail(param);
        const headCode = await this.headCode();
        const tailCode = await this.tailCode();
        try {
          const result = await super.uploadGCodeByNative({
            url: uploadGcodeUrl,
            path,
            options: {
              isFullPath,
              mode: 'formData',
              headCode,
              tailCode,
              useFormData: true,
              onProgress: (percent: number) => {
                isFunction(onProgress) && onProgress(percent);
              },
              onCancel: (cancel: any) => {
                this.#cancelable = cancel;
              },
            },
          });
          if ((result.result ?? result.data.result) === 'ok') {
            this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
            return Promise.resolve(true);
          }
          return Promise.reject(false);
        } catch (err) {
          logger.log('uploadGcode by builder error', err);
          return Promise.reject(false);
        }
      } else {
        // const gcode = await this.builder.gcode(param);
        // const { signal, cancel } = requestCancelable();
        // this.#cancelable = cancel;
        // await this.apis.uploadGcode({
        //   data: { gcode },
        //   signal: signal,
        //   url: `?filetype=1`,
        //   onUploadProgress: (ev: any) => {
        //     const complete = ev.loaded / ev.total;
        //     logger.log({ complete });
        //     isFunction(onProgress) && onProgress(complete);
        //   },
        // });
        // this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
        return Promise.resolve(true);
      }
    }
    // 检测设备是否处于空闲状态
    @deviceChecker.isDeviceIdle()
    isDeviceIdle() {
      return true;
    }

    updateWalkBorderParams(data: { power: number; speed: number }) {
      this.walkBorderParams = {
        ...this.walkBorderParams,
        ...data,
      };
      this.deviceInfo = {
        walkBorderParams: { ...this.deviceInfo.walkBorderParams, ...data },
      };
    }

    // D系列没有ready状态，需要手动触发
    @deviceChecker.uploadGCode()
    async uploadGCode(params?: ProcessingUploadData): Promise<boolean> {
      // const { finishInOneTime = true } = this.config.process.buildParams;
      this.hasCancelProcess = false;
      this.previewDataSettings.isWalkBorder = false;
      this.previewDataSettings.isMovingLaserHead = false;
      if (!this.againProcess) {
        await this.generalGcodeHeadAndTail();
        await this.taskManager.addHeadAndTailCode(
          this.deviceInfo.snCode,
          'head',
          this.dataParser.source.head,
        );
        await this.taskManager.addHeadAndTailCode(
          this.deviceInfo.snCode,
          'tail',
          this.dataParser.source.tail,
        );
      }
      if (this.isWifiConnect) {
        return this.uploadGCodeByHttp(params);
      }
      // await this.builder.gcode(param, finishInOneTime);
      this.apis.enterProcessingMode();
      this.deviceCmdParsing(PROCESSING_COMMAND.WORK_PREPARED);
      // 等下位机返回ready状态时再进入ready页面
      await this.whenReceiveCmd('M8 N11');
      return Promise.resolve(true);
    }

    startProcessing(): Promise<boolean> {
      return this.uploadGCode();
    }

    // 暂停加工
    pauseProcessing() {
      return this.apis.setProcessPause();
    }

    // 取消加工前需要终止gcode发送
    async stopSendGcode() {
      if (!this.isWifiConnect) {
        this.device?.stopReadGcodeFile();
        return this.apis.stopProcessing();
      }
      try {
        const stopResult = Promise.all([
          this.apis?.endProcessing(),
          this.apis.stopProcessing(),
        ]);
        this.#isCancel = true;
        // 不支持socket版本的固件升级以后会无法取消(下位机没有socket)
        this.deviceCmdParsing(PROCESSING_COMMAND.WORK_STOPED);
        return stopResult;
      } catch (error) {
        logger.log('取消加工错误=>', error);
      }
    }

    // 取消加工
    async cancelProcessing() {
      const res = await this.stopSendGcode();
      if (!this.isWifiConnect) {
        this.apis.stopProcessMode();
      }
      return res;
    }

    @deviceChecker.buildWalkBorder()
    async startWalkBorder(gcode: string) {
      logger.log('上传走边框gcode', gcode);
      // 打开走边框防呆弹层
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, true);
      if (this.isWifiConnect) {
        return this.apis.uploadGcode({
          data: { gcode },
          url: `?filetype=0`,
          name: 'uploadGcode',
        });
      }
      //  进入走边框模式
      await this.apis.enterWalkBorderMode();
      gcode = `M206 \n ${gcode}`;
      const code = `${gcode.split('\n').join(':')}\n`;
      return this.apis.cmd(code);
    }

    // 是否开弱光
    get needFire() {
      const { lowLightPower, lowLightOpen, isWalkBorder, isMovingLaserHead } =
        this.previewDataSettings;
      return (
        this.deviceInfo.gMode === LOW_LIGHT &&
        lowLightPower &&
        lowLightOpen &&
        (isWalkBorder || isMovingLaserHead)
      );
    }

    // 是否是红十字模式
    get isCrossOn() {
      return (
        [RED_DOT, RED_CROSS].includes(this.deviceInfo.gMode) &&
        (this.previewDataSettings.isWalkBorder ||
          this.previewDataSettings.isMovingLaserHead)
      );
    }

    get typeCommand() {
      const params = this.dataParser.source.params;
      const typeCommand = [PROCESSING_MODE.LASER_CYLINDER].includes(
        params.processMode,
      )
        ? `M102 S${params.rotateMultiple}`
        : 'M101';
      return typeCommand;
    }

    // 终止上传gcode
    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
    }

    exportLog() {
      return Promise.reject('current device no log.');
    }

    // 40w激光头需要转换
    private getPower(power: number) {
      let finallyPower = power;
      const { power: laserHeadPower } = this.deviceInfo;
      const lowLightPower = this.config.process.lowLightPower[laserHeadPower];
      if (lowLightPower && lowLightPower.formula) {
        finallyPower = lowLightPower.formula(power);
      }
      return finallyPower;
    }

    // 设置弱光
    async setLowLight(options: SettingLowLightParamsType) {
      const { isLowLight, lightPower } = options;
      const power = this.getPower(lightPower);
      const time = Number.MAX_SAFE_INTEGER;
      const cmd = isLowLight ? `M9 S${power * 10} N${time}` : `M9 S0 N0`;
      const params = this.isWifiConnect ? { params: { cmd: cmd } } : cmd;
      // 退出lightBurn模式
      await this.apis.quitLightBurnMode();
      await this.apis.setLaserPower(params);
      this.previewDataSettings.lowLightOpen = isLowLight;
      this.previewDataSettings.lowLightPower = power * 10;
      this.deviceInfo = { isLowLight };
    }

    // 移动激光头
    async movingLaserHead(moveParams: SettingParamsType) {
      const { mode } = this.dataSource?.currentDeviceData;
      const isCylinder = mode === PROCESSING_MODE.LASER_CYLINDER;
      this.#isError = false;
      this.previewDataSettings.isMovingLaserHead = true;
      const { moveSpeed, direction, distance, lightPower } = {
        ...this.settingParams,
        ...moveParams,
      };
      // 设备断连以后再重新无法从ext实例上拿到幅面大小
      const {
        current: { width: currentWidth = 0, height: currentHeight = 0 },
        base: { width: baseWidth = 0, height: baseHeight = 0 },
      } = this.getCurrentArea(mode);
      const w = currentWidth || baseWidth;
      const h = currentHeight || baseHeight;
      let list: (string | number)[] = [];
      const backToOrigin = direction === LASER_HEAD_DIRECTION.CENTER;
      if (backToOrigin) {
        list = [`M205 X${w} Y${h}`, 'M28', ''];
        this.deviceInfo = {
          isLowLight: this.deviceInfo.isLowLight,
          backToOrigin: true,
        };
      } else {
        const moveCodeMap = {
          [LASER_HEAD_DIRECTION.BOTTOM]: `Y${
            isCylinder ? -distance : distance
          }`,
          [LASER_HEAD_DIRECTION.LEFT]: `X${-distance}`,
          [LASER_HEAD_DIRECTION.RIGHT]: `X${distance}`,
          [LASER_HEAD_DIRECTION.TOP]: `Y${isCylinder ? distance : -distance}`,
        };
        const moveCode = moveCodeMap[direction];
        const power = this.getPower(lightPower);

        list = [
          'M17 S1',
          'M207 S0',
          `M106 S${this.isCrossOn ? 1 : 0}`,
          `M205 X${w} Y${h}`,
          `${isCylinder ? this.typeCommand : 'M101'}`,
          'G92 X0 Y0',
          'G90',
          `G1 ${moveCode} F${moveSpeed * 60} S${
            this.needFire ? power * 10 : 0
          }`,
          'M18',
          '',
        ];
        if (this.needFire) {
          list.push(`M9 S${power * 10} N9007199254740991 \n`);
        }
      }
      const cmd = backToOrigin ? 'M28' : 'ok:IDLE';
      if (this.isWifiConnect) {
        await this.apis.cmd({ data: { cmd: list.join('\n') } });
        await this.whenReceiveCmd(cmd);
      } else {
        await this.apis.cmd(list.join('\n'));
        await this.whenReceiveCmd(cmd);
      }
      if (backToOrigin) {
        // 33安规版固件做了改动回原点以后不关闭弱光
        const isLowLight = this.deviceInfo.isLowLight;
        await this.setLowLight({
          isLowLight: isLowLight,
          lightPower: this.settingParams.lightPower,
        });

        this.deviceInfo = { backToOrigin: false };
      }
      logger.log(['移动激光头结束']);
    }

    // 加工过程中错误处理
    private handlerProcessingError(cmd: string) {
      // 报警弹框
      if (ERROR.includes(cmd)) {
        this.#isError = true;
        // temp_err错误在串口下ready/加工中/暂停中才需要提示
        const { currentStatus } = this.deviceInfo;
        let errData = CHECK_ERROR;
        if (
          !this.isWifiConnect &&
          [BEFORE_START, PAUSE_PROCESS, START_PROCESS, FINISH_PROCESS].includes(
            currentStatus,
          )
        ) {
          errData = [...CHECK_ERROR, ...CHECK_TEMP_ERROR];
        }
        const mayBeError = errData.find(({ code }) => code === cmd);
        if (mayBeError) {
          this.emit(ExtEvents.Error, mayBeError);
          this.emit(CANCEL_PROCESS);
          //  触发报警弹层后关闭走边框弹层
          this.deviceInfo = { isLowLight: false };
          this.stopWalkBorder();
        }
        if (this.#isStart) {
          this.stopSendGcode();
          logger.log('==停止发送gcode===');
          this.#isStart = false;
        }
        logger.log('===设备报错===');
      }
    }

    private handlerProcessingFinish() {
      logger.log('是否在走边框', this.previewDataSettings.isWalkBorder);
      // 加工完成以后弱光会自动关闭需要重置弱光按钮状态(走边框跟移动激光头除外)
      if (
        !this.previewDataSettings.isWalkBorder &&
        !this.previewDataSettings.isMovingLaserHead
      ) {
        this.previewDataSettings.lowLightOpen = false;
        this.deviceInfo = { isLowLight: false };
      }
    }

    /**
     * 生成gcode的头部分
     * @param data
     * @returns
     */
    generalGcodeHeadAndTail() {
      const isWalkBorder = this.dataParser.isWalkBorder;
      const { processMode } = this.dataParser.source.params;
      const compiledHead = template(templates.gCodeHead);
      const compiledTail = template(templates.gCodeTail);
      const { current, base } = this.getCurrentArea(processMode);
      const processingArea = current || base;
      const gcodeHead = compiledHead({
        isWalkBorder,
        crossCommand: this.isCrossOn ? 'S1' : 'S0',
        typeCommand: this.typeCommand,
        width: processingArea.width,
        height: processingArea.height,
        isProcessStartPoint: this.isAbsoluteLocation,
        startPoint: getStartPoint(
          this.dataParser.boundingRect,
          this.previewDataSettings.startPointId,
        ),
      });
      const gcodeTail = compiledTail({
        isProcessStartPoint: this.isAbsoluteLocation,
        startPoint: getStartPoint(
          this.dataParser.boundingRect,
          this.previewDataSettings.startPointId,
        ),
        needFire: this.needFire,
        lowLightPower: this.previewDataSettings.lowLightPower,
        isNeedBackOrigin: this.isAbsoluteLocation && !isWalkBorder,
      });
      this.dataParser.source.updateGCodeHead(gcodeHead);
      this.dataParser.source.updateGcodeTail(gcodeTail);
      return;
    }

    genProcessParams(proload?: { isWalkBorder: boolean }) {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      transformProcessParams(
        {
          deviceData,
          processingArea,
          config: this.config.process,
          // 构建gcode需要的额外传参
          deviceInfo: this.deviceInfo,
          isWalkBorder: proload?.isWalkBorder ?? this.dataParser.isWalkBorder,
          startPoint: getStartPoint(
            this.dataParser.boundingRect,
            this.previewDataSettings.startPointId,
          ),
        },
        this.dataParser,
      );
    }

    async beforeGenGcode() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      transformElements(
        {
          config: this.config.process,
          deviceInfo: this.deviceInfo,
          processingArea,
        },
        this.dataParser,
      );
      await super.beforeGenGcode();
    }

    genProcessElements() {
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData.mode);
      const processingArea = current || base;
      return transformElements(
        {
          config: this.config.process,
          deviceInfo: this.deviceInfo,
          processingArea,
        },
        this.dataParser,
      );
    }

    // 处理加工流程
    private async handlerProcessingEvent(cmd: string) {
      const status = statusMap[cmd];
      if (status === BEFORE_START) {
        this.#isCancel = false;
        this.#isError = false;
        logger.log('===进入ready状态===');
        this.deviceInfo = { processingPercent: 0 };
      }

      if (
        WORKING_ONLINE.includes(cmd) &&
        this.deviceInfo.currentStatus === PROCESSING_EVENT.BEFORE_START
      ) {
        const gCodePath = this.taskManager.getTask(
          this.deviceInfo.snCode,
        ).gcode;
        const headCode = await this.headCode();
        const tailCode = await this.tailCode();
        this.device.uploadFile({
          type: 'D',
          headCode,
          tailCode,
          name: gCodePath,
          onProgress: (percent: number) => {
            // logger.log('onProgress', percent);
            this.deviceInfo = { processingPercent: percent };
            logger.log(percent);
          },
        });
        this.#isStart = true;
        logger.log('===串口开始加工===');
      }

      if (WORKING.includes(cmd)) {
        this.#isCancel = false;
        logger.log('串口继续加工');
      }

      if (WORKING_OFFLINE.includes(cmd)) {
        this.#isCancel = false;
        this.#isError = false;
        logger.log('===离线模式开始加工===');
      }

      if (status === PAUSE_PROCESS) {
        logger.log('===设备暂停状态===');
      }

      if (CANCEL.includes(cmd)) {
        this.#isCancel = true;
        logger.log('===设备加工取消===');
        this.hasCancelProcess = true;
        this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
        // 加工中取消才会关闭弱光
        if (
          (!this.previewDataSettings.isWalkBorder &&
            !this.previewDataSettings.isMovingLaserHead) ||
          cmd === PROCESSING_COMMAND.WORK_STOPED_INSTRUCT1
        ) {
          this.deviceInfo = { isLowLight: false };
        }
        if (this.#isStart && !this.previewDataSettings.isWalkBorder) {
          this.stopSendGcode();
          logger.log('==停止发送gcode===');
          this.#isStart = false;
        }
      }

      // 处理加工中错误
      this.handlerProcessingError(cmd);

      // TODO 拔掉usb钥匙点击下位机(下位机返回指令有丢失上位机做兼容处理)
      if (
        IDLE.includes(cmd) ||
        (!this.isWifiConnect &&
          PROCESSING_COMMAND.WORK_FINISHED_INSTRUCT2 === cmd)
      ) {
        this.handlerProcessingFinish();
        // this.deviceInfo = { processingPercent: 1 };
        logger.log('===设备加工完成===');
      }

      if (status) {
        if (this.#isError || this.#isCancel) {
          this.deviceInfo = { currentStatus: CANCEL_PROCESS };
          // 触发错误报警以后重置状态
          // this.#isError = false;
        } else {
          this.deviceInfo = { currentStatus: status };
        }
      }
    }

    // 监听socket信息
    deviceCmdParsing(cmd: string) {
      // TODO 下位机返回有\r\n需要处理
      cmd = cmd.replace(/[\r\n]/g, '');
      logger.log('=> d1', cmd);
      // 处理加工流程
      this.handlerProcessingEvent(cmd);
      // 监听下位机是否已进入指定的状态
      const handle = this.whenReceiveCmdResolveMap.get(cmd);
      if (isFunction(handle)) {
        handle(cmd);
      }
    }

    // 显示常驻提示条
    setKeepAliveMsg(keepAlive: any) {
      this.emit(SYSTEM_EVENT.SET_KEEP_ALIVE_MESSAGE, keepAlive);
    }

    handleDeviceFormValueChanged(prev: any, next: any) {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        if (prev.mode !== next.mode) {
          this.setKeepAliveMsg(MODE_DEFALUT_KA_MSG[next.mode]);
        }
      }
    }
    @deviceChecker.restartProcessing()
    restartProcessing() {}

    onDisconnect(): void {
      if ((window as any).VITE_PHONE) {
        if (this.connected) {
          super.onDisconnect();
          // 断连以后关闭做边框弹层
          this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
        }
      } else {
        super.onDisconnect();
        // 断连以后关闭做边框弹层
        this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
      }
      // 断连以后重置弱光状态
      this.deviceInfo = {
        isLowLight: false,
      };
      this.previewDataSettings.lowLightOpen = false;
      this.hasUploadGcode = false;
    }

    dispose() {
      super.dispose();
    }
  }
  return D1Ext;
}
