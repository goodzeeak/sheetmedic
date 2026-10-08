# Security and privacy notes

See README's safety contract for supported input and fidelity boundaries. Report reproducible security issues without sending private spreadsheets. Use synthetic fixtures.

Data flow: local File → ArrayBuffer → dedicated Web Worker → immutable sheet models → preview → local Blob download. Uploaded data is never interpolated as HTML or sent to telemetry. React escapes cell content. No formula evaluation exists. Worker messages are confined to the same-origin app.

Input bounds are checked before parsing and after extraction. XLSX ZIP entries are preflighted for declared expansion; macro/external-link files are rejected. Processing has a 20-second worker deadline. Formula-bearing workbooks cannot be repaired or exported. XLSX rebuilds data explicitly and cannot preserve general workbook features. User acknowledgement protects against mistaken expectations, not against every malformed workbook.

CSV formula injection is escaped on export, including headers and whitespace-prefixed payloads. This changes the exported text deliberately. Trusted numeric values are not escaped. Further conversions in a downstream application can undo protections; retain original files and inspect the destination application.

Production dependencies passed npm's audit at implementation time; npm audit does not fully cover the off-registry SheetJS distribution. Official SheetJS advisories were reviewed when selecting 0.20.3. Five audit entries remain in the development-only ESLint chain due to the same unpatched braces vulnerability. They are excluded from the static browser build.

Vercel security headers are in vercel.json. Static Next hydration currently uses inline scripts; CSP allows them, while uploaded text is still escaped and never executed. A future build can generate script hashes for a tighter policy. Other hosting providers require equivalent header configuration. Host logs and access controls are separate from spreadsheet processing.
