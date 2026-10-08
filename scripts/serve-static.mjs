// Strict static preview: mimics Pages directories and subpaths, with no SPA fallback.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('out'),base=process.env.NEXT_PUBLIC_BASE_PATH||'';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.txt':'text/plain','.xml':'application/xml','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
createServer(async(req,res)=>{
 try{
  let url=new URL(req.url,'http://localhost').pathname;
  if(base && url===base){res.writeHead(301,{Location:base+'/'});return res.end();}
  if(base && !url.startsWith(base+'/')){res.writeHead(404);return res.end('Not found');}
  url=decodeURIComponent(url.slice(base.length));
  let file=path.resolve(root,'.'+url);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  if((await stat(file)).isDirectory()){
   if(!url.endsWith('/')){res.writeHead(301,{Location:base+url+'/'});return res.end();}
   file=path.join(file,'index.html');
  }
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(3000,'127.0.0.1',()=>console.log(`Static preview: http://127.0.0.1:3000${base}/`));
