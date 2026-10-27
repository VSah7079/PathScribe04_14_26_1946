# Findings while writing the Report deep-dive articles (Batch 666, Oct 24, 2026)

| # | Where | Finding |
|---|---|---|
| 1 | `src/report/index.md` | It called Sign Out & Next Assist-only and said Sign Out Case needs every report finalized. Today there is an Orchestration Sign Out & Next button, and Sign Out Case is not gated that way. The Collaborating Cases tile was also missing. (Corrected in Batch 666 where noted in the article.) |
| 2 | `docs/product/HOTKEY_DECISIONS.md` (about line 33) | It says Sign Out and Next has no Orchestration button. That is stale. |
| 3 | `HOTKEY_DECISIONS.md` and the report article | They do not mention Add Collaborator (Ctrl+Alt+Shift+0) or the Collaborating Cases tile (Ctrl+Alt+F). Both are built. |
| 4 | Registry vs screen | Some registered report voice commands have no listener (`unwiredActions.ts`). The articles list only commands confirmed to be wired. |
| 5 | Next Block (Alt+.), Previous Block (Alt+,), Mark Block Grossed (Alt+G), Confirm Triage (Alt+Shift+T) | Finding 8 in `FINDINGS.md` said these had no handler. They are handled in `SynopticReportPage.tsx`; the article documents them as working. |
| 6 | Synoptic protocol list | It reads as if CAP and RCPath wording is loaded, but the shipped templates are generic placeholders. |
| 7 | Hotkey clashes | On the Report screen Alt+H is History (not Home) and Alt+I is Internal Note (not Messages). Users may expect the global meanings. |
| 8 | Edit Field (Alt+E) | It only focuses synoptic answers. Enter Gross and Enter Diagnosis work on the Report Draft only. |
| 9 | Microscopic panel | The Insert button's quoted sentence "Microscopic examination performed." is English in every language. The button label itself is translated. |
| 10 | Release hold | The server job that releases held reports when the app is closed is not built. |
| 11 | Not covered | The Billing review and Markers panels on the Report screen have no article yet. |
