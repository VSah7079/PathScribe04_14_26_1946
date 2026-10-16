// src/api/caseFlagsApi.ts
// Flag operations — delegates to mockCaseService which now persists to localStorage.
// Replace with real API calls when the backend is ready.

import { CaseWithFlags, FlagInstance } from '../types/flagsRuntime';
import { mockCaseService } from '../services/cases/mockCaseService';
import { updateCaseWithRetryOrThrow } from '../services/cases/caseWrite';
// Batch 452 (PS-57): the typed view replaces the old `any` mapper here.
import { toCaseWithFlags as toView } from '../services/flags/caseFlagView';

const toCaseWithFlags = (c: Parameters<typeof toView>[0] | null | undefined): CaseWithFlags => {
  if (!c) throw new Error('Case not found after the flag change');
  return toView(c);
};

// Real, confirmed resolution to the architectural conflict this file
// used to document here (Jira PS-57): Case.caseFlags/Specimen.
// specimenFlags now correctly declare FlagInstance[] — this file's
// own shape all along — rather than the old CaseFlag[]/SpecimenFlag[]
// (an inline flag-definition copy no real application workflow ever
// produced). SearchPage.tsx's own two consumers of these same fields
// fixed alongside this change, resolving flagDefinitionId against the
// real flag catalog instead of expecting display fields inline. The
// `as any` casts this file used to need are gone — they were masking
// exactly this mismatch, not doing anything else.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApplyFlagPayload {
  caseId: string;
  flagDefinitionId: string;
  specimenId?: string;
  // Batch 491 (disclosed Batch-452 gap): who's applying it, from the
  // caller's own signed-in session. Optional, with a documented fallback
  // below, so existing callers and tests that don't have a session in
  // scope keep working unchanged.
  byUserName?: string;
}

export interface DeleteFlagPayload {
  caseId: string;
  flagInstanceId: string;
  specimenId?: string;
  // Batch 491: same convention as ApplyFlagPayload.byUserName above.
  byUserName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Batch 491: `appliedBy`/`deletedBy` store a display name, the same
// "name, not a separate id" convention as every other append-only clinical
// log in this app (e.g. MarginInkApplication.appliedByName,
// AutopsyOrganTag.recordedByName). 'current-user' is the fallback for a
// caller with no signed-in session to pass through (e.g. a direct test
// call), not a real user name.
function makeInstance(flagDefinitionId: string, byUserName?: string): FlagInstance {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    flagDefinitionId,
    appliedAt: new Date().toISOString(),
    appliedBy: byUserName ?? 'current-user',
    source: 'product',
    deletedAt: null,
    deletedBy: null,
  };
}

// ─── applyFlags ───────────────────────────────────────────────────────────────

// PS-71 (Batch 458): both operations change one flag (add it if absent, or
// mark one instance deleted), so each is applied to the newest copy of the
// case and saved with its version (updateCaseWithRetryOrThrow). On a
// conflict the same one-flag change is re-applied to the newer case, so a
// flag someone else added or removed in between is kept, never overwritten
// by this screen's older list. A save that still conflicts after the
// retries throws ConcurrencyConflictError to the screen.

export async function applyFlags(payload: ApplyFlagPayload): Promise<CaseWithFlags> {
  const c = await mockCaseService.getCase(payload.caseId);
  if (!c) throw new Error(`Case ${payload.caseId} not found`);

  const inst = makeInstance(payload.flagDefinitionId, payload.byUserName);
  const isActive = (f: FlagInstance) => f.flagDefinitionId === payload.flagDefinitionId && !f.deletedAt;

  await updateCaseWithRetryOrThrow(payload.caseId, current => {
    if (payload.specimenId) {
      let changed = false;
      const specimens = (current.specimens ?? []).map((sp) => {
        if (sp.id !== payload.specimenId) return sp;
        const flags: FlagInstance[] = Array.isArray(sp.specimenFlags) ? sp.specimenFlags : [];
        if (flags.some(isActive)) return sp;
        changed = true;
        return { ...sp, specimenFlags: [...flags, inst] };
      });
      return changed ? { specimens } : null;
    }
    const flags: FlagInstance[] = Array.isArray(current.caseFlags) ? current.caseFlags : [];
    return flags.some(isActive) ? null : { caseFlags: [...flags, inst] };
  }, mockCaseService);

  const updated = await mockCaseService.getCase(payload.caseId);
  return toCaseWithFlags(updated);
}

// ─── deleteFlags ──────────────────────────────────────────────────────────────

export async function deleteFlags(payload: DeleteFlagPayload): Promise<CaseWithFlags> {
  const c = await mockCaseService.getCase(payload.caseId);
  if (!c) throw new Error(`Case ${payload.caseId} not found`);

  const now = new Date().toISOString();
  const deletedBy = payload.byUserName ?? 'current-user';
  const markDeleted = (flags: FlagInstance[]) => flags.map(f =>
    f.id === payload.flagInstanceId
      ? { ...f, deletedAt: now, deletedBy }
      : f
  );

  await updateCaseWithRetryOrThrow(payload.caseId, current => {
    if (payload.specimenId) {
      const specimens = (current.specimens ?? []).map((sp) => {
        if (sp.id !== payload.specimenId) return sp;
        const flags: FlagInstance[] = Array.isArray(sp.specimenFlags) ? sp.specimenFlags : [];
        return { ...sp, specimenFlags: markDeleted(flags) };
      });
      return { specimens };
    }
    const flags: FlagInstance[] = Array.isArray(current.caseFlags) ? current.caseFlags : [];
    return { caseFlags: markDeleted(flags) };
  }, mockCaseService);

  const updated = await mockCaseService.getCase(payload.caseId);
  return toCaseWithFlags(updated);
}
