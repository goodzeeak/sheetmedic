import type { NextConfig } from 'next';
const basePath=process.env.NEXT_PUBLIC_BASE_PATH||'';
if(basePath && !/^\/[A-Za-z0-9._-]+$/.test(basePath)) throw new Error('NEXT_PUBLIC_BASE_PATH must be empty or /repository-name.');
const config: NextConfig = { output: 'export', trailingSlash: true, poweredByHeader: false, basePath, images:{unoptimized:true} };
export default config;
