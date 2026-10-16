# api/webhooks/engine/_lib

Shared code for the engine webhooks (`../README.md`). These are Vercel functions using the Firebase Admin SDK, to be replaced by the PathScribe API server (`docs/architecture/INTERFACE_ENGINE_EDGE.md`).

- **`idempotency.ts`:** the `processed_messages` claim.
  - `claimMessageId` claims a messageId on its own.
  - `createWithClaim` (Batch 549) writes one new record and the claim in one transaction.
- **`applyEngineCaseUpdate.ts`:** changes a case and claims the messageId in the same transaction (Batch 545, F10).
- **`upsertEngraverStatus.ts`:** an engraver's latest status, ignoring stale reports. Since Batch 549 it claims the messageId in the same transaction.
- **`raiseSpecimenDeficiency.ts`:** raises a CAPA deficiency.
- **`logIntegrationError.ts`:** logs a refused or failed message.
- **`verifyEngineAuth.ts`:** checks the shared webhook secret (F11: per-tenant credentials come with the API server).
- **`firebaseAdmin.ts`:** the Admin SDK.

**Finding F10 (fixed in Batches 545 and 549):** no webhook claims a message before it writes, so neither a crash nor a not-found can lose an event.

**Tests:**
- Unit tests: `createWithClaim.test.ts`, `upsertEngraverStatus.test.ts`, `raiseSpecimenDeficiency.test.ts` and `logIntegrationError.test.ts`.
- Integration tests: `*.integration.test.ts`. These need the Firestore emulator and are skipped without it.
