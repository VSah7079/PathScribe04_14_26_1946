**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/cancerRegistry/

Real, per the RFP-APLIS-2026-GLOBAL Broader Cancer Registry Exports
gap: NAACCR (US), CPAC (Canada), COSD (UK), INCa (France), ADT/GEKID
(Germany), AIHW (Australia), NZ Cancer Registry, and KCCR (Korea) —
for surgical pathology broadly, genuinely distinct from
`services/cytology/`'s own cervical-screening-programme registries
(KNCSP/KCCR, CSMS, CervicalCheck, PALGA, NCSR).

## The critical finding that shaped this whole module

Before writing any code, `services/facilities/IRegistrySettingsService.ts`'s
own header was found to already defer this exact work, pointing to
`src/FHIR_DISPATCH_ARCHITECTURE_PLAN.md` — a real, already-researched
document. That document's own "critical finding":
**NAACCR/SEER/NPCR/CoC explicitly exclude carcinoma in situ of the
cervix and CIN III from reportability, effective 1996**, alongside
PIN III and skin BCC/SCC, and **the Cancer Registry branch must never
be triggered from cytology sign-out** — a Pap smear is a screening
impression, not a diagnosis, regardless of severity. This module's
own real trigger (`dispatchCancerRegistryReportIfApplicable.ts`) is
wired into `useSignOutWorkflow.ts`'s real, confirmed surgical
pathology sign-out (`handleSignOutConfirm`) and nowhere else.

That same document flagged a genuinely unconfirmed, checkable
question for whoever built this next: does this app actually persist
an ICD-O-3 code's own real behavior digit (the /2 vs /3 the exclusion
rule above depends on) anywhere? **Confirmed directly: it did not.**

## Real, foundational fixes made before any registry logic could be honest

- **`synopticTypes.ts`**: `MedicalCode.system` gained `'ICD-O'` as its
  own, distinct value — previously only `'SNOMED' | 'ICD' | 'CPT'`
  existed, so an ICD-O code selected via `AddCodeModal.tsx`'s own
  'ICDO' filter tab had nowhere honest to land except `system: 'ICD'`,
  indistinguishable from a plain diagnosis code.
- **`types/case/Specimen.ts`**: `Specimen.coding` gained a real,
  per-specimen `icdO?: { code, description }[]` array, mirroring the
  existing `icd10`/`snomed` fields exactly — confirmed nothing like it
  existed anywhere before adding it.
- **`SynopticReportPage.tsx`'s `handleAddCodesToSpecimens`**: a real,
  confirmed bug found and fixed while wiring this in — this function
  only ever filtered for `system === 'ICD'` and `'SNOMED'`, meaning an
  `'ICD-O'`-tagged code reaching it was silently dropped entirely, not
  merely unsupported. Fixed to persist real ICD-O codes into the new
  `coding.icdO` field, mirroring the ICD10/SNOMED handling exactly.

## Files

- **`resolveIcdOBehaviorCode.ts`** — real, pure parse of the real,
  standard WHO ICD-O-3 behavior digit from a code's own combined
  "morphology/behavior" form (e.g. "8500/3" → "3"). Never a separate,
  hand-maintained field that could drift out of sync with the code
  itself.
- **`resolveCancerRegistryReportability.ts`** — implements the
  specific, already-documented NAACCR exclusions (cervical CIS/CIN
  III, PIN III, skin BCC/SCC) — **not** a claim of exhaustive coverage
  of NAACCR's own, much larger body of site-specific reportability
  rules, which is real, substantial reference work beyond this gap's
  own honest scope.
