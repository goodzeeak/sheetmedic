// Runs in an opaque-origin iframe. Never grant this iframe allow-same-origin.
(() => {
  const allowed = new Set(['page_view','analysis_success','repairs_applied','export_success','processing_attempt','processing_failure']);
  let config;
  window.dataLayer=[];
  function gtag(){window.dataLayer.push(arguments);}
  window.addEventListener('message',event=>{
    if(event.source!==parent)return;
    if(event.data?.type==='initialize'&&!config){
      const value=event.data.config;
      if(!value||!/^G-[A-Z0-9]{4,20}$/.test(value.measurementId))return;
      let url;try{url=new URL(value.siteUrl);}catch{return;}
      if(!['https:','http:'].includes(url.protocol)||url.search||url.hash||url.username||url.password)return;
      config={measurementId:value.measurementId,siteUrl:value.siteUrl.replace(/\/$/,'')};
      gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      gtag('js',new Date());
      gtag('config',config.measurementId,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,
        client_id:crypto.randomUUID(),cookie_domain:'none',cookie_expires:0,cookie_update:false,
        page_location:config.siteUrl+'/',page_title:'SheetMedic',page_referrer:''});
      const script=document.createElement('script');script.async=true;script.referrerPolicy='no-referrer';
      script.src='https://www.googletagmanager.com/gtag/js?id='+config.measurementId;document.head.appendChild(script);
    }
    if(event.data?.type==='event'&&config){
      const payload=event.data.payload;
      if(!payload||!allowed.has(payload.name))return;
      const path=payload.params?.page_location;
      if(path!==config.siteUrl+'/'&&path!==config.siteUrl+'/privacy/')return;
      gtag('event',payload.name,{send_to:config.measurementId,page_location:path,page_referrer:'',page_title:path.endsWith('/privacy/')?'SheetMedic privacy':'SheetMedic'});
    }
  });
  parent.postMessage({type:'sheetmedic-analytics-ready'},'*');
})();
