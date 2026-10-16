# src/firebase/

`config.ts` (Firebase app + Firestore initialization) and `index.ts`
(re-exports `db`, plus a `functions` stub).

## Legacy — production is SQL Server, not Firestore

Firestore is not PathScribe's backend. The production database is
Microsoft SQL Server, reached through a PathScribe API server (ASP.NET
Core) that is not built yet (PS-358); today the app runs on
`localStorage`-backed mock services. This folder and the `firestore*`
service files predate that decision and will be replaced — don't
extend them, and don't add Firebase imports to new code.

## A real finding — placeholder credentials, and some screens do load this

`config.ts` has literal placeholder credentials (`"YOUR_API_KEY"`,
`"your-app-id"`, etc.) and calls `initializeApp()` at module load
time — meaning any file that imports from this folder triggers
Firebase initialization with fake credentials immediately.

Files that import `db` (or `functions`) from this folder:
- Reached from live screens: `services/engravers/fetchEngraverDevices.ts`
  (Engraver Monitor), `services/engravers/fetchDispatchHistoryForCase.ts`
  (`DispatchHistoryTimeline.tsx` and `MaterialTrackingHistoryModal.tsx`
  on the report page), and `services/deficiencies/fetchGlobalDeficiencies.ts`
  (`QualityAssurancePage.tsx`). Opening those screens loads this folder
  and initializes Firebase with the placeholder config; their reads
  can't succeed against it.
- Not imported by any live code (only by tests, or not at all):
  `firestoreUserService.ts`, `firestoreVoiceMacroService.ts`,
  `firestoreDelegationTypeService.ts`, `firestoreBiometricService.ts`,
  `services/caseRegistry/caseMaskService.ts`,
  `services/deficiencies/fetchSpecimenDeficienciesForCase.ts`.
  (`hooks/usePendingEngineNotifications.ts` was removed in Batch 549.)

These read paths move to the SQL Server API when it exists; until then
the placeholders stay. Full detail in `PRIORITY_FIXES.md` item #37
(retired Aug 19, 2026; its open items became Jira PS-57 to PS-71 — see
`docs/ARCHIVE.md`).

*Corrected in the Batch 496 README audit (Oct 9, 2026): marked Firestore as legacy (production is SQL Server), replaced the retired `caseRegistryService.ts` with the real importers, and corrected "never executes today" — three live screens' data sources load this folder.*

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- `hooks/usePendingEngineNotifications.ts` removed (see `DELETED_FILES.txt`); the list of unused Firestore readers above is updated.
