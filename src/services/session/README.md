# services/session/

Org-wide idle-session-timeout resolution. Phase 1 of the Inactivity
Timeout & Draft Recovery feature (full spec in `PRIORITY_FIXES.md` #13).

**Pattern:** Standard interface/mock/firestore-stub pattern — matches
this codebase's established convention exactly.

**Correction, worth stating plainly:** the first version of this folder
was a single, non-conforming file (`sessionTimeoutConfig.ts`) with bare
exported functions instead of a real service object implementing an
interface — modeled on `components/Config/AI/orchestratorModeConfig.ts`'s
org-default/per-client-override *shape*, but that file lives in
`components/`, not `services/`, and was never held to this folder's
actual convention. Caught by Pete, restructured properly before it
became a second precedent for future folders to copy incorrectly.

## Files

- **`ISessionTimeoutService.ts`** — `getOrgDefault()`/`setOrgDefault(minutes)`
  (org-wide default) plus `resolveEffectiveMinutes(orderingClientId?)`
  (full resolution — resolves through `resolvePerformingLabClientId()` to
  whichever internal client actually performs the work on the
  currently-open case, same as every other lab-scoped setting in this
  codebase, e.g. `Client.internalAiOrchestratorEnabled`). All three
  methods return the standard async `ServiceResult<T>`. Also exports
  `extractCaseIdFromPath()` as a plain function alongside the interface
  (not part of it) — pure string parsing, no data access, so it doesn't
  belong to either the mock or firestore implementation specifically;
  both would need it identically. Lets the consuming hook
  (`hooks/useIdleTimeout.ts`) detect "is a specific case currently open"
  from the URL without needing case context threaded through
  `ProtectedRoute.tsx` (which wraps every authenticated route equally and
  has no built-in awareness of this).
- **`mockSessionTimeoutService.ts`** — localStorage-backed implementation
  (`pathscribe_idle_timeout_minutes` key for the org default).
  `resolveEffectiveMinutes` falls back to the org default whenever no
  client can be resolved (no case open, missing id, lookup failure, or no
  override set on the performing lab) — fails safe toward the *stricter*
  value, not an unbounded session.
- **`firestoreSessionTimeoutService.ts`** — Stub only, matching this
  codebase's established minimal convention exactly (a comment-only
  placeholder marking future backend cutover) — see
  `services/specimenDictionary/firestoreSpecimenDictionaryService.ts`
  for the identical pattern this was modeled on.

## Notes

- **Deliberately resolves per single currently-open case**, not a
  multi-institution "strictest among all active permissions" model —
  matches PathScribe's actual single-case-focused UI (one case fully
  open at a time), and avoids inventing a user-to-client permissions
  concept that doesn't exist anywhere in the current data model. This
  was a real design decision, not an oversight — see `PRIORITY_FIXES.md`
  #13 for the fuller reasoning (Model 1/2/3 tradeoffs considered).
- Real, working admin UI exists for both layers: org default at
  Configuration → System → Session Security
  (`components/Config/System/SessionSecuritySection.tsx`); per-client
  override on the Client Dictionary edit modal
  (`Client.idleTimeoutMinutesOverride`, `components/ClientDictionary/ClientEditorModal.tsx`).
- Consumed by `hooks/useIdleTimeout.ts`, which is the file that actually
  owns the idle-detection timer itself — this folder is purely the
  "how many minutes" resolution logic, not the timer.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
