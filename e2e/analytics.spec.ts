import {test,expect,Page} from '@playwright/test';
type Hit={type:string;payload:Record<string,string>};
async function instrument(page:Page,fail=false){
 const hits:Hit[]=[],headers:Record<string,string>[]=[];
 await page.route('**/analytics-config.json',route=>route.fulfill({json:{websiteId:'11111111-2222-4333-8444-555555555555',hostname:'127.0.0.1'}}));
 await page.route('https://gateway.umami.is/api/send',async route=>{
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type'}});return;}
  hits.push(route.request().postDataJSON());headers.push(await route.request().allHeaders());
  if(fail)await route.abort();else await route.fulfill({json:{},headers:{'Access-Control-Allow-Origin':'*'}});
 });return {hits,headers};
}
test('exact workflow events and page visits never contain private input',async({page})=>{
 const {hits,headers}=await instrument(page);
 await page.goto('/?email=secret@example.com#private');
 await expect.poll(()=>hits.length).toBe(1);
 await page.getByRole('button',{name:'Switch to dark theme'}).click();
 await page.getByLabel('Choose spreadsheet').setInputFiles({name:'Secret-payroll-Alice.xlsx.csv',mimeType:'text/csv',buffer:Buffer.from('Private heading,Email\n Alice ,secret@example.com\n Alice ,secret@example.com')});
 await expect(page.getByRole('heading',{name:'A little clarity for your data.'})).toBeVisible();
 await page.getByRole('button',{name:'Preview changes'}).click();await expect(page.getByText('0 cells changed')).toBeVisible();
 await page.getByLabel('Trim whitespace').check();await page.getByRole('button',{name:'Preview changes'}).click();await expect(page.getByText('2 cells changed')).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();await download;
 await expect.poll(()=>hits.length).toBe(5);
 expect(hits.map(h=>h.payload.name??'page_visit')).toEqual(['page_visit','processing_attempt','analysis_success','repairs_applied','export_success']);
 await page.getByRole('button',{name:'Start over'}).click();await page.getByLabel('Choose spreadsheet').setInputFiles({name:'sensitive.csv',mimeType:'text/csv',buffer:Buffer.from('Name\n"private-error-value')});await expect(page.locator('.feedback.error')).toBeVisible();
 await expect.poll(()=>hits.length).toBe(7);expect(hits.slice(-2).map(h=>h.payload.name)).toEqual(['processing_attempt','processing_failure']);
 await page.getByRole('link',{name:'Privacy',exact:true}).click();await expect.poll(()=>hits.length).toBe(8);expect(hits.at(-1)?.payload.url).toBe('/privacy/');
 const serialized=JSON.stringify(hits);for(const value of ['Secret','Alice','secret@example.com','Private heading','sensitive','private-error-value','?email','#private'])expect(serialized).not.toContain(value);
 for(const hit of hits){expect(Object.keys(hit.payload).sort()).toEqual((hit.payload.name?['hostname','name','referrer','title','url','website']:['hostname','referrer','title','url','website']).sort());}
 for(const h of headers){expect(h.referer).toBeUndefined();expect(h.cookie).toBeUndefined();}
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});
});
test('sample workflow is excluded and blocked analytics never breaks real processing',async({page})=>{
 const {hits}=await instrument(page,true);await page.goto('/');await expect.poll(()=>hits.length).toBe(1);
 await page.getByRole('button',{name:'Try a sample spreadsheet'}).click();await page.getByLabel('Trim whitespace').check();await page.getByRole('button',{name:'Preview changes'}).click();await expect(page.getByText('2 cells changed')).toBeVisible();expect(hits).toHaveLength(1);
 await page.getByRole('button',{name:'Start over'}).click();await page.getByLabel('Choose spreadsheet').setInputFiles('tests/fixtures/customers.csv');await expect(page.getByRole('heading',{name:'A little clarity for your data.'})).toBeVisible();await page.getByRole('button',{name:'Preview changes'}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();await download;await expect(page.locator('.feedback.error')).toHaveCount(0);
});
for(const signal of ['doNotTrack','globalPrivacyControl'])test(`${signal} prevents tracking`,async({page})=>{
 const {hits}=await instrument(page);await page.addInitScript(key=>Object.defineProperty(navigator,key,{value:key==='doNotTrack'?'1':true}),signal);await page.goto('/');await page.getByLabel('Choose spreadsheet').setInputFiles('tests/fixtures/customers.csv');await expect(page.getByRole('heading',{name:'A little clarity for your data.'})).toBeVisible();expect(hits).toHaveLength(0);
});
