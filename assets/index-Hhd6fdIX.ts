import { logger } from '@xtool/link';
import {
  CanvasItemType,
  CheckUpdateResult,
  Constructor,
  DEVICE_PROCESSING_MODE,
  DEVICE_TYPE,
  DataSource,
  DeviceExtConfig,
  DeviceExtContainer,
  DownloadFirmwareParam,
  PROCESSING_EVENT,
  PROCESSING_MODE,
  PROCESSING_TYPE,
  SYSTEM_EVENT,
  compareVersion,
  delay,
  parseJSON,
  parseParams,
} from '@xtool/xcs-logic';
import { CustomDataManager } from '@xtool/xcs-logic/src/ext-container/custom-data';
import { format } from 'date-fns';
import { isArray, isFunction, isNumber, template } from 'lodash-es';
import { M1LiteModePlugin } from './canvas-plugins/mode';
import {
  M1LiteMultiPointPlugin,
  MULTI_POINT_PLUGIN_NAME,
} from './canvas-plugins/multiPointNew';
import { deviceChecker } from './check';
import config from './config';
import templates from './config/gcode-template';
import { getProcessingSteps } from './config/processingStep';
import {
  ACTIVE_ELECTRIC,
  BIG_PRESS_RANGE,
  CALIB_DATA,
  COMBINE_TASK_GCODE,
  DRIVING_LOCK_INFO,
  FILE_SEP,
  GAP_OPEN,
  HEADER_CONFIG,
  HEIGHTEN_MODE_TYPE,
  INK_PARAMS,
  INK_PREVIEW,
  INK_PRINT_MDB_CONFIG,
  MACHINE_LOCK_OPEN,
  MANIFEST_FOLDER,
  MAX_BRUSH_NUM,
  PROCESSING_AREA,
  PROCESS_HEAD_TYPE_MAP,
  RESET_HOME_REASON,
  SEP,
  displayFieldsMapping,
  statusMap,
} from './constant';
import {
  CustomBrushDataType,
  ExtEvents,
  Head_ID,
  HeaderDetail,
  LASER_HEAD_MODULE,
  MEASURE_ERROR,
  PROCESS_HEADER,
  PointType,
  SOCKET_MODULE,
  SOCKET_PROCESS_CMD,
  ToolType,
} from './types';
import uiComponents, {
  deviceDataValues,
  elementDataValues,
  processingModes,
  processingTypes,
} from './ui';
import uiAppComponents from './ui-app';
import {
  BrushStore,
  checkLaserChange,
  combineTask,
  digit,
  transformElements,
  transformParams,
} from './utils';
/**
 * 第二版扩展实现
 */
