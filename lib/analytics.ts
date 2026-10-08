/** Fixed events only: never accept file data, names, errors or arbitrary properties. */
export const EVENTS = ['processing_attempt', 'analysis_success', 'repairs_applied', 'export_success', 'processing_failure'] as const;
export type AnalyticsEvent = typeof EVENTS[number];
export type AnalyticsPage = '/' | '/privacy/';
export const ANALYTICS_ENDPOINT = 'https://gateway.umami.is/api/send';
export type AnalyticsConfig = { websiteId: string; hostname: string };
type PrivacyNavigator = { doNotTrack?: string | null; globalPrivacyControl?: boolean };

export function validConfig(value: unknown): value is AnalyticsConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as AnalyticsConfig;
  return typeof config.websiteId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.websiteId)
    && typeof config.hostname === 'string' && /^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/i.test(config.hostname);
}

export function privacyOptOut(nav: PrivacyNavigator) {
  return nav.doNotTrack === '1' || nav.doNotTrack === 'yes' || nav.globalPrivacyControl === true;
}

export function payloadFor(config: AnalyticsConfig, page: AnalyticsPage, name?: AnalyticsEvent) {
  if (!validConfig(config) || !['/', '/privacy/'].includes(page) || (name !== undefined && !EVENTS.includes(name))) return null;
  return { type: 'event', payload: {
    website: config.websiteId, hostname: config.hostname, url: page,
    // Never inspect document.title, location.search/hash, document.referrer or the DOM.
    title: page === '/' ? 'SheetMedic' : 'SheetMedic privacy', referrer: '',
    ...(name === undefined ? {} : { name }),
  } };
}

let configuration: Promise<AnalyticsConfig | null> | undefined;
function getConfig(): Promise<AnalyticsConfig | null> {
  if (typeof window === 'undefined' || privacyOptOut(navigator)) return Promise.resolve(null);
  configuration ??= fetch('/analytics-config.json', { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(3000) })
    .then(response => response.ok ? response.json() : null)
    .then(value => validConfig(value) && value.hostname === window.location.hostname ? value : null)
    .catch(() => null);
  return configuration;
}

async function send(page: AnalyticsPage, name?: AnalyticsEvent) {
  try {
    const config = await getConfig();
    if (!config || privacyOptOut(navigator)) return;
    const body = payloadFor(config, page, name);
    if (!body) return;
    // No SDK, remote script, cookies, storage, visitor ID or extra properties.
    // Networking exposes IP/User-Agent to the provider; neither is added to the payload.
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true,
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* No retries, UI errors or processing dependencies on analytics. */ }
}

export function event(name: AnalyticsEvent) { if (EVENTS.includes(name)) void send('/', name); }
export function pageVisit(path: string) { if (path === '/' || path === '/privacy/') void send(path); }
