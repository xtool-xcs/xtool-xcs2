var g=Object.defineProperty;var y=(s,n,e)=>n in s?g(s,n,{enumerable:!0,configurable:!0,writable:!0,value:e}):s[n]=e;var f=(s,n,e)=>(y(s,typeof n!="symbol"?n+"":n,e),e);import{BaseViewModel as S,deviceManager as i,NativeApi as d,sensorsTrack as v,ButtonNames as u,PageName as L,EventNames as D,xcsApp as p,AppType as w,SingleData as C,ConnectType as I}from"./main-f7BGirYr.js";import"../assets/index-FfF0Lcw0.js";import{effectScope as W,watch as P}from"./importmap-vue-u6Q_1Jji.js";class A{}class N{}class O{constructor(n,e){this.device=n,this.isCloseLasted=e}}class k{}class E{}class H{}class F extends S{constructor(){super();f(this,"effectScope",W(!0));f(this,"lastConnectedDevice",null);f(this,"isCloseLasted",!1);this.effectScope.run(()=>{P(()=>i._data,()=>{this.updateState({connectIdentityList:i.connectIdentityList})},{deep:!0})})}createState(){return{wifiDeviceList:[],wifiDirectDeviceList:[],wifiDevicesLoading:!1,connectLoadingVisible:!1,isWifiOpen:!1,connectIdentityList:i.connectIdentityList}}onDestroy(){super.onDestroy(),i.stopWifiList(),this.effectScope.stop()}setEventHandler(){this.registerEventHandler(A,this.findDeviceByWifi),this.registerEventHandler(N,this.stopFindDeviceByWifi),this.registerEventHandler(O,this.connectDevice),this.registerEventHandler(k,this.openWifiPage),this.registerEventHandler(H,this.handleCheckIsWifiOpenEvent),this.registerEventHandler(E,this.openSystemPermissionPage)}async handleCheckIsWifiOpenEvent(){const e=await d.isWifiOpen();this.updateState({isWifiOpen:e}),e||this.sendEffect({showOpenWifiDialog:{}})}async findDeviceByWifi(){if(v(D.buttonClick,{elementId:u.refresh,pageName:L.connectDevice,type:"wifi"}),!await d.requestNetPermission()){this.sendEffect({showGrantNetPermissionDialog:{}});return}if(await this.handleCheckIsWifiOpenEvent(),!this.uiState.wifiDevicesLoading){if(!this.uiState.isWifiOpen){this.updateState({wifiDeviceList:[]});return}this.updateState({wifiDeviceList:[],wifiDevicesLoading:!0}),await i.wifiList((t,a)=>{t=t.filter(o=>o.ip!=="192.168.40.1"),this.updateState({wifiDeviceList:[...t]})}),this.updateState({wifiDevicesLoading:!1})}}stopFindDeviceByWifi(){i.stopWifiList(),this.updateState({wifiDevicesLoading:!1})}async connectDevice(e){this.lastConnectedDevice=e.device,this.isCloseLasted=e.isCloseLasted;const t=p.appType==w.App;t&&i.extId&&e.device.product!==i.extId?p.modal.showSwitchDeviceModal({type:"extId",onConfirm:()=>{this.confirmConnectDevice(e.device,!1)},onCancel:()=>{}}):await this.confirmConnectDevice(e.device,!t)}async cancelSwitchDevice(){this.updateState({isShowSwitchDeviceDialog:!1})}sleep(e){return new Promise(t=>setTimeout(t,e))}async confirmConnectDevice(e,t){var l;if(C.getInstance().connectType=I.wifi,i.connectIdentityList.includes(e.ip)&&p.appType==w.App){this.sendEffect({connectSuccess:{}});return}if(this.uiState.connectLoadingVisible)return;this.updateState({connectLoadingVisible:!0});let a=!1;const o=i.ext;let c=null;try{if(!await d.requestNetPermission())throw new Error("没有本地网络权限");const{extId:m}=e;if(i.connectIdentityList.includes(e.ip)){const r=i.getConnectDevice(e.ip);r!=null&&(c=r)}else{const r=await i.loadExt(m);c=await i.connectExt(r,e)}await i.updateCurrentInstanceId(c,()=>{a=!0},()=>{a=!1,i.closeConnect(c.instanceId)},!0,t),this.isCloseLasted&&await this.closeAndRemoveLastDevice(o,c)}catch(h){a=!1,(l=c==null?void 0:c.device)==null||l.destroyWorker(),console.log("===>error",h),this.sendEffect({connectFail:{}})}finally{this.isCloseLasted&&await this.closeAndRemoveLastDevice(o,c)}this.updateState({connectLoadingVisible:!1}),a&&(this.updateState({currentConnectedDevice:e}),this.sendEffect({connectSuccess:{}}))}async closeAndRemoveLastDevice(e,t){e&&t&&e!=t&&(e==null?void 0:e.instanceId)!=(t==null?void 0:t.instanceId)&&i.closeAndRemoveDevice(e==null?void 0:e.instanceId)}async openWifiPage(){v(D.buttonClick,{elementId:u.setWifi}),await d.openWifiPage()}openSystemPermissionPage(){window.MeApi.permission.openAppPermissionPage()}}export{H as CheckIsWifiOpenEvent,O as ConnectEvent,A as FindDeviceEvent,E as OpenSystemPermissionPageEvent,k as OpenWifiPageEvent,F as WifiViewModel};
