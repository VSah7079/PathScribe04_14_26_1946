# GrossingWorkspacePage

Batch 720. The **Grossing** tile under Pathology Workspace (`/workstations/grossing`, capability `screen:grossing:open`).

- `GrossingWorkspacePage.tsx`: accession box (type or scan) plus the list of cases waiting to be grossed; opens the case on the Grossing screen with `useOpenCase()`. Shows no patient names.
- `grossingQueue.ts` (+ test): `waitingToGross` (status `accessioned`, STAT first, then oldest) and `findByAccession` (ignores case and spaces).

The screen the queue opens is `../GrossingScreenPage/`.
