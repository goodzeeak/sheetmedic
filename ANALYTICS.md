# SheetMedic usage analytics

## Open the dashboard

1. Sign in to **[Umami Cloud](https://cloud.umami.is/)** using the account that created SheetMedic.
2. Open the website for `sheetmedic-goodwin-labs.grandmink.chatgpt.site` (Website ID `fd98290f-deaa-4dcd-9f19-a6c1743834a5`). Keep its dashboard private; a public Share URL is unnecessary.
3. In the website overview, choose Today or your preferred date range. **Visitors** shows estimated unique visitors; the time-series graph shows daily trends across a multi-day range. Use the same dashboard timezone consistently when comparing days.
4. Open **Events** from the website menu. For the selected day/date range, `analysis_success` is completed analyses and `export_success` is completed export generation. The event count is actions; the visitor count is people estimated to have performed them.

| Requested measure | Dashboard item | Exact definition |
|---|---|---|
| Page visits | Views / Visitors | One normal pageview on `/` or `/privacy/`, including client navigation. No new pageview for theme changes, query strings or rerenders. |
| Uploads attempted | `processing_attempt` | A user-supplied file enters the existing load handler, including size/format failures. The file is read locally, not uploaded to a server. |
| Completed analyses | `analysis_success` | Worker parsing and analysis completed successfully for that file. |
| Repairs applied | `repairs_applied` | A successful repair preview with at least one changed cell or removed row. Repeated non-empty previews count as repeated actions, not unique files. No-op previews are excluded. |
| Successful exports | `export_success` | Export bytes generated and a browser download triggered. Browsers cannot confirm that the user ultimately saved the file to disk. Each download action counts once. |
| Processing errors | `processing_failure` | A caught upload/analysis/preview/export failure. No exception message, stack, filename or value is transmitted. |

Built-in **sample spreadsheet** actions are excluded from all five workflow event totals. Page visits still count. Sheet selection and inspecting reports do not count as new analyses. Data from before activation cannot be recovered. Browser privacy settings, blockers and offline requests make totals a lower-bound estimate, not billing-grade figures.

## Free, host-independent setup

Umami Cloud Hobby currently includes one website, 100,000 events/month and six months of retention. Each pageview and custom event consumes an event. Stay on **Hobby**, not a paid trial; this integration neither provisions a paid plan nor enables upgrades. Check the account's Usage screen as traffic grows. See [pricing](https://umami.is/pricing) and [Cloud FAQ](https://docs.umami.is/docs/cloud/faq).

The available Sites APIs expose hosting/deployment/log management but no configurable usage dashboard or event sink. The previous Vercel SDK was inactive and not appropriate for this Sites deployment. It has been removed. Umami works directly from the existing static site using its documented [public collection endpoint](https://docs.umami.is/docs/api/sending-stats), which needs no account API key. No SDK, third-party JavaScript, database, server, persistent client storage or new package is added. Free dashboard access does not require the paid reporting API.

## Privacy boundary

The complete JSON payload contains only a public website ID, the configured hostname, a fixed page path (`/` or `/privacy/`), a fixed title, an empty referrer and (for workflow events) one allowlisted event name. There are no event properties. Names supplied to the API are validated at runtime and TypeScript level.

The integration never reads or transmits filenames, spreadsheet data, headings, cell values, raw errors, names, emails, user/account IDs, query parameters, URL fragments, referrer URLs, device resolution or browser language. There is no replay, DOM scraping, identify call, localStorage, sessionStorage or cookie. Requests omit credentials and suppress the HTTP Referer header. The user-supplied script tag was used only to obtain the public Website ID; its script is not loaded.

Like any remote HTTP service, Umami receives the connecting IP address and browser User-Agent at the network layer. Umami documents that raw IP addresses are **not stored**, but uses IP/User-Agent with its rotating salt to estimate anonymous visitors and derive coarse location/browser statistics. This is not a claim of zero network metadata or a count of known individuals. See [metric definitions](https://docs.umami.is/docs/metric-definitions) and [sessions](https://docs.umami.is/docs/sessions). If no IP processing at all is acceptable, external analytics must be disabled; distinct daily visitors cannot be measured accurately by these stateless events alone.

Do Not Track (`1`/`yes`) and Global Privacy Control prevent collection, including the analytics configuration request. Configuration must have a valid UUID and an exact hostname match. Missing configuration, host mismatch, timeouts, blocked requests and provider errors are silent. Analytics calls are never awaited by spreadsheet processing, and are aborted after three seconds with no retries.

## Configuration and disabling

`public/analytics-config.json` contains the public Website ID and allowed hostname. To turn analytics off, set `websiteId` to an empty string and rebuild/redeploy. No secret belongs in this file. Sites runtime environment variables cannot configure an already exported static build. If the public domain changes, update both this hostname and the website domain in Umami. `vercel.json` allows only the Umami collector in its analytics connection policy for future Vercel hosting.

Do not add the default Umami script in parallel: that would duplicate pageviews and introduce automatic properties. Do not use `identify`, user IDs, session properties or arbitrary event data. The site is public; its analytics account/dashboard remains separate and private.

## Validation

Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, then `npm run test:e2e`.

Analytics unit tests verify the strict payload contract, malformed config, arbitrary event rejection, privacy signals, host mismatch and offline behavior. Browser tests intercept the real browser collector requests and verify all five event types, pageview counts, sensitive fixtures/query-string exclusion, absent referrer/cookies/storage, no-op/sample exclusions and successful processing when analytics fails. Test Website IDs and intercepted collector calls keep automated suite traffic out of the live dashboard.

The original processing engine, CSV/XLSX IO and worker are unchanged. Their regression tests still run. A live deployment smoke test can add a small amount of synthetic QA traffic to the dashboard; this should not be mistaken for customer demand.
