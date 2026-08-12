// Stub only — real implementation pending backend cutover.
// mockDraftCacheService.ts is the active implementation; this satisfies the
// service interface's contract so the swap to a real backend is a
// one-line change in services/index.ts when that backend exists.
//
// Real Phase 3 work when this gets built for real: client-side encryption
// of the payload, using a key derived at login (see IDraftCacheService.ts's
// own header for why that's not implemented in the mock version either —
// needs a real backend/production auth posture to be meaningful).

// src/services/drafts/firestoreDraftCacheService.ts
