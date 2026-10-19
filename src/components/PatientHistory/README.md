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
  either way — not re-checked during the fix below either). *(Since
  settled: the file has no `style` props or `position: 'fixed'` inline
  styling left; the app-wide no-inline-CSS guard covers it — checked in
  the Batch 496 README audit.)*

  **FIXED (July 2026) — confirmed bug in `handleSendMessage`.**
  `senderId`/`senderName` were hardcoded to a specific demo user's ID
  (mislabeled in the code as "Dr. Sarah Johnson" — the ID used was
  actually Pete Nimmo's; the mismatch traces to a separate data
  inconsistency in `services/messages/mockMessageService.ts`'s seed
  data, still on the pending review list as of this writing, not yet
  documented in that folder's own README), and `recipientId` was
  hardcoded to that exact same ID — meaning every message sent from
  this modal was actually addressed back to the sender, never to the
  physician actually shown on screen. The original code's own comment
  ("in real app: look up physician ID") acknowledged this was a stub.
  Now uses the real signed-in user (`useAuth()`) for the sender, and a
  best-effort name-based lookup against `mockUserService` for the
  recipient — imperfect (name matching, not a stable ID) since case
  history only stores the physician's display name, with no real
  physician ID anywhere in this data model yet. A genuine, correct fix
  would add a real physician ID to the underlying case-history data
  itself; flagged here rather than attempted, since that's a data-model
  change beyond this file's scope.

- **Real, per direct guidance ("Molecular testing across siblings")**:
  the "Related Patients" section (`family_relation` links, distinct
  real people — e.g. newborn/mother, or siblings sharing a real
  molecular finding) is now navigable, not just plain text. Clicking a
  related patient re-targets this same modal instance in place — a
  real, internal `viewingRelatedPatient` state overrides the props-
  driven identity (`patientName`/`mrn`/`dateOfBirth`/`patientId`) —
  with a real "← Back to [original patient]" breadcrumb to return,
  and `currentCaseId` deliberately dropped for the related patient's
  own view (we're no longer viewing from one of their own cases). The
  `view` state (list vs. an open report) resets on both navigations,
  so a stale report from the previous patient never lingers into the
  new one. Real, deliberate design: re-targets the existing modal
  instance rather than requiring changes to its one real caller
  (`SynopticReportPage.tsx`) — confirmed directly there's only the one
  real caller before choosing this approach.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`PatientHistoryModal.tsx`: the breadcrumb's case number and the compose panel's case number are tagged.

## Batch 436 (PS-40)

`PatientHistoryModal.tsx`'s comment cited `backend-requirements-concurrency-security.md`, which was never written; it now points at `docs/architecture/CASE_PRIVACY_MODEL.md` (the API server's job, PS-345).

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.

## Batch 613: access to a patient's other cases

- `RestrictedCasesNotice.tsx` (props `{ patientId, caseId }`): inline notice showing how many of the patient's other cases the user cannot open, the request form (reason list, note for "Other"), the user's pending or declined status, and, for people who may decide, Approve / Decline / Revoke with inline reasons. Shown in the Prior Pathology panel and in the case workup.
- `usePatientCaseAccess.ts`: loads the state through `services/patientCaseAccess` and runs the actions.
- `PatientHistoryModal.tsx` lists only the cases the user may open (plus those a grant opens, with a banner) and writes one audit entry when a grant was used.
