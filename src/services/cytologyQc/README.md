**Batch 617 (part R):** the server version(s) in this folder use the one route style `/api/<area>/<service>/<method-kebab>` (GET for plain-value reads, POST otherwise); earlier paths are in `docs/architecture/HTTP_ROUTE_MAPPING.md`.

# services/cytologyQc/

Real, per the uploaded "Automated Cytopathology QC Assignment Engine"
spec, plus extensive direct follow-up resolving two open design
questions and one confirmed real gap. This is the full, general rule
engine that supersedes `services/cytology/`'s own earlier, simpler
2-rate (negative/non-negative) Enterprise → Facility → Staff cascade
(`ICytologyQcSettingsService`, `resolveCytologyRandomQcSelection.ts`)
— those two rates become just two of many possible real rules under
this model, not a second, parallel mechanism.

**Real, deliberate migration scope, per direct guidance**: only the
*post-sign-out peer review* mechanism migrates onto this engine. The
5-year retrospective lookback and histology correlation pool
mechanisms (`resolveCytologyRetrospectiveReviewPoolMembership.ts`,
`resolveCytologyHistologyCorrelationPoolMembership.ts`) stay exactly
as they are — confirmed to serve a genuinely different real purpose,
not folded into this engine.

## Files, in build order

1. **`types/cytologyQc/CytologyQcRule.ts`** — the core data model:
   `QcRuleCriteria` (every real spec §2.1 dimension — jurisdiction,
   facility, provider, specimen, clinical risk, diagnostic scope),
   `QcSamplingLogic` (percentage/interval/fixed_volume, a real
   discriminated union), `QcWorkflowState` (spec §3's exact state
   names), `CytologyQcCaseAssignment` (a real, in-flight case's own
   record as it moves through the state machine).
2. **`resolveQcCriteriaMatch.ts`** — pure per-field criteria matching.
   An unset criteria field never excludes a case.
3. **`resolveQcSamplingDecision.ts`** — the three real sampling modes,
   each with genuinely different real state (a running counter for
   interval/fixed_volume, nothing for percentage).
4. **`resolveQcRuleEvaluation.ts`** — the real orchestrator: evaluates
   active rules in priority order (real, per direct, provided seed
   data's own convention — **higher `evaluationPriority` number
   evaluates first**, corrected from this file's own earlier,
   arbitrary ascending choice), enforces the real, upfront
   Consultation Deduplication guardrail before any rule runs, and
   returns a real, discriminated `QcEvaluationResult`.
5. **`resolveQcReviewerEligibility.ts`** — the one, hard, always-on
   Self-Review Prevention guard (never a per-rule setting).
6. **`resolveNewQcCaseAssignment.ts`** — builds the real initial
   `QC_PENDING` record from either a rule match/CT escalation, or a
   ROSE/FNA discrepancy (a real, fixed, always-on system trigger —
   never a configurable rule — landing at the real, highest urgency
   tier with a fixed real 4-hour SLA, per spec §2.3).
7. **`ICytologyQcCaseAssignmentService.ts` / `mockCytologyQcCaseAssignmentService.ts`**
   — the real, persisted state machine: `create` → `assignReviewer`
   (enforcing self-review prevention) → `recordConcurrence` /
   `recordDiscrepancy` → `escalateForSlaBreach` (real, honest refusal
   if not genuinely breached) / `supervisorBypass` (always logged,
   never silent).
8. **`resolveQcSlaStatus.ts`** — on-time / approaching (80% of window)
   / breached, pure, no clock of its own.
9. **`resolveCytologyQcComplianceReport.ts`** — spec §4's own
   aggregate reporting: tier/trigger breakdowns, per-reviewer
   discrepancy rates, real `undefined` (never a fabricated 0%) when
   there's no resolved data yet.
10. **`sortQcQueueByPriority.ts`** — the real Urgency Matrix ordering
    for the unified queue.
11. **`ICytologyQcRuleService.ts` / `mockCytologyQcRuleService.ts`** —
    real CRUD for the rules themselves, `duplicate()` (starts
    inactive, ready for one small change), and the real, international
    seed set (see below).
