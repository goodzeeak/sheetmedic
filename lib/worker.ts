import { parseFile, exportCSV, exportXLSX } from './files';
import { analyze, Dataset, Fixes, repair } from './engine';
let source:Dataset|null=null;
self.onmessage=(e:MessageEvent)=> {
  const {id,type}=e.data;
  try {
    if(type==='parse') {source=parseFile(e.data.buffer,e.data.name); self.postMessage({id,data:{source,reports:source.sheets.map(analyze)}});}
    else {
      if(!source) throw new Error('Load a file first.');
      if(source.formula) throw new Error('Formula workbooks are analysis only.');
      const index=e.data.index as number,fixes=e.data.fixes as Fixes;
      const result=repair(source.sheets[index],fixes);
      if(type==='preview') self.postMessage({id,data:{...result,report:analyze(result.sheet)}});
      if(type==='export') {
        const sheets=source.sheets.map((s,i)=>i===index?result.sheet:s);
        const bytes=e.data.format==='csv'?exportCSV(result.sheet):exportXLSX(sheets);
        self.postMessage({id,data:bytes});
      }
    }
  } catch(e) {self.postMessage({id,error:e instanceof Error?e.message:'Processing failed.'});}
};
