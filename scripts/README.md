# scripts/

Real, local, developer-run Node scripts — never deployed, never part of the app's own build or runtime.

This README documents only the scripts listed below. The folder also holds `terminology-sources/specimens-starter.json` (the specimen dictionary's seed data, imported by `src/services/specimenDictionary/mockSpecimenDictionaryService.ts`), `reset-mock-data.ts`, and about 30 one-off maintenance scripts (`*.cjs`, `*.ps1`, `css-audit.js`, `tag-phi.mjs` and others) from earlier clean-up passes, which are not described here.

*Corrected in the Batch 496 README audit (Oct 9, 2026): this paragraph said `specimens-starter.json` had never been seen and caused 26 test failures; the file is in `scripts/terminology-sources/`, and the undocumented scripts are now named.*

## Files

- **`css-unused-audit.mjs`** (Batch 596, PS-520): lists the classes in `src/pathscribe.css` that nothing in `src/`, `e2e/` or `index.html` refers to, by family (`node scripts/css-unused-audit.mjs`, or `--json`). Classes whose names code builds from a prefix are listed separately, for a check by hand. `--remove=ps-foo-,ps-bar-` deletes the dead classes with those prefixes and the comments that headed only them; `--remove-all` (Batch 597) deletes every dead class, the `@keyframes` nothing uses any more, and the comments that headed only removed rules. Names built from a prefix or a suffix are never removed. `src/services/styleRules/unusedCss.guard.test.ts` keeps the count at zero.

- **`seedTerminology.ts`** — seeds the licensed terminology code sets into Firestore (`terminology/{system}/codes`, plus a `terminologyMeta` row per system). **Batch 324 (PS-47):** moved to the modular Admin SDK imports (`initializeApp`/`cert` from `firebase-admin/app`, `getFirestore`/`Timestamp` from `firebase-admin/firestore`), because firebase-admin 14 removed the namespaced `admin.firestore()` / `admin.credential` API. The behaviour is unchanged. It type-checks against 14 but hasn't been run here (it needs a real service account).

- **`seedEngraverDevices.ts`** — Populates `engraver_devices` with realistic sample data for local visual verification of the Engraver Monitor page (`src/pages/BatchManagement/EngraverMonitorPage.tsx`) — built specifically because that collection has no other way to get real-looking data without a real Cassette Engine connected. Seeds through the real `upsertEngraverStatus()` function (`api/webhooks/engine/_lib/`), not a raw Firestore write, so the seeded documents are guaranteed to match the real schema exactly rather than risk a hand-typed seed drifting from it. Real, deliberate variety across every real `status` value and both real warning shapes (`supplyWarnings` with real `CassetteColorDefinition` keys; free-text `warnings` for non-supply issues) — deliberately does **not** seed "multi-hopper" data, since PathScribe's own confirmed architecture never models per-hopper detail at all.

  **Real safety guardrail**: refuses to run unless `FIRESTORE_EMULATOR_HOST` is set, unless `--force` is passed explicitly — a seed script silently overwriting real device data because someone had real production credentials configured would be a genuinely bad, easy-to-hit accident otherwise.

  Run via `npm run seed:engravers` (uses `tsx`, not `ts-node` — see the real reasoning below).

  **Real tooling note, found the hard way**: this script's own imports had to go through two failed attempts before landing on `tsx`. `ts-node --esm` failed on Node's strict ESM extension-resolution rules; adding explicit `.js`/`.ts` extensions just moved the failure one level deeper, into `upsertEngraverStatus.ts`'s own existing, correct, extensionless imports (which are fine for how Vite/Vercel actually bundle the rest of this app, and shouldn't be rewritten just to accommodate a dev script). `tsx` is a bundler-aware runner that matches this project's own real `moduleResolution: "bundler"` setting and resolved the whole chain correctly on the first real, verified run. Added as a real `devDependency`.

- **`spellcheck/build-spellcheck-assets.mjs`** (Batch 336, PS-342): builds the spell-check dictionaries into `public/spellcheck/`. It takes the base Hunspell dictionaries from the `dictionary-*` dev dependencies and PathScribe's own lexicon from `spellcheck-data/`, and writes `manifest.json`, `base/`, `medical/`, `licenses/` and `NOTICE.txt` with each source's licence. **Batch 337:** German is added under the GPL. It is copied unmodified, the full GPL texts ship with it, and its source is shipped from `spellcheck-data/sources/de-DE/` or offered in writing. The script warns while the source-offer contact is still a placeholder. Run it with `npm run spellcheck:build`. The output is committed and ships as static files, so a deployment doesn't need to run it. **Batch 339:** it also reads the licensed clinical vocabularies dropped into `spellcheck-data/licensed/` (the SPECIALIST Lexicon's `LRAGR`, SNOMED CT RF2 releases, LOINC with its linguistic variants), using `spellcheck/licensedSources.mjs` and the rules in `spellcheck-data/licensed-sources.json`. Only the derived word lists ship, with attribution in `NOTICE.txt`. With no licensed folder the output is unchanged. Use `npm run spellcheck:build -- --licensed <folder>` for another folder. It is tested end to end on the synthetic samples in `spellcheck/fixtures/licensed/` by `spellcheck/licensedSources.test.mjs`.


