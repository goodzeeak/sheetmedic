import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { unzipSync } from 'fflate';
import { Cell, Dataset, LIMITS, Sheet, validateSheets } from './engine';
export function parseFile(buffer:ArrayBuffer,name:string):Dataset {
  if(!buffer.byteLength) throw new Error('This file is empty. Add a header and at least one data row.');
  if(buffer.byteLength>LIMITS.bytes) throw new Error('The file exceeds the 5 MB limit.');
  if(!/\.(csv|xlsx)$/i.test(name)) throw new Error('Choose a .csv or .xlsx file.');
  if(/\.csv$/i.test(name)) {
    let text:string;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);}catch{throw new Error('Save CSV files as UTF-8, then try again.');}
    if(!text.trim() || text.includes('\0')) throw new Error('This is not a readable CSV file.');
    const result=Papa.parse<string[]>(text,{skipEmptyLines:false,dynamicTyping:false});
    if(result.errors.some(e=>e.code!=='UndetectableDelimiter')) throw new Error('Malformed CSV: check quotes and delimiters.');
    const raw=result.data;
    if(raw.length>LIMITS.rows+2 || raw.some(r=>r.length>LIMITS.columns)) throw new Error('Limit: 20,000 data rows and 100 columns per sheet.');
    if(/\r?\n$/.test(text) && raw.at(-1)?.length===1 && raw.at(-1)?.[0]==='') raw.pop();
    const width=Math.max(...raw.map(r=>r.length));
    const warnings=raw.some(r=>r.length!==raw[0].length)?['Uneven row widths were padded with blank cells. Review the inferred columns.']:[];
    const rows=raw.map(r=>Array.from({length:width},(_,i)=>r[i]??null));
    const sheets=[{name:'Sheet 1',rows}]; validateSheets(sheets);
    return {sheets,kind:'csv',formula:false,warnings};
  }
  try {
    let expanded=0;
    const zip=unzipSync(new Uint8Array(buffer),{filter:e=>{expanded+=e.originalSize;if(expanded>LIMITS.expanded) throw new Error('Expanded workbook exceeds 25 MB.');return false;}});
    void zip;
    // Only accept an OOXML ZIP container, never another format disguised as XLSX.
    if(new Uint8Array(buffer)[0]!==0x50 || new Uint8Array(buffer)[1]!==0x4b) throw new Error('Not an XLSX workbook.');
    const names:string[]=[];
    unzipSync(new Uint8Array(buffer),{filter:e=>{names.push(e.name);return false;}});
    if(!names.includes('[Content_Types].xml') || !names.includes('xl/workbook.xml')) throw new Error('Not an XLSX workbook.');
    if(names.some(n=>/vbaProject|externalLinks/i.test(n))) throw new Error('Workbooks with macros or external links are unsupported.');
    const wb=XLSX.read(buffer,{type:'array',cellFormula:true,cellDates:false,sheetRows:LIMITS.rows+2});
    let formula=false;
    const sheets=wb.SheetNames.map(name=> {
      const ws=wb.Sheets[name],ref=ws['!fullref']??ws['!ref'];
      if(!ref) return {name,rows:[]};
      const range=XLSX.utils.decode_range(ref);
      if(range.e.r>LIMITS.rows || range.e.c>=LIMITS.columns) throw new Error('Workbook exceeds row or column limits.');
      for(const [address,cell] of Object.entries(ws)) if(!address.startsWith('!') && (cell.f || cell.F)) formula=true;
      const rows=XLSX.utils.sheet_to_json<Cell[]>(ws,{header:1,defval:null,raw:true,blankrows:true,range:0});
      const width=Math.max(0,...rows.map(r=>r.length));
      return {name,rows:rows.map(r=>Array.from({length:width},(_,i)=>r[i]??null))};
    });
    validateSheets(sheets);
    return {sheets,kind:'xlsx',formula,warnings:['XLSX exports contain cell data and sheet names only. Formatting, charts, merged cells, hidden state, validation, comments, links and other metadata are not preserved.',...(formula?['Formulas detected: analysis only. Repairs and exports are disabled to protect workbook logic.']:[])]};
  } catch(e) {throw new Error(e instanceof Error?`Could not read XLSX: ${e.message}`:'Could not read this XLSX workbook.');}
}
export const safeCSVCell=(v:Cell):Cell => typeof v==='string' && /^[\s\u0000-\u001f]*[=+\-@\t\r\n]/.test(v) ? "'"+v : v;
export function exportCSV(sheet:Sheet):Uint8Array {
  return new TextEncoder().encode('\ufeff'+Papa.unparse(sheet.rows.map(r=>r.map(safeCSVCell)),{newline:'\r\n'}));
}
export function exportXLSX(sheets:Sheet[]):Uint8Array {
  const wb=XLSX.utils.book_new();
  for(const s of sheets) XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s.rows),s.name);
  return new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
}
