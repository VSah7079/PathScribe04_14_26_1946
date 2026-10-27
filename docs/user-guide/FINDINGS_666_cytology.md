# Findings while writing the Cytology articles (Batch 666, Oct 24, 2026)

| # | Where | Finding |
|---|---|---|
| 1 | `src/worklist/index.md` (Surgical QA view) | It lists the Cytology QC and Surgical Post-Sign-Out QA tiles in one row and gives one step, "Review a peer-review queue", without saying what the Surgical QA view holds: post-sign-out peer review cases (Peer Review - Random or Targeted), Biopsy-to-Resection Correlation Candidates, and "Deferred clinical mismatches (secondary review)" with a Review button (Resolved or Unresolved). Row buttons: Open Case, Record Review (Concordant or Discordant; Discordant requires direction of change, severity, root cause and a comment), Not Relevant (correlation candidates only). The Cytology article now describes both queue views and can be linked. |
| 2 | Worklist views | The Cytology QC view also opens for someone holding only the supervisor-bypass permission, without the screen permission. |
| 3 | CISOE-A form | The "required" and "unsatisfactory but abnormal" messages shown after a failed save are English text built in the service; they stay English in every language. |
| 4 | `resolveGermanCytologyTriageRecommendation.ts`, `resolveCytologyTbsEquivalent.ts` | Both exist with tests but no screen uses them: the München III triage suggestion and the Bethesda cross-mapping are not shown anywhere. |
| 5 | Surgical QA queue, Record Review | The button is not greyed out without the surgical QA permission; the refusal appears only after submission. Cytology QC buttons are hidden without permission. |
| 6 | Cytology QC, Record Discrepancy window | Primary and Secondary Diagnostic Code are both required to enable Submit Discrepancy, though "Secondary" reads as optional. Both are free text. — Fixed in Batch 669. Refined in Batch 669f: an unrecognised secondary code is flagged and blocks Submit. |
| 7 | Page naming | The page title says "Cytology Worklist"; the breadcrumb and the Pathology Workspace tile say "Cytology Workspace". |
| 8 | Cytology QC labels | The small label pills show the text a QC rule stored, not a translated label (not verified against the demonstration rules). |
| 9 | Hotkeys | Ctrl+Alt+Shift+A is both Save Cytology Review and Add Comment (Microtomy). Different screens, but the shared key is not in the hotkey decisions document. |
| 10 | Recall Needed tile | Rows show priority, window, codes and wording but no action; register feeds are not built. |
| 11 | Follow-up Due tile | Lists cases only. Recording the outcome and e-mailing the clinician is done in Quality Assurance, Operations, Follow-up. |
| 12 | Return to Trainee (cytology) | The trainee sees a banner on opening the case; no e-mail or other notification is sent (KNOWN_GAPS, Batch 608). |
