# components/RequestReview/

## Files

- **`RequestReviewModal.tsx`** — "Request Informal Review" — sends an
  internal message to a colleague with the case attached (explicitly NOT
  the same as Delegate — no ownership transfer, own comment is clear on
  this). Uses the shared `ps-modal-dark`/`ps-overlay` CSS pattern. Reviewer
  list now sourced live from the real user directory — see Notes for the
  bug this replaced.

## Notes — real bug, FIXED (July 2026)

Used to have a hardcoded 6-entry `REVIEWERS` array whose own comment
claimed it "mirrors AppShell INTERNAL_USERS." It didn't, and Pete's own
analysis of both lists was more precise than the original diagnosis:
`AppShell.tsx`'s real directory is a broad, non-clinical general-staff
messaging list (Lab Manager, IT Support, Billing Dept, Archives — actual
departments, not reviewers), while this modal legitimately needs a
narrow, clinically-appropriate subset — a genuinely different scope, not
a mirror. The 4 `uk-*` names weren't a deliberate separate pool either;
the whole array was just a standalone list that was never connected to
any real data source, which is exactly how it drifted into real ID
collisions with `AppShell.tsx`'s directory:

| ID | `AppShell.tsx` | `RequestReviewModal.tsx` (old, hardcoded) |
|---|---|---|
| `u3` | System Admin | Dr. James Chen |
| `u4` | Dr. Sarah Li Chen | Dr. Maria Santos |

**Fix:** now fetches from the user service (`userService` from `@/services`;
written here originally as `services/users/mockUserService.ts`, corrected in
the Batch 496 README audit) — the same
real, canonical `StaffUser` directory `StaffTab.tsx` and `CaseTeamModal.tsx`
already use — filtered to `status === 'Active' && roles.includes('Pathologist')`,
excluding the sender. This is a real, role-based, collision-free subset:
none of its IDs (`1`, `6`, `7`, `9`, `PATH-001`, `PATH-UK-001`, etc.)
overlap with `AppShell.tsx`'s `u`-prefixed range at all, so the whole
class of collision is gone by construction, not just patched around.
Display name/subtitle built from real `firstName`/`lastName`/`department`
instead of the old fictional "Consultant Histopathologist"-style titles.
Added loading and empty states since the list is now fetched
asynchronously instead of available synchronously from a constant.

Confirmed via grep: zero remaining references to the old `REVIEWERS`
constant anywhere in the file.


## Batch 363 (PS-72): patient data tagged for screenshot redaction

`RequestReviewModal.tsx`: the confirmation text, which names the case, is tagged.

---
*See [components/README.md](../README.md) for how this folder fits the whole components/ layer.*

## Batch 506 (PS-477)

Files here that imported a mock service directly now import it from `@/services` (see `services/deploymentReadiness/README.md`). No change in behaviour.

## Batch 513 (PS-269): the UI translation sweep is complete

Every visible string here now goes through `t()`, in all five languages, and `src/i18n/uiText.guard.test.ts` keeps it that way. The colleague list's fallback "Pathologist" is translated. The review-type labels written into the message to the colleague stay English (they are stored message text); the on-screen buttons were already translated. Selection colours moved to `pathscribe.css` modifier classes.

## Batch 524 (PS-491): accessibility

Clickable elements here work from the keyboard (`pressable` / `switchable`, `utils/a11y/pressable.ts`), on/off tracks are named switches, and every form field has a name a screen reader reads. Guarded by `services/accessibility/a11y.guard.test.ts`; checked in the browser by `e2e/a11y.spec.ts` (`npm run test:a11y`).

## Batch 549 (PS-539 phase 2d: items carried over from earlier batches)

- Loading text here now goes through `LoadingState` (`components/Common`): nothing for 300 ms, then the screen's own loading text, and "Still working…" from 3 s. Carried over from Batch 548; `services/connectivity/latency.guard.test.ts` now covers every loading text in the app.