- **`auth/hash-demo-password.mjs`** (Batch 343, PS-60): prints the stored form of a demo-account password for `src/services/auth/demo/demoAccounts.ts`. It uses PBKDF2-SHA256 with 600,000 iterations and a fresh random salt. It asks for the password without echoing it (or reads it from standard input), so the password itself never goes into the source. Use it to change the demo passwords, which were in the shipped bundle in plain text until Batch 343.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`tag-phi.mjs` still auto-tags simple cases, but its line-by-line audit over-reports (class names, comments, filters and props all match). The count that decides PS-72 is `src/services/phi/phiTagging.guard.test.ts`, which reads the code structure; see `src/services/phi/README.md`.

## Batch 448

`auth/hash-demo-password.mjs` is now a developer tool only, for changing the built-in starting passwords. Administrators set and reset passwords in Staff → edit → Sign-in password.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 503

- **`generate-security-headers.mjs`** — writes every hosting option's security-header config from `deploy/security-headers/securityHeaders.mjs` and a deployment's origins file (`node scripts/generate-security-headers.mjs <origins.json> <outDir>`); with `origins.demo.json` it also refreshes the root `vercel.json`. See `deploy/security-headers/README.md`.

## Batch 505 (PS-475): `measure-first-load.mjs`

`npm run build` runs it after every build (and `npm run measure:first-load` runs it alone): the gzipped size of everything a browser fetches before PathScribe can show anything (entry script, preloaded modules, stylesheets, and the English locale chunk found through `dist/.vite/manifest.json`). Exits 1 over `--target-mb` (default 3); `--json` for machine-readable output. See `src/services/loadSize/README.md`.

## Batch 507: `remove-deleted-files.mjs`

`npm run cleanup:deleted` removes every path listed in the root `DELETED_FILES.txt` that is still present; a path ending in `/` is a whole folder. A delta zip can't delete files, so this is the one-step way to apply a batch's deletions. `-- --dry` only lists them. Safe to run repeatedly.

## Batch 511 (PS-478): full strict type-checking

`hash-demo-password.d.mts` (in `auth/`), `measure-first-load.d.mts`, `remove-deleted-files.d.mts` and `generate-security-headers.d.mts` declare the types of the plain `.mjs` scripts that tests import, so the tests type-check under strict mode.

## Batch 516

`tag-phi.mjs` prints a note that its count isn't the PS-72 measure (the structure-aware guard is).

## Batch 519: `import-xray.ps1`

Imports a batch's Xray execution file (`docs/quality/evidence/PathScribe-BatchN-xray.json`) into Xray Cloud as a new Test Execution, through Xray's REST API (Xray Cloud has no screen that imports a results file). Run it from the repo folder in PowerShell: `.\scripts\import-xray.ps1 "$HOME\Downloads\PathScribe-Batch519-xray.json"`. It prints the new Test Execution's key. The Xray API key comes from the user environment variables `XRAY_CLIENT_ID` and `XRAY_CLIENT_SECRET`; if they aren't set it asks you to copy each value to the clipboard and press Enter, saves them, and clears the clipboard. The key is never written to the repo. Setup steps: `docs/quality/README.md`.

## Batch 527 (PS-486): a lean first load

`measure-first-load.mjs`: the target is now **1 MB** (PS-486), and it also counts the sign-in page's own chunks (`signInPageAssets`), since nothing shows until they arrive. New `check-production-bundle.mjs` (`npm run check:production`) checks a server build:
- **fails** if a demo or developer screen is in it (the mock interface engine, mock EMR, mock WSI viewer, demo reset);
- **lists** the mock service modules. With `--require-no-mocks` (Stage 2, once the HTTP services exist) those fail too.

`npm run build:server` builds a server build (`vite build --mode server`), measures and checks it. Since Batch 547 the API server's address isn't needed at build time: each deployment sets it in its `config.json` (`docs/architecture/RUNTIME_CONFIG.md`), so one server build serves every site. A plain `npm run build` with no `VITE_API_BASE_URL` is the demo build, and the check fails on it.

## Batch 547

- `build:server` is `vite build --mode server`, so `.env.server` is loaded, not `.env.production`.
- `measure-first-load.mjs` counts the `startApp` chunk.
- `check-production-bundle.mjs` also fails on the demo accounts module.
- `generate-security-headers.mjs` takes `--runtime-config config.json`.

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `static-chunk-closure.mjs` (+ `.d.mts`, new): the chunks to preload for the app's start (`startApp.tsx` and its static imports). Pure; used by `vite/preloadAppStart.ts`.
- `vite/preloadAppStart.ts` (new): the build plugin that adds those `modulepreload` tags to `index.html` (`vite.config.ts`). See `vite/README.md`.