12. **`resolveQcRuleDraftValidation.ts`** — the admin form's own pure
    validation (real ranges, required fields) — the form itself never
    embeds this logic.
13. **`resolveQcQueueTabFilter.ts`** — the real tab slicing (All /
    Escalations & Discrepancies / Routine & Random) for the unified
    queue UI, pure.
14. **`resolveQcEvaluationContextFromCytologyReview.ts`** — the real
    adapter from `CytologyScreeningPage.tsx`'s own available data to
    a real `QcEvaluationCaseContext`. Pure — the actual async lookups
    (facility → jurisdiction, category ID → adequacy label) stay in
    the real call site, not hidden in this function. (No call site uses
    it yet; see the safety-net section below.)

## Admin UI & reviewer UI

- `Config/System/CytologyQcRulesSection.tsx` — the rule builder.
- `pages/CytologyQcQueuePage.tsx` — the real, unified, reviewer-facing
  Peer Review Queue. It is shown inside the Worklist
  (`/worklist?view=cytologyQc`); the old `/cytology-qc-queue` address
  redirects there.

*Corrected in the Batch 496 README audit (Oct 9, 2026): the queue is a Worklist view now, not its own route.*

## Real, international seed rule set — 8 rules

Seeded per direct, provided specification, translated field-for-field
onto this module's own types (jurisdiction labels expanded into this
app's own real per-country `Jurisdiction` values; `NILM`/`NEGATIVE`
diagnostic codes mapped onto `resultIsNegative: true` rather than
enumerating Bethesda categories; `routing.target_reviewer_role` kept
as real, provided strings in `eligibleReviewerRoles`):

| Rule | Jurisdiction(s) | Role | Sampling | Tier |
|---|---|---|---|---|
| `SEED-US-CLIA-001` | US | CT | 10% negative | routine_random |
| `SEED-US-CLIA-002` | US | CT | 100% high-risk-flagged negative | targeted_high_consequence |
| `SEED-UK-NHS-001` | GB_EW/GB_SCT/GB_NIR/IE | CT+Path | 20% HPV+ | targeted_high_consequence |
| `SEED-EU-ISO-001` | DE/FR/NL/BE | Pathologist only | 2% Path-to-Path | routine_random |
| `SEED-EU-CT-SIGNOUT-001` | DE/FR/NL/BE | CT | 10% negative | routine_random |
| `SEED-APAC-AU-001` | AU/NZ | Pathologist | 100% high-grade | targeted_high_consequence |
| `SEED-GLOBAL-ONBOARD-001` | any (ships inactive) | Pathologist | first 50 cases | high_escalation |
| `SEED-GLOBAL-UNSAT-001` | any | CT+Path | 100% unsatisfactory | targeted_high_consequence |

### Real, confirmed gap found and fixed — EU Cytotechnologist independent sign-out (Sep 2026)

The original EU seed only ever covered Pathologist-to-Pathologist
review (`SEED-EU-ISO-001`), silently assuming all EU cytology
sign-out is Pathologist-attributed. Direct guidance flagged the real
risk this created — the migration onto this engine could silently
drop QC coverage for any EU Cytotechnologist sign-out that the old,
general Enterprise/Facility/Staff cascade used to catch. Confirmed via
direct, cited research (EACC/EFCS surveys): this is a real, common
misconception, not a safe assumption — Cytotechnologists independently
sign out negative (and in several jurisdictions, abnormal) cytology
across real EU countries.

**Resolved via a complete, provided seed definition**: `SEED-EU-CT-SIGNOUT-001`
was widened into the one, real, universal negative-rescreen rule
covering every jurisdiction this app models (retiring the earlier,
now-redundant US-only `SEED-US-CLIA-001`), and `SEED-EU-ADV-CT-ABNORMAL-001`
was added for the real, distinct advanced-CT abnormal sign-out
scenario, scoped to the jurisdictions that genuinely permit it
(GB_EW/GB_SCT/GB_NIR, NL, DE — see the jurisdiction policy below).

