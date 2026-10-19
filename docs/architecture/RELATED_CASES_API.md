# Related cases at sign-out and the patient summary (Batch 613, part B)

**Decisions** (Pete, Oct 18, 2026): a pathologist signing out a case is told, inline, that the patient has other released cases. Nothing is pre-ticked. Each candidate shows the ordering physician and the copy-to physicians. The pathologist decides what goes in. The chosen reports are shown inside the sign-out view, are fixed when the case is signed out, and are part of what the pathologist signs. Print, PDF and the outbound result carry exactly what was seen. A later amendment of a related case raises a flag; it does not change the attached section. The intraoperative diagnosis is part of the case report, like an addendum.

**Source of truth for the browser:** `src/services/relatedCases/` (types in `relatedCaseTypes.ts`, rules in `relatedCaseRules.ts`). This document gives the server contract; where they differ, the TypeScript wins and this is corrected.

## 1. What exists today (demo)

- Candidates: released cases (finalized, closed, signed out) of the same patient and linked identities, other than this case, **that the signed-in user may already open** (`caseRouter.getAll` with the access rules; no bypass). Oldest first. At most 10 per report.
- A choice is saved as text copies (`RelatedCaseSnapshot`) in browser storage under `relatedCaseAttachments`, per case.
- Saving needs `report:related-cases:attach` (pathologists and fellows) and is refused once the attachment is frozen.
- When the case reaches pending-release, finalized or closed the attachment is frozen (`frozenAt`, `frozenBy`).
- The report render payload (`buildReportRenderPayload` in `SynopticReportPage.tsx`) carries `intraoperativeDiagnosis` and `relatedCases`. `functions/main.py` draws the intraoperative diagnosis after the case header and the related cases after the body, in the PDF and the text. The outbound narrative text and the PDF come from the same payload, so they carry exactly the same.
- A frozen attachment whose source case now has a higher record version raises `RelatedCasesAmendedNotice` on the report. The attached copy is not changed.
- The **Patient summary** (Patient History): the user ticks released cases (Select all is offered), and prints a sheet labelled as a summary, not a signed report, with the accession of each source case. Needs `patient:summary:print`; audited.

## 2. Snapshot

```
RelatedCaseSnapshot {
  sourceCaseId, accession, releasedAt, sourceVersion,
  specimens[], diagnosis, intraoperativeDiagnosis?, signedBy?,
  orderingPhysician?, copyToPhysicians[], client?
}
```

`sourceVersion` is the source case's record version when the copy was taken. The text is the other case's own recorded text and is not translated.

## 3. With the API server

| Call | Rule |
|---|---|
| `GET /cases/{id}/related-candidates` | The server applies the viewer's case access (`CASE_PRIVACY_MODEL.md`) and returns only released cases of the patient and linked identities the viewer may open. It never returns a case the viewer cannot open, and a count of those goes through the patient case access notice (`PATIENT_CASE_ACCESS_API.md`). |
| `PUT /cases/{id}/related-cases` | Body: the chosen `sourceCaseId`s. The server builds the snapshots itself from the released record (the browser's text is not trusted). Needs `report:related-cases:attach` for the case's facility. Refused with 409 once the case is signed out. At most 10. |
| Sign-out | The attachment is frozen in the same transaction as the sign-out, and stored **with the signed report version** (`REPORT_VERSION_API.md`): the version's hash covers the attached section. |
| Render | The server renders from the stored attachment, never from a fresh read of the related cases, so a reprint years later is identical. |
| Amendment flag | When a case that is the source of any frozen attachment is amended, the server raises a notice on each report that carries it. The stored section is not changed. |
| Audit | `RELATED_CASES_ATTACHED`, `RELATED_CASES_CLEARED`, `RELATED_CASES_FROZEN`, `PATIENT_SUMMARY_PRINTED`. Counts only: no accession, name or diagnosis text in the detail. |

## 4. Not done here

- The server calls above (the demo keeps the choice in the browser).
- An amended related case being re-sent as a new version of the report is a decision for the pathologist; the flag only tells them.
