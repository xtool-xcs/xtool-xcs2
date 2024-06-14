import{useMaterialStore as G,useExtCenterStore as q,useDebounceFn as J,useNetwork as $,xcsApp as M,sensorsTrack as ee,ButtonNames as te,EventNames as se,getDomain as oe,__unplugin_components_0 as ae,filterMaterialListByDeviceMode as ne,getOssProcessedImage as le,_export_sfc as re}from"./main-f7BGirYr.js";import"./griditem.vue_vue_type_style_index_0_scoped_39934db8_lang-w40geAFS.js";import{Grid as ie}from"./grid-aKCJR2-u.js";import{useRouter as ce,useRoute as Ae}from"./importmap-vue-router-aHGpzyJi.js";import{useI18n as de}from"./importmap-vue-i18n-LlhaB8iP.js";import{lodashExports as ue}from"../assets/index-FfF0Lcw0.js";import{Button as me,NavBar as pe,List as ve,Image as ge,Space as fe,Cell as we}from"./importmap-vant-Ij4SMMwJ.js";import{defineComponent as _e,ref as u,computed as F,onMounted as Le,onBeforeUnmount as be,openBlock as n,createElementBlock as _,createVNode as l,withCtx as i,createBaseVNode as o,normalizeStyle as X,createBlock as A,unref as r,createTextVNode as Y,toDisplayString as L,Fragment as Q,renderList as z,normalizeClass as he,createCommentVNode as b}from"./importmap-vue-u6Q_1Jji.js";const ke=""+new URL("../assets/default_material_img-6UZehMzY.png",import.meta.url).href,ye="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAQmSURBVHgB3ZtdSBRdGMfPObtp9sLr5psvrNXqVkRQWqlJH0ZJdJEFRdRNXRRdBHZRBgV2lV0VGPQBKXQhXbRGFlLg5kWQQR+UrGYf935QKqmtBra668w0/4mNbXbL2XZ2Z8753Xg+xrPPb894Vh/noUTH8PDodoWSvYSwfYQoRYRDFEJ7CVV6mey44HYv7I+do9FGX1/QlZ0jn1cvryUiwZSrM1POC17vwgl0NWHIZuXInZQo69Tu5FToW+P42MTzPbsOPiMc0tp2q2SZt7Ama17WYfSx4+EQq4K0Jjw0Mn4FOyvLymBPoLv62LFTg0QAmpuveUrLyx4xRj3Y6YL/80/T4eFgkUKlPlwQ6Aqs0ct2dNzbmvdf3u7R8S9+ozv++vXjczn/LDj3u/lk39i51pNmI+0tvvaahobLk/o5SJdXlL1Qb+ZcqihVjDDpPCbCM2FfbAC1tSddXYEnlxYvLfBPh2fe21UW673peVuXSBbgdUKhUCPakkL3OdX7ex3u8qFPHxujF0H2yNEDfofTURycmKzZVlntIyYFZ7askfVG1fPIs3QBYYzspUMjYwoGS9Zs+Td6AXZ2/vzsEyLIRnn34cVXfGX6iZs3rxeKJhtLnHBpWXGdqLIgTnjk81iLCLI4h7q7n97Rjzv1A3Y+jZORjR66+jlG/gJeZUHSwjzLgqSEeZcFhoVFkAWGhEWRBXMKiyQLWKaCM3s9I7LhSDju9wmWieDMXs+obPn6qhr9OEt3cGavl4osYOkMzuz1UpUFccIiywLDn8MiyAJDwqLIgjmFRZIFfxQWTRYwM4IDPMgClmpwgBdZwFIJDthZFglJ/VicsEiyFRtL/frxOGGRZLX/KemwPKeVSVlgaU4r07LAspyWFbLAkpyWVbIg4zktK2VBRnNaVsuCjOW0rJCdCn27qB/LSE7LKtlNG3YaExZVFqQ1p2U3WZC2nJYdZUFaclp2lQWm57TsLAtMzWnZXRaYltPiQRaYktPiRRaknNPiSRbECUdmpeeiyJ49eyZXP5bw0UMj2F22te12SZHHfaiifEcd+tFHD53kL+BBdtVKrz/QFdiin0s6xcOLbGh62pfox1IVpv1otHfc2zrXYrzISrPS4P27bT+/p7X1VonWoLSXqSfyQ7TzF7kq/7QYTzvb4rtb3dBw4+cD48uWF2oxKUTppT/Kdmin2p189bKn8vjxkwOJFgy86WyKFk0kwkrZ5uYmz+riFYdHExSm4LU2bi57jzZVHF6tyOPj0NhVxsgpfP52verZ/Ttp3oh9Y2WZXFtSsKj2RxlPMOjKDsudRNHKeLT6h8GBgab9+4++IxyiFabkuSrVP3VPqN3cuDIeAOl5IakeO00EAjsbmXHU/1KoFYtW1kMi9YQ51kZ3nD9ovyxLDx2UPnC785/GznwHp7hvLCibE9MAAAAASUVORK5CYII=",Ce="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAA8CAYAAAA6/NlyAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAADBSURBVHgB7dpBCsIwFEXRp7gvs4gO3I11Nw66iO/OjFNtU8HwkZd7oAgpCLeQDH4rAQDwNw5KNE2XUn/K23Isyz2U5KRcpV7XlfVQkqMGQ7A7gt0R7I5gdwS7I9gdwe4IdjdccHOmtTGD+sV55f+iXg/105yR7c20itZnUD0V9X2oL7F1gz3sbrjgvT0c6ivl0GrdzH7zMOvzELzVU3VWEvawO4LdEeyOYHcEuyPYHcHuCHZHsLvsby3jyzUAAEbwBO9pGeBtMkMMAAAAAElFTkSuQmCC",Z="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAOCAYAAAAbvf3sAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAD9SURBVHgBlVDLEQFBEH0ztpTjhrAiwEVxIwIlAjJABMhACESgZOC2flWIwIbg6MJ40/uxu7Wq6KqZnunu9/p1AwVmjujgHzN7GIKmvxUfUBeAPTuM83ldgBklL4WpOcM1Jww+IcvKoPwe9Bq3bEtMLJB+rlpYhAAfQ5QkaXV7uY53Hld8GVUVDRmzfopf6LLbOipOumlhDwu9FCNQwYWgPrIT1xw46DGB1KAT3nXVEOCWW9uSuRMrcPhxU+WBamKZLCGUtiFJDAg0A9cU+1xcI5IVxoLk/cRKs8PCIiVHdnyzF9fapjwZ3odnN0UpXr6O8Rnzs0KSjPY45mdJ3v4wWVUrDWobAAAAAElFTkSuQmCC",Ue={class:"material-wrap"},Be={class:"change-list"},Ie={class:"change"},Re=["onClick"],xe={class:"selected-wrap"},Ve={class:"material-name-wrap"},Ee={class:"material-name"},Se={class:"card"},Me={class:"w64"},Fe={class:"material-name-wrap"},Xe={class:"material-name"},Ye={class:"selected"},Qe={class:"bottom"},ze=_e({__name:"MoreMaterial",setup(Ze){const h=ce(),g=Ae(),d=u(0),C=u(!1),D=u(!0),{t:f,locale:P}=de(),U=u([]),k=G(),B=F(()=>{const e=k.getMaterialList;return console.log("oldList",e),ne(U.value,e)});Le(()=>{window.addEventListener("message",V),g.query.processTypes&&(U.value=g.query.processTypes),g.query.selectMaterial&&(c.value=Number(g.query.selectMaterial)),console.log("materialList-数据",y.value)});const y=F(()=>(console.log("materialListByTypes.value",B.value),B.value.map(({id:e,name:t,image:a,isDangerous:m})=>{const p=P.value==="zh-CN"?t.zh:t.en;return{id:e,text:e===0?f(p):p,image:a,isDangerous:m}}))),W=(e,t)=>`${e}?x-oss-process=image/resize,w_${t}/format,webp`,j=e=>e.image?le(e.image,"m_fill,w_512,h_512","webp"):ke,c=u(0),I=e=>{d.value=e},R=e=>{c.value=e.id},x=q(),w=u(!1),N=J(()=>{w.value||(w.value=!0,h.back(),k.setLocalMaterial(c.value),k.sortLocalMaterial(c.value),setTimeout(()=>{M.modal.showToast({msg:"device.parameter_panel.success",layout:"vertical",icon:"success",uniqueId:"material-toast",duration:3e3})},0),w.value=!1)},500),O=$().isOnline,T=()=>{var a;if(ee(se.buttonClick,{elementId:te.plusMore}),!O.value){M.modal.showToast({msg:f("announcement.network_error"),icon:"error"});return}let e=x.currentPower;ue.isArray(e)&&(e=e.join(","));const t=`${oe().domain.material}?power=${e}&device=${x.ext.config.productID}`;console.log(["=> material lab url",e,t]),(a=window.MeApi)==null||a.openNative.openWebInApp(t)};be(()=>{window.removeEventListener("message",V)});const V=e=>{const{action:t,id:a,processingType:m="",matrix:p={},power:v,productID:E,originLaserSource:S}=e.data;t==="popMoreMaterial"&&h.back()};return(e,t)=>{const a=ae,m=me,p=pe,v=ge,E=fe,S=we,K=ve;return n(),_("div",Ue,[l(p,{title:e.$t("mobile.device.select_material"),fixed:"","left-arrow":"",placeholder:"",class:"nav-bar-wrap",style:{width:"100%"}},{left:i(()=>[l(a,{name:"arrow_left",size:"22px",class:"f-s-22",onClick:t[0]||(t[0]=()=>r(h).back())})]),right:i(()=>[l(m,{type:"success",disabled:w.value,class:"right-btn",onClick:r(N)},{default:i(()=>[Y(L(e.$t("mobile.material.confirmed")),1)]),_:1},8,["disabled","onClick"])]),_:1},8,["title"]),o("section",Be,[o("div",Ie,[o("div",{class:"out",style:X({backgroundColor:d.value==0?"#fff":"#E1E2E6"}),onClick:t[1]||(t[1]=s=>I(0))},[l(a,{name:d.value==0?"material_round":"material_round_default",size:"16px",class:"f-s-16"},null,8,["name"])],4),o("div",{class:"out",style:X({backgroundColor:d.value==1?"#fff":"#E1E2E6"}),onClick:t[2]||(t[2]=s=>I(1))},[l(a,{name:d.value==1?"material_list":"material_list_default",size:"16px",class:"f-s-16"},null,8,["name"])],4)])]),d.value==0?(n(),A(r(ie),{key:0,cols:2,gap:"16px",class:"block-list"},{default:i(()=>[(n(!0),_(Q,null,z(y.value,s=>(n(),_("div",{key:s.id,class:he(["item",{active:c.value===s.id}]),onClick:H=>R(s)},[c.value==s.id?(n(),A(a,{key:0,name:"file_upload_success",class:"selected f-s-18"})):b("",!0),o("div",xe,[l(v,{src:j(s),height:110,"preview-disabled":"",class:"material-image"},null,8,["src"])]),o("section",Ve,[s.isDangerous?(n(),A(v,{key:0,src:r(Z),width:12,height:13,class:"fire"},null,8,["src"])):b("",!0),o("span",Ee,L(s.text),1)])],10,Re))),128))]),_:1})):(n(),A(K,{key:1,loading:C.value,"onUpdate:loading":t[3]||(t[3]=s=>C.value=s),finished:D.value,class:"line-list","finished-text":r(f)("mobile.material.no_more")},{default:i(()=>[(n(!0),_(Q,null,z(y.value,s=>(n(),A(S,{key:s.id},{default:i(()=>[l(E,{style:{display:"flex"},class:"item",onClick:H=>R(s)},{default:i(()=>[o("div",Se,[o("section",Me,[l(v,{src:s.image?W(s.image,512):r(ye),class:"w64","preview-disabled":""},null,8,["src"])]),o("section",Fe,[s.isDangerous?(n(),A(v,{key:0,src:r(Z),width:12,height:13,class:"fire"},null,8,["src"])):b("",!0),o("span",Xe,L(s.text),1)])]),o("div",Ye,[c.value==s.id?(n(),A(a,{key:0,name:"file_upload_success",class:"f-s-18"})):b("",!0)])]),_:2},1032,["onClick"])]),_:2},1024))),128))]),_:1},8,["loading","finished","finished-text"])),o("section",Qe,[l(m,{icon:r(Ce),type:"default",class:"bottom-btn",onClick:T},{default:i(()=>[Y(L(r(f)("device.material.material_lab")),1)]),_:1},8,["icon"])])])}}}),Ge=re(ze,[["__scopeId","data-v-1235e3b2"]]);export{Ge as MoreMaterial};