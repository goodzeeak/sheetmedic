'use client';
import {useState} from 'react';
import {repair,Sheet} from '../lib/engine';
export function ChangeLog({changes,sheet}:{changes:ReturnType<typeof repair>['changes'];sheet:Sheet}){
 const [page,setPage]=useState(0);const size=20,pages=Math.max(1,Math.ceil(changes.length/size));
 return <details className="change-log"><summary>Inspect every change · {changes.length.toLocaleString()} entries</summary><p className="muted">Row numbers refer to the original sheet. Text values are quoted so whitespace changes are visible.</p><div className="table-scroll"><table><thead><tr><th>Original row</th><th>Column</th><th>Before</th><th>After</th></tr></thead><tbody>{changes.slice(page*size,(page+1)*size).map((c,i)=><tr key={i}><td>{c.row}</td><td>{c.column===null?'Entire row':String(sheet.rows[0]?.[c.column]||`Column ${c.column+1}`)}</td><td>{c.action==='removed'?'Duplicate or empty row':JSON.stringify(c.before)}</td><td>{c.action==='removed'?'Removed':JSON.stringify(c.after)}</td></tr>)}</tbody></table></div><div className="log-pagination"><button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>Previous changes</button><span>Page {page+1} of {pages}</span><button className="secondary" disabled={page+1>=pages} onClick={()=>setPage(page+1)}>Next changes</button></div></details>;
}
