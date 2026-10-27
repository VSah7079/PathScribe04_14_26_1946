# pages/WorklistPage/hooks/

## Batch 652 — Specimen pipeline gaps

- **`usePoolAssignmentTimeout.ts`**: starts and stops the Assignment Timeout sweep with the Worklist. The decision is in `services/cases/poolAssignmentTimeout.ts`; the hook only schedules it and updates the cases it routed.
