# services/deploymentReadiness/

**Keeps the UI deployment-neutral (Batch 330).** PathScribe has to deploy to public or private cloud (Azure, AWS, Google, or a hospital's own data centre). The real backend isn't built yet. These files make sure the screens don't pick up new dependencies on where data lives while it is being built.

## Files

- **`deploymentReadiness.guard.test.ts`** — three rules for the UI layer (`components/`, `pages/`, `hooks/`, `contexts/`, and top-level `src/*.tsx`):
  1. **No direct mock-service import** (`…/mockXxx`). Use `@/services` or an injected dependency, so replacing mocks with the real backend is one switch rather than a change in every screen.
  2. **No direct `localStorage` / `sessionStorage`.** Display preferences go through `utils/uiPreferences.ts`, settings that belong to the computer (scan station, OR terminal, display profile, foot pedal, window positions) through `utils/workstationSettings.ts` (Batch 506), and data through a service.
  3. **No direct Firebase SDK import.** The database is reached only through services, so it can be replaced. Production will use Microsoft SQL Server behind an API server (Pete, Sep 2026).
- **`deploymentBaseline.ts`** — the files that broke a rule when the guard was added. It listed 183 mock imports, 39 browser-storage users and 1 Firebase import. Batch 334 removed `PendingApprovalSection.tsx` from the mock-import list (182 left). Batch 338 removed `OrchestratorSectionEditor.tsx` from the mock-import list (181 left) and `components/Editor/PathScribeEditor.tsx` from the browser-storage list (38 left; its theme preference now goes through `utils/uiPreferences.ts`). Batch 342 removed `pages/OrSuiteDashboardPage.tsx` from the mock-import list (180 left). Batch 343 (PS-60) removed `contexts/AuthContext.tsx` from both lists, and `ProtectedRoute.tsx` and `pages/LoginPage.tsx` from the browser-storage list (179 mock imports, 35 browser-storage users left). Batch 344 removed `pages/SynopticReportPage/modals/PreFinalisationModal.tsx` from the mock-import list and `pages/Synoptic/useSynopticFinalize.ts` from the browser-storage list (178 and 34 left). Batch 350 removed `pages/SearchPage.tsx` from both lists (177 and 33 left): saved searches go through the saved-search service, the last search through `utils/search/searchSession.ts`, and the action registry through `@/services`.
  - **The lists only shrink.** A new file may not break a rule, and a listed file that has been cleaned up must come off the list; the guard fails otherwise.
  - **Checked:** a new file importing a mock and using `localStorage` fails the guard with the fix named.
  - **Today: zero in all three lists (Batch 506, PS-477).** The guard also fails if an entry is added back. The batch entries below record how it got there.

*Corrected in the Batch 496 README audit (Oct 9, 2026): added the current baseline counts; the list above stopped at Batch 350.*

## Not covered by the guard

- **Services that answer synchronously.** For example `getSessionUser()`, and `templates/templateGovernanceSettings.ts → getTemplateGovernanceSettings()` from Batch 328. A real backend is asynchronous, so their callers will need a small change.
- **The protocol registry** (`components/Config/Protocols/protocolShared.tsx → PROTOCOL_REGISTRY`) lives in a component folder and is changed in place by `templates/templateService.ts`. It should move behind the template service.
- **Build-time settings.** `VITE_` settings are fixed when the app is built, so each customer would need its own build. Deployment needs settings read at run time.

## Batch 353

The TAT and delegation services took six files off the mock-import baseline (177 → 171) and four off the browser-storage baseline (33 → 29):
- `TATConfigSection.tsx`, `QualityTab.tsx`, `EnterpriseRollupTab.tsx` and `ContributionDashboardPage.tsx` came off both.
- `DelegateModal.tsx` and `InformalReviewBanner.tsx` came off the mock-import baseline. *(Since removed: `InformalReviewBanner.tsx` was deleted in Batch 355, PS-346 — checked in the Batch 496 README audit.)*


## Batch 363 (PS-72): patient data tagged for screenshot redaction

Seven files came off `MOCK_IMPORT_BASELINE` (they now import from `@/services`): `CasePoolAssignmentSection`, `ExternalConsultViewPage`, `EmbeddingStationPage`, `MicrotomyWorkstationPage`, `IntraopQueuePage`, `LeftReportPanel`, `useSpecimenBlockManagement`.

## Batch 365 (PS-347)
`pages/AccessionPage/OrderLookupModal.tsx` came off `MOCK_IMPORT_BASELINE`: it takes `patientIndexService` from `@/services`. `AccessionPage.tsx` was touched too but stays listed; it imports about fifteen mock services, too many to move in this batch.

## Batch 368

- **Came off `MOCK_IMPORT_BASELINE`:**
  - they now import from `@/services`: `CytologyCategoriesSection`, `AIContributionTab`, `MentorTab`, `ProductivityTab`, `FacilityEditorModal`, `CytologyQaTab`, `ReassignCasePatientPanel`, `TemplateAssemblyPage`, `BatchDetailView`, `EngraverMonitorPage`, `LabelDesignerPage`, `MolecularWorkcenterPage`, `CaseTeamModal`;
  - `BottomActionBar` reads `reportReleaseService`.
- **Came off the browser-storage list:** `CommentModalShell` keeps the dialog position through `utils/uiPreferences.ts`.
- **Correction:** Batch 367 touched these files, and others still listed, without doing this cleanup, and its notes didn't say so.
- **Still listed after being touched in Batch 367 or 368**, because the cleanup isn't practical in a small change:
  - `SynopticReportPage` and `QualityAssurancePage` (many mock imports);
  - `DeliveryRulesSection` (4) and `ValidationStudiesSection` (5);
  - `DemoResetTab` (clears browser storage by design);
  - `TemplatePreviewPanel` and `WorklistTable` (browser storage);
  - `HeaderBar` (a type import from `mockLisSyncService` and a session-storage flag set by messaging).

## Batch 369 (PS-355)

Seven files came off the mock-import baseline. Their mock imports were replaced with `@/services` (new exports: `billingDeficiencyService`, `outboundChargeQueueService`, `codeReviewPoolService`, `reasonDictionaryService`):
- `components/Config/Staff/RoleDictionary.tsx`
- `components/QualityAssurance/InspectionModeTab.tsx`
- `components/QualityAssurance/IntraopLinkageTab.tsx`
- `components/QualityAssurance/PatientMatchReviewSection.tsx`
- `components/QualityAssurance/QaDashboardTab.tsx`
- `components/QualityAssurance/ReconciliationTab.tsx`
- `pages/QualityAssurancePage.tsx`

`SynopticReportPage.tsx` was touched and stays listed. Its remaining direct imports are part of the report page's larger cleanup, as in Batch 368.

## Batch 370 (PS-356)

`components/Config/System/DemoResetTab.tsx` came off the browser-storage baseline. Its reset logic moved to `services/demoReset/`.

## Batch 380

`pages/SynopticReportPage/modals/AmendmentModal.tsx` (reason dictionary through `@/services`) and `pages/SynopticReportPage/hooks/useAmendmentWorkflow.ts` (audit service and the two AI suggestion functions through `@/services`) came off the mock-import baseline.

## Batch 381

Off the baselines:
- **`pages/SynopticReportPage/SynopticReportPage.tsx`, both lists.**
  - Audit, billing rules, service charges, the action registry, report templates, report release and the grossing-template evaluation now come through `@/services`.
  - The header's compact mode, the sidebar and the tab width are `utils/uiPreferences` preferences.
  - The search-results list is read with `getSessionFlag`.
- **`pages/SynopticReportPage/modals/BlockStainEditorModal.tsx`:** molecular targets and cassette colours come through `@/services`.

## Batch 382

Off the mock-import baseline: `components/Billing/CorrectAppliedCodeModal.tsx` (RVU code map), `components/Billing/PostSignoutBillingChangeModal.tsx` (reason dictionary) and `pages/SynopticReportPage/modals/DiscordanceReconciliationModal.tsx` (the frozen-final activity type id), all now through `@/services`.

## Batch 384

Off the mock-import baseline: `components/AppShell/AppShell.tsx` (the action registry), now through `@/services`. It stays on the browser-storage baseline (session storage for the messages drawer).

## Batch 388

`pages/MicrotomyWorkstationPage/hooks/useMicrotomyWorkstation.ts` came off the mock-import baseline: it read scan stations from `mockScanStationService` and now uses `scanStationService` from `@/services`.

## Batch 406

Five pages left the baseline:
- `MolecularRackLoadingPage.tsx`
- `MolecularRackWorklistPage.tsx`
- `MolecularControlRulesPage.tsx`
- `MolecularBatchManagementPage.tsx`
- `MolecularOrderQueuePage.tsx`

Every molecular page now takes its services from `@/services`.

## Batch 407

`DisposalQueuePage.tsx`, `DisposalReportPage.tsx` and `PendingBatchQueuePage.tsx` left the baseline. No Batch Management page is on it now.

## Batch 409

The Cytology Workspace (`CytologyScreeningPage.tsx`, `CytologyWorklistPage.tsx`, `CytologySynopticFormView.tsx`) left the baseline.

## Batch 414

`components/Config/Cytology/CytologyRegistrySettingsSection.tsx` left the baseline: it takes its services from `@/services`.

## Batch 422

`components/Config/System/CancerRegistrySettingsSection.tsx` off the baseline: it now reads through `@/services` and saves through the permission-checked service.

## Batch 426

`pages/SynopticReportPage/hooks/useLisIntegration.ts` is off the mock-import baseline. Its LIS send now goes through `services/reports/dispatchAssistSynopticResult.ts`.

## Batch 428: Configuration permissions

Off the baseline: `RetentionSection.tsx` (now a service), `DepartmentsSection.tsx` (barrel imports), and the deleted `SpecimenCategoriesSection.tsx` and `System/PatientMatchReviewSection.tsx`.

## Batch 431

The browser-storage baseline went from 24 files to 6. What's left is the workstation's own settings (scan station, OR terminal, display profile, companion window, foot pedal) and the demo-reset key audit. Moved: per-person settings, lab-wide settings, template review work, AI drafts (removed), access badges (records), and session flags and the preview window position (`utils/uiPreferences.ts`).

## Batch 444

`components/Config/System/ScanStationsSection.tsx` left the mock-import baseline (it uses `@/services` now).

## Batch 451 — screen-level test evidence for Priority 2 tickets

Three Configuration sections left the mock-import baseline (99 left).

## Batch 452 — Closing the review gaps (PS-131, PS-105, PS-133/PS-323, PS-57), PS-156 correlation window, decant ↔ billing sync, Phase 1 fixes

`pages/Synoptic/useSynopticFlags.ts` now uses `@/services` and is off the mock-import baseline (98 left).

## Batch 465b

`hooks/useGlobalStationSwitch.ts` is off the baseline: it now reads the scan stations through `@/services`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*

## Batch 495

Two pages left `MOCK_IMPORT_BASELINE`: `pages/ReportPreview/ReportPreviewPage.tsx` (now opens its case through `openCaseForViewDefault()`) and `pages/MigrationJobsPage.tsx` (now reaches `migrationJobService`/`migrationRecordResultService` through `@/services`). `pages/MockInterfaceEnginePage/MockInterfaceEnginePage.tsx` was touched too (breadcrumb) but stays listed: it is the developer screen for the mock interface engine itself, and its imports are that mock by design.

## Batch 506 (PS-477): the baseline is empty

- **Mock imports, 95 → 0.** Each screen imports its service from `@/services`. The index gained the services and helpers screens were reaching into mock files for (marked "Batch 506" at the end of `services/index.ts`). Two screens built their own `MockVoiceMacroService`; they now share `voiceMacroService` (the class keeps no state of its own, so nothing changes). Dynamic `import()` calls of mock files now import `@/services`.
- **Browser storage, 6 → 0.**
  - The five workstation hooks use the new `utils/workstationSettings.ts`, with the same keys, so saved settings carry over.
  - `WorklistTable` kept its collapsed-pool state through the mock-storage helpers. It's a display preference, so it now goes through `utils/uiPreferences.ts`. That changes the key, so a remembered collapsed/expanded state resets once.
  - The demo-reset key audit moved to `services/demoReset/demoResetKeys.auditTest.ts`.
- **Firebase, 1 → 0.** `usePendingEngineNotifications` reads through `services/engravers/fetchNewEngineNotifications.ts` (same query, same handlers). The hook was never mounted, and both were removed in Batch 549 (F1). Firebase itself leaves the front end in PS-487.
- **New check:** the guard fails if any baseline list is non-empty.

## Batch 507: `deletedFiles.guard.test.ts`

Fails when a file listed in the root `DELETED_FILES.txt` is still in the working copy, and names it. Fix with `npm run cleanup:deleted`. It was added after a stale `CreateBatchModal.tsx` in Pete's copy failed the HTML sanitising guard instead (Oct 10). That file had been retired in an earlier batch whose deletion was only mentioned in the changelog. `DELETED_FILES.txt` now also lists 19 such earlier deletions.

## Batch 537: `deploymentReadinessReview.guard.test.ts`

Keeps `docs/architecture/DEPLOYMENT_READINESS_REVIEW.md` (PS-539) honest. Every file the review cites must exist, by path or by its tail under the repo; proposed files are listed in `PROPOSED`. The review must also keep decisions D1 to D7 and findings F1 to F7.

## Batch 541

`deploymentReadinessReview.guard.test.ts`: every decision row (D1–D7) must say Decided and carry its verification column.

## Batch 542

- `phase2cContracts.guard.test.ts` (new): `MESSAGE_BUS_API.md` cites only real files and places every server job of the review's §7; `ASYNC_EXPORT_API.md` cites only real files, and the export kinds equal the catalog's export capabilities.
- `deploymentReadinessReview.guard.test.ts`: findings F8 and F9 must stay listed.

## Batch 543

`phase2cContracts.guard.test.ts`: `BLOB_STORAGE_API.md` cites only real files and names every place the browser holds a file today (each field must still exist).

## Batch 544

`phase2cContracts.guard.test.ts`: links only (Pete, Oct 13). It fails if a screen takes an image file (`type="file"` with an image `accept`), if `StaffTab.tsx` reads a file again, or if `BLOB_STORAGE_API.md` plans an `images`, `attachments`, `signatures`, `branding` or `uploads-staging` container.

## Batch 545

- `phase2cContracts.guard.test.ts` adds the following checks:
  - `INTERFACE_ENGINE_EDGE.md` cites only real files;
  - it has a row for every answer in `engineEdgeContract.ts`;
  - the review's §6.2 points to it;
  - no engine webhook claims a message first and then answers 404 (F10).
- `deploymentReadinessReview.guard.test.ts` now checks findings F1 to F12.

## Batch 546

`phase2cContracts.guard.test.ts` adds `SITE_AGENT_API.md`. It checks that:
- the document cites only real files;
- its failure table places every agent error as `agentFailureRetriable` does;
- its figures match the contract's limits;
- the review's §6.3 points to it;
- `attemptPrintDelivery.ts` checks where it runs before reaching the Node print transports (F3).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- The engine-notification hook and its Firestore read are removed (F1); `DELETED_FILES.txt` lists them.
