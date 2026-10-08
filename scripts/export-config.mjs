import {writeFileSync,readdirSync,copyFileSync} from 'node:fs';
import path from 'node:path';
const measurementId=process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID||'';
if(measurementId&&!/^G-[A-Z0-9]{4,20}$/.test(measurementId))throw Error('Invalid GA4 measurement ID');
const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'+(process.env.NEXT_PUBLIC_BASE_PATH||'');
writeFileSync('out/analytics-config.json',JSON.stringify({measurementId,siteUrl},null,2)+'\n');
// Next 16.4 exports nested segment files, while its static client requests dot-separated
// names. Plain hosts cannot rewrite requests; publish matching aliases alongside originals.
for(const file of readdirSync('out',{recursive:true,withFileTypes:true})){
  if(!file.isFile()||!file.name.endsWith('.txt'))continue;
  const original=path.join(file.parentPath,file.name),relative=path.relative('out',original),parts=relative.split(path.sep);
  const segment=parts.findIndex(part=>part.startsWith('__next.'));
  if(segment<0||segment===parts.length-1)continue;
  const alias=path.join('out',...parts.slice(0,segment),parts.slice(segment).join('.'));
  copyFileSync(original,alias);
}
