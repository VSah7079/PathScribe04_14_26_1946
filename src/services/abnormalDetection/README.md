# services/abnormalDetection/

PS-105 (Core Abnormal Detection Engine), PS-129 — a real, admin-configurable
dictionary mapping a specific synoptic field/value combination to a severity
flag, plus the pure evaluation logic that checks a specimen's resolved
synoptic answers against it.

**Pattern:** standard admin-curated dictionary, modeled directly on
`services/deficiencies/`'s `DeficiencyType`/`ResolutionType` pair — same
`getAll/add/update/deactivate/reactivate` CRUD shape, same Global/scoped
`performingLabFacilityId` convention.

## Files

- **`IAbnormalTriggerRuleService.ts`** — `AbnormalTriggerRule` (fieldLabel,
  triggerValues, severity, description, status, performingLabFacilityId) and
  the CRUD contract. `AbnormalSeverity` (`Abnormal` | `Critical` | `Malignant`)
  is exported from here and shared with `services/clinical/detectCriticalFindings.ts` —
  one real, unified severity vocabulary across both the discrete
  (this folder) and narrative-AI (`services/clinical/`) detection paths.
- **`mockAbnormalTriggerRuleService.ts`** — the real, currently-active
  implementation, seeded with the four rules PS-105's own spec named
  (Margin Status, Perineural Invasion, Lymph Node Status, Lymphovascular
  Invasion) — an admin can edit or deactivate any of these, and add their own.
- **`evaluateAbnormalTriggerRules.ts`** — pure, testable evaluation: matches a
  specimen's `ResolvedAnswer[]` (`orchestrator/contextBuilder.ts`) against the
  active rule set, case-insensitively, on `displayValue` components (never the
  raw `value` array, which holds opaque option IDs, not human-readable text).
  Splits a multi-select field's `displayValue` on comma and requires an exact
  match per component — never a bare substring check, which would wrongly
  match "Present" inside "Not Present." Returns real `AiFieldSuggestion`
  (`types/case/Case.ts`) results, confidence always 100 (a discrete rule match
  is deterministic, not a probabilistic guess) — never an auto-applied
  determination. Real, per direct guidance: "the case is considered abnormal
  or not, however the human makes the final call. We just offer the
  suggestion and why with a confidence factor."

- **`resolveAbnormalDetectionEnabled.ts`** — the real, per direct guidance: "If the
  enterprise level is disabled then the performing facility level is disabled
  and cannot be overridden." Deliberately NOT `SystemConfigContext.tsx`'s
  existing `isFeatureEnabled()` — that resolves facility-over-enterprise in
  *either* direction (correct for `reportingPlusEnabled`, wrong here, since it
  would let a facility silently re-enable something an enterprise admin
  explicitly turned off). Enterprise-disabled is an absolute floor; a facility
  can only ever further restrict a permissive enterprise default, never loosen
  it. Wired as the very first check in `useSignOutWorkflow.ts`'s
  `fetchCriticalFindings` — when disabled, nothing below it runs at all, not
  even the AI call. Enterprise toggle lives at the top of this folder's own
  admin section (`components/Config/System/AbnormalTriggerRulesSection.tsx`);
  facility toggle in `FacilityEditorModal.tsx`, gated to the `performing_lab`
  role. **6 real tests** across `resolveAbnormalDetectionEnabled.test.ts` and a
  dedicated governance-gate test in `useSignOutWorkflow.test.ts`.

- **`IAbnormalDetectionSignalService.ts` / `mockAbnormalDetectionSignalService.ts`** — PS-137, real
  "Level 1 AI learning" agreement tracking, per direct guidance: "How often was
  their agreement... an opportunity to feed that information back for
  learning, just like we do when we add or remove synoptic reports." That
  precedent is real, not assumed — mirrors `TemplateSuggestionSignal`
  (`services/templateSuggestions/`) and `NarrativeEditSignal`
  (`services/narrativeSignals/`), unified into one shape since PS-129/PS-131
  suggestions differ only in whether real clinical text is involved. A
  `'narrative'`-source signal's `reasonClean` is run through the real,
  exported `deidentifyText()` before storage; a `'discrete'`-source one needs
  no de-identification (a config-driven field/value label, never clinical
  text). Captured fire-and-forget from both `handleRecordCriticalNotification`
  ('confirmed') and `handleAcknowledgeCriticalFindings` ('dismissed') in
  `useSignOutWorkflow.ts`. **10 real tests** across both files.

- **`resolveSyntheticCoding.ts`** — real, per direct guidance: lets the "confirmed
  finding → attached coded term" architecture be exercised end to end before a
  real, verified terminology source exists (PS-130 stays genuinely blocked —
  this does not unblock it). Real, structural safety boundary: every code
  value is prefixed `TEST-` directly in the code string itself (never real
  SNOMED CT's bare-numeric or ICD-O-3's `\d{4}/\d` format), and every display
  string leads with `[SYNTHETIC — TEST ONLY]` — unmistakable as fake even read
  completely alone, never relying on a field name or comment as the only
  safeguard. Wired alongside `Case.abnormalDetectionStatus` at the same real
  confirm moment (`handleRecordCriticalNotification`), stored on
  `Case.syntheticAbnormalCoding`, surfaced in `WorklistTable.tsx`'s
  `AbnormalDot` tooltip for direct QC verification. **3 dedicated safety tests**
  in `resolveSyntheticCoding.test.ts` plus a direct integration test in
  `useSignOutWorkflow.test.ts`.