- **`ICancerRegistrySettingsService.ts` / `mockCancerRegistrySettingsService.ts`**
  and **`IFacilityCancerRegistryOverrideService.ts` / `mockFacilityCancerRegistryOverrideService.ts`**
  — the real, two-tier cascade (Enterprise default + Facility
  override), same established shape as the cytology screening-registry
  settings. Deliberately no seed facility assignments: unlike that
  cytology work (which had real, direct research confirming specific
  seed facilities' own jurisdictions), no such research was done here
  to assign this app's existing seed facilities to a specific real
  cancer registry. *(Since closed: Batch 457 seeds Metro General (`c1`) → `naaccr_us` (`CANCER_REGISTRY_DEMO_OVERRIDES`) — checked in the Batch 496 README audit.)*
- **`resolveEffectiveCancerRegistrySettings.ts`** — the real, pure
  cascade resolution, mirroring the cytology equivalent exactly.
- **`buildCancerRegistryReportPayload.ts`** — the real, structured
  JSON builder from a real `Case` — same "PathScribe builds structured
  JSON; interface engine handles registry-specific translation"
  principle as cytology's own registry dispatch. Reads
  `Specimen.coding.icdO` directly.
- **`ICancerRegistryOutboundQueueService.ts` / `mockCancerRegistryOutboundQueueService.ts`**
  — mirrors the cytology registry outbound queue's exact shape
  (QUEUED/SENT/FAILED, retry, audit logging on every state change).
- **`dispatchCancerRegistryReportIfApplicable.ts`** — the real
  orchestration: resolves effective settings, checks each specimen's
  own real ICD-O finding for reportability, and enqueues only a
  genuinely reportable case. Fire-and-forget from sign-out — a real
  dispatch-side failure never blocks the case's own, already-
  successful sign-out.

## Real, honest scope boundary

Same real "PathScribe builds structured JSON; a real interface engine
handles actual delivery" split as everywhere else in this app — this
module assembles and queues real, structured data; it does not itself
speak NAACCR XML, the CoC Data Standard, or any other registry's own
wire format (`FHIR_DISPATCH_ARCHITECTURE_PLAN.md`'s own, already-settled
decision). Filed on the Backend Needs Log: real outbound delivery to
each registry's own real submission endpoint.

**A second, real, honest gap — not fixed here, and worth stating
plainly**: there is still no real way for a pathologist to actually
*enter* an ICD-O code in this app today. `AddCodeModal.tsx`'s own live
ICD-O search is a genuine "coming soon" placeholder (no backend proxy
exists — the same real category as its neighboring ICD-11
placeholder), and no manual-entry fallback exists either. This
module's own pipeline (mapping → reportability → payload → queue) is
real and fully tested end to end against a real `Case` object with
real, populated `coding.icdO` data — but until that separate, real
capture-path gap is closed, no real, live case will ever have that
data to dispatch. Building a full live ICD-O terminology search
(requiring a real backend proxy, same as ICD-11) was judged out of
this gap's own honest scope; a minimal manual-entry UI inside
`AddCodeModal.tsx` (a real, 1,200+-line, heavily-used file) was
deliberately not attempted here given the real risk of modifying that
file further without a focused, dedicated pass — flagged as real,
separate, future work.

**Update (checked in the Batch 496 README audit, Oct 9, 2026):** the ICD-O tab in `AddCodeModal.tsx` is no longer a "coming soon" placeholder. It searches through `services/terminologySearch/codeSearchService.ts`'s `searchIcdo`, which queries UMLS for SNOMED CT morphology concepts and stores their SNOMED ids under system `ICDO`. Those are not ICD-O-3 `morphology/behavior` codes (`8500/3`), so `resolveIcdOBehaviorCode.ts` still has nothing it can parse from a searched code. AI code suggestions can also return `ICDO` codes. Real ICD-O-3 capture remains open.

## Batch 417

The payload's `patient` carries `nationalIdentifiers` (system, value, verification status) when the patient has any; the interface engine picks the one the registry keys on and must not send a `failedChecksum` one. There is still no per-registry identifier choice on this side (the screening definitions have one); that comes with the cancer JCPs.

## Batch 418

`CancerRegistrySettingsConfig.honoursPatientOptOut` (default false: statutory). `dispatchCancerRegistryReportIfApplicable` evaluates the patient's cancer registry opt-out: excluded with an audit entry where honoured; otherwise sent with "Registry opt-out overridden by statute" on the audit log. No Configuration switch for it yet (the settings screen is on the deployment baseline). *(Since closed: Configuration → System → Cancer Registry Reporting has the opt-out checkbox, saved through `saveCancerRegistrySettings.ts` (Batch 422) — checked in the Batch 496 README audit.)*

## Batch 419

Each cancer registry submission carries the payload header (`services/registrySubmission/`), case-level (`specimenId: 'case'`). A second dispatch for the same case is `CORRECTION`, version 2, same master id. `CancerRegistrySettingsConfig.environment` (default `test`); no Configuration control yet (the settings screen is on the deployment baseline). *(Since superseded: Batch 424 stopped reading `environment`; each registry's go-live is its own record in `services/registryGoLive/` — checked in the Batch 496 README audit.)* The queue's `retryDispatch` marks a duplicate retry. `CancerRegistryOutboundQueueEntry.errorCode` includes `EXCLUDED_BY_CONSENT`.

## Batch 420: reports are now sent

Before this batch `dispatchCancerRegistryReportIfApplicable` queued the report and stopped: nothing ever sent it, so no cancer registry report left PathScribe. It now dispatches (`CANCER_REGISTRY_REPORT`) and marks the entry sent (→ `awaitingAck`) or failed. The dispatch is a dependency (`CancerRegistryDispatchDeps`) so tests use a fake. The queue gains `setRegistryStatus`; entries carry `registryStatus`, `sentAt`, `acknowledgements`. The "sent" audit text no longer claims the report was "accepted": it says delivered to the interface engine, awaiting the registry.

## Batch 421

`prepareCancerRegistrySubmission` (settings, reportability, consent, payload body, content fingerprint) split out of `dispatchCancerRegistryReportIfApplicable`, which now commits what it prepares. Used by the worklist's resend.

## Batch 422: thirteen registries as definitions (SRS step 6)

`cancerRegistryDefinitions.ts`: every population cancer registry as data, the way the screening programmes have been since Batch 414: jurisdictions, the national identifier it keys on, the wire format, and specification status. Five added: **NCRI** (Ireland, IHI), **Public Health Scotland** (CHI), **NICR** (Northern Ireland, H&C number), **NKR / IKNL** (Netherlands, BSN, via the PALGA protocol), **Belgian Cancer Registry** (national register number, HD-S4S on healthdata.be). `CancerRegistryId` derives from the list. All are `configurable`: identifiers and formats are from public descriptions and must be confirmed by each JCP's sign-off lead. NAACCR matches on demographics; KCCR isn't keyed on the RRN (PIPA).

The payload carries `wireFormat` and `patientIdentifier` (the verified national identifier first, the MRN as a format-checked fallback; cancer reporting is statutory, so a missing or failed one doesn't hold the report, it's flagged in `verification`).

`saveCancerRegistrySettings.ts` (`config:cancer-registry:manage`, audited): the enterprise registry with its environment and opt-out rule, and facility overrides. Before Batch 422 the Configuration screen saved straight to the stores with no permission or audit. `cancerRegistrySettingsDeps.ts` wires it; `@/services` exports the stores and saves for the UI.

## Batch 423: go-live gate

- `dispatchCancerRegistryReportIfApplicable` asks `liveHold` (a `CancerRegistryDispatchDeps` member) before sending. A live register without a current go-live approval holds the report.
- `saveEnterpriseCancerRegistry` no longer sets the environment (Batch 422 did); go-live is approved through `services/registryGoLive/`.
- `cancerRegistriesInUse` (in `resolveEffectiveCancerRegistrySettings.ts`) lists the enterprise registry and the facility overrides' registries, each of which needs its own approval.

## Batch 424

- **Send gate.** `dispatchCancerRegistryReportIfApplicable` asks `sendGate` (a `CancerRegistryDispatchDeps` member that replaces `liveHold`):
  - on a validation instance a real case is not sent;
  - on production the case is held until go-live is approved.
- **Per-registry environment.** `CancerRegistrySettingsConfig.environment` is no longer read. Each cancer registry's go-live is its own record, so approving or stopping one no longer switches the others (the Batch 423 shared-setting gap).
- **Correction.** `cancerRegistryDefinitions.ts` said "the hospital's interface engine". The engine is ForMedrixAI's, shipped with PathScribe.

## Batch 425 — the mandatory-data hold

Each registry definition lists its `mandatoryFields`:
- every registry: date of birth, diagnosis date, primary diagnosis and an ICD-O code;
- a registry keyed on a national identifier: that identifier too, verified or at least the right format.

`cancerRegistryMandatoryData.ts` checks the payload before anything is emitted. A report missing any of it is queued and held:
- `FAILED`, `HOLD_MISSING_MANDATORY_DATA`, with the missing items in the message;
- never sent;
- shown on the Registry Exceptions worklist as held, and re-checked on resend (`rebuildRegistrySubmission`).

The case's sign-out is never held (Pete's answer). This replaces Batch 422's rule that an unusable identifier didn't hold a cancer report. The check runs after the send gate, so a validation instance still never queues a real case. The synthetic test suite's cancer cases meet every registry's list (tested). The lists are to be confirmed against each registry's specification at sign-off, like the identifiers.

## Batch 456 — Sign-in lockout, password screening, demo seeds

`cancerRegistryDemoSeed.ts`: six NAACCR (test) submissions. Registry Exceptions shows S26-4405 (rejected: laterality missing), S26-4490 (acknowledgement overdue) and S26-4633 (revised by the registry after acceptance). S26-4412 (with a correction) and S26-4630 are accepted and appear only in the transmission audit download. Resend on a seeded exception answers that Metro General no longer reports to a registry, because Metro General has no registry configured (an earlier decision to seed none; not changed).

## Batch 457 — Metro General cancer registry, Molecular Order Queue seed

Pete: yes, give Metro General a cancer registry. `mockFacilityCancerRegistryOverrideService` now starts with `CANCER_REGISTRY_DEMO_OVERRIDES`: Metro General (c1) reports to `naaccr_us`. Superseded: the earlier "deliberately no seed" decision in that file. S26-4405 (8500/2) and S26-4490 (8500/3) now carry an ICD-O code, a primary diagnosis and an issue date (`mockCaseService.ts`, `MOCK_VERSION` 51).

Resend on those exceptions now rebuilds the submission and stops at the instance rule: the demo is a validation instance (`VITE_APP_ENV` not `production`), which never sends a real case to a registry (`registryGoLive/registrySendGate.ts`). That rule is correct and unchanged. A successful send is shown through the go-live steps (agreement, then the synthetic test suite). Test: `demoReset/demoBaseline457.test.ts`.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*

## Batch 616 (part C): server versions (PS-498 to PS-504)

Each service here (the cancer registry services) now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/REGISTRY_API.md`. The mocks are unchanged.
