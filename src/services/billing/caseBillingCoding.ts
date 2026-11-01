// src/services/billing/caseBillingCoding.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460: the billing review panel's coding changes, as pure functions.
// They were inline in SynopticReportPage.tsx; the Cytology Workspace and the
// Microtome workstation now reuse the same panel, so the decisions live here
// and every screen applies them the same way. Each screen only saves the
// result through its own save path (and records the charge or credit through
// caseBillingCharges.ts).
//
// A billable unit is a block or a decant (services/material/billableMaterial.ts);
// both keep { cpt, rejectedCpt } of AppliedBlockCode. A specimen's base codes
// are plain strings on specimen.coding.cpt. A matrix block's codes are kept per
// specimen on specimen.matrixBlockCoding.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppliedBlockCode } from '@/types/case/Specimen';


export interface UnitCoding { cpt: AppliedBlockCode[]; rejectedCpt: AppliedBlockCode[] }

const both = (coding: { cpt?: AppliedBlockCode[]; rejectedCpt?: AppliedBlockCode[] } | undefined): UnitCoding =>
  ({ cpt: [...(coding?.cpt ?? [])], rejectedCpt: [...(coding?.rejectedCpt ?? [])] });

/** Codes approved on a unit (a suggestion accepted, or several at once). */
export function codingWithApproved(coding: UnitCoding | { cpt?: AppliedBlockCode[]; rejectedCpt?: AppliedBlockCode[] } | undefined, codes: AppliedBlockCode[]): UnitCoding {
  const c = both(coding);
  return { cpt: [...c.cpt, ...codes.map(x => ({ code: x.code, stainOrderId: x.stainOrderId }))], rejectedCpt: c.rejectedCpt };
}

/** A suggestion declined for this stain: nothing was charged, so nothing to credit. */
export function codingWithRejected(coding: { cpt?: AppliedBlockCode[]; rejectedCpt?: AppliedBlockCode[] } | undefined, code: string, stainOrderId?: string): UnitCoding {
  const c = both(coding);
  return { cpt: c.cpt, rejectedCpt: [...c.rejectedCpt, { code, stainOrderId }] };
}

/** A suggestion replaced by another code for the same stain, in one change. */
export function codingWithOverride(coding: { cpt?: AppliedBlockCode[]; rejectedCpt?: AppliedBlockCode[] } | undefined, oldCode: string, newCode: string, stainOrderId?: string): UnitCoding {
  const c = both(coding);
  return { cpt: [...c.cpt, { code: newCode, stainOrderId }], rejectedCpt: [...c.rejectedCpt, { code: oldCode, stainOrderId }] };
}

/** An applied code removed (matched by code and stain). Its rejection list is
 *  untouched, so the suggestion can come back while the stain is still there. */
export function codingWithoutCode(coding: { cpt?: AppliedBlockCode[]; rejectedCpt?: AppliedBlockCode[] } | undefined, code: string, stainOrderId?: string): UnitCoding {
  const c = both(coding);
  const idx = c.cpt.findIndex(x => x.code === code && x.stainOrderId === stainOrderId);
  if (idx !== -1) c.cpt.splice(idx, 1);
  return c;
}

/** An applied code replaced by its correction, in place. */
export function codingWithCorrection(coding: { cpt?: AppliedBlockCode[]; rejectedCpt?: AppliedBlockCode[] } | undefined, oldCode: string, newCode: string, stainOrderId?: string): UnitCoding {
  const c = both(coding);
  const idx = c.cpt.findIndex(x => x.code === oldCode && x.stainOrderId === stainOrderId);
  if (idx !== -1) c.cpt[idx] = { code: newCode, stainOrderId };
  return c;
}

export interface BillingApprovalItem { specimenId: string; blockId: string; code: string; stainOrderId?: string }

/** "Approve all", grouped by unit, so each unit is written once with all of
 *  its codes (several approvals of the same code on one block are kept). */
export function groupApprovalsByUnit(items: BillingApprovalItem[]): { specimenId: string; blockId: string; codes: AppliedBlockCode[] }[] {
  const byUnit = new Map<string, { specimenId: string; blockId: string; codes: AppliedBlockCode[] }>();
  for (const item of items) {
    const key = `${item.specimenId}::${item.blockId}`;
    if (!byUnit.has(key)) byUnit.set(key, { specimenId: item.specimenId, blockId: item.blockId, codes: [] });
    byUnit.get(key)!.codes.push({ code: item.code, stainOrderId: item.stainOrderId });
  }
  return [...byUnit.values()];
}

/** A specimen-level base code added. */
export function specimensWithBaseCodeAdded<S extends { id: string; coding?: any }>(specimens: readonly S[], specimenId: string, code: string): S[] {
  return specimens.map(sp => (sp.id === specimenId ? { ...sp, coding: { ...sp.coding, cpt: [...(sp.coding?.cpt ?? []), code] } } : sp));
}

/** A specimen-level base code removed. */
export function specimensWithBaseCodeRemoved<S extends { id: string; coding?: any }>(specimens: readonly S[], specimenId: string, code: string): S[] {
  return specimens.map(sp => (sp.id === specimenId ? { ...sp, coding: { ...sp.coding, cpt: (sp.coding?.cpt ?? []).filter((c: string) => c !== code) } } : sp));
}

/** A specimen-level base code corrected in place. */
export function specimensWithBaseCodeCorrected<S extends { id: string; coding?: any }>(specimens: readonly S[], specimenId: string, oldCode: string, newCode: string): S[] {
  return specimens.map(sp => (sp.id === specimenId ? { ...sp, coding: { ...sp.coding, cpt: (sp.coding?.cpt ?? []).map((c: string) => (c === oldCode ? newCode : c)) } } : sp));
}

/** A matrix-block code applied or declined for one specimen's cores (PS-93). */
export function specimensWithMatrixCode<S extends { id: string; matrixBlockCoding?: any[] }>(
  specimens: readonly S[], specimenId: string, matrixBlockId: string, code: string, stainOrderId: string | undefined, decision: 'applied' | 'rejected',
): S[] {
  return specimens.map(sp => {
    if (sp.id !== specimenId) return sp;
    const existing = sp.matrixBlockCoding ?? [];
    const entry = existing.find((e: any) => e.matrixBlockId === matrixBlockId);
    const updated = decision === 'applied'
      ? { matrixBlockId, cpt: [...(entry?.cpt ?? []), { code, stainOrderId }], rejectedCpt: entry?.rejectedCpt ?? [] }
      : { matrixBlockId, cpt: entry?.cpt ?? [], rejectedCpt: [...(entry?.rejectedCpt ?? []), { code, stainOrderId }] };
    return { ...sp, matrixBlockCoding: [...existing.filter((e: any) => e.matrixBlockId !== matrixBlockId), updated] };
  });
}

/** Which of a matrix-block stain's cores the pathologist confirmed as evaluated. */
export function matrixSlidesWithEvaluatedCores<T extends { id: string }>(slides: readonly T[], stainOrderId: string, evaluatedSpecimenIds: string[]): T[] {
  return slides.map(s => (s.id === stainOrderId ? { ...s, evaluatedSpecimenIds } : s));
}