### Real credential normalization design (Sep 2026)

Per direct guidance's own confirmed correction: rule criteria
(`QcRuleCriteria.requiredCapabilities`) and the sign-out gate both
check one, normalized system capability (`CYTO_ADVANCED_SPECIALIST`)
— never a raw, jurisdiction-specific credential string directly. A
provider's real, held credential is always the real, raw, local
certification (the UK's `IBMS_ASD`, the Netherlands' `NL_KCA_ADVANCED`,
Germany's `DE_ZYTO_ASSISTENT_ADV`); `resolveNormalizedCredentialCapabilities.ts`
is the one, real place that maps a raw credential to its normalized
capability, exposed to the evaluation engine as
`QcEvaluationCaseContext.providerCapabilities`. This also resolved
Germany's own earlier, honest placeholder (an empty accepted-credential
list, pending a real German credential name) — that real name is now
known and mapped to the same capability as the UK and Dutch ones.

**Real, important naming caveat, per direct guidance's own explicit
caution**: `CYTO_ADVANCED_SPECIALIST` is authoritative only within
PathScribe's own normalized authorization model — it is not itself a
real credential recognized by any individual country's own certifying
body. The correct, precise term is a "normalized system capability
key," never an "authoritative credential identifier" — the latter
could wrongly suggest a real, cross-border regulatory standard that
doesn't actually exist.

**Also noted, out of scope for this fix**: the same research named
Denmark and Sweden as real countries where independent CT sign-out is
established practice. Neither exists in this app's own `Jurisdiction`
type (`types/systemConfig.ts`) at all yet — a real, separate gap in
this app's own jurisdiction coverage, not something this rule-seeding
pass can fix on its own.

## Real, deliberate safety net — new engine first, old mechanism as fallback

Per direct guidance, given the real risk that any *other*,
not-yet-identified jurisdiction/role combination could have the same
kind of silent coverage gap the EU one turned out to have, the plan was
for the sign-out call site to check this engine's active rules first and
fall back to the old Enterprise/Facility/Staff cascade only when nothing
matched.

**What the code does today:** the rule engine is not called at sign-out.
`resolveQcRuleEvaluation` (and `resolveQcEvaluationContextFromCytologyReview`)
are used only by their tests; sign-out lives in
`services/cytology/signOutCytologyCase.ts` and `saveCytologyReview.ts`,
which select random QC and post-sign-out peer review with the old cascade
(`resolveEffectiveCytologyQcSettings` + `resolveCytologyRandomQcSelection`).
The only QC assignments created at sign-out are ROSE discrepancies
(`resolveNewQcCaseAssignmentFromRoseDiscrepancy`). Rules edited in
Cytology QC Rules therefore don't yet change which cases are selected.

*Corrected in the Batch 496 README audit (Oct 9, 2026): this section said the engine was checked first at sign-out; it isn't called there.*

