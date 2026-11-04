# components/ValidationStudies/

## Files

- **`ValidationStudiesSection.tsx`** (~1,120 lines, the largest single-file
  folder) — Parallel-run validation study management, 3 sub-tabs (Studies/
  Dashboard/Reports). Wired to real services throughout (validationStudy,
  narrativeSignal, client, physician, reportTemplate). Not read
  line-by-line at this size; no issues surfaced at the architecture/import
  level. The "AI Model Being Validated" field in `StudyFormModal` links out
  to `ModelStoreModal` (below) — "Don't see the model you need? Browse the
  ForMedrixAI store," shown only when creating a new study.
- **`ModelStoreModal.tsx`** — the ForMedrixAI store (see `services/models/mockModelStoreService.ts` and `STORE_INTEGRATION_NOTES.md`; the licence check and the catalog source are still mock).
  - **What it lists (Batch 320, PS-58):** global catalog models this organisation hasn't adopted yet.
  - **Adopt** (formerly "Download") creates an adoption record for the organisation in session, always Beta and never the default. It selects the model in the study form's dropdown and refreshes the parent's model list.
  - **Errors:** the service returns codes (`STORE_NOT_LICENSED`, `NO_ORGANISATION`, `NOT_IN_CATALOG`, `ALREADY_ADOPTED`), and the modal shows them translated.
  - **Localization:** vendor labels and the published date now follow the user's language.

## Batch 367 (PS-74): no inline CSS

`ValidationStudiesSection.tsx`: the remaining inline styles moved into `pathscribe.css` classes. Per-instance values (sizes, positions, a colour) are passed as custom properties, and colours are derived with `color-mix()` from `--ps-hue` instead of hex strings built in JSX. The browser checks are listed in the Batch 367 changelog (`src/i18n/README.md`). The app-wide check is `services/styleRules/inlineCss.guard.test.ts`.

## Batch 429: view-only sections, equipment log for the bench

The Validation tab is view only without its capabilities; the store link and "How it works" stay usable.

## Batch 430: personal settings per person; view-only fields

Search and filter fields here are marked `data-config-nav`, so they keep working when the section is shown view only.

## Batch 437

Printing a validation study report is audited (PS-282).

## Batch 449

`ValidationStudiesSection.tsx` opens the inner tab named in `?section=` (`studies`, `dashboard`, `reports`; the list is `VALIDATION_SECTIONS`).

## Batch 500 (PS-473)

The printed validation report escapes the admin-entered values it places in HTML (study name, ethics reference, section ids). Its other text is still hard-coded English with an `en-GB` date; converting that printed report to translations is still open.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 514 (PS-269)

- **Printed report translated** (resolves the Batch 500 note above): built by `services/validationStudies/buildValidationReportHtml.ts` in the reader's language.
- Dates and percentages on the screen use the user's format. The audit-log detail for "report generated" keeps its English percentage.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.
