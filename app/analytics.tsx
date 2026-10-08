'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { pageVisit,privacyOptOut,setConsent,storedConsent,startAnalytics,stopAnalytics,validConfig, type AnalyticsConfig } from '../lib/analytics';
import {assetPath} from '../lib/site';

export function Analytics() {
  const path = usePathname();
  const lastPath = useRef<string | null>(null);
  const [config,setConfig]=useState<AnalyticsConfig|null>(null),[enabled,setEnabled]=useState(false),[choosing,setChoosing]=useState(false);
  useEffect(()=>{
    let active=true;
    if(!privacyOptOut(navigator))void fetch(assetPath('/analytics-config.json'),{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(3000)})
      .then(r=>r.json()).then(value=>{if(active&&validConfig(value)){setConfig(value);if(storedConsent()){startAnalytics(value);setEnabled(true);}else {try{setChoosing(localStorage.getItem('sheetmedic.analytics-consent')!=='denied');}catch{setChoosing(true);}}}}).catch(()=>{});
    return()=>{active=false;stopAnalytics();};
  },[]);
  useEffect(() => {
    // Count route visits, not hydration, rerenders, query changes or Strict Mode replays.
    if (!enabled || path === lastPath.current) return;
    lastPath.current = path;
    pageVisit(path === '/privacy' ? '/privacy/' : path);
  }, [path,enabled]);
  if(!config)return null;
  function choose(allow:boolean){setConsent(allow);setChoosing(false);setEnabled(allow);lastPath.current=null;if(allow)startAnalytics(config!);}
  return choosing?<aside className="analytics-choice" aria-label="Analytics preference"><p>Help improve SheetMedic with optional Google Analytics? Only usage events are shared, never spreadsheet data.</p><button className="secondary" onClick={()=>choose(false)}>No thanks</button><button className="primary" onClick={()=>choose(true)}>Allow analytics</button></aside>:<button className="analytics-settings" onClick={()=>setChoosing(true)}>Analytics preferences</button>;
}
