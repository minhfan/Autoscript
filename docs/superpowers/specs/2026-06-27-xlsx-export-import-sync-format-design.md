# XLSX Export/Import + Sync Format Fix — Design

> Date: 2026-06-27
> Scope: `app.html` logging screen (source in `src/app/`) + Google Apps Script (`apps-script/Code.gs`)

## Problem

1. **Import sai format.** Import (`toolbar.js initCSVImport`) reads timecode columns in the wrong
   order (`C=tcswap, D=tcin, E=tcout`) while the canonical sheet layout used by the in-app table,
   the Google Sheets sync, and `Code.gs` is `C=tcin, D=tcout, E=tcswap`. Round-tripping
   export→import therefore misaligns the three timecode columns.
2. **No file export.** The app can only push to Google Sheets; there is no "download a spreadsheet
   file" feature. User wants an Excel (`.xlsx`) export and to drop `.csv` entirely.
3. **Sync format errors.** `Code.gs buildRichTextFromHtml` only understands `<b> <i> <strike> <s>`.
   Any other markup (`<u>` underline, pasted `<span style>` / `<font>`, etc.) is inserted into the
   cell as **literal text** instead of being applied as formatting or stripped.

## Canonical format (single source of truth)

Spreadsheet + `.xlsx` file column layout, columns A–G:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| STT | ACTION | TC IN | TC OUT | TC SWAP | SCRIPT | NOTE |

- Data starts at **row 5**; rows 1–4 are header.
- `script` / `note` are stored internally as minimal HTML: `<b> <i> <s> <u>` + `\n` only.

## Decisions (from brainstorming)

- **Export**: the existing "Sync Sheet" button becomes a dropdown with two actions — **Sync Sheet**
  and **Export Excel**. `.csv` is dropped from both import and export.
- **Formatting in the `.xlsx` file is preserved** (rich text) → use **ExcelJS** (read + write rich
  text), replacing SheetJS which cannot write rich text in the free build.
- **Sync fix on both sides**: normalize HTML on the client before sync/export, *and* harden
  `Code.gs` for legacy data already in KV. User will redeploy `Code.gs`.

## Components

### `src/app/js/richtext.js` (new, pure functions, registered in `APP_JS_MODULES` after `timecode.js`)
Regex-tokenizer based (no DOM) so it is unit-testable and runs identically in browser:
- `parseHtmlToRuns(html)` → `[{ text, bold, italic, strike, underline }]`. Handles `<b>/<strong>`,
  `<i>/<em>`, `<s>/<strike>/<del>`, `<u>/<ins>`, style-based (`font-weight`, `font-style`,
  `text-decoration`) on any tag, `<br>/<div>/<p>` → `\n`, decodes entities, ignores unknown tags.
- `normalizeEditorHtml(html)` = `runsToCanonicalHtml(parseHtmlToRuns(html))` — canonical
  `<b>/<i>/<s>/<u>` + `\n`, idempotent. Wired into the `#inputScript`/`#inputNote` `value` getter.
- `htmlToRuns(html)` → runs for ExcelJS write.
- `richTextRunsToHtml(richTextArr)` → canonical HTML from an ExcelJS `richText` array (import).
- Node guard: `module.exports` when present (for tests; harmless in browser).

### Export — `exportToExcel()` (toolbar.js)
Build an ExcelJS workbook mirroring the template: row 4 = column labels, data from row 5, columns
A–G in canonical order. `script`/`note` written as rich text (`wrapText`). Download as Blob named
`<spreadsheetName> - <tab>.xlsx`.

### Import — rewrite `initCSVImport()` (toolbar.js) with ExcelJS
Detect the header row (cells contain `ACTION`/`TC IN`/`STT`), data starts after it (fallback row 5).
Map columns correctly: `B=action, C=tcin, D=tcout, E=tcswap, F=script, G=note`. `script`/`note`
read rich text → canonical HTML; others read plain. Keep `DELTELE→DELETE` fix. `accept=".xlsx,.xls"`.

### UI (`src/app/template.html`)
- Replace SheetJS `<script>` (head, ~L200) with ExcelJS (`cdnjs exceljs 4.4.0`, global `ExcelJS`).
- "Sync Sheet" button → dropdown wrapper: trigger `#btnSyncMenu`, menu with `#btnSyncSheets`
  (unchanged id, runs sync) and `#btnExportExcel` (runs export).
- `#csvImport` `accept=".xlsx, .xls"`; remove `.csv` wording from labels/error strings.

### GAS — harden `buildRichTextFromHtml()` (`apps-script/Code.gs`)
Support `<u>/<ins>` (underline), `<strong>/<em>/<del>`, basic style-based formatting; **ignore
unknown tags instead of emitting them as text**; keep `<br>/<div>/<p>` → `\n` and entity decoding.

### Build
Add `src/app/js/richtext.js` to `APP_JS_MODULES` in `scripts/lib/build-app-page.js`; run
`npm run sync:app-source` + `npm run sync:public`.

## Testing
- Node unit tests for `richtext.js` pure functions (normalize, htmlToRuns, richTextRunsToHtml,
  round-trip idempotency, the column-order contract).
- Manual: export → reopen in Excel/Sheets → import back → verify columns + formatting intact.
```

## Out of scope
SRT import/export, project/login/setting pages, KV schema, auth.
