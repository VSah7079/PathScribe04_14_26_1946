// src/services/material/materialTree.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452: the decant changes as one pure reducer over a case's material
// tree (its specimens, their blocks and decants). Used by the optimistic
// store (caseMaterialStore.ts) and by the atomic save (caseMaterialService.ts),
// so the screen and the saved case apply exactly the same change.
//
// A decant is taken from its specimen, or split from another decant
// (Decant.parentDecantId), which makes multi-level splitting possible:
// specimen A → D1 (residual fluid) → D2 (cell block made from D1).
// Deleting a decant that others were split from is refused: delete the
// children first, so no decant is left pointing at a missing parent.
// ─────────────────────────────────────────────────────────────────────────────

import type { Decant } from '@/types/case/Material';
import type { DecantEvent, MaterialChangeKind } from './materialEvents';


export type DecantChange =
  | { kind: 'add'; specimenId: string; decant: Decant }
  | { kind: 'update'; decantId: string; patch: Partial<Decant> }
  | { kind: 'delete'; decantId: string };

export type DecantChangeRefusal = 'specimenNotFound' | 'decantNotFound' | 'duplicateId' | 'parentNotFound' | 'hasChildren';

export type DecantChangeResult<S> =
  | { ok: true; specimens: S[]; change: MaterialChangeKind; event: DecantEvent }
  | { ok: false; refusal: DecantChangeRefusal };

interface SpecimenLike { id: string; decants?: Decant[] }

export function findDecant<S extends SpecimenLike>(specimens: readonly S[], decantId: string): { specimen: S; decant: Decant } | null {
  for (const specimen of specimens) {
    const decant = specimen.decants?.find(d => d.id === decantId);
    if (decant) return { specimen, decant };
  }
  return null;
}

export function decantEventOf(specimenId: string, decant: Decant, timestamp: string): DecantEvent {
  return {
    parentId: decant.parentDecantId ?? specimenId,
    childId: decant.id,
    materialType: decant.decantType,
    volumeOrWeight: decant.totalVolumeMl ?? decant.yieldPelletSize ?? null,
    timestamp,
  };
}

export function applyDecantChange<S extends SpecimenLike>(specimens: readonly S[], change: DecantChange, nowIso: string): DecantChangeResult<S> {
  if (change.kind === 'add') {
    const sp = specimens.find(s => s.id === change.specimenId);
    if (!sp) return { ok: false, refusal: 'specimenNotFound' };
    if (findDecant(specimens, change.decant.id)) return { ok: false, refusal: 'duplicateId' };
    if (change.decant.parentDecantId && !sp.decants?.some(d => d.id === change.decant.parentDecantId)) return { ok: false, refusal: 'parentNotFound' };
    const next = specimens.map(s => s.id === sp.id ? { ...s, decants: [...(s.decants ?? []), change.decant] } : s);
    return { ok: true, specimens: next, change: 'added', event: decantEventOf(sp.id, change.decant, nowIso) };
  }
  const found = findDecant(specimens, change.decantId);
  if (!found) return { ok: false, refusal: 'decantNotFound' };
  if (change.kind === 'update') {
    const { id: _id, parentDecantId: _p, ...safe } = change.patch as Partial<Decant> & { id?: string };
    const updated = { ...found.decant, ...safe };
    const next = specimens.map(s => s.id === found.specimen.id
      ? { ...s, decants: (s.decants ?? []).map(d => d.id === updated.id ? updated : d) }
      : s);
    return { ok: true, specimens: next, change: 'modified', event: decantEventOf(found.specimen.id, updated, nowIso) };
  }
  if (found.specimen.decants?.some(d => d.parentDecantId === change.decantId)) return { ok: false, refusal: 'hasChildren' };
  const next = specimens.map(s => s.id === found.specimen.id
    ? { ...s, decants: (s.decants ?? []).filter(d => d.id !== change.decantId) }
    : s);
  return { ok: true, specimens: next, change: 'deleted', event: decantEventOf(found.specimen.id, found.decant, nowIso) };
}

/** The next decant label on a specimen (D1, D2, …): one past the highest in
 *  use, so deleting D1 doesn't make the next one reuse "D2". */
export function nextDecantLabel(decants: readonly Pick<Decant, 'label'>[] | undefined): string {
  const max = (decants ?? []).reduce((m, d) => Math.max(m, Number(/^D(\d+)$/.exec(d.label)?.[1] ?? 0)), 0);
  return `D${max + 1}`;
}

/** The message key for a decant change that wasn't saved
 *  (useSpecimenBlockManagement.toast.decantNotSaved.<key>). */
export function decantRefusalKey(error: string): string {
  return ['specimenNotFound', 'decantNotFound', 'duplicateId', 'parentNotFound', 'hasChildren', 'notPermitted'].includes(error) ? error : 'saveFailed';
}

/** Batch 453: when a specimen edit touched only its decants (the Microtome
 *  workstation's decant slides), the decant updates it amounts to, so they
 *  can go through the atomic decant save. Null when anything else on the
 *  specimen changed, or a decant was added or removed. */
export function decantOnlyUpdates(before: { decants?: Decant[] } & Record<string, unknown>, after: { decants?: Decant[] } & Record<string, unknown>): { decantId: string; patch: Partial<Decant> }[] | null {
  const { decants: beforeDecants = [], ...beforeRest } = before;
  const { decants: afterDecants = [], ...afterRest } = after;
  if (JSON.stringify(beforeRest) !== JSON.stringify(afterRest)) return null;
  if (beforeDecants.length !== afterDecants.length || beforeDecants.some((d, i) => d.id !== afterDecants[i].id)) return null;
  const updates: { decantId: string; patch: Partial<Decant> }[] = [];
  afterDecants.forEach((d, i) => {
    const prev = beforeDecants[i];
    const patch: Partial<Decant> = {};
    for (const k of Object.keys({ ...prev, ...d }) as (keyof Decant)[]) {
      if (k === 'id' || k === 'parentDecantId') continue;
      if (JSON.stringify(prev[k]) !== JSON.stringify(d[k])) (patch as any)[k] = d[k];
    }
    if (Object.keys(patch).length) updates.push({ decantId: d.id, patch });
  });
  return updates;
}
