// src/services/cases/ConcurrencyConflictError.ts
// ─────────────────────────────────────────────────────────────────────────────
// The 409 Conflict contract from the Case Hydration & Optimistic Concurrency
// Control spec, §5.1: "Mismatch (Conflict): Mutation is rejected with a 409
// Conflict." There's no real HTTP layer in this app yet (mock services over
// localStorage, or a not-yet-live Firestore backend) — this typed error is
// the same contract expressed as something both can throw identically, so
// callers write one catch path regardless of which service is actually
// backing ICaseService at runtime.
// ─────────────────────────────────────────────────────────────────────────────
export class ConcurrencyConflictError extends Error {
  readonly caseId: string;
  /** The version the caller thought it was writing against. */
  readonly expectedVersion: number;
  /** What's actually stored right now. */
  readonly actualVersion: number;

  constructor(caseId: string, expectedVersion: number, actualVersion: number) {
    super(`Concurrency conflict on case ${caseId}: expected version ${expectedVersion}, found ${actualVersion}`);
    this.name = 'ConcurrencyConflictError';
    this.caseId = caseId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}
