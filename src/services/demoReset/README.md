# services/demoReset/

The demo data reset (mock backend only). Moved out of `components/Config/System/DemoResetTab.tsx` in Batch 370 (PS-356), so the screen no longer touches browser storage and the decision to reset is made here.

- **`resetAllDemoData({ authorization })`** clears every tester's demo data. It needs the capability `config:demo-data:reset` (checked and audited) and refuses without it.
- **`executeUserReset(userId)`** clears only the signed-in user's own hospital's data. No capability is needed, since it touches nothing of anyone else's.
- **Both refuse** unless `IS_MOCK_BACKEND`: a real database is never reset from the browser.
- **The key lists** (`VERSIONED_KEYS`, `SETTINGS_KEYS`, `CASE_KEYS`, `FLAG_KEYS`, `STATE_KEYS`) are checked by `components/Config/System/DemoResetTab.coverage.test.ts` against every storage key in `src/`.

## Batch 381

`STATE_KEYS` gains the report page's display preferences under their `utils/uiPreferences` names: `ps_ui_reportHeaderCompact`, `ps_ui_reportSidebarCollapsed` and `ps_ui_reportTabWidth`. The old keys stay listed so old values are still cleared.

## Batch 392

`released_report_pdfs` (report PDFs kept from release so an ORU^R01 retry sends the same document) is cleared by a Full Reset.

## Batch 423

The reset now covers `registryGoLiveRecords` and `registryGoLiveGovernance` (registry go-live requests and approvals, and the approval settings).

## Batch 424

The reset now also clears `registryAgreements`, `registryAdapterRules` and `registryValidationRecords`.

## Batch 431

Also clears `pathscribe_org_page_setup`, `ps_ui_previewWindowGeometry`, and the template review key families (`ps_answers_`, `ps_comments_`, `ps_state_`, now in `RUNTIME_KEY_PREFIXES`).

## Batch 442

Full Reset now clears four keys that were written straight to `localStorage` and so missed the `pathscribe_mock_` sweep:
- `pathscribe_signature_used`;
- `pathscribe_interface_engine_dispatch_outcomes`;
- `pathscribe_concordance_review_org_config`;
- `pathscribe_deficiency_types_version`.

The trend recommendations key is listed as well. `DemoResetTab.coverage.test.ts` now finds any `…KEY` constant used directly with `localStorage`, not only ones named `STORAGE_KEY` or `KEY`. Keys used through `storageGet`/`storageSet` live under the swept prefix and were always cleared.

## Batch 455 — Demo baseline: people, pools, cases and the reset

- **Full Reset:** `restoreSeedRecords` returns the seeded billing-rule and modifier versions in the kept dictionaries to their seeded state. Versions anyone created are kept.
- **Removed:** `executeUserReset` ("My data only"), together with `HOSPITAL_MAP` and `getCurrentUserId`. It re-seeded every tester's LIS cases and left the related stores stale.
- **Test:** `demoBaseline.test.ts` checks that the baseline holds together: sign-ins for every role, pools, cases, delegations, QC pairs, follow-ups, the countersign route and the billing restore.

## Batch 456 — Sign-in lockout, password screening, demo seeds

New seeds come back with Full Reset: registry submissions, a critical-finding alert, a support-access request, a consult link, molecular runs, decants and a matrix block, autopsy cases. The sign-in lock store sits under the mock prefix, so Full Reset clears every lock. Tests: `demoBaseline456.registryCritical.test.ts`, `demoBaseline456.autopsyMolecular.test.ts`, `demoBaseline456.decantSupport.test.ts`, and the identity checks in `demoBaseline.test.ts`.

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

`demoBaseline457.test.ts`: Metro General's registry, the resend outcome, the ICD-O data, and the Molecular Order Queue seed (including that it returns after a reset).

## Batch 468 — Autopsy: consent-scope narrowing, a forensic seed

`demoBaseline456.autopsyMolecular.test.ts` updated: A26-4661's hospital consent is now narrowed with an excluded organ (brain) actually present among its specimen's organ codes, so the new consent-scope warning banner is demoable; new **A26-4663**, a `medicolegal_forensic` case with one chain-of-custody transfer already on record. Four autopsies now come back with Full Reset, not three.

## Batch 469 — Autopsy: toxicology order seed, GB_EW disposal-demo case

`demoBaseline456.autopsyMolecular.test.ts` updated again: new **A26-4664**, a `GB_EW` hospital-consented case with a full-retention tier and no disposal recorded, so the organ-retention disposal panel has an HTA-governed case to demo against; A26-4663 gained a `toxicologyOrders` entry. Five autopsies now come back with Full Reset, not four.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 372

- **The Full Reset now really keeps what `DELIBERATELY_NOT_RESET` lists.** The mock services store through `mockStorage.ts`, which puts every key under `pathscribe_mock_`, and the reset's prefix sweep cleared those keys regardless of the list. So until now a Full Reset **did** clear the main audit log (`pathscribe_audit_logs`), the error log and the four billing dictionaries, despite what the list and its comments said. `keptThroughReset(key)` now exempts them, bare or prefixed. Only `ps_ai_audit_log_v1`, stored without the prefix, had actually survived.
- **Support access:** the support audit stream (`pathscribe_support_audit`) is kept; support access settings and requests clear with the prefix sweep.
