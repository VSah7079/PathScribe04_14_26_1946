// src/services/cytology/cytologyCaseWriteDeps.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-71 (Batch 458): the cytology services' loosely typed case ports, adapted
// to the version-aware CaseWriteDeps that updateCaseWithRetry
// (services/cases/caseWrite.ts) takes. Every cytology case save goes through
// it: read, build the change from that read, save with its version.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { caseVersionOf, updateCaseWithRetryOrThrow, type CaseWriteDeps } from '../cases/caseWrite';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

/** A case save that carries the version the change was built from. */
export type VersionedCaseUpdate = (caseId: string, patch: Record<string, unknown>, expectedVersion: number) => Promise<unknown>;

export function caseWriteDepsFrom(
  getCase: (caseId: string) => Promise<Case | null | undefined>,
  updateCase: VersionedCaseUpdate,
): CaseWriteDeps {
  return {
    getCase,
    updateCase: async (caseId, updates, expectedVersion) => { await updateCase(caseId, updates as Record<string, unknown>, expectedVersion); },
  };
}

/**
 * A save from the Cytology Workspace, built from the case the screen loaded:
 * the change is applied to that copy and saved with its version. If someone
 * saved the case since (ConcurrencyConflictError), the case is read again and
 * the same change is re-applied to the newer case (updateCaseWithRetry), so
 * their change survives; a conflict that outlasts the retries throws.
 * Returns the updates saved, or null when there was nothing to save.
 */
export async function saveCaseChangeFrom(
  loaded: Case,
  change: (current: Case) => Partial<Case> | null,
  ports: { getCase: (caseId: string) => Promise<Case | null | undefined>; updateCase: VersionedCaseUpdate },
): Promise<Partial<Case> | null> {
  const first = change(loaded);
  if (!first) return null;
  try {
    await ports.updateCase(loaded.id, first as Record<string, unknown>, caseVersionOf(loaded));
    return first;
  } catch (e) {
    if (!(e instanceof ConcurrencyConflictError)) throw e;
  }
  const r = await updateCaseWithRetryOrThrow(loaded.id, change, caseWriteDepsFrom(ports.getCase, ports.updateCase));
  return r.ok ? r.updates : null;
}
