// src/services/stainQc/stainQcCaseWrites.ts
// Batch 763: writes QC results onto the cases: a slide's stain status (by its label id, as the rack lists it), and a
// scanned slide's image decision (by its stain order). Each case is saved on its newest copy with its version
// (updateCaseWithRetryOrThrow), so another person's change to other slides is kept.
import type { Case } from '@/types/case/Case';
import { updateCaseWithRetryOrThrow, type CaseWriteDeps } from '../cases/caseWrite';

type AnyStain = { id?: string; displayId?: string; status?: string; distributionStatus?: string; lastScanOutcome?: string; wsiScanBatchId?: string };
type AnySpecimen = { label?: string; blocks?: { id: string; stains?: AnyStain[] }[]; decants?: { id: string; stains?: AnyStain[] }[] };

function mapStains(c: Case, change: (st: AnyStain, holderId: string) => AnyStain | null): Partial<Case> | null {
  let changed = false;
  const specimens = ((c.specimens ?? []) as unknown as AnySpecimen[]).map(sp => {
    const touch = (holder: { id: string; stains?: AnyStain[] }) => ({ ...holder, stains: (holder.stains ?? []).map(st => { const n = change(st, holder.id); if (!n) return st; changed = true; return n; }) });
    return { ...sp, blocks: (sp.blocks ?? []).map(touch), decants: (sp.decants ?? []).map(touch) };
  });
  return changed ? ({ specimens } as unknown as Partial<Case>) : null;
}

/** Sets each slide's stain status, grouped by case; slides are matched by their label id. */
export async function writeSlideStatuses(
  updates: { slideId: string; caseAccession: string; status: string }[],
  deps: CaseWriteDeps & { caseIdFor: (accession: string) => Promise<string | null> },
): Promise<void> {
  const byCase = new Map<string, Map<string, string>>();
  for (const u of updates) {
    const m = byCase.get(u.caseAccession) ?? new Map<string, string>();
    m.set(u.slideId.toUpperCase(), u.status);
    byCase.set(u.caseAccession, m);
  }
  for (const [accession, statuses] of byCase) {
    const caseId = await deps.caseIdFor(accession);
    if (!caseId) continue;
    await updateCaseWithRetryOrThrow(caseId, c => mapStains(c, st => {
      const s = st.displayId ? statuses.get(st.displayId.toUpperCase()) : undefined;
      return s && st.status !== s ? { ...st, status: s } : null;
    }), deps).catch(() => undefined);
  }
}

/** Releases a scanned slide's image to the pathologist, or sends the slide back to the scanning queue. */
export async function writeImageOutcome(u: { caseId: string; stainId: string; blockId: string; outcome: 'scanned' | 'imageQcFailed' }, deps: CaseWriteDeps): Promise<void> {
  await updateCaseWithRetryOrThrow(u.caseId, c => mapStains(c, (st, holderId) => {
    if (st.id !== u.stainId || holderId !== u.blockId) return null;
    return u.outcome === 'scanned'
      ? { ...st, distributionStatus: 'Scanned', lastScanOutcome: 'scanned' }
      : { ...st, distributionStatus: 'In Scanning Queue', lastScanOutcome: 'imageQcFailed', wsiScanBatchId: undefined };
  }), deps).catch(() => undefined);
}
