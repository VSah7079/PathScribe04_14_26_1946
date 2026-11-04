# components/ClinicalHistory

## Batch 530 (Pete, Oct 11, 2026)

`CaseClinicalHistoryBar.tsx`: one line on the report page, the Cytology Workspace and the grossing screen, until sign-out. With no clinical information it reads "Mismatch check deferred: no clinical information provided"; otherwise it counts the coded entries. **Add / Edit clinical history** opens the same coded picker Accession uses (`pages/AccessionPage/ClinicalHistory/ClinicalHistoryEntryPanel.tsx`) for the case-level entries, and saves through `clinicalHistoryAfterAccessionService` (`case:clinical-history:record`).
