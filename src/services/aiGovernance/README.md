# aiGovernance (Batch 680)

Audit entries for the pathologist's decisions on AI output (`aiNarrativeReviewAudit`, `aiCodeBindAudits`, `recordAiCodeBinds`). Detail text names the section or code and the person, never clinical text. The sign-out stop for unaccepted AI narrative is gate 12 in `services/signoutGates/signOutReviewGates.ts`.

Batch 681: `unreviewedAiValueCount`. Batch 691 (replaces the 681 sign-out audit): `omitUnverifiedAi.ts` clears unconfirmed optional AI values before the sign-out dialog, so they never enter the signed report; audit `AI_VALUES_OMITTED_AT_SIGNOUT`. Styling: `pages/SynopticReportPage/aiGovernance.css`.

Batch 692: the same omission for grossing reports at Gross Complete (`recordAiOmittedAtGross`) and in the sign-out count. Autopsy and cytology have no AI suggestions to clear.

Batch 696: `AI_CODE_BOUND` now also records how the code was produced and checked (model and service, model confidence, which check confirmed the code, the part of the case and specimen it was taken from, and whether the pathologist changed it). The confidence number is in the audit log only. See `services/coding/suggestionOrigin.ts` and `aiCodeProvenanceText`.

Batch 706 (Pete, Oct 28 2026, Provenance Over Confidence): guard test noConfidencePercent.test.tsx fails if an English UI string pairs 'confidence' with a percent or number placeholder, or if a main surface renders a confidence figure. Admin threshold settings are the only allowed exceptions.
