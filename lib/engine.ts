export type Cell = string | number | boolean | null;
export type Sheet = { name: string; rows: Cell[][] };
export type Dataset = { sheets: Sheet[]; kind: 'csv' | 'xlsx'; formula: boolean; warnings: string[] };
export type IssueKind = 'duplicate'|'whitespace'|'emptyRow'|'emptyColumn'|'capitalization'|'numeric'|'dates'|'missing'|'outlier'|'heading'|'category';
export type Issue = { kind: IssueKind; title: string; severity: 'definite'|'review'; count: number; columns: number[]; examples: string[]; rows: number[] };
export type Fixes = { duplicates: boolean; trim: boolean; emptyRows: boolean; numbers: boolean; dates: boolean; text: Record<number, 'lower'|'upper'>; categories: number[] };
export const noFixes = (): Fixes => ({ duplicates:false, trim:false, emptyRows:false, numbers:false, dates:false, text:{}, categories:[] });
export const LIMITS = { bytes: 5*1024*1024, expanded: 25*1024*1024, rows: 20000, columns: 100, cells: 300000, sheets: 20 };
export const blank = (v: Cell | undefined) => v === null || v === undefined || (typeof v === 'string' && !v.trim());
const key = (row: Cell[]) => JSON.stringify(row);
const idHeading = (s: Cell) => /(^|[^a-z])(id|sku|code|zip|postal|phone|tel|account|reference|ref|isbn|barcode)([^a-z]|$)|(?:id|code|phone|sku)$/i.test(String(s ?? ''));
export function numeric(v: Cell, heading: Cell): number | null {
  if (typeof v !== 'string' || idHeading(heading) || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(v) || /^-?0\d/.test(v)) return null;
  if (v.replace(/[-.]/g,'').length > 15 || Object.is(Number(v),-0)) return null;
  return Number.isFinite(Number(v)) ? Number(v) : null;
}
export function dateISO(v: Cell): string | null {
  if (typeof v !== 'string') return null;
  const m = /^(\d{4})([-/])(\d{2})\2(\d{2})$/.exec(v);
  if (!m || Number(m[1]) < 1000) return null;
  const iso = `${m[1]}-${m[3]}-${m[4]}`;
  const d = new Date(iso+'T00:00:00Z');
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === iso ? iso : null;
}
export function validateSheets(sheets: Sheet[]) {
  if (!sheets.length || sheets.length > LIMITS.sheets) throw new Error('Use a workbook with 1–20 worksheets.');
  let cells = 0;
  for (const s of sheets) {
    if (s.rows.length > LIMITS.rows + 1 || s.rows.some(r=>r.length > LIMITS.columns)) throw new Error('Limit: 20,000 data rows and 100 columns per sheet.');
    cells += s.rows.reduce((n,r)=>n+r.length,0);
  }
  if (cells > LIMITS.cells) throw new Error('Limit: 300,000 cells per file.');
}
function categoryMap(rows: Cell[][], col: number) {
  const counts = new Map<string, Map<string, number>>();
  for (const r of rows) if (typeof r[col] === 'string' && !blank(r[col])) {
    const value = r[col] as string, k = value.trim().toLowerCase();
    const variants = counts.get(k) ?? new Map<string,number>();
    variants.set(value,(variants.get(value)??0)+1); counts.set(k, variants);
  }
  const map = new Map<string,string>();
  for (const variants of counts.values()) {
    const chosen = [...variants].sort((a,b)=>b[1]-a[1] || (a[0]<b[0]?-1:a[0]>b[0]?1:0))[0][0].trim();
    for (const v of variants.keys()) map.set(v,chosen);
  }
  return {map, distinct:counts.size};
}
export function analyze(sheet: Sheet) {
  const [headers = [], ...rows] = sheet.rows;
  const found = new Map<IssueKind,Issue>();
  const rowSets = new Map<IssueKind,Set<number>>();
  const add = (kind:IssueKind,title:string,severity:Issue['severity'],row:number,col:number,example:string) => {
    const i = found.get(kind) ?? {kind,title,severity,count:0,columns:[],examples:[],rows:[]};
    i.count++; if(col>=0 && !i.columns.includes(col)) i.columns.push(col);
    const tracked=rowSets.get(kind)??new Set<number>();
    if(row>=0 && !tracked.has(row)) {i.rows.push(row);tracked.add(row);} rowSets.set(kind,tracked);
    if(i.examples.length<3) i.examples.push(example.slice(0,100)); found.set(kind,i);
  };
  const seen = new Set<string>();
  headers.forEach((h,c)=> { if(headers.slice(0,c).some(v=>String(v??'').trim().toLowerCase()===String(h??'').trim().toLowerCase())) add('heading','Duplicate column headings','definite',-1,c,String(h)); });
  rows.forEach((r,i)=> {
    if(r.every(blank)) { add('emptyRow','Entirely empty rows','definite',i,-1,`Row ${i+2}`); return; }
    if(seen.has(key(r))) add('duplicate','Exact duplicate rows','definite',i,-1,`Row ${i+2}`); seen.add(key(r));
    r.forEach((v,c)=> {
      if(blank(v)) add('missing','Missing values','review',i,c,`Row ${i+2}, ${headers[c]||'column '+(c+1)}`);
      if(typeof v==='string' && v!==v.trim()) add('whitespace','Leading or trailing whitespace','definite',i,c,JSON.stringify(v));
      if(numeric(v,headers[c])!==null) add('numeric','Numbers stored as text','review',i,c,String(v));
      if(typeof v==='string' && (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(v)) && (!dateISO(v) || v!==dateISO(v))) add('dates','Date formats to review','review',i,c,`${v} → ${dateISO(v)??'ambiguous; unchanged'}`);
    });
  });
  headers.forEach((h,c)=> {
    if(rows.length && rows.every(r=>blank(r[c]))) add('emptyColumn','Entirely empty columns','definite',-1,c,String(h));
    const {map,distinct}=categoryMap(rows,c);
    const text = rows.filter(r=>typeof r[c]==='string' && !blank(r[c]));
    if(text.length && new Set(text.map(r=>String(r[c])===String(r[c]).toLowerCase()?'lower':String(r[c])===String(r[c]).toUpperCase()?'upper':'mixed')).size>1)
      add('capitalization','Inconsistent capitalization','review',-1,c,String(h));
    if(distinct<=30 && distinct<=Math.max(2,rows.length/2)) for(const [a,b] of map) if(a!==b) add('category','Categorical spelling variants','review',-1,c,`${a} → ${b}`);
    const nums=rows.map(r=>typeof r[c]==='number'?r[c] as number:numeric(r[c],h)).filter((v):v is number=>v!==null).sort((a,b)=>a-b);
    if(nums.length>=8) {
      const q1=nums[Math.floor((nums.length-1)*.25)],q3=nums[Math.floor((nums.length-1)*.75)],iqr=q3-q1;
      if(iqr>0) rows.forEach((r,i)=> { const v=typeof r[c]==='number'?r[c] as number:numeric(r[c],h); if(v!==null && (v<q1-1.5*iqr||v>q3+1.5*iqr)) add('outlier','Possible numeric outliers','review',i,c,String(v)); });
    }
  });
  const issues=[...found.values()];
  const definite=new Set(issues.filter(i=>i.severity==='definite').flatMap(i=>i.rows)), review=new Set(issues.filter(i=>i.severity==='review').flatMap(i=>i.rows));
  const structural=issues.filter(i=>i.severity==='definite' && ['heading','emptyColumn'].includes(i.kind)).reduce((n,i)=>n+i.count,0);
  const penalty=60*definite.size/Math.max(1,rows.length)+20*review.size/Math.max(1,rows.length)+20*Math.min(1,structural/Math.max(1,headers.length));
  return {issues,score:rows.length?Math.max(0,Math.round(100-penalty)):null,records:rows.length,columns:headers.length};
}
export function repair(sheet:Sheet,fixes:Fixes) {
  const [headers=[],...original]=sheet.rows;
  const maps = new Map(fixes.categories.map(c=>[c,categoryMap(original,c).map]));
  const seen=new Set<string>(); let changed=0,removed=0;
  const changes:{row:number;column:number|null;before:Cell;after:Cell;action:'removed'|'changed'}[]=[];
  const rows:Cell[][]=[];
  for(const [rowIndex,r] of original.entries()) {
    // Exact duplicates are based on original records, never on normalized values.
    if((fixes.emptyRows && r.every(blank)) || (fixes.duplicates && seen.has(key(r)))) {removed++;changes.push({row:rowIndex+2,column:null,before:null,after:null,action:'removed'});continue;}
    seen.add(key(r));
    rows.push(r.map((v,c)=> {
      let next=v;
      if(typeof next==='string') {
        if(fixes.categories.includes(c)) next=maps.get(c)?.get(next)??next;
        if(fixes.trim) next=next.trim();
        if(fixes.text[c]) next=fixes.text[c]==='lower'?next.toLowerCase():next.toUpperCase();
        if(fixes.dates) next=dateISO(next)??next;
        if(fixes.numbers) next=numeric(next,headers[c])??next;
      }
      if(next!==v) {changed++;changes.push({row:rowIndex+2,column:c,before:v,after:next,action:'changed'});}return next;
    }));
  }
  return {sheet:{name:sheet.name,rows:sheet.rows.length?[[...headers],...rows]:[]},changed,removed,changes};
}
