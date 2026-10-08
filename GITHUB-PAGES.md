# GitHub Pages deployment

Target: https://goodzeeak.github.io/sheetmedic/
Repository: https://github.com/goodzeeak/sheetmedic

The application uses Next.js static export (`output: 'export'`) with trailing slashes. It needs no Node server, API route, database, image optimizer or server action at runtime. CSV/XLSX parsing, scoring and repair code is unchanged. The existing ChatGPT Sites deployment remains independent and online; this workflow does not update or delete it.

## Automatic deployment

Push to `main`, or run **Actions → Deploy SheetMedic to GitHub Pages → Run workflow**. The workflow reads the Pages origin/subpath from `actions/configure-pages`, installs locked dependencies, runs lint/type checks/unit tests, builds, runs all browser tests against a strict static server, uploads `out`, and deploys using the `github-pages` environment. It uses GitHub's automatic token with read-only source access and narrowly scoped Pages deployment permissions. No personal access token is saved in the repository.

Repository settings: Pages source **GitHub Actions**. Repository variable `GA4_MEASUREMENT_ID` is `G-G3J46L2VNH`; it is public, not a secret. No custom domain is configured. Build values are `NEXT_PUBLIC_BASE_PATH=/sheetmedic` and `NEXT_PUBLIC_SITE_URL=https://goodzeeak.github.io/sheetmedic`, discovered automatically by the workflow. The GA configuration file is generated in `out`; changing runtime environment variables after export has no effect.

## Local validation

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/sheetmedic'
$env:NEXT_PUBLIC_SITE_URL='https://goodzeeak.github.io/sheetmedic'
$env:NEXT_PUBLIC_GA4_MEASUREMENT_ID='G-G3J46L2VNH'
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

For a root-hosted export, set base path to an empty string and site URL to that host's origin. `scripts/serve-static.mjs` serves exported directories under the selected prefix, returns real 404s, and never falls back to the home page. It catches problems that development servers and SPA fallbacks hide.

`next/link` prefixes internal navigation; `lib/site.ts` prefixes fetched assets and the analytics frame. Next prefixes its script/CSS/worker chunks. Canonical/Open Graph URLs, sitemap and robots use the deployed origin plus subpath. `.nojekyll` preserves underscore directories. `scripts/export-config.mjs` supplies flat aliases for Next 16.4's nested static segment payloads, because GitHub Pages cannot apply the rewrite those requests expect. Originals remain available.

`vercel.json` is retained for Vercel compatibility only; GitHub Pages does not apply its headers. `.openai/hosting.json` is retained as the old preview's identity, not used by this workflow. Do not publish the Pages-prefixed build to that preview.

## GA4 and privacy

Google tag ID: **G-G3J46L2VNH**. Umami is absent from the migrated application. The old preview has its previous independent analytics deployment; visiting it does not run this Pages build.

Visitors explicitly opt in before any Google script or collection request starts. DNT/GPC disable analytics. The preference is the only analytics value saved in localStorage. Denial and withdrawal leave spreadsheet functionality fully available.

The Google tag runs in a dedicated empty iframe. Only fixed event names and two canonical page URLs are passed to it. The iframe contains no spreadsheet UI, input fields or download links, so automatic measurement cannot observe those elements in its own document. GA4 does not send hits from an opaque-origin frame; the frame therefore has a normal same-site origin. This is data separation, **not a security isolation boundary**: Google's script remains trusted third-party code. No private file data is copied into it.

The frame validates event messages, omits arbitrary parameters, disables automatic pageviews, Google Signals and advertising personalization, and denies advertising consent categories. A random client ID lasts for the frame; session analytics cookies may be set under the repository path with a SheetMedic-specific prefix. Cookies are not used before opt-in. The local consent preference persists. Withdrawing consent destroys the frame and stops subsequent tracking; already transmitted events cannot be recalled. Unique visitors and returning-user metrics are approximate because the explicit client ID changes when the frame is recreated.

Google receives network/device metadata and the generated pseudonymous identifier. This is **not anonymous processing**. Its library may emit technical/session events and enhanced-measurement events from the empty frame, but has no spreadsheet UI in that frame. Query strings, fragments and parent referrers are excluded from application event parameters. The privacy page links to Google's policy. No API secret or Measurement Protocol credential is exposed.

Application events:

| Event | Meaning |
|---|---|
| `page_view` | Consented visit to home or privacy; query strings/fragments are discarded. |
| `analysis_success` | Successful analysis of a user-selected file. |
| `repairs_applied` | Successful preview with changed cells or removed rows; no-op previews excluded. |
| `export_success` | Output generated and download triggered, not proof of saving to disk. |
| `processing_attempt` / `processing_failure` | Existing upload/failure counters without file names or errors. |

Demo-file actions are excluded. Events before consent are not replayed. Each action counts, not unique files. Requests blocked by the browser are not retried and do not delay processing.

## Dashboard and verification

Sign in to https://analytics.google.com/ and select the property containing measurement ID **G-G3J46L2VNH** (Admin → Data streams → select the web stream to confirm). Use the measurement ID to identify the correct stream; property names may change.

Use **Reports → Realtime** to verify a consented visit and `analysis_success`, `repairs_applied`, `export_success`. Standard processed reports may lag. Test traffic from deployment verification is synthetic and should not be counted as customer demand. Analytics tests stub Google locally; the live smoke test uses synthetic files and verifies collection responses. Realtime visibility is a separate check from HTTP receipt.

To disable analytics, clear the repository's `GA4_MEASUREMENT_ID` variable and rerun the workflow. To roll back the website, revert the relevant Git commit and let Actions deploy again. The old preview remains available independently throughout.
