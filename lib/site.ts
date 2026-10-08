export const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';
export const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'+basePath).replace(/\/$/,'');
export const assetPath=(path:string)=>basePath+path;
export function pagePath(path:string){
  if(basePath && (path===basePath||path.startsWith(basePath+'/'))) path=path.slice(basePath.length)||'/';
  return path==='/privacy'?'/privacy/':path;
}
