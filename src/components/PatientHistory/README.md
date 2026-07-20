# components/PatientHistory/

**Renamed this pass** (was `components/CasePanel/` — a name that gave no
signal this folder contains the patient history modal specifically;
there's no other "case panel" concept it was distinguishing itself from).

## Files

- **`PatientHistoryModal.tsx`** — Prior pathology history + AI-matched
  similar cases. Sole consumer: `pages/SynopticReportPage/SynopticReportPage.tsx`.
  Uses its own `position: 'fixed'` overlay styling — worth checking next
  time this file is touched whether it's the same duplicated pattern
  logged in `Common/README.md`'s modal-consolidation note (not confirmed
  either way). No other issues.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
