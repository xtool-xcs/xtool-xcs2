import{__unplugin_components_0 as C,_export_sfc as x,Storage as m,router as u}from"./main-f7BGirYr.js";import{useI18n as $}from"./importmap-vue-i18n-LlhaB8iP.js";import{defineComponent as v,computed as A,openBlock as y,createElementBlock as B,createVNode as s,withCtx as i,createBaseVNode as a,toDisplayString as l,createTextVNode as d,ref as M,onMounted as I,createBlock as L}from"./importmap-vue-u6Q_1Jji.js";import{Dialog as N,Button as D}from"./importmap-vant-Ij4SMMwJ.js";import"../assets/index-FfF0Lcw0.js";import"./importmap-vue-router-aHGpzyJi.js";const H={class:"privacy-container"},V={class:"title"},E=["innerHTML"],P=v({__name:"PrivacyDialog",props:{callback:{type:Function},show:{type:Boolean}},setup(r){const{t:e}=$(),t=r,c=o=>{switch(o.target.classList.value){case"service":n("https://passport.xtool.com/terms.html");break;case"privacy":n("https://passport.xtool.com/policy.html");break;case"safe":n("https://s.xtool.com/doc/lso-training");break}},p=A(()=>e("mobile.common.privacy_policy_detail",{user_policy:`<a class='service'>${e("mobile.common.user_policy_des")}</a>`,privacy_policy:`<a class='privacy'>${e("mobile.common.privacy_policy_des")}</a>`,safe_policy:`<a class='safe'>${e("mobile.common.safe_policy_des")}</a>`}));function h(){t.callback(!1)}function b(){t.callback(!0)}function n(o){window.MeApi.openNative.openWebInApp(o)}return(o,g)=>{const w=C,_=D,k=N;return y(),B("div",null,[s(k,{show:o.show,"show-confirm-button":!1,"show-cancel-button":!1,class:"van-dialog-policy"},{default:i(()=>[a("div",H,[s(w,{name:"home-soft",class:"home-icon"}),a("div",V,l(o.$t("mobile.common.privacy_policy")),1),a("div",{class:"content",onClick:c},[a("div",{class:"description",innerHTML:p.value},null,8,E)]),s(_,{type:"success",class:"agree_btn",onClick:b},{default:i(()=>[d(l(o.$t("mobile.common.agree_and_continue")),1)]),_:1}),s(_,{class:"disagree-but",onClick:h},{default:i(()=>[d(l(o.$t("mobile.common.disagree")),1)]),_:1})])]),_:1},8,["show"])])}}}),T=x(P,[["__scopeId","data-v-0e55c1a5"]]),f="PRIVACY_NEW_KEY",j=v({__name:"Index",setup(r){const e=M(!1);function t(c){c?(m().set(f,!0),u.replace({path:"/"})):window.MeApi&&window.MeApi.app.exit()}return I(()=>{const c=m().get(f,!1);e.value=!c,c&&u.replace("/")}),(c,p)=>(y(),L(T,{show:e.value,callback:t},null,8,["show"]))}});export{j as default};