import {describe,it,expect} from 'vitest';
import {EVENTS,payloadFor,validConfig,privacyOptOut,type AnalyticsEvent,type AnalyticsPage} from '../lib/analytics';
const config={measurementId:'G-TEST12345',siteUrl:'https://goodzeeak.github.io/sheetmedic'};
describe('GA4 privacy contract',()=>{
 it('allows only sanitized paths and fixed event fields',()=>{expect(payloadFor(config,'/','analysis_success')).toEqual({name:'analysis_success',params:{page_location:config.siteUrl+'/',page_title:'SheetMedic',page_referrer:''}});});
 it('rejects arbitrary event names and sensitive URLs',()=>{expect(payloadFor(config,'/?email=secret' as AnalyticsPage)).toBeNull();expect(payloadFor(config,'/','private data' as AnalyticsEvent)).toBeNull();});
 it('validates the measurement ID and canonical origin',()=>{expect(validConfig(config)).toBe(true);for(const value of ['', 'UA-123','G-<script>'])expect(validConfig({...config,measurementId:value})).toBe(false);expect(validConfig({...config,siteUrl:'https://host/?secret=1'})).toBe(false);});
 it('supports workflow events without properties or user identifiers',()=>{for(const name of EVENTS)expect(Object.keys(payloadFor(config,'/',name)!.params).sort()).toEqual(['page_location','page_referrer','page_title']);});
 it('strips unexpected input fields',()=>{expect(JSON.stringify(payloadFor({...config,filename:'secret.csv'} as typeof config,'/'))).not.toContain('secret');});
 it('honors DNT and GPC',()=>{expect(privacyOptOut({doNotTrack:'1'})).toBe(true);expect(privacyOptOut({globalPrivacyControl:true})).toBe(true);expect(privacyOptOut({})).toBe(false);});
 it('tracks privacy page with canonical subpath',()=>{expect(payloadFor(config,'/privacy/')?.params.page_location).toBe(config.siteUrl+'/privacy/');});
});
