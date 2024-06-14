import{useViewModel as U,__unplugin_components_0 as H,_export_sfc as P,observeEffect as S,useExtCenterStore as M,xcsApp as V}from"./main-f7BGirYr.js";import{pwdRegex as q}from"./regexhelpr-tVNfJSeD.js";import"../assets/index-FfF0Lcw0.js";import{HotspotConfigViewModel as A,SetWifiInfoEvent as J,GetWifiListEvent as Q,WIFI_NAME_MAX_LENGTH as L,WIFI_NAME_MIN_LENGTH as Y,WIFI_PASSWORD_MIN_LENGTH as Z}from"./hotspotconfigviewmodel-8JYLNcii.js";import{useI18n as G}from"./importmap-vue-i18n-LlhaB8iP.js";import{useRouter as ee}from"./importmap-vue-router-aHGpzyJi.js";import{defineComponent as K,computed as W,openBlock as m,createElementBlock as u,createVNode as l,withCtx as _,createBaseVNode as s,toDisplayString as w,unref as o,Fragment as z,renderList as oe,createTextVNode as O,ref as b,watch as F,onMounted as te,createCommentVNode as ie}from"./importmap-vue-u6Q_1Jji.js";import{Popup as le,Loading as se,Button as X,NavBar as ne,Field as ae}from"./importmap-vant-Ij4SMMwJ.js";const ce={class:"wifi-list-pop"},de={class:"wifi-list-container"},re={class:"wifi-list-header"},fe={class:"wifi-header-text"},me={key:0,class:"wifi-list-content"},ue={class:"center-container mt-16"},pe={class:"loading-text"},_e={key:1,class:"wifi-list-content"},ve={class:"center-container"},we={key:2,class:"wifi-list-content mt-16"},he=["onClick"],ge={class:"text"},be={class:"wifi-list-bottom"},ke=K({__name:"WifiPop",props:{wifiListData:{},modelValue:{type:Boolean},wifiName:{}},emits:["update:modelValue","update:wifiName","refresh"],setup(R,{emit:e}){const{t:h}=G(),p=R,a=e,k=U(A),y=W(()=>k.uiState.isWifiListLoading),d=W({get:()=>p.modelValue,set:c=>a("update:modelValue",c)}),r=c=>{a("update:wifiName",c),f()},f=()=>{a("update:modelValue",!1)},E=()=>{a("refresh")};return(c,x)=>{const N=se,g=H,B=X,T=le;return m(),u("div",ce,[l(T,{show:d.value,"onUpdate:show":x[0]||(x[0]=v=>d.value=v),round:"","close-on-click-overlay":!0},{default:_(()=>[s("div",de,[s("div",re,[s("span",fe,w(o(h)("mobile.connect.hotspot_config_wifi_list")),1)]),y.value?(m(),u("div",me,[s("div",ue,[l(N,{size:"20px",type:"spinner",color:"#545458"},{default:_(()=>[s("span",pe,w(o(h)("device.status.loading")),1)]),_:1})])])):c.wifiListData.length===0?(m(),u("div",_e,[s("div",ve,[l(g,{name:"wifi-empty",class:"wifi-empty-icon"})])])):(m(),u("div",we,[(m(!0),u(z,null,oe(c.wifiListData,v=>(m(),u("div",{key:v,class:"wifi-list-item",onClick:$=>r(v)},[s("div",ge,w(v),1),l(g,{name:v==c.wifiName?"checkmark":"",color:"#28BE44",class:"wifi-item-check"},null,8,["name"])],8,he))),128))])),s("div",be,[l(B,{block:"",class:"wifi-refresh-btn",disabled:y.value,onClick:E},{default:_(()=>[O(w(o(h)("mobile.connect.refresh")),1)]),_:1},8,["disabled"])])])]),_:1},8,["show"])])}}}),ye=P(ke,[["__scopeId","data-v-2ac21c01"]]),Ve={class:"config-wifi-container"},xe={class:"config-header-tip"},Ne={class:"input-wrap"},Ce={key:0},Ie={class:"right-lock"},Le={class:"right-lock"},We={key:1},Ee={class:"right-lock"},Be={class:"bottom-wrap"},Te=K({__name:"ConfigWifiByHotspot",setup(R){const{t:e}=G(),h=ee(),p=U(A),a=b(""),k=b(""),y=W(()=>f.value?a.value:k.value),d=b(""),r=b(!1),f=b(!0);F([()=>a.value,()=>f.value],([i,t])=>{console.log("selectedWifiName:",i,t),d.value=""}),S(()=>p.uiEffect.showToast,i=>{V.modal.showToast({icon:"info",msg:e(i.msgKey),wordBreak:"break-word"})}),S(()=>p.uiEffect.showSuccessToast,i=>{V.modal.showToast({icon:"success",msg:e(i.msgKey),wordBreak:"break-word"})}),S(()=>p.uiEffect.showFailToast,i=>{V.modal.showToast({icon:"error",msg:e(i.msgKey),wordBreak:"break-word"})});const E=()=>{if(!f.value){f.value=!0;return}h.back()};let c=!1;const x=()=>{if(c){console.log("didSave",c);return}if(!M().checkDeviceIsIdle()){V.modal.showToast({msg:e("device.process.device_is_working"),wordBreak:"break-word"});return}V.modal.showTipModal({haveIcon:!0,iconName:"msg_info",title:e("device.connect.wifi_config"),content:e("mobile.connect.hotspot_config_wifi_dialog_tip"),hasClose:!1,confirmTxt:e("mobile.common.confirm"),cancelTxt:e("mobile.common.cancel"),onConfirm:()=>{c=!0,p.sendEvent(new J(y.value,d.value)),setTimeout(()=>{M().closeConnect()},3e3)},onCancel:()=>{}})},N=i=>i.replace(q,""),g=b(!1),B=W(()=>{console.log("wifiListData:",p.uiState.wifiList);const i=[...p.uiState.wifiList];return a.value.length===0&&i.length>0&&(a.value=i[0]),i}),T=()=>{g.value=!0},v=()=>{f.value=!1};F(()=>M().connected,i=>{i||h.go(-2)});const $=()=>{p.sendEvent(new Q)};return te(()=>{$()}),(i,t)=>{const C=H,D=X,j=ne,I=ae;return m(),u(z,null,[l(j,{"left-arrow":"",title:i.$t("device.connect.wifi_setting"),fixed:"",placeholder:""},{left:_(()=>[l(D,{class:"header-lft-btn",size:"small",onClick:E},{default:_(()=>[l(C,{name:"arrow_left",color:"#fff",class:"f-s-22"})]),_:1})]),_:1},8,["title"]),s("div",Ve,[s("div",xe,w(f.value?o(e)("mobile.connect.hotspot_config_wifi_header_tip_new"):o(e)("mobile.connect.hotspot_config_wifi_header_tip")),1),s("div",Ne,[f.value?(m(),u("div",Ce,[l(I,{ref:"wifiNameRef",modelValue:a.value,"onUpdate:modelValue":t[0]||(t[0]=n=>a.value=n),clearable:"",border:!1,"label-width":"25%",maxlength:o(L),placeholder:o(e)("ipad.connect.select_wifi"),label:o(e)("mobile.connect.wifi_name"),readonly:"",class:"input-box",onClick:T},{"right-icon":_(()=>[s("div",Ie,[l(C,{name:"psw-arrow_right",class:"f-s-18"})])]),_:1},8,["modelValue","maxlength","placeholder","label"]),l(I,{modelValue:d.value,"onUpdate:modelValue":t[1]||(t[1]=n=>d.value=n),clearable:"",class:"input-box","label-width":"25%",border:!1,maxlength:o(L),label:o(e)("mobile.connect.wifi_password"),type:r.value?"text":"password",formatter:N,placeholder:o(e)("ipad.connect.placeholder_password"),onClickRightIcon:t[2]||(t[2]=n=>r.value=!r.value)},{"right-icon":_(()=>[s("div",Le,[l(C,{name:r.value?"eye-on":"eye-off",class:"f-s-18"},null,8,["name"])])]),_:1},8,["modelValue","maxlength","label","type","placeholder"])])):(m(),u("div",We,[l(I,{ref:"wifiNameRef",modelValue:k.value,"onUpdate:modelValue":t[3]||(t[3]=n=>k.value=n),clearable:"",border:!1,class:"input-box","label-width":"25%",maxlength:o(L),placeholder:o(e)("ipad.connect.placeholder_wifi_name"),label:o(e)("mobile.connect.wifi_name")},null,8,["modelValue","maxlength","placeholder","label"]),l(I,{modelValue:d.value,"onUpdate:modelValue":t[4]||(t[4]=n=>d.value=n),clearable:"",class:"input-box",border:!1,"label-width":"25%",maxlength:o(L),label:o(e)("mobile.connect.wifi_password"),type:r.value?"text":"password",formatter:N,placeholder:o(e)("ipad.connect.placeholder_password"),onClickRightIcon:t[5]||(t[5]=n=>r.value=!r.value)},{"right-icon":_(()=>[s("div",Ee,[l(C,{name:r.value?"eye-on":"eye-off",class:"f-s-18"},null,8,["name"])])]),_:1},8,["modelValue","maxlength","label","type","placeholder"])]))]),s("div",Be,[f.value?(m(),u("div",{key:0,class:"bottom-tip",onClick:v},w(o(e)("mobile.connect.hotspot_config_wifi_btn_tip")),1)):ie("",!0),l(D,{block:"",class:"btn",disabled:y.value.length<o(Y)||d.value.length<o(Z),onClick:t[6]||(t[6]=n=>x())},{default:_(()=>[O(w(o(e)("mobile.editor.keyboard_confirm")),1)]),_:1},8,["disabled"])]),l(ye,{modelValue:g.value,"onUpdate:modelValue":t[7]||(t[7]=n=>g.value=n),wifiName:a.value,"onUpdate:wifiName":t[8]||(t[8]=n=>a.value=n),"wifi-list-data":B.value,onRefresh:$},null,8,["modelValue","wifiName","wifi-list-data"])])],64)}}}),Pe=P(Te,[["__scopeId","data-v-3f87f016"]]);export{Pe as default};
