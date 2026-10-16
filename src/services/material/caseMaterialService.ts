// src/services/material/caseMaterialService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (Pete, Oct 4 2026: "API integrity"): a decant change is one
// atomic call that returns the complete updated material tree and the
// billing lines it affected, so the screen never has to guess the result.
//
//   applyDecantChange(caseId, change, expectedVersion)
//     → { ok: true, specimens, version, billing: { changed, removedMaterialIds } }
//     → { ok: false, error: 'conflict', currentVersion }   (stale version: the 409)
//     → { ok: false, error: <refusal> }                    (nothing written)
//
// Deleting a decant needs case:decant:delete, checked here. Adding and
// changing decants follow the screen's existing case access. The server
// contract is in docs/architecture/CASE_API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { applyDecantChange as reduce, type DecantChange, type DecantChangeRefusal } from './materialTree';
import { affectedBillingLines, billingLinesOf, billingSummaryForMaterial, type BillingLine } from './billableMaterial';
import type { DecantEvent, MaterialChangeKind } from './materialEvents';
import type { StainType } from '../stains/IStainService';


export type DecantSaveResult =
  | { ok: true; specimens: any[]; version: number; change: MaterialChangeKind; event: DecantEvent; billing: { changed: BillingLine[]; removedMaterialIds: string[] } }
  | { ok: false; error: 'conflict'; currentVersion: number }
  | { ok: false; error: DecantChangeRefusal | 'notPermitted' | 'caseNotFound' | 'saveFailed'; detail?: string };

export interface CaseMaterialServiceDeps {
  getCase: (caseId: string) => Promise<{ id: string; version?: number; specimens?: any[]; matrixBlocks?: any[] } | null | undefined>;
  /** Saves with the version check; throws an error with `actualVersion` on a conflict. */
  updateCase: (caseId: string, patch: Record<string, unknown>, expectedVersion: number) => Promise<unknown>;
  getStainTypes: () => Promise<StainType[]>;
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  now: () => Date;
}

export async function applyDecantChangeAtomic(caseId: string, change: DecantChange, expectedVersion: number, deps: CaseMaterialServiceDeps): Promise<DecantSaveResult> {
  if (change.kind === 'delete') {
    const decision = await deps.enforce('case:decant:delete', { caseId, decantId: change.decantId });
    if (!decision.allowed) return { ok: false, error: 'notPermitted' };
  }
  const current = await deps.getCase(caseId);
  if (!current) return { ok: false, error: 'caseNotFound' };
  const currentVersion = current.version ?? 0;
  if (currentVersion !== expectedVersion) return { ok: false, error: 'conflict', currentVersion };
  const before = current.specimens ?? [];
  const result = reduce(before, change, deps.now().toISOString());
  if (result.ok === false) return { ok: false, error: result.refusal };
  try {
    await deps.updateCase(caseId, { specimens: result.specimens }, expectedVersion);
  } catch (e: any) {
    if (typeof e?.actualVersion === 'number') return { ok: false, error: 'conflict', currentVersion: e.actualVersion };
    return { ok: false, error: 'saveFailed', detail: e?.message ?? String(e) };
  }
  const stainTypes = await deps.getStainTypes().catch(() => [] as StainType[]);
  const billing = affectedBillingLines(
    billingLinesOf(billingSummaryForMaterial(before, stainTypes, current.matrixBlocks ?? [])),
    billingLinesOf(billingSummaryForMaterial(result.specimens, stainTypes, current.matrixBlocks ?? [])),
  );
  return { ok: true, specimens: result.specimens, version: expectedVersion + 1, change: result.change, event: result.event, billing };
}

/** The atomic call against the app's own services. */
export async function applyDecantChangeLive(caseId: string, change: DecantChange, expectedVersion: number): Promise<DecantSaveResult> {
  const { caseRouter } = await import('../cases/CaseRouter');
  const { authorizationService } = await import('../authorization/defaultAuthorizationService');
  const { stainTypeService } = await import('../index');
  return applyDecantChangeAtomic(caseId, change, expectedVersion, {
    getCase: async id => (await caseRouter.getCase(id)) as any,
    updateCase: (id, patch, v) => caseRouter.updateCase(id, patch as any, v) as Promise<unknown>,
    getStainTypes: async () => { const r = await stainTypeService.getAll(); return r.ok ? r.data : []; },
    enforce: (cap, ctx) => authorizationService.enforce(cap as any, ctx as any),
    now: () => new Date(),
  });
}