*Since Batch 501 the engine IS called at sign-out — not as the "new engine first, old cascade as fallback" plan above, but alongside it (Pete's layered model, Oct 9). See the Batch 501 section below.*

## Real, completed sign-out gate wiring (Sep 2026)

`resolveCytologySignOutGate.ts`'s own real 3-part advanced-CT
exception (jurisdiction policy + normalized capability check) is now
fully wired into the real sign-out screen
(`CytologyScreeningPage.tsx`) — not just available as an unused
capability. The real `labJurisdiction` and `signingProviderCredentials`
inputs are resolved once at the component level (a real facility
lookup for jurisdiction, a real staff-record lookup for credentials)
and reused across all five real call sites that check this gate,
rather than repeating both real async lookups per call. Real, honest
default: `'US'` (a jurisdiction that grants no exception) until the
real facility lookup resolves — an unresolved jurisdiction can never
silently grant an exception it hasn't actually confirmed.

**Real, pre-existing architectural note surfaced along the way**: this
app has two, separate, pre-existing `StaffUser` type definitions
(`types/index.ts` and `services/users/IUserService.ts`) — a real
duplication this work did not attempt to unify (out of scope), but
`providerCredentials` was added consistently to both so real credential
data resolves correctly regardless of which one a given real call site
happens to use.

## Duplicate names are localized (Batch 317, PS-73)

`duplicate(id, name)` now takes the copy's name from the caller, in the user's language (`t('common.copyOfName', { name })`). It used to store the English `"Copy of …"` as data. The copy still starts inactive.

## Batch 395

`demoCytologyQcAssignments.ts`: three demo QC peer-review assignments (one per priority tier) on Desert Valley cytology cases, loaded when the store has never been written. Primary sign-out provider Dr. Sarah Johnson, so Pete Nimmo can review them.

## Batch 396: recording a QC verdict from the case screen

- Pete: "I would not want to force the pathologist to go to 2 screens." The screening page now has a QC review bar (`components/CytologyQc/CytologyQcCaseBar.tsx`) with the queue's buttons, and each queue row has **Open Case**.
- `resolveCytologyQcCaseReview.ts`: which open review a reader can act on for a case, and whether they can take it (not their own sign-out), record the verdict (their review), or see it is taken. `cytologyQcErrorKey` maps service errors to messages.
- `assignReviewer`, `recordConcurrence` and `recordDiscrepancy` check **`cytology:qc-review:record`** (high risk), seeded to Pathologist and Fellow, the roles that had the queue. A refusal returns `QC_REVIEW_NOT_PERMITTED` (`qcReviewErrors.ts`). The queue used to ignore a failed action; it now shows why.
- `supervisorBypass` and `escalateForSlaBreach` are unchanged and have no screen yet. *(Since closed: Batch 432 below added Escalate and Supervisor bypass to the queue — checked in the Batch 496 README audit.)*

## Batch 428: Configuration permissions

- `mockCytologyQcRuleService`: `add`, `update`, `deactivate`, `reactivate`, `remove`, `duplicate` need `config:cytology-qc-rules:manage`.

Before, anyone who could open Configuration could change this; now each change is checked in the service (`authorization/guardConfigWrites.ts`, audited) and a refusal changes nothing. Reads are unchanged. Seeds: Admin and Lab Director; see `docs/architecture/AUTHORIZATION_API.md`.

## Batch 432

From the queue: Escalate (an SLA-breached review back to the queue; `cytology:qc-review:record`, reason required) and Supervisor bypass (`cytology:qc-review:bypass`, justification required, shown only to holders). The audit entries name the person who did it.

## Batch 434

`resolveCytologyQcCaseReview(assignments, userId, canRecord)`: without `cytology:qc-review:record`, Assign to Me and the verdict buttons aren't offered. The QC queue's rows now use it too, so the queue also hides Assign to Me from the person who signed the case out, as the case's review bar already did. The service still refuses either way.

---
*When this folder's contents change meaningfully, update THIS file.*

## Batch 501 — the QC Rules engine runs at sign-out (Pete's layered model, Oct 9)

Three mechanisms, in order of precedence, with **one open QC assignment per specimen**:
1. **ROSE discrepancy** (fixed, always on): top tier (`high_escalation`), 4-hour SLA.
2. **QC Rules engine** (Configuration → Cytology QC Rules): active rules in priority order; the first that matches and is selected by its sampling creates the assignment with the rule's tier, SLA and reviewer pool (`eligibleReviewerRoles`).
3. **Peer-review selection** (QC Settings rates, high-risk): stays a **passive flag** on the specimen. It never creates an assignment; when ROSE or a rule also selects the specimen, the flag is recorded as a selection reason.

**Upgrade, never duplicate** (`resolveQcAssignmentUpsert.ts`, pure). A trigger that finds an open assignment (QC_PENDING / QC_IN_REVIEW) for the same specimen upgrades it: higher tier, earlier SLA deadline, the pool of whichever trigger now sets the tier (at equal tiers the existing pool stays unless it had none), ROSE over a rule as the trigger source; the reason is added and a history line written. A weaker trigger only adds its reason. A resolved assignment is left alone, so a new trigger opens a new one. `applyAdditionalTrigger` on the assignment service persists it (trigger fields only; refuses a resolved assignment; audited).

**New fields on `CytologyQcCaseAssignment`:** `eligibleReviewerRoles`, `selectionReasons` (e.g. `["rose_discrepancy", "rule:r-104", "peer_review_flag:random_selection"]`), `history`. Older assignments have none; `qcSelectionReasons()` falls back to the trigger.

**Other new files:**
- `resolveCaseInFormalConsultation.ts` — spec §2.2's exclusion: an active `pending_consultation` case hold, or an active `consultant` / `second_opinion` participant. Only the Rules engine applies it; ROSE and peer-review selection still apply to such a case.
- `mockCytologyQcSamplingStateService.ts` — each rule's sampling counters, kept between sign-outs (browser storage in the mock, cleared by Full Reset; the API server must own them in production, `docs/architecture/CYTOLOGY_QC_API.md`).
- `qcSelectionReasonLabels.ts` — the queue's "Selected by" labels.
- `resolveQcEvaluationContextFromCytologyReview.ts` now knows an FNA (a specimen with a ROSE evaluation).

**Reviewer pool (Batch 608):** now enforced; see the Batch 608 section below. `resolveNewQcCaseAssignmentFromRuleMatch` / `…FromRoseDiscrepancy` are no longer used by sign-out (the upsert builds the record); they remain with their tests.

## Batch 608

- `resolveQcReviewerEligibility.ts`: `resolveQcReviewerPool` (a rule's `eligibleReviewerRoles` against the reviewer's pools; an empty pool admits anyone but the signer) and `effectiveQcReviewerRoles` (a staff member's `qcReviewerRoles`, or PATHOLOGIST for a Pathologist who has none set).
- `mockCytologyQcCaseAssignmentService.ts`: `assignReviewer`, `recordConcurrence` and `recordDiscrepancy` return `QC_REVIEWER_NOT_IN_POOL` (`qcReviewErrors.ts`) for someone outside the pool.
- `resolveCytologyQcCaseReview.ts`: takes the reader's pools and returns `notInPool`; `cytologyQcErrorKey` maps the refusal to `notInPool`.
- `resolveCytologyQcComplianceReport.ts` now has a screen: the Compliance view of the QC queue (`components/CytologyQc/CytologyQcCompliancePanel.tsx`).

## Batch 616 (part C): server versions (PS-498 to PS-504)

Each service here (the cytology QC services) now has an API-server version, `http<Name>Service.ts`, chosen by `<name>ServiceInstance.ts` (mock without an API server address, server version with one). One route per interface method; the calls are listed in `docs/architecture/CYTOLOGY_API.md`. The mocks are unchanged.

## Batch 669f — optional secondary code, confirmation on a large divergence (cyt-6)

`resolveQcCodeDivergence.ts`: `resolveQcCodeDivergence` and `nextDiscrepancySubmitStep`. The Secondary Diagnostic Code of a discrepancy is optional. "Diverge significantly" is defined on the cytology category scale (`diagnosticRank`, the scale `classifyCytologyAgreement` uses): ranks two or more steps apart, or on opposite sides of the low-grade / high-grade line (`HIGH_GRADE_RANK_THRESHOLD`). Typed codes are matched to a category by abbreviation or label; an unmatched PRIMARY code is not compared, but an unmatched SECONDARY code is unrecognised (`isUnrecognisedSecondaryCode`; step `'unrecognised'` blocks Submit, `recordDiscrepancy` returns `QC_SECONDARY_CODE_UNRECOGNISED`, so it is never stored; nothing is blocked when the category list could not be read). `recordDiscrepancy` takes `divergenceConfirmed` and otherwise returns `QC_DIVERGENCE_NOT_CONFIRMED`. Tests: `resolveQcCodeDivergence.test.ts`, `mockCytologyQcCaseAssignmentService.test.ts`.
