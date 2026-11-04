// src/services/flags/applyLisSyncFlags.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-57): where flags reported by the report page's LIS sync
// ("Check now" in HeaderBar) land on the case. Moved out of HeaderBar.tsx
// unchanged. Each reported flag is resolved to a catalog definition (by LIS
// code, auto-created when unknown — resolveLisFlagDefinition.ts) and applied
// as a FlagInstance (source 'lis'): on the specific specimen's own
// specimenFlags when the LIS names a specimen, otherwise on caseFlags. A
// definition already applied (and not removed) at that place is not applied
// again.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { FlagInstance } from '@/types/flagsRuntime';
import type { LisSyncPendingFlag } from '../lisSync/ILisSyncService';

export interface ApplyLisSyncFlagsDeps {
  /** The catalog definition id for a reported flag (resolveLisFlagDefinitionId). */
  resolveDefinitionId: (pf: LisSyncPendingFlag) => Promise<string>;
  /** ISO time the flags are applied at. */
  now: string;
  newId: () => string;
}

export async function applyLisSyncFlags(caseData: Case, newFlags: LisSyncPendingFlag[], deps: ApplyLisSyncFlagsDeps): Promise<Case> {
  let updatedCaseFlags = (caseData.caseFlags ?? []).slice();
  const specimenFlagAdds = new Map<string, FlagInstance[]>();

  for (const pf of newFlags) {
    const flagDefinitionId = await deps.resolveDefinitionId(pf);
    const inst: FlagInstance = {
      id: deps.newId(),
      flagDefinitionId,
      appliedAt: deps.now,
      appliedBy: 'LIS Sync',
      source: 'lis',
      deletedAt: null,
      deletedBy: null,
    };
    if (pf.specimenId) {
      const existingOnSpecimen = (caseData.specimens ?? []).find(sp => sp.id === pf.specimenId)?.specimenFlags ?? [];
      const alreadyApplied = existingOnSpecimen.some(f => f.flagDefinitionId === flagDefinitionId && !f.deletedAt);
      if (!alreadyApplied) {
        if (!specimenFlagAdds.has(pf.specimenId)) specimenFlagAdds.set(pf.specimenId, []);
        specimenFlagAdds.get(pf.specimenId)!.push(inst);
      }
    } else {
      const alreadyApplied = updatedCaseFlags.some(f => f.flagDefinitionId === flagDefinitionId && !f.deletedAt);
      if (!alreadyApplied) updatedCaseFlags = [...updatedCaseFlags, inst];
    }
  }

  return {
    ...caseData,
    caseFlags: updatedCaseFlags,
    specimens: (caseData.specimens ?? []).map(sp => {
      const adds = specimenFlagAdds.get(sp.id);
      return adds ? { ...sp, specimenFlags: [...(sp.specimenFlags ?? []), ...adds] } : sp;
    }),
  };
}
