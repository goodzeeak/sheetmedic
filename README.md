# SheetMedic

Diagnose, clean and repair messy spreadsheets in seconds. A Goodwin Labs browser-only microtool.

## Run locally

Use Node.js 22.12+ (validated with 24.14.0).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. No API keys, database or account required. Copy `.env.example` to `.env.local` only to change the canonical origin .

## Architecture

- Next.js 16.4 static export, React, TypeScript, Tailwind 4 with custom CSS. Native labelled controls keep dependencies small; shadcn/Radix is deliberately unnecessary for this interface.
- `lib/engine.ts`: pure deterministic diagnosis and immutable repairs.
- `lib/files.ts`: Papa Parse CSV, official SheetJS CE 0.20.3 XLSX, fflate ZIP preflight.
- `lib/worker.ts`: parsing, analysis, repair and export off the UI thread; 20-second timeout terminates the worker.
- `app/page.tsx`: upload, report, repair selection, preview, all-change pagination and downloads.
- No spreadsheet network requests, API routes, persistent storage, remote fonts or third-party assets. Optional consented usage events go to GA4 in an isolated frame; see GITHUB-PAGES.md.

## Package selection

Versions are pinned and the npm lockfile is committed. SheetJS comes from its official patched distribution, **not** the stale npm `xlsx` release. See [SheetJS installation](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/) and [security advisories](https://cdn.sheetjs.com/advisories/). Papa Parse supports quoted fields and strict malformed-quote reporting; see [its documentation](https://www.papaparse.com/docs). fflate inspects uncompressed ZIP sizes before SheetJS processing. Next supports [static exports](https://nextjs.org/docs/app/guides/static-exports), keeping hosting simple.

## Safety contract

The original file is never modified. Every preview starts from the original data. Unchecking fixes or Reset reverses all selections before export. Switching worksheets resets the selected sheet's proposed fixes; a workbook export includes all original sheets with repairs on the current sheet only.

Limits: 5 MB input, 25 MB declared ZIP expansion, 20 sheets, 20,000 data rows plus a header per sheet, 100 columns and 300,000 total cells. UTF-8 CSV only. First row is always headings. Short CSV rows are padded; the interface warns about uneven widths. Blank sheets remain blank.

**XLSX is data-only, not lossless.** Sheet names and raw cell values are retained. Formatting, charts, tables, names, hidden state, merges, comments, validation and other metadata are discarded. Acknowledgement is required before either export format from an XLSX source. Numeric Excel date serials remain numeric. Workbooks with formulas are analysis-only: the worker rejects repair/export, even beyond UI disabling. Macro and external-link archives are rejected. CSV exports include only the selected sheet.

No formulas, macros or scripts execute. Formula-like CSV text, including whitespace-prefixed payloads and header cells, is prefixed with an apostrophe. Numeric cell values stay numeric. XLSX writes text as text cells. CSV itself does not preserve cell types: downstream spreadsheet programs may reinterpret leading zeros; choose XLSX when types matter.

Numeric conversion excludes leading zeros, exponent notation, plus-prefixed numbers, thousands separators, strings exceeding 15 digits and identifier-like headings. Undeclared, short, numeric-only identifiers cannot always be recognized; conversion remains opt-in. Dates convert only validated `YYYY/MM/DD` to `YYYY-MM-DD`. Locale-ambiguous dates remain unchanged. Text normalization and case/space category merging are per-column and opt-in. Category canonical spelling uses frequency then lexical order; no fuzzy matching. Missing values are never inferred.

Empty columns and duplicate headings are reported for manual attention. Duplicate rows are compared by original values and types; normalization does not silently create a new deduplication criterion. Entirely blank rows have their own repair.

## Health score

For N data rows and C columns, score = round(100 − 60×D/N − 20×R/N − 20×min(1,S/C)), bounded 0–100. D and R are unique rows with definite patterns and review patterns respectively. S is the number of empty-column and duplicate-heading flags. Denominators are at least one. No data rows yields no score. Column-wide capitalization/category suggestions do not lower the score. A row can count once in each severity. Small samples are labelled explicitly. Outliers use 1.5×IQR only with at least eight numeric observations and positive IQR; they are possible issues, never automatic repairs.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```

Fixtures are checked in under `tests/fixtures`; regenerate with `node scripts/fixtures.mjs`. Unit tests cover empty/malformed files, duplicate typed values, ambiguous dates, ID preservation, Unicode, CSV injection, workbook formulas, multi-sheet exports, large datasets, ZIP expansion, combined repairs and reversibility. Playwright tests the actual production export, downloads, failure recovery, mobile overflow, privacy navigation, themes, formula blocking and metadata-loss acknowledgement. Screenshots are written under ignored `test-results/`.

## Deploy and analytics

Production target: [SheetMedic on GitHub Pages](https://goodzeeak.github.io/sheetmedic/). Repository: [goodzeeak/sheetmedic](https://github.com/goodzeeak/sheetmedic). Pushes to main run all checks and publish through GitHub Actions. See [GITHUB-PAGES.md](GITHUB-PAGES.md) for configuration, subpath tests, GA4 event definitions, privacy controls, dashboard access and rollback. The original ChatGPT preview remains independent and online. Umami is removed from this build.

## Known limitations and security review

- MVP supports tabular values, not faithful Excel editing. Keep original workbooks.
- Only Chromium has automated browser coverage; Safari/Firefox and assistive technology should be included before broad launch.
- Current npm audit reports no production dependency advisories. Development ESLint tooling retains a high-severity `braces` advisory through Next's lint plugin; no patched braces release was available during implementation. Do not lint untrusted repositories/patterns. This dependency is not shipped to users. The serve compression advisory is patched through a compatible override.
- ZIP preflight and timeout reduce denial-of-service exposure but browser memory is not a hard sandbox budget. A malicious parser input may crash a tab. No claim of comprehensive hostile-file resilience is made.
- All-change inspection is paginated; side-by-side tables show only the first eight rows. Preview counts refer to selected repairs, while issue counts may refer to rows, cells or columns as labelled.
- No durable audit trail, session persistence or server-side recovery. Reset or close the tab to clear data.
- The GitHub Pages workflow configures the deployment origin and repository path at build time. The previous Sites preview is preserved.

## Short roadmap

1. Validate demand with public launch and anonymous funnel metrics; collect feedback without attachments.
2. Add Firefox/WebKit, screen-reader and adversarial-file testing.
3. Add explicit date-locale selection, improved identifier-column classification and user-defined category mapping.
4. Investigate verified workbook-preserving edits before allowing formulas, formatting or structural repairs.
5. Upgrade the development lint dependency chain once its advisory is fixed.

No authentication, billing, cloud storage, AI services or database are included.
