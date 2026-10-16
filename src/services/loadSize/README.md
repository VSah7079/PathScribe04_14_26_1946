# services/loadSize/

Batch 505 (PS-475): what keeps PathScribe's first page load small.

- **The measure:** `npm run build` ends by running it (or `npm run measure:first-load` on its own)
  (`scripts/measure-first-load.mjs`). It adds up, gzipped, everything a
  browser fetches before the app can show anything: the entry script, the
  modules it preloads, the stylesheets, and the start-up language. Exits 1
  over the target (3 MB for Stage 1; PS-465 lowers it to 1 MB once the mock
  services leave the bundle).
- **`loadSize.guard.test.ts`** catches the known regressions in a normal
  test run: no static import of a locale file, the guide PDFs
  (`utils/guideAssets`), `pdf-lib`, or the seed template JSON.

What loads on demand, and where:

| What | Size | Loaded by |
|---|---|---|
| Languages other than the person's | ~0.26 MB gzipped each | `i18n/config.ts` (`lazyLocales`, `loadLanguage`) |
| User and admin guide PDFs | 5.5 MB raw | `hooks/useGuideAssets.ts`, when the About menu opens |
| Seed synoptic templates | ~420 KB raw | `services/templates/templateService.ts` (`ensureSeedTemplate`) |
| `pdf-lib` | ~170 KB gzipped | the three PDF post-processing services, when a PDF is built |

Measured on the Batch 505 build: 6.69 MB before, **1.87 MB** after.

## Batch 527 (PS-486): a lean first load

`loadSize.guard.test.ts` follows the static imports from `main.tsx` (where the first screen comes from). It fails if that graph reaches:
- the services barrel;
- a PDF engine or embedded fonts (`jspdf` itself was removed from the project in Batch 549; PDFs come from the report renderer);
- the barcode library;
- `SignedInApp.tsx`.

It also checks that the demo and developer screens are built only into the demo build, and tests the sign-in page measurement and the production check.

## Batch 547

The first screen is now `main.tsx` plus `startApp.tsx`: `main.tsx` reads `config.json`, then loads the app. `scripts/measure-first-load.mjs` counts the `startApp` chunk too.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- The `jspdf` package is removed from `package.json` (nothing imported it since Batch 539).
