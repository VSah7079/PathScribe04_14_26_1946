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
  either way — not re-checked during the fix below either).

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

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*
