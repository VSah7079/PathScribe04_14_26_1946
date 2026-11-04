// src/services/flags/flagChangeAudit.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (everyday-17): the Flag Manager edits a draft, and nothing is real until Save. The audit
// entries used to be written as each chip was added or removed in the draft, so Cancel left entries
// for changes that never happened. Now the entries are built from the difference between the case as
// it was opened and the draft, at Save, and each is written only after its change has been stored.
// Cancel therefore leaves nothing, and a Save that stops partway audits exactly what was stored.
// ─────────────────────────────────────────────────────────────────────────────

/** The part of a flag instance these functions read. */
export interface FlagInstance { id: string; flagDefinitionId: string; deletedAt: string | null }

/** The part of a case these functions read: its id, flags, and each specimen's flags (the Flag Manager's draft carries more). */
export interface FlagDiffCase {
  id: string;
  flags: FlagInstance[];
  specimens: Array<{ id: string; label?: string; flags: FlagInstance[] }>;
}
type CaseWithFlags = FlagDiffCase;

export interface FlagChange {
  kind: 'apply' | 'remove';
  flagDefinitionId: string;
  /** Present for a removal: the stored instance to mark removed. */
  flagInstanceId: string;
  specimenId?: string;
}

export interface FlagAuditEntry {
  action: 'flag_applied' | 'flag_removed';
  caseId: string;
  flagName: string;
  specimenId?: string;
}

export interface FlagSaveDeps {
  applyFlag: (p: { caseId: string; flagDefinitionId: string; specimenId?: string }) => Promise<unknown>;
  removeFlag: (p: { caseId: string; flagInstanceId: string; specimenId?: string }) => Promise<unknown>;
  audit: (entry: FlagAuditEntry) => void;
}

export interface FlagSaveResult {
  /** How many changes were stored (and audited). */
  saved: number;
  /** The failure that stopped the save, when one did. */
  error?: Error;
}

const active = (flags: FlagInstance[] | undefined) => (flags ?? []).filter(f => !f.deletedAt);

function diffList(orig: FlagInstance[] | undefined, now: FlagInstance[] | undefined, specimenId?: string): FlagChange[] {
  const origIds = new Set(active(orig).map(f => f.id));
  const changes: FlagChange[] = [];
  for (const f of now ?? []) {
    const wasActive = origIds.has(f.id);
    const isActive = !f.deletedAt;
    if (!wasActive && isActive) changes.push({ kind: 'apply', flagDefinitionId: f.flagDefinitionId, flagInstanceId: f.id, specimenId });
    else if (wasActive && !isActive) changes.push({ kind: 'remove', flagDefinitionId: f.flagDefinitionId, flagInstanceId: f.id, specimenId });
  }
  return changes;
}

/** What Save has to store: case-level changes first, then each specimen in order. A flag added and removed inside the draft is no change. */
export function diffFlagChanges(initial: CaseWithFlags, draft: CaseWithFlags): FlagChange[] {
  const changes = diffList(initial.flags, draft.flags);
  for (const sp of draft.specimens) {
    const origSp = initial.specimens.find(s => s.id === sp.id);
    changes.push(...diffList(origSp?.flags, sp.flags, sp.id));
  }
  return changes;
}

/** True when the draft differs from the case as it was opened (the Cancel/discard warning). */
export function hasFlagChanges(initial: CaseWithFlags, draft: CaseWithFlags): boolean {
  return diffFlagChanges(initial, draft).length > 0;
}

export function flagAuditEntry(
  change: FlagChange, caseId: string, definitions: ReadonlyArray<{ id: string; name?: string }>,
): FlagAuditEntry {
  const def = definitions.find(d => d.id === change.flagDefinitionId);
  return {
    action: change.kind === 'apply' ? 'flag_applied' : 'flag_removed',
    caseId,
    flagName: def?.name ?? change.flagDefinitionId,
    ...(change.specimenId ? { specimenId: change.specimenId } : {}),
  };
}

/** Stores the draft's changes one by one, writing each audit entry after its change was stored; stops at the first failure. */
export async function saveFlagChanges(
  input: { caseId: string; initial: CaseWithFlags; draft: CaseWithFlags; definitions: ReadonlyArray<{ id: string; name?: string }> },
  deps: FlagSaveDeps,
): Promise<FlagSaveResult> {
  let saved = 0;
  for (const change of diffFlagChanges(input.initial, input.draft)) {
    try {
      if (change.kind === 'apply') await deps.applyFlag({ caseId: input.caseId, flagDefinitionId: change.flagDefinitionId, specimenId: change.specimenId });
      else await deps.removeFlag({ caseId: input.caseId, flagInstanceId: change.flagInstanceId, specimenId: change.specimenId });
    } catch (e) {
      return { saved, error: e instanceof Error ? e : new Error(String(e)) };
    }
    deps.audit(flagAuditEntry(change, input.caseId, input.definitions));
    saved++;
  }
  return { saved };
}
