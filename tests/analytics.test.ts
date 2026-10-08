import {afterEach,describe,expect,it,vi} from 'vitest';
import {AnalyticsEvent,AnalyticsPage,EVENTS,payloadFor,privacyOptOut,validConfig} from '../lib/analytics';
const config={websiteId:'11111111-2222-4333-8444-555555555555',hostname:'sheetmedic-goodwin-labs.grandmink.chatgpt.site'};
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('analytics privacy contract',()=>{
 it('only serializes fixed fields, even when config contains private extras',()=>{
  const payload=payloadFor({...config,filename:'payroll.xlsx',email:'private@example.com'} as typeof config,'/','analysis_success');
  expect(payload).toEqual({type:'event',payload:{website:config.websiteId,hostname:config.hostname,url:'/',title:'SheetMedic',referrer:'',name:'analysis_success'}});
 });
 it('rejects arbitrary event strings, URLs and malformed IDs',()=>{
  expect(payloadFor(config,'/','secret cell value' as AnalyticsEvent)).toBeNull();
  expect(payloadFor(config,'/?email=private@example.com' as AnalyticsPage)).toBeNull();
  expect(payloadFor(config,'/customer/123' as AnalyticsPage)).toBeNull();
  expect(validConfig({...config,websiteId:''})).toBe(false);
  expect(validConfig({...config,hostname:'host/path?secret'})).toBe(false);
 });
 it('supports every requested workflow event with no properties or distinct ID',()=>{
  for(const name of EVENTS){const body=payloadFor(config,'/',name)!;expect(Object.keys(body.payload).sort()).toEqual(['hostname','name','referrer','title','url','website']);}
  expect(payloadFor(config,'/privacy/')!.payload).not.toHaveProperty('name');
 });
 it('respects DNT and GPC',()=>{expect(privacyOptOut({doNotTrack:'1'})).toBe(true);expect(privacyOptOut({doNotTrack:'yes'})).toBe(true);expect(privacyOptOut({globalPrivacyControl:true})).toBe(true);expect(privacyOptOut({doNotTrack:'0'})).toBe(false);});
 it('never starts networking when privacy signal is enabled',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('window',{location:{hostname:config.hostname}});vi.stubGlobal('navigator',{globalPrivacyControl:true});vi.stubGlobal('fetch',fetcher);
  const {event}=await import('../lib/analytics');event('analysis_success');await new Promise(r=>setTimeout(r,0));expect(fetcher).not.toHaveBeenCalled();
 });
 it('disables tracking on unconfigured or mismatched hosts',async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>config});vi.stubGlobal('window',{location:{hostname:'localhost'}});vi.stubGlobal('navigator',{});vi.stubGlobal('fetch',fetcher);
  const {event}=await import('../lib/analytics');event('analysis_success');await new Promise(r=>setTimeout(r,0));expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('sends nonblocking requests without credentials or referrer and absorbs failure',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>config}).mockRejectedValue(new Error('Offline'));vi.stubGlobal('window',{location:{hostname:config.hostname}});vi.stubGlobal('navigator',{});vi.stubGlobal('fetch',fetcher);
  const {event}=await import('../lib/analytics');expect(event('analysis_success')).toBeUndefined();await new Promise(r=>setTimeout(r,0));expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1][1]).toMatchObject({credentials:'omit',referrerPolicy:'no-referrer',keepalive:true});
 });
});
