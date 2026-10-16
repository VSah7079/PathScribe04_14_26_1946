# services/browserCleanup

Batch 431. Removes browser copies the app no longer uses, once at start-up (`main.tsx`), so they don't sit on shared workstations.

| File | What it does |
|---|---|
| `retiredBrowserKeys.ts` | `removeRetiredBrowserKeys()`: removes old AI draft copies (`ps_orch_sections_*`, which held report text), the reviewer page's old copies of template state (`ps_state_*`), and the per-computer "access requested" markers. |

Settings that moved to a per-person or lab-wide service are not listed here: their services carry the old value over the first time they're read.

---
*Update this file when a retired key is added or removed.*

## Batch 515

`pathscribe_mock_fppe_assignments` (the retired legacy FPPE store) is removed at start-up.

## Batch 525 (PS-485)

The old clinical keys (`cases`, `orch_cases_v3`, `pathscribe_drafts`, `patientHistoryCache`, `ps_case_masks_v1`, cytology QC assignments …) are **not** on the retired list: the demo still uses them. On a server deployment they are removed at start-up by `browserData/browserKeepList.ts` (`removeBrowserDataCopies`), which keeps only preferences, workstation settings and the session.
