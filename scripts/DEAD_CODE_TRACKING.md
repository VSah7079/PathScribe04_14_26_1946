# Dead / Duplicate Code Tracking

Separate from `PRIORITY_FIXES.md` (which tracks functional bugs, gaps, and
UX issues) — this document exists specifically to track dead code (unused
variables, functions, components, imports, duplicated blocks) found and
fixed across the application, as part of pre-IP-submission cleanup.

**Why a separate document:** `PRIORITY_FIXES.md` is already large and
focused on behavioral correctness. Dead code is a different category —
it doesn't cause incorrect behavior, but it clutters the codebase and
isn't something an IP attorney (or a future engineer) should have to
puzzle over. Tracking it separately keeps both documents focused and
makes it easy to confirm, at submission time, that a systematic dead-code
sweep was actually done rather than left to incidental discovery during
unrelated work.

## Methodology

Manual review during folder-by-folder README passes (`services/`,
`components/`, `pages/SynopticReportPage/`, etc.) catches *some* dead code
incidentally, but isn't exhaustive — it depends on a reviewer happening to
notice an unused declaration while reading for other reasons.

For a definitive, tool-verified pass (not yet run as of this writing):
temporarily enable `noUnusedLocals` and `noUnusedParameters` in
`tsconfig.json` (currently both `false` — confirmed, this is why `tsc`
hasn't been flagging any of this on its own) and run `npx tsc --noEmit -p .`
across the whole project. This will surface unused variables/parameters
project-wide, not just in one file — expect real noise the first time
this runs. Review the results folder-by-folder rather than fixing
everything in one giant pass, logging genuine findings below.

**Status: `noUnusedLocals`/`noUnusedParameters` enabled in `tsconfig.json`
(July 2026). Full project-wide list captured below — 83 findings total.
Working through `pages/SynopticReportPage/` scope first (in progress);
everything else logged for later.**

### Important caveat, confirmed by direct example

"Unused" does not always mean "safe to delete." `Sidebar.tsx`'s
`onAddSpecimen` prop was flagged unused *within that file* — but the
*parent* (`SynopticReportPage.tsx`) passes it a real, working handler that
opens the Add Orders modal. The prop was unused because `Sidebar.tsx`
never rendered anything to call it — a wiring gap, not dead code — until
checked against how the parent actually uses it. (In this specific case,
further investigation found the real, working "+ Add Specimen" already
exists via a different path — `MaterialTreePanel.tsx`'s own button — so
`Sidebar.tsx`'s copy turned out to be genuinely redundant after all. But
that conclusion took investigation, not assumption.) Every item below
needs the same treatment: check what actually calls/passes it before
deciding fix vs. delete.

### In scope now — `pages/SynopticReportPage/` (~27 items, working through these)

- [x] `Sidebar.tsx` — `onAddSpecimen`, `onAddBlock`, `onAddStain` (3 unused
      props) — confirmed genuinely dead (real "+ Add Specimen" capability
      already exists via `MaterialTreePanel.tsx`; block/stain-adding
      already covered by `MaterialTreePanel.tsx`'s "+ Request block/recut"
      and `BlockStainEditorModal.tsx` respectively). Remove all three.
- [ ] `HeaderBar.tsx` — `isManuallyCompact` (line 99) — destructured but
      unused within the component itself. Check: is this meant to drive
      any visual state (e.g. a pressed/active look on the toggle button),
      or genuinely just a pass-through no longer needed now that
      `onToggleManualCompact`'s mere presence already gates the button?
- [ ] `OrchestratorSectionEditor.tsx` — `onEditSynoptic`, `resolvedTemplateName`,
      `resolvedBy`, `overrideTemplateId`, `onOverrideTemplate` (5 unused
      props), `stopDictation` (1 unused local). The template-related props
      are all passed in from `SynopticReportPage.tsx` — check whether this
      component was supposed to display template identity/override
      controls itself, or whether that responsibility fully moved to the
      centre pane header in `SynopticReportPage.tsx` (which does show
      template name + Change ▾) — in which case these are dead leftovers.
- [ ] `RightSynopticPanel.tsx` — `onReportTypeChange` (unused prop, passed
      from parent as `setActiveReportType`). Check whether this component
      should be calling it (e.g. when a legacy grossing/synoptic instance
      is loaded) or whether it's dead.
- [ ] `SequencerPanel.tsx` — `setExpandedSynoptics` (setter for a Set that's
      read but seemingly never written — check the read side too),
      `initialOrder` (state set but never read — was this meant to support
      a "revert to original order" feature that never got built?),
      `visibleFields`/`overflow` (computed for what looks like "+N more
      fields" truncation UI — check whether that render is actually
      missing from the JSX, i.e. a real display gap, not dead code).
- [ ] `BottomActionBar.tsx` — `closeCompanion` (destructured from
      `useCompanionWindow()` but unused — check whether the EMR sidecar
      window should be explicitly closed somewhere, e.g. on unmount or
      case change, and currently isn't).
- [ ] `BlockStainEditorModal.tsx` — `useMemo` import unused.
- [ ] `ProtocolChangeModal.tsx` — `useMemo` import unused.
- [ ] `SynopticReportPage.tsx` (10 items):
  - `discordanceService` import — check why it's imported (alongside
    `intraoperativeService`, which IS used) if never called.
  - `flagService`, `Flag` type import — same question.
  - `resolvedTemplateId` (state set but never read elsewhere — only
    `resolvedTemplateName`/`resolvedBy` appear to be actually used
    downstream; check if this was meant to feed something).
  - `setComputationalResults` (setter never called — `computationalResults`
    itself IS read/passed down, but nothing ever updates it after initial
    empty state. Real gap: computational/discrete LIS results never
    actually populate this).
  - `isPrinting` (state set in `handleOrchPrint` but never read — was a
    loading indicator planned but never wired into the Print button's UI?).
  - `order` parameter in `sendMaterialOrderToLis` (unused — check the
    function body actually needs the order details it's not using).
  - `blockId` parameter in `handleSendStainOrder` (unused — check whether
    the stain order payload should include which block it's for).
  - `pendingFieldOverrides` (state set via `setPendingFieldOverrides` in
    `handleFieldOverridesConfirmed` but never read — check whether this
    was meant to feed UI showing which fields have pending overrides).
  - `instanceId` parameter in `PreFinalisationModal`'s `onJumpToField`
    callback (unused — check whether jumping to a field needs to know
    which specimen instance it belongs to, given a case can have multiple).

### Out of scope for now — everything else (~51 items, logged for later folder passes)

**`components/Config/` (AI, System):**
- `Config/AI/index.tsx` — `PROVIDER_MODELS` import unused
- `Config/System/DeficienciesSection.tsx` — entire import (`DeficiencyType`, `ResolutionType`) unused
- `Config/System/ProtocolDictionarySection.tsx` — `ProtocolHistoryEntry` type unused; `TEMPLATE_EXAMPLE_ROWS` unused
- `Config/System/RetentionSection.tsx` — `useEffect` import unused
- `Config/System/SubspecialtiesSection.tsx` — `badge` local unused
- `Config/System/TATConfigSection.tsx` — `handleEntryDelete`, `handleEntryToggle`, `isNew` all unused (worth checking: are Delete/Toggle actions for TAT entries missing from the UI entirely, given this section was noted as still-a-stub in earlier session summaries?)

**`components/Contribution/`:**
- `ProductivityTab.tsx` — `ReferenceLine`, `Legend` (recharts) imports unused
- `QualityTab.tsx` — `TatTooltip` component defined but unused

**`components/Editor/`:**
- `PathScribeEditor.tsx` — `Editor` type import unused

**`components/TemplateBuilder/`:**
- `RoutingRulesTab.tsx` — `resolveReportTemplate` import unused
- `TemplateListTab.tsx` — `btn` function unused
- `TemplatePreviewPanel.tsx` — `node` parameter unused

**`components/ValidationStudies/ValidationStudiesSection.tsx`** (5 items):
- `isSuperAdmin` unused in 3 separate places (worth checking together —
  same access-control gap noted elsewhere as a known, deferred item?)
- `templates` prop unused
- `setPiId` setter unused (principal investigator ID never gets set after initial state?)

**`components/Worklist/WorklistTable.tsx`:**
- `flagDefinitions` prop unused
- `caseId` parameter in `renderFlag` unused

**`orchestrator/orchestratorEngine.ts`:**
- `narrativeTemplateConfig` import unused

**`pages/Home.tsx`:**
- `WarningIcon` import unused

**`pages/IntraopQueuePage.tsx`:**
- `showManualEntry`/`setShowManualEntry` state unused (a manual-entry
  mode that got removed or never finished?)
- `entry` parameter unused

**`pages/Synoptic/Comments/`:**
- `CaseCommentModal.tsx` — `currentUserId` prop unused
- `ReportCommentModal.tsx` — `currentUserId` prop unused

**`pages/WorklistPage/WorklistPage.tsx`:**
- `log` (from `useAuditLog`) unused — audit logging gap?
- `canViewPeds` unused (pediatric-case visibility gate computed but not applied?)
- `displayCases` unused (assigned from `realCases` but never rendered from?)

**`services/cases/`:**
- `CaseRouter.ts`, `FirestoreCaseService.ts` — both import `PathologyCase` type unused

**`services/clientSLA/`, `services/deficiencies/` (4 files), `services/performanceTargets/`, `services/narrativeSignals/INarrativeSignalService.ts`:**
- All import `ID` type but never use it — likely a shared pattern worth
  fixing consistently, not one at a time

**`services/flags/firestoreFlagService.ts`:**
- `query`, `where` (Firestore imports) unused

**`services/hl7/`:**
- `adapters/vantageAdapter.ts` — `standardMessage` parameter unused
- `segmentBuilders.ts` — `setId` parameter unused

**`services/narrativeSignals/mockNarrativeSignalService.ts`:**
- `NarrativeSignalStats` type unused

**`services/participationTypes/firestoreParticipationTypeService.ts`:**
- `setDoc` import unused

**`services/reports/`:**
- `mockAmendmentService.ts` — `AmendmentType`, `ClinicalNotification` types unused
- `mockLisAmendmentNoticeService.ts` — `LisAmendmentNoticeStatus` type unused

**`services/routingRules/mockRoutingRuleService.ts`:**
- `VERSION` constant unused

**`services/validationStudies/mockValidationStudyService.ts`:**
- `activatedBy` parameter unused in `activate()` (audit-trail gap — who
  activated a study is passed in but never recorded?)

**`utils/guideAssets.ts`:**
- `filename` parameter unused in `openPdfBlob`

## Found and fixed so far (incidental, during manual review)

- **`OrchestratorReportPanel.tsx`** (`pages/SynopticReportPage/components/`)
  — entire 917-line file was dead. Component itself never imported/
  rendered anywhere in the app (confirmed via full-repo grep); only its
  `OrchestratorSection` type was still referenced, by two files
  (`hooks/usePreviewChannel.ts`, `pages/ReportPreview/ReportPreviewPage.tsx`),
  both repointed to the byte-for-byte-identical type in
  `OrchestratorSectionEditor.tsx` (the file that actually superseded it —
  confirmed by that file's own header comment). File deleted entirely.

- **`SequencerPanel.tsx`** (`pages/SynopticReportPage/components/`) —
  `DocSection` component defined but never referenced anywhere in the
  file. Removed.

- **`LeftReportPanel.tsx`** (`pages/SynopticReportPage/components/`) —
  `markRef` (a `useRef`) was written to in `handleMarkMount` but never
  read anywhere; the actual scroll-into-view logic already used the
  local `el` parameter directly. Removed.

- **`SynopticReportPage.tsx`** — a 7-line comment block (originally
  written for `setSectionDirty`, explaining why it adds/removes just its
  own named dirty-section entry) was duplicated immediately below its
  correct location, misplaced directly above the unrelated
  `activeSpecimenId` state declaration. Clear copy-paste artifact.
  Removed.

## Deferred / not yet actioned

- **Full project-wide `noUnusedLocals`/`noUnusedParameters` sweep** — see
  Methodology above. Not yet run. Given the likely volume of results,
  plan to review in batches aligned with whichever folder is currently
  under README review, rather than as one separate mega-task.

---
*Update this file whenever dead/duplicate code is found and fixed, whether
via manual review or the tool-assisted sweep above.*
