import {test,expect,Page} from '@playwright/test';
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
async function setup(page:Page){
 await page.route('**/analytics-config.json',r=>r.fulfill({json:{measurementId:'G-TEST12345',siteUrl:'https://goodzeeak.github.io'+base}}));
 await page.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:'/* isolated deterministic tag mock */',contentType:'text/javascript'}));
}
test('GA4 requires opt-in, isolates spreadsheet data, supports withdrawal',async({page})=>{
 await setup(page);await page.goto('./?private=secret@example.com#private');
 await expect(page.getByRole('button',{name:'Allow analytics'})).toBeVisible();expect(page.frames()).toHaveLength(1);
 await page.getByRole('button',{name:'Allow analytics'}).click();
 const iframe=page.locator('iframe[title="Optional usage analytics"]');await expect(iframe).toHaveAttribute('sandbox','allow-scripts');
 const frame=await (await iframe.elementHandle())!.contentFrame();
 await expect.poll(()=>frame!.evaluate(()=>((window as unknown as {dataLayer:unknown[]}).dataLayer??[]).length)).toBeGreaterThan(3);
 await page.getByLabel('Choose spreadsheet').setInputFiles({name:'private-payroll.csv',mimeType:'text/csv',buffer:Buffer.from('Private column\n secret@example.com ')});
 await page.getByRole('heading',{name:'A little clarity for your data.'}).waitFor();await page.getByLabel('Trim whitespace').check();await page.getByRole('button',{name:'Preview changes'}).click();await page.getByText('1 cells changed').waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();await download;
 await expect.poll(()=>frame!.evaluate(()=>JSON.stringify((window as unknown as {dataLayer:unknown[]}).dataLayer))).toContain('export_success');
 const serialized=await frame!.evaluate(()=>JSON.stringify((window as unknown as {dataLayer:unknown[]}).dataLayer));for(const value of ['private-payroll','secret@example.com','Private column','?private','#private'])expect(serialized).not.toContain(value);
 expect(await frame!.evaluate(()=>{try{void parent.document.body;return false;}catch{return true;}})).toBe(true);
 await page.getByRole('button',{name:'Analytics preferences'}).click();await page.getByRole('button',{name:'No thanks'}).click();await expect(iframe).toHaveCount(0);
});
test('privacy signals suppress analytics',async({page})=>{await setup(page);await page.addInitScript(()=>Object.defineProperty(navigator,'globalPrivacyControl',{value:true}));await page.goto('./');await page.getByRole('button',{name:'Try a sample spreadsheet'}).click();await expect(page.getByRole('heading',{name:'A little clarity for your data.'})).toBeVisible();await expect(page.locator('iframe')).toHaveCount(0);await expect(page.getByRole('button',{name:'Allow analytics'})).toHaveCount(0);});
test('static subpath routes and assets work without SPA fallback',async({page})=>{
 const failures:string[]=[];page.on('response',r=>{if(r.status()>=400&&r.url().includes('127.0.0.1'))failures.push(r.url());});
 await page.goto('./');await page.getByRole('link',{name:'Privacy',exact:true}).click();await expect(page).toHaveURL(new RegExp(base+'/privacy/'));await page.reload();await expect(page.getByRole('heading',{name:'Your data stays yours.'})).toBeVisible();await page.getByRole('link',{name:'Back to SheetMedic',exact:false}).click();await page.getByRole('button',{name:'Try a sample spreadsheet'}).click();await expect(page.getByRole('heading',{name:'A little clarity for your data.'})).toBeVisible();expect(failures).toEqual([]);
});
test('blocked Google script does not stop repairs or exports',async({page})=>{await setup(page);await page.route('https://www.googletagmanager.com/**',r=>r.abort());await page.goto('./');await page.getByRole('button',{name:'Allow analytics'}).click();await page.getByRole('button',{name:'Try a sample spreadsheet'}).click();await page.getByLabel('Trim whitespace').check();await page.getByRole('button',{name:'Preview changes'}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).click();await download;await expect(page.locator('.feedback.error')).toHaveCount(0);});
