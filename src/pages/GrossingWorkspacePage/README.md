**Batch 735:** the accession field is the shared `StationScanField` (no on-screen keyboard, focus kept); the page is in the station touch layout.

# GrossingWorkspacePage

Batch 720. The **Grossing** tile under Pathology Workspace (`/workstations/grossing`, capability `screen:grossing:open`).

- `GrossingWorkspacePage.tsx`: accession box (type or scan) plus the list of cases waiting to be grossed; opens the case on the Grossing screen with `useOpenCase()`. Shows no patient names.
- `grossingQueue.ts` (+ test): `waitingToGross` (status `accessioned`, STAT first, then oldest) and `findByAccession` (ignores case and spaces).

The screen the queue opens is `../GrossingScreenPage/`.

Batch 756: the queue reads both stores (`caseRouter.getAll(..., { includeOrchestration: true })`), so a case made on Accession (an Orchestration case) is listed; before this it never was.
