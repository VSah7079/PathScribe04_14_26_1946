// src/services/material/materialBillingWrites.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460: the billing panel's saves for a bench screen (Microtomy's full
// review), against the case as saved:
// • a block's codes: a versioned case save, rebuilt from the newer case on a
//   conflict (updateCaseWithRetry), the change applied to the codes as saved;
// • a decant's codes: the atomic decant save (Batch 452/453), like every
//   other decant change;
// • the specimens' codes (base codes, matrix codes): a versioned case save.
// Each returns the case as saved; a save that didn't land throws, so the
// billing hook never records a charge for a code that wasn't saved.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import { updateCaseWithRetry, type CaseWriteDeps } from '../cases/caseWrite';
import type { DecantChange } from './materialTree';
import { applyDecantChangeLive, type DecantSaveResult } from './caseMaterialService';
import { materialEventBus } from './materialEvents';
import { caseRouter } from '../cases/CaseRouter';


export interface MaterialBillingWriteDeps extends CaseWriteDeps {
  applyDecantChange: (caseId: string, change: DecantChange, expectedVersion: number) => Promise<DecantSaveResult>;
  /** Announces a saved decant change (MATERIAL_DECANTED), as every decant save does. */
  onDecantSaved?: (caseId: string, result: Extract<DecantSaveResult, { ok: true }>) => void;
}

export class MaterialBillingNotSaved extends Error {
  constructor(readonly reason: string) { super(`Billing change not saved: ${reason}`); }
}

const specimenWith = (specimens: any[], specimenId: string, change: (sp: any) => any) => specimens.map(sp => (sp.id === specimenId ? change(sp) : sp));

export async function saveUnitCodingOnCase(
  input: { caseId: string; specimenId: string; unitId: string; change: (coding: any) => any },
  deps: MaterialBillingWriteDeps,
): Promise<Case> {
  const { caseId, specimenId, unitId, change } = input;
  const current = await deps.getCase(caseId);
  if (!current) throw new MaterialBillingNotSaved('notFound');
  const specimen = (current.specimens ?? []).find((sp: any) => sp.id === specimenId) as any;
  const decant = (specimen?.decants ?? []).find((d: any) => d.id === unitId);
  if (decant) {
    const r = await deps.applyDecantChange(caseId, { kind: 'update', decantId: unitId, patch: { coding: change(decant.coding) } } as DecantChange, current.version ?? 0);
    if (r.ok === false) throw new MaterialBillingNotSaved(r.error);
    deps.onDecantSaved?.(caseId, r);
    return { ...current, specimens: r.specimens as any, version: r.version } as Case;
  }
  return saveSpecimensOnCase({ caseId, change: specimens => specimenWith(specimens, specimenId, sp => ({
    ...sp, blocks: (sp.blocks ?? []).map((b: any) => (b.id === unitId ? { ...b, coding: change(b.coding) } : b)),
  })) }, deps);
}

export async function saveSpecimensOnCase(input: { caseId: string; change: (specimens: any[]) => any[] }, deps: CaseWriteDeps): Promise<Case> {
  let base: Case | null = null;
  const r = await updateCaseWithRetry(input.caseId, current => { base = current; return { specimens: input.change((current.specimens ?? []) as any[]) as any }; }, deps);
  if (r.ok === false || !base) throw new MaterialBillingNotSaved(r.ok === false ? r.reason : 'notFound');
  return { ...(base as Case), ...r.updates, version: r.version } as Case;
}

export const materialBillingWriteDeps: MaterialBillingWriteDeps = {
  getCase: id => caseRouter.getCase(id),
  updateCase: (id, updates, expectedVersion) => caseRouter.updateCase(id, updates, expectedVersion) as Promise<void>,
  applyDecantChange: (caseId, change, version) => applyDecantChangeLive(caseId, change, version),
  onDecantSaved: (caseId, r) => materialEventBus.publish({ type: 'MATERIAL_DECANTED', caseId, change: r.change, decant: r.event } as any),
};
