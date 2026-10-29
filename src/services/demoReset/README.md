# services/demoReset/

**Batch 648:** the Lockbox Drop-Off demo (`services/lockbox/lockboxDemoSeed.ts`) is covered by the existing mock-prefix sweep: its two keys are removed by a Full Reset and the mock store re-seeds on the next read, with fresh times. `lockbox/lockboxDemoSeed.test.ts` checks the round trip.

The demo data reset (mock backend only). Moved out of `components/Config/System/DemoResetTab.tsx` in Batch 370 (PS-356), so the screen no longer touches browser storage and the decision to reset is made here.

- **`resetAllDemoData({ authorization })`** clears every tester's demo data. It needs the capability `config:demo-data:reset` (checked and audited) and refuses without it.
- **There is no per-user reset.** `executeUserReset` ("My data only") was removed in Batch 455; see below.
- **It refuses** unless `IS_MOCK_BACKEND`: a real database is never reset from the browser.
- **The key lists** (`VERSIONED_KEYS`, `SETTINGS_KEYS`, `CASE_KEYS`, `FLAG_KEYS`, `STATE_KEYS`, plus the `RUNTIME_KEY_PREFIXES` sweep) are checked by `components/Config/System/DemoResetTab.coverage.test.ts` and `demoResetKeys.guard.test.ts` (this folder; part of the automated suite since Batch 508) against every storage key in `src/`. Keys named in `DELIBERATELY_NOT_RESET` survive a Full Reset.

*Corrected in the Batch 496 README audit (Oct 9, 2026): removed `executeUserReset` from the current description (deleted in Batch 455) and named the second key-audit test.*

## Batch 613 (part A) — case search reporting

`pathscribe_scheduledReports` (report schedules) is cleared with the other browser data.

## Batch 609 (part A)

- `caseReportImages` (the image links) is in `CASE_KEYS`.

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

## Batch 473 — Case-type key migration

`demoBaseline456.autopsyMolecular.test.ts` updated in step with the `AutopsyCaseAuthority` rename: A26-4663 is now asserted as `caseAuthority: 'statutory_judicial'`, not `'medicolegal_forensic'`. The Batch 456 entry above is left as an accurate historical record of what was built then. See `services/autopsy/README.md`.

## Batch 469 — Autopsy: toxicology order seed, GB_EW disposal-demo case

`demoBaseline456.autopsyMolecular.test.ts` updated again: new **A26-4664**, a `GB_EW` hospital-consented case with a full-retention tier and no disposal recorded, so the organ-retention disposal panel has an HTA-governed case to demo against; A26-4663 gained a `toxicologyOrders` entry. Five autopsies now come back with Full Reset, not four.

## Batch 482 — Structured Inking, Module 3 (PS-359 follow-up)

`SETTINGS_KEYS` gains `ink_colors` — the new margin ink-colour admin palette (`services/inkColors/mockInkColorService.ts`) clears on a Full Reset, same as every other lab dictionary.

## Batch 491 — Tumor Board auto-flagging rules, and a disclosed pre-existing gap closed (PS-359 follow-up)

`SETTINGS_KEYS` gains `tumor_board_auto_flag_rules` and `facility_tumor_board_rule_overrides` (`services/tumorBoardRules/mockTumorBoardRuleService.ts`), same real-dictionary reasoning as `ink_colors` above.

Also found and fixed while auditing those two new keys against this file's own established pattern: `cytologyHistologyCorrelationSettings`/`facilityCytologyHistologyCorrelationOverrides` and `biopsyResectionCorrelationSettings`/`facilityBiopsyResectionCorrelationOverrides` (both built by `createCorrelationSettingsServices` since Batch 452/453) were never added here — meaning this admin config silently survived every Full Reset since. Both have real `DEFAULT_*` seed fallbacks, same as every other entry in `SETTINGS_KEYS`.

`margin_shadow_attributes`/`margin_extraction_exceptions` were already in `CASE_KEYS` since Batch 490 — verified, not re-added.

## Batch 494 — the batching cut-off setting (PS-359 follow-up — MDT Self-Service Assignment & Batching redesign)

