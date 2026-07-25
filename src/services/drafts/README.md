# services/drafts/

Local caching of in-progress, unsaved user work — Phase 2 of the
Inactivity Timeout & Draft Recovery feature (full spec in
`PRIORITY_FIXES.md` #13). Generic and reusable, keyed by an arbitrary
entity id (a caseId, in the current real usage), not tied to any one
page's data shape.

**Pattern:** Standard interface/mock/firestore-stub pattern — matches
this codebase's established convention exactly. Worth noting honestly:
the first draft of this folder was a single, non-conforming file with
bare exported functions instead of a service object implementing an
interface, caught and corrected (by Pete) before anything depended on
it.

## Files

- **`IDraftCacheService.ts`** — `DraftRecord<T>` (the stored shape:
  `entityId`/`payload`/`savedAt`/`userId`) plus the `IDraftCacheService`
  interface (`saveDraft`/`getDraft`/`clearDraft`/`clearAllDraftsForUser`,
  all async, standard `ServiceResult<T>`-wrapped). Methods are generically
  typed (`saveDraft<T>(...)`) rather than the interface itself being
  generic, keeping it simple to import/reference.
- **`mockDraftCacheService.ts`** — localStorage-backed implementation
  (`pathscribe_drafts` key — added to `DemoResetTab.tsx`'s `CASE_KEYS`,
  see `PRIORITY_FIXES.md` #17). Drafts older than `RETENTION_DAYS` (7,
  matching the original spec's default) are silently dropped on next
  read. **Security note, stated in this file's own header:** callers are
  responsible for excluding sensitive fields from whatever payload they
  pass in — this service has no way to know what's sensitive in an
  arbitrary caller's data shape. Real payload encryption is NOT
  implemented here — genuinely Phase 3, needs a real backend/production
  auth posture (a real client-side key derived at login) to be
  meaningful; a fake/weak obfuscation now would be worse than being
  honest this is plaintext today, same reasoning applied elsewhere this
  session (not claiming Phase 1's warning modal auto-saved anything
  before it actually did).
- **`firestoreDraftCacheService.ts`** — Stub only, matching this
  codebase's established minimal convention exactly (a comment-only
  placeholder marking future backend cutover, no attempted
  implementation) — see `services/specimenDictionary/firestoreSpecimenDictionaryService.ts`
  for the identical pattern this was modeled on.

## Notes

- **Real, live consumer:** `hooks/useDraftCache.ts` wraps this service
  with debounced auto-save (1000ms, matching the spec's
  `Drafts:DebounceIntervalMs` default) and exposes the cached payload
  directly (`existingDraftPayload`) rather than requiring a second fetch
  after the user decides to restore — wired into
  `pages/SynopticReportPage/SynopticReportPage.tsx`.
- **What actually gets cached is the sanitized full case, not just
  synoptic answers.** An earlier version of the consuming hook's wiring
  only cached `synopticReports.answers` — a full audit of that page's
  own `markDirty()` call sites found 18 distinct dirty-able things
  (Priority, Flags, Case comments, Specimens, Codes, Report sequence,
  etc.), meaning the narrower version would have silently missed most
  real editable content. The cached payload explicitly **excludes the
  `patient` object** (name/DOB/MRN) — both HIPAA minimum-necessary
  reasoning (unencrypted demographics at rest is unnecessary risk given
  encryption is Phase 3, not built) and a real data-integrity concern
  (patient demographics are read-only LIS/EHR master data; restoring a
  stale cached copy over freshly-fetched current data would be a
  correctness bug, not just a privacy one).
- **Restore is local-only — no auto-persist to the server.** The
  consuming page marks itself dirty via its own existing mechanism on
  restore, so the user's normal Save Draft review is the real
  verification step before anything commits anywhere. Raised directly by
  Pete as a firm requirement, not a default assumption.

---
*See [services/README.md](../README.md) for how this folder fits the whole services/ layer.*
*When this folder's contents change meaningfully, update THIS file. Only touch the master services/README.md if this folder's overall PURPOSE changes.*
