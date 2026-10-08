import {assetPath,pagePath} from './site';
/** Fixed events only: never accept file data, names, errors or arbitrary properties. */
export const EVENTS = ['processing_attempt', 'analysis_success', 'repairs_applied', 'export_success', 'processing_failure'] as const;
export type AnalyticsEvent = typeof EVENTS[number];
export type AnalyticsPage = '/' | '/privacy/';
export type AnalyticsConfig = { measurementId: string; siteUrl: string };
type PrivacyNavigator = { doNotTrack?: string | null; globalPrivacyControl?: boolean };

export function validConfig(value: unknown): value is AnalyticsConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as AnalyticsConfig;
  if(typeof config.measurementId!=='string'||!/^G-[A-Z0-9]{4,20}$/.test(config.measurementId)||typeof config.siteUrl!=='string')return false;
  try {const url=new URL(config.siteUrl);return ['https:','http:'].includes(url.protocol)&&!url.search&&!url.hash&&!url.username&&!url.password;}catch{return false;}
}

export function privacyOptOut(nav: PrivacyNavigator) {
  return nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || nav.globalPrivacyControl === true;
}

export function payloadFor(config: AnalyticsConfig, page: AnalyticsPage, name?: AnalyticsEvent) {
  if (!validConfig(config) || !['/', '/privacy/'].includes(page) || (name !== undefined && !EVENTS.includes(name))) return null;
  return {name:name??'page_view',params:{page_location:config.siteUrl.replace(/\/$/,'')+page,page_title:page==='/'?'SheetMedic':'SheetMedic privacy',page_referrer:''}};
}

export const CONSENT_KEY='sheetmedic.analytics-consent';
let frame:HTMLIFrameElement|null=null,config:AnalyticsConfig|null=null,ready=false;
let queue:NonNullable<ReturnType<typeof payloadFor>>[]=[];
export function storedConsent(){try{return localStorage.getItem(CONSENT_KEY)==='granted';}catch{return false;}}
export function setConsent(granted:boolean){
  try{localStorage.setItem(CONSENT_KEY,granted?'granted':'denied');}catch{/* An in-memory choice still works. */}
  if(!granted)stopAnalytics();
}
function onReady(e:MessageEvent){
  if(!frame||e.source!==frame.contentWindow||e.data?.type!=='sheetmedic-analytics-ready')return;
  ready=true;frame.contentWindow?.postMessage({type:'initialize',config},'*');
  for(const payload of queue)frame.contentWindow?.postMessage({type:'event',payload},'*');queue=[];
}
export function startAnalytics(value:AnalyticsConfig){
  if(frame||!validConfig(value)||privacyOptOut(navigator))return;
  config=value;frame=document.createElement('iframe');frame.title='Optional usage analytics';frame.hidden=true;
  // Opaque-origin sandbox: Google's tag cannot read the app DOM, uploaded files or cookies.
  frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.src=assetPath('/ga-bridge.html');
  window.addEventListener('message',onReady);document.body.appendChild(frame);
}
export function stopAnalytics(){frame?.remove();frame=null;config=null;ready=false;queue=[];if(typeof window!=='undefined')window.removeEventListener('message',onReady);}
function send(page:AnalyticsPage,name?:AnalyticsEvent){
  try{if(!config||!frame||privacyOptOut(navigator))return;const payload=payloadFor(config,page,name);if(!payload)return;
    if(ready)frame.contentWindow?.postMessage({type:'event',payload},'*');else if(queue.length<20)queue.push(payload);
  }catch{/* Analytics never blocks processing. */}
}
export function event(name:AnalyticsEvent){if(EVENTS.includes(name))send('/',name);}
export function pageVisit(path:string){const page=pagePath(path);if(page==='/'||page==='/privacy/')send(page);}
