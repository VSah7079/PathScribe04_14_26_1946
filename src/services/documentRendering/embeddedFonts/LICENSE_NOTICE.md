# Embedded font provenance — Liberation Sans (Regular + Bold)

Real, per PS-276 §1.1.1 gap-closing pass. This folder's two `.ts` files
carry the actual, real TrueType font program bytes (base64-encoded)
that `registerEmbeddedPrintFont.ts` embeds into every generated
cytology PDF via jsPDF's `addFileToVFS`/`addFont`.

## Source

- npm package: `@typopro/dtp-liberation@3.7.5`
- Files extracted: `TypoPRO-LiberationSans-Regular.ttf`,
  `TypoPRO-LiberationSans-Bold.ttf`
- Package's own declared license (per its `package.json`):
  `MIT AND Apache-2.0 AND OFL-1.1 AND CC0-1.0`

## Verified directly, not assumed

Each font file's own embedded `name` table was read directly with
`fontTools` before use:

- Family: `TypoPRO Liberation Sans` (Regular) / `TypoPRO Liberation
  Sans Bold` (Bold)
- License record (name ID 13): `Licensed under the SIL Open Font
  License, Version 1.1`

The SIL Open Font License, Version 1.1 explicitly permits embedding,
bundling, and redistribution of the font — including inside generated
documents — free of charge. Its one real restriction (the Reserved
Font Name clause) blocks redistributing a *modified* font under the
original name; this app embeds the font unmodified, so that clause
doesn't apply.

## Why Liberation Sans

Liberation Sans is a real, purpose-built, metrically-compatible,
freely embeddable replacement for Helvetica/Arial — chosen specifically
so this app's real, existing print layout (character widths jsPDF's
own `splitTextToSize()` measures against) doesn't shift meaningfully
from what the app was built and tested against while it used jsPDF's
non-embeddable built-in `'helvetica'`.

## Real, disclosed trade-off

`registerEmbeddedPrintFont.ts` embeds the FULL font program (jsPDF's
`WinAnsiEncoding` embedding path), never a subsetted one — there's no
font-subsetting tool in this project's own toolchain. This adds a
real, fixed ~180KB (Regular) / ~188KB (Bold) to every generated
cytology PDF's byte size. Accepted as a real, worthwhile trade-off:
PDF/A conformance requires embedding, and a full, real font program is
what "embedded" honestly means — subsetting to shrink this further is
real, separate, unstarted follow-up work.

---

# Pretendard (Regular + Bold) — Korean report PDFs and Korean text on screen (Batch 391)

- **Source:** Pretendard 1.3.9 (taken from the npm package `pretendard@1.3.9`; since Batch 394 the files are shipped in the repository, not installed as a dependency), by Kil Hyung-jin, https://github.com/orioncactus/pretendard.
- **License:** SIL Open Font License 1.1, with Reserved Font Name "Pretendard" (`node_modules/pretendard/dist/LICENSE.txt`). Checked in the font's own `name` table: ID 13 is the OFL 1.1 text; its OS/2 `fsType` is 0 (installable embedding allowed).
- **Files used, unmodified:** `dist/public/static/alternative/Pretendard-Regular.ttf` and `Pretendard-Bold.ttf` for the PDF (`services/documentRendering/printFonts.ts`, served from the app's own origin and fetched only when a Korean report is printed); `dist/web/variable/pretendardvariable-dynamic-subset.css` and its woff2 files for the screens (`src/main.tsx`).
- **Why unmodified:** the Reserved Font Name clause bars distributing a modified copy (for example a trimmed subset) under the name "Pretendard". The app ships the package's files as they are; jsPDF then embeds only the glyphs each document uses, which the OFL allows for documents. `printFonts.test.ts` checks the bytes loaded equal the package's file.
- **Obligation:** keep this notice and the package's LICENSE.txt with any distribution of the app.
- **Batch 393:** the same two unmodified TTF files, with the package's `LICENSE.txt` as `Pretendard-LICENSE.txt`, are shipped in `functions/fonts/` for the surgical and autopsy report renderer (`functions/main.py`, ReportLab, which embeds only the glyphs used).
- **Batch 394:** the app's copies moved into `public/fonts/pretendard/` (the two TTF files for PDFs; `web/` holds the dynamic-subset CSS and its 92 woff2 files for the screens, loaded by `index.html`), with the licence as `Pretendard-LICENSE.txt`. The npm dependency was removed: its absence on a machine broke 44 unrelated test files, because a service imported the font through the package. All copies are byte-identical to the release (`printFonts.test.ts` checks the PDF copies).
