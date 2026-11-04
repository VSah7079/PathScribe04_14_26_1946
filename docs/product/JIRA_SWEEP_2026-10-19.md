# Jira sweep, 19 October 2026

Pete asked (after the Spain work) for every existing PS ticket to be checked so that each "Not in this ticket" item is built, scheduled in a batch, owned by another ticket, or knowingly dropped. Read-only: **no ticket was created, edited, commented on or moved.** Working tables are in `/tmp` only; this file is the record.

## What was covered
- 810 PS tickets. **50** have a literal "Not in this ticket" section in the description (PS-113 to PS-341); all 50 were read, with their comments, and each item was checked against the code and docs.
- **90** more use other wording ("out of scope", "not included", "not yet built", "deferred", "still open") in a description or comment; these were read in key ranges (PS-1 to PS-830).
- Verdicts: BUILT (cited), SCHEDULED, OWNED (another ticket whose summary was read), GAP (nothing covers it). "Weak" means it rests on one comment or a light code check.
- Limits: the search finds words, so a ticket that lists open items without those words is not covered. A few items could not be confirmed either way (listed last).

## Result in one line
Most items are built or owned. **About 40 items have no owner**, listed below. They are mostly small, disclosed follow-ups, but several are real product gaps.

## Gaps with no owner (strongest first)

**Product gaps**
- PS-118: the live Discordance sign-out modal still uses its own form, not the shared QA review form.
- PS-163: "Reactive Changes optional per lab SOP" has no lab setting; the sign-out gate always lets a cytotechnologist sign out.
- PS-174: no inbound HL7/FHIR result from a molecular platform; "Record Positive/Negative" is manual. (Interface side belongs with PS-812.)
- PS-171: cytology patients are not in the patient index, so outbound dispatch skips them silently (skip found in `dispatchCytologyAmendedCaseInstance.ts`; cause not tested).
- PS-187: the CLIA workload cap applies in every jurisdiction, not only the US.
- PS-189: reassignment cannot name a colleague; it returns the case to the pool.
- PS-193: no way to clear the f36 CSMS eligibility flag, and no source for the "S" suspension data.
- PS-203: QA reports MOL-QA-01/02/04, APAC-QA-01, CYT-QA-03/04, US-QA-02 are unbuilt; UK-QA-01 and EU-QA-01 are missing columns.
- PS-359: cytology countersign has no UI or service path (`CountersignRecord` stays pending).
- PS-539: block-delete tiers for signed-out and amended reports are not built (only the in-process tier is).
- PS-130: no admin control to set a rule's own `syntheticCoding`; the licensed SNOMED/ICD-O-3 mapping table is blocked on a licence and no open ticket holds it.
- PS-136: automatic critical-alert dispatch to AU/NZ networks (HealthLink, Medical Objects, ReferralNet) has no owner.
- PS-324: M&M conference scheduling and minutes.
- PS-276: no Web Worker offload for PDF rendering.
- PS-486 is open and owns its own gap (production build still bundles mock services).

**Australia / Korea / Germany screening (PS-178, 179, 180, 182)**
- MBS order-modifier fields, Cancer Council Australia interpretive comments, NCSR history lookup, KNCSP invitation and participation tracking, eDoku/KBV export (only oKFE exists as one of 12 programme definitions). National-identifier capture is out of scope on privacy grounds and is your decision.

**Smaller, weak, or housekeeping**
- PS-143: messaging gateway cannot be set below tenant level. PS-151: PS-147 pattern detection does not cover cytotechnologist screeners. PS-149: recall letters unconfirmed.
- PS-341: no regional titles for grossing assistant / PA. PS-329: AI-confidence badge uses template "required" fields, not licensed CAP tier data. PS-164: high-risk matching uses `patient.id`, not MPI-linked identity. PS-159: no colour-blind check recorded for the Cytology tile colour.
- PS-68 (PDF integrity hash is a design note only), PS-69 (project-wide strict `ServiceResult` narrowing), PS-73 (legacy large components), PS-277, PS-282 (screen-only print points not audited), PS-316 (billing not on either screen), PS-349 (patient names in typed text not scrubbed from support tickets), PS-359 (`caseFlagsApi` falls back to `'current-user'`; margin rules cover distance only).
- PS-198: 29 files in `src` and `docs` point to `NETFLIX_SETUP.md`, `ACCESS_CONTROL_PLAN.md`, `PRIORITY_FIXES.md`, which do not exist.
- PS-177's text calls itself PS-177 where it means PS-178 (cosmetic).
- PS-800: the OBR/OBX identifier and coding-system check against the NPCR guide and each state's specification, and the UK correction-window start (rejection or receipt), are questions for Pete with no ticket.
- PS-811: native review of the Spanish text is not named on PS-480 (Korean) or PS-348 (language reviews).
- PS-622: Korean review of the connection-banner text may not be on PS-653.

## Decisions for Pete with no ticket
- PS-283: restrict print for VIP/confidential cases? DRAFT/PRELIMINARY watermark?
- PS-359: what to do with the dead `StainOrderStatus` values.
- PS-120 open points are all on PS-526 (To Do), including whether to remove the specialised Operations tabs.
- PS-147 department-level trend policies; PS-143 first AU/NZ/KR messaging networks.
- PS-562/566: should Admin have `:view` by default?

## Could not confirm either way
PS-156 (trigger that pulls a new HSIL+ patient's earlier negative Paps over 5 years), PS-158 (admin screen for non-GYN routing), PS-161 (several cytology specimens in one case), PS-155 (session-based staff wiring), PS-119 (whether the deficiency endpoints exist: the description says no, the completion queue says yes), PS-154 (aggregate agreement dashboards).

## Housekeeping found
Description checkboxes are still unticked on PS-146, 148, 324, 328 and 341 although the work is built.

## Next
Nothing is created from this. When you say which of these to take on, they become tickets and batches; the sweep list is the source.
