var B=Object.defineProperty;var T=(t,e,s)=>e in t?B(t,e,{enumerable:!0,configurable:!0,writable:!0,value:s}):t[e]=s;var _=(t,e,s)=>(T(t,typeof e!="symbol"?e+"":e,s),s);import{BaseViewModel as C,useExtCenterStore as w,MultiProcessManager as L,PROCESSING_EVENT as P,externalInterface as n,processUtilityManager as y,CommonProcessDataCheckTip as M,sensorsTrack as D,EventNames as G,ProductType as v,PROCESSING_MODE as k}from"./main-f7BGirYr.js";import"../assets/index-FfF0Lcw0.js";import{watch as x}from"./importmap-vue-u6Q_1Jji.js";var u=(t=>(t.Process="process",t.WalkBoarder="walkBoarder",t.ExportGCode="exportGCode",t))(u||{}),I=(t=>(t[t["device.gs002.file_save_success"]=0]="device.gs002.file_save_success",t[t["device.gs002.file_already_exists"]=1]="device.gs002.file_already_exists",t[t["device.gs002.file_does_not_exist"]=2]="device.gs002.file_does_not_exist",t[t["device.gs002.space_is_not_enough"]=3]="device.gs002.space_is_not_enough",t[t["device.gs002.backup_failure"]=4]="device.gs002.backup_failure",t))(I||{});class W{constructor(e){this.instanceId=e}}class A{constructor(e,s,c){this.instanceId=e,this.isPreview=s,this.taskId=c}}class H{constructor(e){this.instanceId=e}}class U extends C{constructor(){super(...arguments);_(this,"multiProcess")}createState(){return{walkBorderLoading:!1,isFrameMode:!1,walkBroderVisible:!1}}initWatch(){super.initWatch();const s=w();x(()=>s.isShowWalkBorderTipModal,c=>{this.updateState({walkBroderVisible:c})})}setEventHandler(){this.registerEventHandler(W,this.requestDeviceStatus),this.registerEventHandler(A,this.walkBorder),this.registerEventHandler(H,this.stopWalkBorder)}requestDeviceStatus(s){this.multiProcess=L.instance.addProcess(s.instanceId),this.effectWatch(()=>(x(()=>n.deviceData(),c=>{const r=c[s.instanceId],a=[P.FRAME_READY,P.FRAME_WORKING].includes(r==null?void 0:r.currentStatus);this.updateState({isFrameMode:a})},{immediate:!0,deep:!0}),{}))}async walkBorder(s){var c,r;if(!this.uiState.walkBorderLoading)try{this.updateState({walkBorderLoading:!0}),n.isFrameMode()&&await((c=this.multiProcess)==null?void 0:c.stopWalkBorder());const a=await((r=this.multiProcess)==null?void 0:r.walkBorder(s.isPreview,s.taskId));a&&this.sendEffect({showToast:{msgKey:a}})}catch{this.sendEffect({showToast:{msgKey:"device.process.gcode_upload_fail"}})}finally{this.updateState({walkBorderLoading:!1})}}async stopWalkBorder(s){var c,r,a;try{if(!this.multiProcess)return;await y.withTimeout((c=this.multiProcess)==null?void 0:c.stopWalkBorder(),3e3)}catch(h){console.log(h)}finally{(a=(r=n.getCurrentExt(s.instanceId))==null?void 0:r.changeWalkBorderModal)==null||a.call(r,!1)}}onDestroy(){super.onDestroy()}}class N{constructor(e,s=!1,c=!1){this.checkType=e,this.checkOverDict=s,this.checkAgain=c}}class F{}class Y extends C{createState(){return{isProcessChecking:!1,isWalkBoarderChecking:!1,isExportGCodeChecking:!1}}setEventHandler(){this.registerEventHandler(N,this.handleCheckEvent),this.registerEventHandler(F,this.handleCheckDeviceLengthEvent)}async handleCheckEvent(e){var a,h;const s=e.checkOverDict;if(e.checkType===u.WalkBoarder){if(this.uiState.isWalkBoarderChecking)return;this.updateState({isWalkBoarderChecking:!0})}else if(e.checkType===u.ExportGCode){if(this.uiState.isExportGCodeChecking)return;this.updateState({isExportGCodeChecking:!0})}else{if(this.uiState.isProcessChecking)return;this.updateState({isProcessChecking:!0})}const c=n.getCurrentInstanceId();if(!c){this.checkOver(e.checkType),this.sendEffect({checkProcessFail:{checkType:e.checkType,type:"error",text:"device.status.please_connect_device"}});return}let r="";try{const i=await y.withTimeout(y.checkProcess(c,e.checkType===u.WalkBoarder,e.checkType===u.ExportGCode),3e4);if(i){r="fail";const l={checkType:e.checkType,type:i.type,text:i.text,event:i.event||null};this.checkOver(e.checkType),this.sendEffect({checkProcessFail:l}),(l.text===M.catch_data_empty||l.text===M.thickness_is_empty)&&this.sendEffect({onlyProcessPanelOpen:{}});return}const f=n.getExt(),{overScanRequired:g=!0}=f.config.process.buildParams;if(s&&g&&f.id==="S1"&&f.checkOverDict()){r="fail";const p={checkType:e.checkType,type:"s1OverDict",text:void 0};this.checkOver(e.checkType),this.sendEffect({checkProcessFail:p});return}r="success",this.sendEffect({checkProcessSuccess:{checkType:e.checkType,isCheckAgain:e.checkAgain}})}catch(i){console.log(i)}finally{const i=n.getExt();D(G.startProcess,{result:r,extId:c,...(a=i==null?void 0:i.dataParser)==null?void 0:a.processingModeData,processingParams:(h=i==null?void 0:i.dataParser)==null?void 0:h.processingParams}),this.checkOver(e.checkType)}}async handleCheckDeviceLengthEvent(){var c,r,a,h,i,f,g,l,p,S,m,E;const e=n.getExt();if(!e)return;const s=e.id;if(v.S1===s){const d=((r=(c=e.dataSource)==null?void 0:c.currentModeData)==null?void 0:r.focalLength)??void 0;if(!d&&d!==0){this.sendEffect({checkLengthFail:{msg:"device.process.focal_length_is_empty"}});return}}if(v.M1===s){const d=n.currentMode();if(d!==k.KNIFE_CUT)if(d===k.LASER_CYLINDER||d===k.PASS_THROUGH){const o=((h=(a=e.dataSource)==null?void 0:a.currentModeData)==null?void 0:h.focalLength)??void 0;if(!o&&o!==0){this.sendEffect({checkLengthFail:{msg:"device.process.focal_length_is_empty"}});return}}else{const o=((f=(i=e.dataSource)==null?void 0:i.currentModeData)==null?void 0:f.thickness)??void 0;if(!o&&o!==0){this.sendEffect({checkLengthFail:{msg:"device.process.thickness_is_empty"}});return}}}if(v.M2===s&&n.currentMode()!==k.KNIFE_CUT&&!(((l=(g=e.dataSource)==null?void 0:g.currentModeData)==null?void 0:l.focalLen)||void 0)){this.sendEffect({checkLengthFail:{msg:"device.process.focal_length_is_empty"}});return}if(v.P2===s)if(n.currentMode()===k.LASER_PLANE){const o=((S=(p=e.dataSource)==null?void 0:p.currentModeData)==null?void 0:S.thickness)??void 0;if(!o&&o!==0){this.sendEffect({checkLengthFail:{msg:"device.process.thickness_is_empty"}});return}}else{const o=((E=(m=e.dataSource)==null?void 0:m.currentModeData)==null?void 0:E.focalLength)??void 0;if(!o&&o!==0){this.sendEffect({checkLengthFail:{msg:"device.process.focal_length_is_empty"}});return}}this.sendEffect({checkLengthSuccess:{}})}checkOver(e){e===u.WalkBoarder?this.updateState({isWalkBoarderChecking:!1}):e===u.ExportGCode?this.updateState({isExportGCodeChecking:!1}):this.updateState({isProcessChecking:!1})}}export{F as CheckDeviceLengthEvent,N as CheckProcessEvent,Y as CheckProcessViewModel,u as CheckType,W as RequestDeviceStatusEvent,H as StopWalkBorderEvent,I as WORK_FILE_CODE,A as WalkBorderEvent,U as WalkBorderViewModel};