`SETTINGS_KEYS` gains `tumor_board_batch_settings` (`services/tumorBoardRules/mockTumorBoardRuleService.ts`'s new `mockTumorBoardBatchSettingsService`), added alongside the two Tumor Board rule keys from Batch 491 above, same real admin-configured-dictionary reasoning.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 372

- **The Full Reset now really keeps what `DELIBERATELY_NOT_RESET` lists.** The mock services store through `mockStorage.ts`, which puts every key under `pathscribe_mock_`, and the reset's prefix sweep cleared those keys regardless of the list. So until now a Full Reset **did** clear the main audit log (`pathscribe_audit_logs`), the error log and the four billing dictionaries, despite what the list and its comments said. `keptThroughReset(key)` now exempts them, bare or prefixed. Only `ps_ai_audit_log_v1`, stored without the prefix, had actually survived.
- **Support access:** the support audit stream (`pathscribe_support_audit`) is kept; support access settings and requests clear with the prefix sweep.

## Batch 497

`ps_ui_previewWindowGeometry` stays in the reset key list after the preview window was retired, so a reset still clears a window position saved in a browser before then.

## Batch 501

Full Reset also clears `cytologyQcSamplingStates` (the Cytology QC rules' sampling counters).

## Batch 508

- **Full Reset clears every screen display preference** (`ps_ui_…`, `utils/uiPreferences.ts`): saved filters, page size, editor theme, the worklist's collapsed pools, organ-map view, print margins and sidebar state. Pete decided this on Oct 10. Before, it cleared only the four named in `STATE_KEYS`.
- **What it still keeps** is unchanged: the audit trails and billing dictionaries in `DELIBERATELY_NOT_RESET`, and the companion-window positions. It already cleared the workstation's scan station, OR terminal, display profile and foot-pedal bindings (`SETTINGS_KEYS` / `STATE_KEYS`).
- **The key check is now automated: `demoResetKeys.guard.test.ts`.** It was a manual `.auditTest.ts` that had drifted. It compared keys saved through the mock-storage helpers without their `pathscribe_mock_` prefix, so it reported 20 keys the reset's prefix sweep does clear. It also reported `pathscribe_support_audit` as a stale exclusion, because it couldn't follow a service's injected store. Both are fixed. It reads `RUNTIME_KEY_PREFIXES` from the reset instead of keeping its own copy, and it now passes.

## Batch 509

`demoReset.test.ts` pins the workstation rule: Full Reset clears the scan station (and its "prompted" flag), OR terminal, display profile and foot-pedal bindings, and keeps only the guide-window positions (`ps-companion-window-geometry-…`). No code change.

## Batch 510

`demoResetKeys.guard.test.ts` hung on Windows. It walked up looking for a path ending in `/src`, and Windows paths end in `\src`. It now uses `process.cwd()/src`.

## Batch 515

`fppe_assignments` left the reset list (nothing writes it; start-up cleanup removes any old copy). `demoBaseline456.decantSupport.test.ts` allows the revoke it tests, now that revoking a consult link needs a permission.

## Batch 517

Full Reset clears `pathscribe_secure_messaging`, so each demo lab's secure messaging gateways (PS-143) are restored.

## Batch 518

Full Reset clears `pathscribe_label_reprint_runs`, the batch label reprint run log (PS-123). Each label print also has its own entry in the document-output audit, and that audit is kept.

Full Reset clears `report_delivery_queue_v1`, the e-fax and file-drop delivery queue (Batch 520, PS-280).

Full Reset clears `delivery_retry_records_v1`, the automatic delivery retries and the delivery exception queue (Batch 521, PS-281).

The seeded consult link stores only a token fingerprint (Batch 522, PS-290).

## Batch 534

`demoReset.ts`: a Full Reset also clears `held_report_releases` (reports held for the release delay).

## Batch 538

`report_documents` (the released report documents) is cleared with the case data.

## Batch 552 (PS-539 phase 2d: site agent screens)

- `site_agent_config` (the demo's site agent printers and shares) is in `SETTINGS_KEYS`.

## Batch 589

`critical_findings_by_case_v1` (flagged critical findings per case) is cleared by the demo reset.

- Batch 612 (part A): Reset demo clears `interfaceDictionaryProfiles` (settings) and `interfaceDictionaryFieldValues` (case data).

## Batch 716 - cytology demo data

The cytology specimen entries, GYN Cytology department and series, cytology protocols, eight cytology orders and the demo cytology routing default are seeds of the mock services (`specimen_dictionary`, `pathscribe_departments`, `ps_case_masks_v1`, `pathscribe_protocols`, `pathscribe_incoming_orders`, `cytologyRoutingSettings`), all already in the reset lists, so a Full Reset restores them. `specimenDictionary/cytologyDemoSeed.test.ts` checks this round trip.
