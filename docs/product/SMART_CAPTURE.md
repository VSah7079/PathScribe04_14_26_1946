# Smart Capture (charge suggestions): prototype

**Status: Built (Demo), Prototype, not compliance-reviewed.** Batch 611, queue entry #189. In the browser demo the suggestions come from a small fixed rule set and the export goes to the labelled Simulated interface engine. Nothing reaches a payer. This is not coding advice and no claim is ever submitted on its own.

## Decision (dev team)

AI charge capture stays in Release 1 as a **human-reviewed capability**: distinct *suggested*, *reviewed*, *approved* and *exported* states; the evidence and rule version in the audit trail; no autonomous claim submission; production use gated on validation, security, privacy and legal review; and the prototype labelled "not compliance-reviewed".

## What a user sees

1. In the case's **Billing** panel, a **Smart Capture** button with the label *Prototype, not compliance-reviewed*. It is shown only when an administrator has left the prototype switched on.
2. Opening it makes the suggestions (no patient data is read) and lists each line: CPT code, units, specimen, the **rule** that produced it and the **evidence** (the matched word, the block count, the stain count).
3. A person **accepts or rejects** each line. Nothing else moves.
4. A **pathologist** ticks *I have reviewed the accepted lines and confirm them* and presses **Approve accepted lines**. Anyone else is refused.
5. The **structured payload preview** shows exactly what would leave: the approved lines, the rule-set version, who approved and when, and the flags `prototype: true`, `complianceReviewed: false` and `simulated`.
6. **Export approved lines** hands only accepted, approved lines to the charge path. In the demo that is the simulated engine, labelled *SIMULATED*. To a real interface engine it is refused (*PRODUCTION_GATED*) until the production gate is open.
7. **Start again** discards an approved or exported review and suggests afresh; the earlier steps stay in the audit trail.
8. If the case or the rule set changes after a review, the review is shown **stale** and cannot be approved or exported until the suggestions are made again.

## Acceptance criteria

| # | Criterion | Where it is tested |
|---|---|---|
| 1 | The same case always gives the same suggestions (deterministic; no AI model is called). | `smartCaptureRules.test.ts` |
| 2 | Each suggestion names its rule, rule-set version and evidence. | `smartCaptureRules.test.ts` |
| 3 | A line moves forward only by a person's action; suggested, reviewed, approved, exported are distinct. | `smartCaptureStates.test.ts`, `smartCaptureService.test.ts` |
| 4 | Approval needs every line decided, at least one accepted, the confirmation ticked and a pathologist. | `smartCaptureStates.test.ts` |
| 5 | Nothing is sent before approval; a rejected line never leaves. | `smartCaptureService.test.ts` |
| 6 | A change to the case or rule set makes the review stale and blocks approval and export. | `smartCaptureService.test.ts` |
| 7 | Export to a real engine is refused until all six checklist items are ticked and production is activated; unticking closes it. | `smartCaptureSettings.test.ts`, `smartCaptureService.test.ts` |
| 8 | Every step is audited without patient data (counts, CPT codes, rule ids, rule-set version only). | `smartCaptureService.test.ts` |
| 9 | Every step checks its capability for the case's performing lab. | `smartCaptureService.test.ts`, `capabilities.guard.test.ts` |
| 10 | The drawer, the payload and the administration screen carry the Prototype label. | `SmartCaptureLauncher.test.tsx`, `SmartCaptureSection.test.tsx` |

## Rules in this prototype (`sim-rules-1.0`)

| Rule | CPT | Reads |
|---|---|---|
| SC-LEVEL | 88302 to 88309 | Words in the specimen description (organ resection words give a higher level; biopsy words a lower one; otherwise level III) and the block count |
| SC-SPECIAL | 88312 | Count of special stains ordered (a fixed name list: PAS, GMS, AFB and so on) |
| SC-IHC-FIRST / SC-IHC-ADDL | 88342 / 88341 | Count of other stains, treated as immunohistochemistry |
| SC-DECAL | 88311 | Count of blocks needing decalcification |

The rule set is a stand-in so the review flow can be shown and tested. It is not a coding policy. When CPT is switched off for the case's jurisdiction (Configuration → Code systems) nothing is suggested.

## Administration

**Configuration → System → Smart Capture** (`config:smart-capture:manage`, Admin and Lab Director):

- **Offer the Smart Capture drawer** switch (on in the demo).
- **Production checklist**, six items: clinical validation, security review, privacy review, legal review, claims and coding policy review, real receiving system tested. Ticking records who and when. It does not make the prototype compliant; it records that the reviews were done elsewhere.
- **Allow export to a real interface engine**, available only when all six are ticked. Unticking any item closes it again. Every change is audited.

## Permissions

| Capability | Who by default |
|---|---|
| `billing:smart-capture:review` | Pathologist |
| `billing:smart-capture:approve` | Pathologist |
| `billing:smart-capture:send` | Pathologist |
| `config:smart-capture:manage` | Admin, Lab Director |

Approving and sending also require the signed-in role to be a pathologist, so granting the capability to another role does not let that role confirm.

## Waiting on the server and the organisation (not built here)

- Review by counsel and a claims specialist; the institution's payer and coding policies.
- The institution's LIS or revenue-cycle receiver for the payload.
- A validated suggestion model, if one is ever used, with its own validation and change control. Until then the rule set above is the only source.