## Notes

- **Worklist visibility (PS-133)**: `Case.abnormalDetectionStatus` (`types/case/Case.ts`) is the real, persisted,
  pathologist-CONFIRMED status `WorklistTable.tsx`'s `AbnormalDot` renders from —
  set only by `handleRecordCriticalNotification` (`useSignOutWorkflow.ts`), to
  the single highest-severity finding among everything shown in that sign-out
  session. Never set from an unconfirmed suggestion — `handleAcknowledgeCriticalFindings`
  deliberately does not touch this field.

- Admin UI: `components/Config/System/AbnormalTriggerRulesSection.tsx`
  (Clinical Lookups group).
- **13 tests** in `evaluateAbnormalTriggerRules.test.ts` — field-label
  matching, case-insensitivity, the "Not Present" vs. "Present" substring
  safety case, multi-select handling, inactive-rule exclusion, and the
  highest-severity reduction helper.

*Corrected in the Batch 496 README audit (Oct 9, 2026): test count 11 → 13.*

## PS-137's open gap closed: signals carry the Validation Study (Batch 318)

PS-137's one remaining gap was that agreement signals never recorded which active Validation Study covered the case. The narrative-edit signals, which PS-137 asked this to mirror, already did.

- **`AbnormalDetectionSignal.studyId`** (optional) is now set when a signal is captured.
- **`getByStudy(studyId)`** and **`getStats(studyId?)`** can scope to one study, matching `NarrativeSignalService`.
- **`recordAbnormalDetectionOutcomes.ts`** (new) turns the pathologist's decision on the flagged findings shown at sign-out into signals:
  - 'confirmed' when they record a notification;
  - 'dismissed' when they acknowledge without recording.

  It resolves the covering study once per decision (`services/validationStudies/resolveActiveStudyId.ts`) and de-identifies narrative quotes exactly as before. This mapping used to be written out twice inside `useSignOutWorkflow.ts`; that hook now only calls it.
- **Tests:** `recordAbnormalDetectionOutcomes.test.ts`, plus study-scoping cases in `mockAbnormalDetectionSignalService.test.ts` and `useSignOutWorkflow.test.ts`.

## Batch 428: Configuration permissions

- `mockAbnormalTriggerRuleService`: `add`, `update`, `deactivate`, `reactivate` need `config:abnormal-triggers:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 450 — test evidence for Priority 1 and 2 tickets (PS-129)

`abnormalTriggerRuleEditing.ts`: add, edit, deactivate and reactivate trigger rules, moved out of `AbnormalTriggerRulesSection.tsx`; refused without the configuration capability.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 615 (PS-138): searches for matched triggers

`triggerCodeQueries.ts` turns a specimen's trigger matches into the searches the Code Manager offers (one per matched rule and matched value: field label plus value). It runs no search and picks no code; the pathologist chooses a finding and then a result. `pages/SynopticReportPage/hooks/useTriggerCodeQueries.ts` loads them while the Code Manager is open, where abnormal detection is on.

## Batch 617 (part A): server versions (PS-514)

`abnormalTriggerRuleService`, `abnormalDetectionSignalService` now have an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (the mock without an API server address, the server version with one). One route per interface method; the calls are listed in `docs/architecture/CONFIG_SERVICES_API.md`. The mocks are unchanged. The instance file imports the mock, so a test that loads the mock first may need to load the instance first (the mock can reach `@/services`, which reaches the instance).

## Batch 623 (PS-130): real codes while a licence is on

`resolveFindingCoding.ts` decides which code(s) a matched rule attaches: the rule's own real `licensedCoding` for each code system whose licence is on and unexpired (`terminologyLicence/`), otherwise the rule's test codes, otherwise the severity default (`resolveSyntheticCoding.ts`). `evaluateAbnormalTriggerRules` takes the active licences as a fourth argument (default none, so every existing caller keeps test codes). The sign-out hook passes `activeLicensedSystems(enterpriseConfig.terminologyLicences, todayIso())`. `abnormalTriggerRuleEditing.ts` checks and stores the rule form's real codes. `SyntheticCodingTerm` keeps the test systems; the new `LicensedCodingTerm` and the union `CodingTerm` carry the rest. The case field and flag field are still named `syntheticAbnormalCoding` / `syntheticCoding` (renaming them touches stored cases).

## Batch 652

`codingTermText.ts` (+ test) splits a confirmed finding's coded terms into demonstration codes (the `TEST-` systems, `isDemonstrationCode` in `resolveSyntheticCoding.ts`) and real licensed codes; the worklist dot tooltip labels the first group "demonstration code, not a real SNOMED CT or ICD-O-3 code". No demonstration SNOMED lookup exists and none was bound.
