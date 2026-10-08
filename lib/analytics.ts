import { track } from '@vercel/analytics';
type Event = 'processing_attempt'|'analysis_success'|'issues_detected'|'repairs_applied'|'export_success'|'processing_failure';
// No arbitrary properties, filenames, cell values, errors or column names accepted.
export function event(name:Event,count?:number) {
  if(process.env.NEXT_PUBLIC_ANALYTICS_ENABLED!=='true') return;
  try {track(name, count===undefined?{}:{count:Math.max(0,Math.min(1000000,Math.round(count)))});}catch{/* Analytics never blocks work. */}
}
