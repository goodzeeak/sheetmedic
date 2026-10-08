import {defineConfig} from '@playwright/test';
const base='http://127.0.0.1:3000'+(process.env.NEXT_PUBLIC_BASE_PATH||'');
export default defineConfig({testDir:'./e2e',use:{baseURL:base+'/',headless:true},webServer:{command:'node scripts/serve-static.mjs',url:base+'/',reuseExistingServer:false},projects:[{name:'chromium',use:{browserName:'chromium'}}]});
