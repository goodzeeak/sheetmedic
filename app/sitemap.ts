import type {MetadataRoute} from 'next';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXT_PUBLIC_SITE_URL||'https://sheetmedic-goodwin-labs.grandmink.chatgpt.site';return [{url:base+'/'},{url:base+'/privacy/'}];}