export const v2 = true;
export interface M1LiteExt extends DeviceExtContainer {
  taskList: any[];
  processList: any[];
  processListData: any[];
  processTaskId: number;
  initProcessTask: () => void;
  getCalibData: (arg: any) => { X: number; Y: number; Z: number };
  // 抛出异常
  emitError: (
    msg: string,
    type?: string,
    params?: { [key: string]: string },
  ) => void;
  // 异常弹窗
  emitErrorByCmd: (cmd: string) => void;
  // 测距检测
  measureChecker: () => boolean;
  // 更新加工头
  updateHeadParams(isTip: boolean): Promise<HeaderDetail>;
  getHeader(): Promise<HeaderDetail>;
}
export function DeviceExt(Base: Constructor<DeviceExtContainer>) {
  class M1LiteExt extends Base {
    #cancelable: null | (() => void) = null;
    #isCancelProcess = false;
    #brushStore: BrushStore; // 用于自定义画笔增删改
    // 走边框gcode
    #walkBorderGcode = '';
    breakMeasureStatus = false;
    isInMeasuring = false;
    customData = new CustomDataManager();
    // 加工分组
    #processList: any[] = [];
    #processListData: any = {};
    #processTaskId = 0;
    #taskList: any[] = [];
    // 查询加工头状态
    #isSearchHeadType = false;
    hasCancelProcess = false;
    #connected = false;
    #isWalkBorder = false;

    constructor(...args: any[]) {
      super(config, ...args);
      this.#brushStore = new BrushStore(this.fileHelper);
      this.#processTaskId = 0;
    }

    // 扩展加载，获取自定义画笔列表
    async initBrush() {
      await this.#brushStore.setup();
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
    processingTypes = processingTypes;

    get ui() {
      return uiComponents;
    }

    get uiApp() {
      return uiAppComponents;
    }

    set processList(val: any[]) {
      this.#processList = val;
      this.updateDeviceInfo({ processList: val });
    }

    set taskList(val: any[]) {
      this.#taskList = val;
      this.updateDeviceInfo({ taskList: val });
    }

    set processListData(val: any) {
      this.#processListData = val;
      this.updateDeviceInfo({ processListData: val });
    }

    set processTaskId(val: number) {
      this.#processTaskId = val;
      this.updateDeviceInfo({ processTaskId: val });
    }

    // 走边框默认配置
    _walkBorderParams = {
      xyDistance: 20,
      xySpeed: 100,
      speed: 100,
      power: 0,
    };

    // 设置走边框配置
    set walkBorderParams({ speed, xyDistance, xySpeed }) {
      this._walkBorderParams.xyDistance = xyDistance;
      this._walkBorderParams.xySpeed = xySpeed;
      this._walkBorderParams.speed = speed;
    }

    // 获取走边框配置
    get walkBorderParams() {
      return this._walkBorderParams;
    }

    get subType() {
      return DEVICE_TYPE.DEVICE_ONE;
    }

    // 发送走边框gcode
    @deviceChecker.walkBorder()
    async startWalkBorder(gcode: string) {
      try {
        // 走边框之前检测是否复位被打断
        const resetInterrupt = await this.checkResetInterrupt();
        if (resetInterrupt) {
          throw 'resetInterrupt error';
        }
        logger.log('上传走边框gcode', gcode);

        // 上传走边框类型
        await this.apis.setToolType({
          params: {
            type: ToolType.Frame,
          },
        });

        // 发送走边框gcode
        await this.apis.uploadGcode({
          data: gcode,
          params: { zip: false },
        });
        this.#walkBorderGcode = gcode;
        this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, true);
      } catch (error) {
        logger.log('startWalkBorder error', error);
      }
    }

    // 取消走边框
    async stopWalkBorder() {
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, false);
      this.#walkBorderGcode = '';
    }

    // 关闭走边框弹框
    changeWalkBorderModal(visible: boolean) {
      this.emit(SYSTEM_EVENT.UPDATE_WALK_BORDER_TIP_MODAL_VISIBLE, visible);
    }

    // 加工流程
    getProcessingSteps(mode: DEVICE_PROCESSING_MODE, info: any): any {
      return getProcessingSteps(this, mode, info);
    }

    // 添加加工中右侧显示
    queryProcessingRightSideBarCom(status: PROCESSING_EVENT) {
      const { rightSideBar = {} } = this.config.process;
      return rightSideBar[status];
    }

    // TODO: 画笔需要填充，但是需要canvas返回矢量数据
    getCanvasDataConfig(mode: PROCESSING_MODE) {
      if (PROCESSING_MODE.BRUSH_PAINTING === mode) {
        return { exportVectorPathWhenFill: true };
      }
      return {};
    }

    // 日志导出
    exportLog() {
      return super.exportLog('xcs_m2_log.gz');
    }

    // check固件版本
    @deviceChecker.downloadFirmware()
    async downloadFirmware(data: DownloadFirmwareParam) {
      return super.downloadFirmware(data);
    }

    // 固件更新
    async updateFirmware(params: any) {
      const { data, md5List, onUploadProgress = () => {} } = params;
      try {
        await this.apis.updateFirmwareHandshake();
        await this.apis.updateFirmware({
          data,
          md5List,
          onUploadProgress: (ev: any) => {
            const percent = Math.floor((ev.loaded / ev.total) * 60);
            onUploadProgress({ loaded: percent, total: 100 });
          },
        });
        return true;
      } catch (error) {
        return Promise.reject(error);
      }
    }

    // check固件版本
    async customCheckVersion(
      deviceFirmware: CheckUpdateResult,
    ): Promise<boolean> {
      try {
        const { version, sub_version = {} } = await this.apis.version();
        const { latestVersion, subVersions = {} } = deviceFirmware;

        // 1. 比对主版本
        const isPrimaryEqual = compareVersion(version, latestVersion) >= 0;
        let isCompleteUpdated = true;

        // 2. 比对子版本
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

    // 读取自定义画笔
    readCustomBrush() {
      return this.#brushStore.customBrushList;
    }

    // 获取自定义画笔数据
    getBrushData(uuid: string) {
      return this.#brushStore.list[uuid];
    }

    // 删除自定义画笔数据
    deleteBrushData(uuid: string) {
      return this.#brushStore.delete(uuid);
    }

    // 保存画笔（区分自定义画笔和官方画笔）
    saveCustomBrush(data: CustomBrushDataType) {
      if (this.#brushStore.customBrushList.length > MAX_BRUSH_NUM) {
        this.emitError('device.m1lite.pen_limit_tip');
        return Promise.reject('over');
      }
      return this.#brushStore.add(data);
    }

    // 更新自定义画笔
    updateCustomBrush(data: CustomBrushDataType, uuid: string) {
      return this.#brushStore.update(data, uuid);
    }

    // 设置自定义画笔权限
    setCustomBrushUsePermission(permission: boolean) {
      this.#brushStore.setUsePermission(permission);
    }

    // 自定义显示元素设置
    getDisplayFields(
      processingType: string | undefined,
      mode: string,
      fields: any,
    ) {
      const displayModeConfig = displayFieldsMapping[mode];
      if (!displayModeConfig) {
        return {};
      }
      const displayFieldsConfig = displayModeConfig[processingType!];
      if (displayFieldsConfig) {
        const { typeCount } = displayFieldsConfig;
        const data = {
          ignore: fields.slice(0, 1),
          type: fields.slice(1, typeCount),
          other: fields.slice(typeCount, fields.length),
        };
        return data;
      }
      return {};
    }

    // 抛出异常
    emitError(msg: string, type = 'info', params?: { [key: string]: string }) {
      this.appContext.showMessage({
        contentI18nKey: msg,
        type,
        args: params,
      });
    }

    // 异常弹窗
    emitErrorByCmd(errorKey: string, msg: string) {
      this.emit(ExtEvents.Error, {
        code: errorKey,
        msg,
      });
    }

    // 检测回原点被打断
    async checkResetInterrupt(): Promise<boolean> {
      try {
        if (!this.#connected) {
          return false;
        }
        const resetInterrupt = await this.apis?.isResetInterrupt();
        this.updateDeviceInfo({ resetInterrupt });
        return resetInterrupt;
      } catch (error) {
        this.updateDeviceInfo({ resetInterrupt: true });
        return true;
      }
    }

    resetOriginHomeStatus() {
      this.updateDeviceInfo({
        loadingResetHomeButton: false,
        resetInterrupt: false,
      });
    }

    getOffset(): { offsetX: number; offsetY: number; measureOffset: number } {
      const { driving = 0 } = this.deviceInfo;
      const activeHeadObj = PROCESS_HEAD_TYPE_MAP[driving] || {};
      const { x: offsetX = 0, y: offsetY = 0 } =
        activeHeadObj?.touchOffset || {};
      const measureOffset = activeHeadObj?.measureOffset || 0;
      return { offsetX, offsetY, measureOffset };
    }

    // 测量焦距
    @deviceChecker.measure()
    async measure(): Promise<any> {
      try {
        this.updateProcessing();
        const { offsetX, offsetY, measureOffset } = this.getOffset();
        // 测距检查复位是否被打断
        const checkResult = await this.checkResetInterrupt();
        if (checkResult) {
          throw false;
        }

        // touch到红十字 -> 测距 -> touch归位

        // 设备是否倾斜
        const { attitudeState } = await this.apis.getAttitude();
        if (attitudeState === 1 || attitudeState === 2) {
          throw 'attitudeState false';
        }

        this.isInMeasuring = true;
        if (!this.breakMeasureStatus) {
          await this?.apis?.moveHead({
            data: {
              action: 'relative_motion',
              waitTime: 0,
              x: offsetX,
              y: offsetY,
              f: 8400,
            },
          });
        }
        const { value: measure, error } = await this.apis.measure();

        switch (error) {
          // 超出最大范围
          case 4:
            await this?.apis?.moveHead({
              data: {
                action: 'relative_motion',
                waitTime: 0,
                x: offsetX * -1,
                y: offsetY * -1,
                f: 8400,
              },
            });
            throw MEASURE_ERROR.OUT_OF_MAX_RANGE;
          // 测距被打断
          case 6: {
            this.breakMeasureStatus = true;
            throw false;
          }
          default:
            break;
        }

        // 计算焦距，判断是否超出最小范围
        const temp = Number((measure / 10 - measureOffset).toFixed(1));
        console.log('measure: ', temp);
        // 测距冗余值为1
        if (!isNumber(measure) || !isNumber(temp) || temp + 1 < 0) {
          throw MEASURE_ERROR.OUT_OF_MIN_RANGE;
        }

        // 测量成功
        this.emitError(
          'device.measure_guide.auto_measurement_success',
          'success',
        );
        await this?.apis?.moveHead({
          data: {
            action: 'relative_motion',
            waitTime: 0,
            x: offsetX * -1,
            y: offsetY * -1,
            f: 8400,
          },
        });
        this.breakMeasureStatus = false;
        return Math.max(0, temp);
      } catch (error: any) {
        // 测距超时
        if (error.code && error.code === 'ECONNABORTED') {
          this.emitError(MEASURE_ERROR.NO_DATA_TIME, 'error');

          const { offsetX, offsetY } = this.getOffset();
          await this?.apis?.moveHead({
            data: {
              action: 'relative_motion',
              waitTime: 0,
              x: offsetX * -1,
              y: offsetY * -1,
              f: 8400,
            },
          });
          throw error;
        }
        if (error) {
          this.emitError(error, 'error');
        }
        throw error;
      } finally {
        this.isInMeasuring = false;
        this.updateCancelProcessing();
      }
    }

    // 清洗喷墨头
    @deviceChecker.cleanTest()
    async cleanPrintHead(position: string): Promise<any> {
      try {
        this.updateProcessing();
        // 1. 移动位置
        let x;
        let y;
        if (position === 'xtool define') {
          x = INK_PARAMS.spitX;
          y = INK_PARAMS.spitY;
        } else {
          const { X = 0, Y = 0 } = await this.apis?.getHeadPosition();
          x = X;
          y = Y;
        }
        await this?.apis?.moveHead({
          data: {
            action: 'go_to',
            waitTime: 3000,
            x,
            y,
            f: 8400,
          },
        });

        // 2. 测距
        const { value } = await this.apis.measure();

        // 3. 下降Z轴
        await this?.apis?.moveHead({
          data: {
            action: 'go_to',
            waitTime: 3000,
            z: value / 10,
            f: 8400,
          },
        });

        // 4. 发送清洗指令
        await this.apis.cleanPrintHead();
        await delay(3000);
        return true;
      } catch (error) {
        this.updateCancelProcessing();
        return error;
      } finally {
        await this?.apis?.moveHead({
          data: {
            action: 'go_to',
            waitTime: 3000,
            z: 0,
            f: 8400,
          },
        });
        this.updateCancelProcessing();
      }
    }

    showInkPrintMask(visible: boolean) {
      const canvas = this.dataSource?.canvasManager.canvas;
      if (canvas) {
        if (visible) {
          // 喷墨修改幅面
          const plugin = new M1LiteModePlugin('INK_PRINT_MASK');
          canvas.registerPlugin(plugin);
          plugin.inkPrintMask();
        } else {
          canvas.unRegisterPluginByName('INK_PRINT_MASK');
        }
      }
    }

    // 组合模式，喷墨头添加遮罩
    async handleDataFormValueChanged() {
      let visible = false;
      const elements: any = this.dataSource?.currentDeviceData.displays;
      const canvas = this.dataSource?.canvasManager.canvas;
      const el = await canvas.getCanvasData({
        imageData: false,
        path: false,
        clearSelected: false,
      });
      const res: any[] = [];
      el.forEach((item: any) => {
        res.push(elements.get(item.id));
      });
      res.forEach((item: any) => {
        if (item.processingType === PROCESSING_TYPE.INK_PRINT) {
          visible = true;
        }
      });
      this.showInkPrintMask(visible);
    }

    // 喷墨模式，添加遮罩
    handleDeviceFormValueChanged(prev: any, next: any) {
      const visible = next.mode === PROCESSING_MODE.INK_PRINT;
      this.showInkPrintMask(visible);
    }

    // 导出 gcode
    exportGcode = async () => {
      // 1. 读出当前任务对应的gcode文件数据
      let gcodePath = '';
      const currentTask =
        this.deviceInfo.taskList[this.deviceInfo.processTaskId];

      // 组合任务
      if (currentTask.length > 1) {
        const inputFiles = currentTask.map((taskId: number) => {
          const taskConfig = this.deviceInfo.processList[taskId];
          return `task/${taskConfig.gcode}`;
        });
        await this.combineGcode(inputFiles, COMBINE_TASK_GCODE);
        gcodePath = COMBINE_TASK_GCODE;
      } else {
        const taskConfig = this.deviceInfo.processList[currentTask];
        gcodePath = `task/${taskConfig.gcode}`;
      }

      // 默认文件名
      const gShareName = `${config.id}-${format(
        new Date(),
        'yyyy-MM-dd HH-mm-ss',
      )}.gc`;

      // 2. 写入用户定义路径
      // electron端处理
      if (this.fileHelper) {
        const gcode = await this.fileHelper.readGcode(gcodePath);
        return this.fileHelper.save(gShareName, gcode, {
          write: 'utf8',
          save: {
            defaultPath: gShareName,
            filters: [
              {
                name: 'GCode',
                extensions: ['gc'],
              },
            ],
          },
          saveAs: false,
        });
      }
    };

    // 根据加工模式，过滤不支持加工数据
    filterByMode(canvasData: any, mode: PROCESSING_MODE) {
      const filterData = [];
      for (const item of canvasData) {
        const isBitmap = item.type.toUpperCase() === 'BITMAP';
        const isFill = item.isFill;
        switch (mode) {
          case PROCESSING_MODE.KNIFE_COMBINE:
            if (isBitmap || isFill) {
              continue;
            }
            break;

          case PROCESSING_MODE.BRUSH_PAINTING:
          case PROCESSING_MODE.PRESS_PRINT:
            if (isBitmap) {
              continue;
            }
            break;

          case PROCESSING_MODE.INK_PRINT:
            if (!isBitmap) {
              continue;
            }
            break;
          default:
            break;
        }
        filterData.push(item);
      }
      return filterData;
    }

    // 加工前，检测激光头
    async checkProcessData({
      canvasData,
      centralAxisPosition,
      isWalkBorder = false,
      dataSource,
      isExportGcode = false,
      layerOrder,
      processPath,
    }: {
      canvasData: CanvasItemType[];
      canvasId: string;
      centralAxisPosition: number;
      isWalkBorder: boolean;
      dataSource: DataSource;
      isExportGcode: boolean;
      layerOrder: string[];
      processPath: string;
    }) {
      this.#isWalkBorder = isWalkBorder;
      const mode = dataSource?.currentDeviceData?.mode;

      // 加工前检测是否回原点被打断
      const resetInterrupt = await this.checkResetInterrupt();
      if (resetInterrupt) {
        throw 'resetInterrupt error';
      }

      // 用于加工完成，回加工前坐标
      try {
        const headPosition = await this.apis?.getHeadPosition();
        this.updateDeviceInfo({ headPosition });
      } catch (error) {
        console.log(error);
      }

      // 过滤不支持的加工数据
      const filterData = this.filterByMode(canvasData, mode);
      return super.checkProcessData({
        canvasData: filterData,
        centralAxisPosition,
        isWalkBorder,
        dataSource,
        isExportGcode,
        layerOrder,
        processPath,
      });
    }

    toggleMultiPointPlugin(data: any, status = true) {
      const canvas = this.dataSource?.canvasManager.canvas;
      let canvasPlugin = canvas.getPluginByName(MULTI_POINT_PLUGIN_NAME);
      if (status) {
        if (!canvasPlugin) {
          canvasPlugin = new M1LiteMultiPointPlugin(MULTI_POINT_PLUGIN_NAME);
          canvas.registerPlugin(canvasPlugin);
        }
        canvasPlugin.updateMeasureArea(data);
      } else {
        canvas.unRegisterPlugin(canvasPlugin);
      }
    }

    // 生成 gcode 的头尾部分
    generalGcodeHeadAndTail(data?: { isWalkBorder: boolean }) {
      // 获取加工前起始点
      const { X = 0, Y = 0 } = this.deviceInfo?.headPosition || {};
      const isWalkBorder = data?.isWalkBorder ?? this.dataParser.isWalkBorder;
      const gcodeTail = template(templates.gCodeTail);
      const originX = isWalkBorder ? digit(X, 3) : 0;
      const originY = isWalkBorder ? digit(Y, 3) : 0;
      this.dataParser.source.updateGCodeHead(templates.gCodeHead);
      this.dataParser.source.updateGcodeTail(
        gcodeTail({
          originPoint: { x: originX, y: originY },
        }),
      );
      return;
    }

    // 初始化加工任务数据
    initProcessTask() {
      this.#processTaskId = 0;
      this.#taskList = [];
      this.#processList = [];
      this.#processListData = {};
    }

    // 更新加工任务数据、
    updateProcessTask() {
      this.updateDeviceInfo({
        processTaskId: this.#processTaskId,
        taskList: this.#taskList,
        processList: this.#processList,
        processListData: this.#processListData,
      });
    }

    // 更新 params 参数
    async genProcessParams() {
      this.initProcessTask();
      const deviceData = this.dataSource?.currentDeviceData;
      const { current, base } = this.getCurrentArea(deviceData!.mode);
      const processingArea = current || base;
      const processParams = transformParams({
        deviceData,
        config: this.config.process,
        deviceInfo: this.deviceInfo,
        isWalkBorder: this.#isWalkBorder,
        processingArea,
      });
      // 参数更新
      this.dataParser?.source.updateProcessParams(processParams);
      // 存储svg
      await this.dataParser.saveImg();

      // 任务分组
      await this.taskGroupe();
      this.updateProcessTask();
    }

    // 任务分组
    async taskGroupe() {
      // 1. 遍历 elements 数组，通过 processingType 分组
      this.dataParser.source.elements.forEach((item: any) => {
        // 分组key，多画笔，多激光头
        const groupKey = `${item.processHead}${
          (item.processHead === 'BRUSH' ? item.brush : item.laser)
            ? FILE_SEP +
              (item.processHead === 'BRUSH' ? item.brush : item.laser)
            : ''
        }`;
        if (groupKey && isArray(this.#processListData[groupKey])) {
          this.#processListData[groupKey].push(item);
        } else {
          this.#processListData[groupKey] = [item];
        }
      });

      // 2. 存储分类加工类型
      this.#processList = Object.keys(this.#processListData).map(
        (item: string) => {
          const tempArr = item.split(FILE_SEP);

          // 处理大电流问题
          const currentData = this.#processListData[item];
          const isBigCutPress = currentData.some((el: any) => {
            return el?.cutValue > BIG_PRESS_RANGE;
          });

          if (tempArr.length > 1) {
            const processHead = tempArr[0];
            const headerDetail = tempArr[1];
            const headConfig = HEADER_CONFIG[processHead];
            return {
              groupKey: item,
              processHead,
              headerDetail,
              manifest: `${headerDetail}${FILE_SEP}${headConfig.in}`,
              gcode: `${headerDetail}${FILE_SEP}${headConfig.out}`,
              funcName: headConfig.funcName,
              toolType: headConfig.toolType,
              priority: headConfig.priority,
              isPrint: headConfig.isPrint,
              isDone: false,
              isActive: headConfig.isActive,
              timeUse: 0,
              isBigCutPress,
              notCombine: headConfig.notCombine,
              officeBrush: this.#processListData[item][0].officeBrush,
            };
          }
          const headConfig = HEADER_CONFIG[item];
          return {
            groupKey: item,
            processHead: item,
            manifest: headConfig.in,
            gcode: headConfig.out,
            funcName: headConfig.funcName,
            toolType: headConfig.toolType,
            priority: headConfig.priority,
            isPrint: headConfig.isPrint,
            isDone: false,
            isActive: headConfig.isActive,
            timeUse: 0,
            isBigCutPress,
            notCombine: headConfig.notCombine,
            officeBrush: this.#processListData[item][0].officeBrush,
          };
        },
      );

      // 3. 优先级排序
      this.#processList.sort((a, b) => {
        return a.priority - b.priority;
      });

      // 4. 任务整合
      this.#taskList = combineTask(this.#processList);
    }

    // 生成 dataParser.source 数据
    async beforeGenGcode() {
      // 每组调用 transform 计算偏移等
      for (const item of this.#processList) {
        const currentData = this.#processListData[item.groupKey];
        this.dataParser.source.elements = currentData;
        // 修改elements
        await this.genProcessElements();
        // 添加gcode头尾
        this.generalGcodeHeadAndTail();
        // 生成 manifest
        await this.dataParser.setup(MANIFEST_FOLDER, item.manifest);
        // 处理喷墨数据
        if (item.isPrint) {
          // 预览json写入
          const previewData = currentData.map((item: any) => {
            return {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              url: `file://${window.MeApi?.appDataPath}/${INK_PRINT_MDB_CONFIG.inputDir}/${item.filename}`,
            };
          });
          await window?.MeApi?.fileHelper?.writeData(
            INK_PREVIEW,
            JSON.stringify(previewData),
            {},
          );
          await window?.xcm?.inkJetMdb(INK_PRINT_MDB_CONFIG);
        }
      }
    }

    // gcode 生成前置操作
    async buildProcessGcode() {
      try {
        const gcodeFiles: { code: number; gcode: any[] } = {
          code: 0,
          gcode: [],
        };
        // manifest 生成
        await this.beforeGenGcode();
        // gcode 生成
        for (const item of this.#processList) {
          const gcodeResult = await window?.xcm?.genGCode({
            inputDir: MANIFEST_FOLDER,
            outputFile: `task/${item.gcode}`,
            manifestName: item.manifest,
            funcName: item.funcName,
            toolType: item.toolType,
          });
          console.log('gcodeResult: ', gcodeResult);
          if (gcodeResult?.code === -1 || !gcodeResult) {
            throw 'error';
          }
          if (item.processHead === PROCESS_HEADER.PRINTER) {
            // 传入喷墨json预览路径
            gcodeFiles.gcode.push(
              `${window.MeApi?.appDataPath}/${INK_PREVIEW}`,
            );
            continue;
          }
          gcodeFiles.gcode.push(gcodeResult.gcode || gcodeResult.outputFile);
        }
        return gcodeFiles;
      } catch (error) {
        console.log(error);
        return false;
      }
    }

    // 测距完成，重新生成gcode
    async rebuildGcode(taskId: number, measure?: number) {
      try {
        const taskConfig = this.#processList[taskId];
        const isPrint = taskConfig.processHead === PROCESS_HEADER.PRINTER;
        const currentData = this.#processListData[taskConfig.groupKey];
        this.dataParser.source.elements = currentData;
        if (measure) {
          this.dataParser.source.params.focalLen = measure;
          this.dataParser.source.params.z_num = measure;
        }
        await this.genProcessElements();

        // 生成 manifest
        await this.dataParser.setup(MANIFEST_FOLDER, taskConfig.manifest);

        // 处理喷墨数据
        if (isPrint) {
          await window?.xcm?.inkJetMdb(INK_PRINT_MDB_CONFIG);
        }

        // 重新生成gcode
        await window?.xcm?.genGCode({
          inputDir: MANIFEST_FOLDER,
          outputFile: `task/${taskConfig.gcode}`,
          manifestName: taskConfig.manifest,
          funcName: taskConfig.funcName,
          toolType: taskConfig.toolType,
        });

        // 喷墨压缩成zip
        if (isPrint) {
          const headConfig = HEADER_CONFIG[taskConfig.processHead];
          return this.fileHelper.zipDir(
            headConfig.outputDir,
            headConfig.zipFile,
          );
        }
        return true;
      } catch (error) {
        console.log('rebuild error: ', error);
        throw error;
      }
    }

    // gcode 组合
    async combineGcode(
      inputFiles: string[],
      outputFile: string,
    ): Promise<boolean> {
      try {
        // 将 input 中文件数据，整合到 output 文件中
        if (this.fileHelper && isFunction(this.fileHelper.combineFiles)) {
          await this.fileHelper.combineFiles(inputFiles, outputFile);
          return Promise.resolve(true);
        }
        return Promise.resolve(false);
      } catch (error) {
        return Promise.resolve(false);
      }
    }

    // 更新 manifest elements
    async genProcessElements(data?: { isWalkBorder: boolean }) {
      const { isWalkBorder = false } = data || {};
      return transformElements(
        {
          deviceData: this.dataSource?.currentDeviceData,
          deviceInfo: this.deviceInfo,
          ext: this,
          isWalkBorder,
        },
        this.dataParser,
      );
    }

    // 将任务ID后置到，上传文件之后
    async genTaskId() {}

    async writeHistoryGcode(gcodePath: string) {
      const task = this.taskManager.createTask(this.id, this.deviceInfo.snCode);
      const input = gcodePath;
      const out = task.gcodePath;
      return this.fileHelper.copy(input, out);
    }

    // 发送gcode
    @deviceChecker.uploadGCode()
    async uploadGCode(params?: any): Promise<boolean> {
      let gcodePath = '';
      const currentTask =
        this.deviceInfo.taskList[this.deviceInfo.processTaskId];
      const isCombineTask = currentTask.length > 1;
      let isLase = false;
      let isPrint = false;
      let isBigCutPress = false;
      this.hasCancelProcess = false;

      try {
        // 组合任务，需要合并gcode
        if (isCombineTask) {
          const inputFils: any[] = [];
          currentTask.forEach((item: number) => {
            const taskConfig = this.deviceInfo.processList[item];
            if (taskConfig.processHead === PROCESS_HEADER.LASER) {
              isLase = true;
            }
            if (taskConfig.isBigCutPress) {
              isBigCutPress = taskConfig.isBigCutPress;
            }
            inputFils.push(`task/${taskConfig.gcode}`);
          });
          const res = await this.combineGcode(inputFils, COMBINE_TASK_GCODE);
          if (!res) {
            throw 'combine fail';
          }
          gcodePath = COMBINE_TASK_GCODE;
        } else {
          const processTask = this.deviceInfo.processList[currentTask[0]];
          if (processTask.isBigCutPress) {
            isBigCutPress = processTask.isBigCutPress;
          }
          isPrint = HEADER_CONFIG[processTask.processHead].isPrint;
          gcodePath = `task/${processTask?.gcode}`;
        }

        let getToolType;

        if (isCombineTask) {
          getToolType = isLase ? ToolType.Laser : ToolType.Combine;
        } else {
          const officeBrush =
            this.deviceInfo.processList[currentTask].officeBrush;
          getToolType =
            !officeBrush && officeBrush !== undefined
              ? ToolType.Brush_Custom
              : HEADER_CONFIG[
                  this.deviceInfo.processList[currentTask].processHead
                ]?.processType;
        }

        // 调用大电流大刀压接口
        if (isBigCutPress) {
          this.apis.setActiveElectric({ data: ACTIVE_ELECTRIC.MAX });
        }

        // 切换类型，是否需要排气
        await this.apis.setToolType({
          params: {
            type: getToolType,
          },
        });

        // 发送gcode
        const {
          baseUrl,
          url,
          params: urlParams = {},
        } = await this.apis.uploadGcode({ method: 'info' });
        const printParams = isPrint
          ? {
              gcodeType: 'printer',
              fileType: 'normal',
              operate: 'normal',
            }
          : {};

        // 喷墨
        gcodePath = isPrint
          ? HEADER_CONFIG[PROCESS_HEADER.PRINTER].zipFile
          : gcodePath;

        // 任务ID
        if (this.supportTaskId) {
          await this.writeHistoryGcode(
            `${window.MeApi?.appDataPath}/${gcodePath}`,
          );
          urlParams.taskId = this.taskManager.getTask(
            this.deviceInfo.snCode,
          ).id;
        }

        // 上传路径
        const uploadGcodeUrl = `${baseUrl}${url}${parseParams({
          ...urlParams,
          ...printParams,
        })}`;
        console.log({ uploadGcodeUrl });

        const result = await super.uploadByBuilder({
          url: uploadGcodeUrl,
          path: gcodePath,
          options: {
            isFullPath: false,
            onProgress: (percent: number) => {
              isFunction(params?.onProgress) && params.onProgress(percent);
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
      } catch (error) {
        console.log('m2 upload gcode fail: ', error);
        return Promise.reject(false);
      }
    }

    // 终止上传gcode
    cancelUploadGCode() {
      if (isFunction(this.#cancelable)) {
        this.#cancelable();
      }
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

    // 继续加工
    @deviceChecker.restartProcessing()
    restartProcessing() {
      logger.info('点击继续加工');
    }

    // 自动测距
    @deviceChecker.autoMeasure()
    checkMeasureSafety() {}

    // 标定弹窗
    // @dataChecker.multiPoint()
    @deviceChecker.multiPoint()
    multiPoint() {}

    // 关闭复位异常弹窗
    closeResetHomeModal() {
      const currentInfo = {
        resetInterrupt: false,
      };
      this.updateDeviceInfo(currentInfo);
    }

    updateProcessing() {
      this.updateDeviceInfo({ currentStatus: PROCESSING_EVENT.BEFORE_START });
    }

    updateCancelProcessing() {
      this.updateDeviceInfo({ currentStatus: PROCESSING_EVENT.IDLE });
    }

    // 关盖复位
    @deviceChecker.resetHome()
    async resetHome() {
      // 设置加工类型为自定义画笔加工
      const currentInfo = {
        loadingResetHomeButton: true,
      };
      try {
        this.updateDeviceInfo(currentInfo);
        await this.apis.resetOrigin();
      } catch (e) {
        const currentInfo = {
          loadingResetHomeButton: false,
        };
        this.updateDeviceInfo(currentInfo);
        this.updateCancelProcessing();
      }
    }

    // socket 处理上报加工信息
    #handleProcessingStatusChange(cmd: string) {
      logger.log('processing cmd', cmd);
      console.log('processing cmd', cmd);
      let status = statusMap[cmd];
      // 取消加工
      if (status === PROCESSING_EVENT.CANCEL_PROCESS) {
        this.hasCancelProcess = true;
        this.#isCancelProcess = true;
      }
      // gcode 发送完成，就绪状态
      if (status === PROCESSING_EVENT.BEFORE_START) {
        this.#isCancelProcess = false;
      }
      // 取消加工，会上报 finish
      if (this.#isCancelProcess && status === PROCESSING_EVENT.FINISH_PROCESS) {
        this.#isCancelProcess = false;
        if (this.#isWalkBorder) {
          this.#isWalkBorder = false;
          this.stopWalkBorder();
          this.changeWalkBorderModal(false);
          return;
        }
        status = PROCESSING_EVENT.CANCEL_PROCESS;
      }
      // 加工完成，将当前任务表示为加工完成
      if (!this.#isWalkBorder && status === PROCESSING_EVENT.FINISH_PROCESS) {
        const current = this.deviceInfo.taskList[this.deviceInfo.processTaskId];
        const len =
          this.deviceInfo.processList && this.deviceInfo.processList.length;
        if (current && len) {
          current.forEach((item: number) => {
            this.#processList[item].isDone = true;
          });
        }
        this.updateProcessTask();
      }
      if (this.#isWalkBorder && cmd === SOCKET_PROCESS_CMD.WORK_FINISHED) {
        // 重复发送走边框
        this.startWalkBorder(this.#walkBorderGcode);
      }
      if (status) {
        this.deviceInfo = { currentStatus: status };
        this.updateDeviceInfo({ currentStatus: status });
        this.generateProcessingTask(status);
        const handle = this.whenReceiveCmdResolveMap.get(status);
        if (isFunction(handle)) {
          handle(status);
        }
      }
    }

    // 监听socket信息
    async deviceCmdParsing(cmd: string) {
      const cmdObj = parseJSON(cmd, { defaultValue: {} });
      const { module = '', info = '', type = '' } = cmdObj;
      // 报警弹框
      const errorKey = [module, type, info].join(SEP);
      const errorObj =
        config.deviceExceptions && config.deviceExceptions[errorKey];

      if (errorObj) {
        logger.log('===设备报错===', errorObj.code);
        this.emit(ExtEvents.Error, errorObj);
      }

      if (errorKey === GAP_OPEN) {
        this.emitError('device.m1lite.close_gap_process', 'warning');
        if (this.#walkBorderGcode) {
          this.emitError('device.m1lite.break_operation', 'warning');
        }
      }
      switch (module) {
        // 加工状态信息
        case SOCKET_MODULE.STATUS_CONTROLLER:
          logger.log('socket', { module, info, type });
          if (type === PROCESSING_EVENT.MODE_CHANGE) {
            const taskId = info.taskId;
            this.deviceInfo = { taskId: taskId };
          }
          if (type === SOCKET_PROCESS_CMD.AXIS_HOME_FINISHED) {
            const currentInfo = {
              resetInterrupt: false,
              loadingResetHomeButton: false,
            };
            this.breakMeasureStatus = false;
            // 更新数据
            this.updateDeviceInfo(currentInfo);
          }
          this.#handleProcessingStatusChange(type);
          break;

        // 编码器
        case SOCKET_MODULE.LASER_HEAD:
          if (type === 'VALUE_CHANGE') {
            if (DRIVING_LOCK_INFO.hasOwnProperty(info)) {
              DRIVING_LOCK_INFO[info] && this.updateHeadParams(true);
            }
          } else {
            LASER_HEAD_MODULE[type] && this.emit(LASER_HEAD_MODULE[type], info);
          }
          break;

        // USB钥匙连接状态
        case SOCKET_MODULE.MACHINE_LOCK: {
          logger.log('socket', { module, info, type });
          const workStatus = await this.apis.getWorkStatus();
          if (
            workStatus.subMode !== 'workPause' &&
            errorKey !== MACHINE_LOCK_OPEN
          ) {
            type === 'CLOSE'
              ? this.emitError('device.m1lite.usb_install', 'success')
              : this.emitErrorByCmd(errorKey, 'err_usb_unlock');
          }
          this.updateDeviceInfo({ usbKeyIsLock: type === 'CLOSE' });
          break;
        }

        // 盖子开关状态
        case SOCKET_MODULE.GAP:
          this.updateDeviceInfo({ gapCover: type === 'CLOSE' });
          break;

        // 底板
        case SOCKET_MODULE.DRAWER: {
          const data = { drawerStatus: type === 'CLOSE' };
          Object.assign(this.deviceInfo, data);
          this.emit(SYSTEM_EVENT.UPDATE_DEVICE_INFO, data);
          break;
        }

        // 排烟风扇
        case SOCKET_MODULE.SMOKING_FAN:
          this.updateDeviceInfo({ smokingFan: type === 'CONNECT' });
          break;

        // 增高架连接状态
        case SOCKET_MODULE.US_HEIGHT: {
          console.log('tt,', { module, info, type });
          const configData = HEIGHTEN_MODE_TYPE[type];
          const msgKey = `${this.dataSource?.currentDeviceData?.mode}_MSG`;
          if (configData[msgKey]) {
            const { contentI18nKey, type } = configData[msgKey];
            this.emitError(contentI18nKey, type);
          }
          if (configData?.data) {
            Object.assign(this.deviceInfo, configData.data);
            this.emit(SYSTEM_EVENT.UPDATE_DEVICE_INFO, configData.data);
          }
          break;
        }

        case SOCKET_MODULE.MOTOR_HOME: {
          const reason = RESET_HOME_REASON[info] || '';
          if (reason) {
            const currentInfo = {
              resetInterrupt: true,
              loadingResetHomeButton: false,
              resetInterruptReason: reason,
            };
            // 更新数据
            this.updateDeviceInfo(currentInfo);
          }
          break;
        }

        default:
          break;
      }
    }

    // 查询非加工主动头、被动头
    async getHeader(): Promise<HeaderDetail> {
      const acquiescentInfo = {
        driving: 0,
        drived: 0,
        drivingLock: false,
      };
      try {
        const { driving, drived, drivingLock } =
          await this.apis.getProcessHeadType();
        // 假如没有装主动头，则默认锁扣不检测
        const lockStatus = driving === 0 || drivingLock === 1;
        Object.assign(acquiescentInfo, {
          driving,
          drived,
          drivingLock: lockStatus,
        });
        this.updateDeviceInfo(acquiescentInfo);
        return acquiescentInfo;
      } catch (error) {
        return acquiescentInfo;
      }
    }

    // 获取加工时主动头
    async getProcessHead(): Promise<HeaderDetail> {
      if (this.#isSearchHeadType) {
        const { driving, drived, drivingLock } = this.deviceInfo;
        return {
          driving,
          drived,
          drivingLock,
        };
      }
      this.#isSearchHeadType = true;
      const result = {
        driving: 0,
        drived: 0,
        drivingLock: false,
      };

      // 1. 查询加工头
      try {
        const { driving, drived, drivingLock } =
          await this.apis.getProcessHeadType();

        // 假如没有装主动头，则默认锁扣不检测
        const lockStatus = driving === 0 || drivingLock === 1;
        Object.assign(result, {
          driving,
          drived,
          drivingLock: lockStatus,
        });
      } catch (error) {
        this.#isSearchHeadType = false;
        return result;
      }

      if (result.driving === Head_ID.Active_Rotate_Knife) {
        // 2. 查询主动刀头
        try {
          const { driving } = await this.apis.getKnifeHeadType();
          // 操作中断,可能不需要了
          // if (driving === -1) {
          //   this.emitError('device.m1lite.break_operation', 'error');
          // }
          result.driving = driving || 0;
        } catch (error) {
          this.#isSearchHeadType = false;
          return result;
        }
      }

      this.#isSearchHeadType = false;
      return result;
    }

    // 设备设置刷新加工头
    @deviceChecker.getProcessingHead()
    refreshHead() {
      return this.updateHeadParams(false);
    }

    // 热插拔，更新主/被动头，并且更新偏移值数据
    async updateHeadParams(isTip: boolean) {
      const processHeadData = await this.getProcessHead();
      console.log('processHeadData: ', { processHeadData });
      if (isTip) {
        if (checkLaserChange(processHeadData.driving)) {
          this.emitError('device.m1lite.chang_laser_header');
        }
      }
      this.updateDeviceInfo(processHeadData);
      return processHeadData;
    }

    // 请求校准数据
    async getCalibData(arg: any): Promise<{ X: number; Y: number; Z: number }> {
      try {
        if (!arg) {
          return { X: 0, Y: 0, Z: 0 };
        }
        const res = await this.apis.getOffset({ data: arg });
        return res;
      } catch (error) {
        return { X: 0, Y: 0, Z: 0 };
      }
    }

    // 获取红十字校准数据
    async getRedCrossCalibData(): Promise<{
      redCrossPoint1: PointType;
      redCrossPoint2: PointType;
      passiveZ: PointType;
    }> {
      const redCrossPoint1 = await this.getCalibData(CALIB_DATA.redCross[0]);
      const redCrossPoint2 = await this.getCalibData(CALIB_DATA.redCross[1]);
      const passiveZ = await this.getCalibData(CALIB_DATA.drived_z);
      return {
        redCrossPoint1,
        redCrossPoint2,
        passiveZ,
      };
    }

    // 获取下位机当前状态
    async getCurrentStatus() {
      const result = await this.apis.getStatus();
      const mode = result?.curMode?.mode;
      const subMode = result?.curMode?.subMode;
      const key = `${mode}.${subMode}`;
      // const alarmArr = result?.curAlarmInfo?.alarm || [];
      const map = {
        'P_IDLE.': SOCKET_PROCESS_CMD.IDLE,
        'Work.workReady': SOCKET_PROCESS_CMD.WORK_PREPARED,
        'Work.working': SOCKET_PROCESS_CMD.WORK_STARTED,
        'Work.workPause': SOCKET_PROCESS_CMD.WORK_PAUSED,
        'P_WORK_DONE.': SOCKET_PROCESS_CMD.WORK_FINISHED,
        'P_ERROR.': SOCKET_PROCESS_CMD.ERROR,
      };
      return { status: map[key] };
    }

    // 设备连接
    async onConnected() {
      this.#connected = true;
      const { status } = await this.getCurrentStatus();

      // IDLE状态重置预览界面
      if (PROCESSING_EVENT.IDLE === status) {
        this.appContext.resetProcessingState();
        this.apis.openHeadPosition();
      }

      // 重连更新下位机状态
      this.deviceCmdParsing(
        JSON.stringify({
          module: SOCKET_MODULE.STATUS_CONTROLLER,
          type: status,
        }),
      );

      // 获取usb钥匙状态
      // 获取盖子开关状态
      // 获取增高架连接状态
      const {
        usbKeyIsLock = false,
        gapCover = false,
        heightenStatus = false,
        heightenDoorStatus = false,
        smokingFan = false,
        drawerStatus = false,
        isHoming = true,
      } = await this.apis.connectInfo();

      // 获取 主动头/被动头 类型
      const processHeadData = await this.getHeader();

      // 获取运动状态是否被打断
      await this.checkResetInterrupt();

      // 获取 红十字校准 数据
      const redCrossData = await this.getRedCrossCalibData();

      // 存储数据
      const currentInfo = {
        ...processHeadData,
        ...redCrossData,
        usbKeyIsLock,
        gapCover,
        smokingFan,
        heightenStatus,
        heightenDoorStatus,
        drawerStatus,
        isHoming,
        resetInterrupt: this.deviceInfo.resetInterrupt,
        loadingResetHomeButton: this.deviceInfo.loadingResetHomeButton,
        taskList: [],
      };

      if (isHoming && status !== SOCKET_PROCESS_CMD.ERROR) {
        currentInfo.resetInterrupt = true;
        currentInfo.loadingResetHomeButton = true;
      }

      // 更新数据
      this.updateDeviceInfo(currentInfo);
      console.log('currentInfo', currentInfo);
      super.onConnected();
    }

    onDisconnect(): void {
      this.#connected = false;
      super.onDisconnect();
      this.changeWalkBorderModal(false);
      this.emit(LASER_HEAD_MODULE.MODE_REPORT, { x: 0, y: 0 });
    }

    dispose() {
      super.dispose();
    }
  }
  return M1LiteExt;
}
