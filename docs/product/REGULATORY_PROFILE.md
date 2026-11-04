# Regulatory profile (Batch 679)

**Why:** PathScribe's working standard is the Intended Use Statement (documentation, workflow, traceability; AI output shown with its source, not a probability). Medical-device positioning is deferred. This setting keeps the clinical-support capabilities in the code without exposing them.

## The setting
`VITE_REGULATORY_PROFILE`: `documentation` (default) or `clinical_support`. Unknown values mean `documentation`. Switching later is a configuration change, not a rebuild of the features; but it is not a regulatory decision: counsel must clear it first.

## What each profile does
| Behaviour | documentation | clinical_support |
|---|---|---|
| Mismatch check | Plain flag with reason, low risk, logged to QA, never holds sign-out | Thresholds per rule; Block holds sign-out |
| Confidence % on synoptic fields, review modal, header, protocol/template suggestions, code suggestions, narrative note, history extraction, mismatch alert, QA worklist, AI Contribution tile, patient-history match | Hidden; shows "AI suggestion" / "Check source" / "Source found in report text" and the source quote | Hidden too (Batch 706, Pete Oct 28 2026: no confidence percentage on any clinical screen in either profile; the numbers stay in code, data, audit and thresholds) |
| Quality dashboards (acceptance rates, turnaround) | Numbers shown (not AI confidence) | Shown |
| Admin Confidence Threshold settings | Numeric input (a setting, not a display) | Numeric input |

## Closed in Batch 680
Unaccepted AI narrative sections now stop sign-out (gate 12 in `signOutReviewGates.ts`); accept, edit-and-accept and reject of AI narrative drafts, and the binding of AI-suggested codes, are audited (`services/aiGovernance/aiReviewAudit.ts`).

## Still open
1. (Mostly closed: a polled fill is always stored as unverified, so it carries the tint and the sign-out count; Batch 682.) Auto-fill paths (assist polling; "Regenerate from Gross") write AI values into the report without an accept step. Required fields are caught by the unverified-field sign-out gate; others are not. Decided (Pete, Oct 25): no hard block on optional fields; Batch 681 adds a faint tint on unreviewed AI values, a sign-out line with the count, and an audit entry.
2. (Closed in Batch 680.)
3. (Closed in Batch 680.)
4. (Closed in Batch 683: the flag shows the model's two quotes, each checked against the case text. Batch 685 stores the quotes in the QA record.)
5. Features in buckets D/E (infer diagnosis, image analysis via vendor screening) need regulatory review before use.
6. (Closed in Batch 682: the unused `showConfidenceScores` setting was removed; the profile is the control.)

## Narrative generation (Pete's question)
The narrative is organised from what the pathologist entered. In this standard it must be visibly a draft until the pathologist accepts it, show where each section came from, and never become part of the record by itself; the pathologist reads, edits and signs out. Items 2 and 3 above are what remain to meet that fully.


## Code match labels (Batch 690)
In the documentation profile an AI-suggested code shows "Strong match" (85 and above) or "Possible match" instead of a percentage. The label is text-match strength between the case wording and the code description, not a probability. Intended Use Statement wording to confirm with Pete before external use. In clinical_support the percentage is unchanged.

## Code suggestion provenance (Batch 696)
Under the Intended Use Statement (AI Output Governance) an AI-suggested code is shown with the code dictionary's own description (not the AI's wording), where in the case it was taken from (the report narrative, gross, microscopic, ancillary studies or synoptic answers, and the specimen when the text names one; shown as "Checked origin: …", checked by the product for plausibility and not verified by a person, else "Origin not stated"), and a check mark for the dictionary check. It stays advisory until the pathologist applies it. The audit entry `AI_CODE_BOUND` records the model and service, the model confidence (in the log only), which check confirmed the code, the origin, and whether the pathologist changed it. No source-quote highlighting is used for codes (Pete, Oct 26, 2026). The "Strong match / Possible match" label (Batch 690) remains; whether to keep it is Pete's decision.

## Auto-fill audit (Batch 689)
Auto-filled AI values (Auto-insert on opening a report, Regenerate from Gross) are recorded as `AI_VALUES_AUTOFILLED`; the values stay unverified, tinted and counted at sign-out.

## Server contract: unconfirmed AI values at sign-out (Batch 691)
The browser clears unconfirmed optional AI values before the sign-out dialog opens. The server must not rely on that. At sign-out, for every synoptic and grossing report instance being signed or finalized (the Gross Complete finalize too), the server shall:
1. find each field where the stored `aiSuggestions[field].verification` is `unverified`, the field is not required by the template, and the stored answer equals the suggestion's value (an edited value is the user's);
2. remove those answers from everything signed or sent: the answers snapshot, the rendered report, HL7/LIS payloads and the report version;
3. write one `AI_VALUES_OMITTED_AT_SIGNOUT` audit entry (count only, no values) in the same transaction as the status change;
4. leave the `aiSuggestions` records unchanged (provenance).
Required fields with an unverified AI value stay a hard stop (unchanged). Narrative sections are outside this rule (narrative has the accept gate from Batch 680). Autopsy and cytology have no AI suggestions today; add them when they do.
