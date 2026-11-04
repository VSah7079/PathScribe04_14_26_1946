// src/services/material/incompleteSectioning.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 729 (Lab Workflow & Batch spec §7.5): "warn when a step is incomplete
// (for example not all blocks sectioned)". A case's sectioning has started
// when any of its slides has been cut; it is incomplete while another of its
// blocks (ordinary or matrix) still has a slide waiting to be cut. Add-on orders
// are left out: they have their own timing on the wall (Decisions 2 and 3).
// Control slides and cancelled slides do not count. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { Case } from '@/types/case/Case';
import type { StainOrder } from '@/types/case/Specimen';

export interface SectioningProgress {
  /** Blocks with at least one slide cut. */
  started: number;
  /** Blocks with a routine slide still waiting to be cut. */
  waiting: number;
  /** The waiting blocks' labels (A1, M1), in case order. */
  waitingLabels: string[];
}

const counts = (s: StainOrder) => s.status !== 'Cancelled' && !(s as { isControlSlide?: boolean }).isControlSlide;
const isAddOn = (s: StainOrder) => !!(s as { orderedAt?: string; addOnPriority?: string }).orderedAt && !!(s as { addOnPriority?: string }).addOnPriority;

/** How far the case's sectioning has got. */
export function sectioningProgress(c: Pick<Case, 'specimens' | 'matrixBlocks'>): SectioningProgress {
  const blocks: { label: string; slides: StainOrder[] }[] = [
    ...(c.specimens ?? []).flatMap(sp => (sp.blocks ?? []).map(b => ({ label: `${sp.label}${b.label}`, slides: b.stains ?? [] }))),
    ...(c.matrixBlocks ?? []).map(m => ({ label: m.label, slides: m.slides ?? [] })),
  ];
  let started = 0;
  const waitingLabels: string[] = [];
  for (const b of blocks) {
    const slides = b.slides.filter(counts);
    if (slides.some(s => s.status !== 'Pending Cut')) started++;
    if (slides.some(s => s.status === 'Pending Cut' && !isAddOn(s))) waitingLabels.push(b.label);
  }
  return { started, waiting: waitingLabels.length, waitingLabels };
}

/** Whether the case's sectioning has started but not every block is done (the §7.5 warning). */
export function sectioningIncomplete(c: Pick<Case, 'specimens' | 'matrixBlocks'>): boolean {
  const p = sectioningProgress(c);
  return p.started > 0 && p.waiting > 0;
}

/** The other blocks of the case still waiting to be cut, leaving out the one at the bench. */
export function otherBlocksWaiting(c: Pick<Case, 'specimens' | 'matrixBlocks'>, currentLabel: string): string[] {
  return sectioningProgress(c).waitingLabels.filter(l => l !== currentLabel);
}
