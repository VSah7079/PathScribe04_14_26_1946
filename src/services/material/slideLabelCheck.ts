// src/services/material/slideLabelCheck.ts
// Batch 757 (Pete, Nov 1, 2026): the dual scan at the Microtome. The tech scans the block, prints a slide label, then
// scans the new label on the glass: that second scan binds the slide to its block and records the cut ("sectioned" on
// the station log). Until the label just printed is scanned (or typed, if the scanner is broken), Print/Etch Next
// waits. Pure.
import { slideLevelOf } from './slideLevels';

/** A slide id as printed on the label: the accession, then the block and level (S26-0001-A1-L1). */
export function fullSlideId(fullAccession: string, slideId: string): string {
  return slideId.toUpperCase().startsWith(fullAccession.toUpperCase()) ? slideId : `${fullAccession}-${slideId}`;
}

export type SlideLabelScan =
  /** A label of the block being cut, already printed: confirm it. */
  | { kind: 'confirm'; slideId: string }
  /** A slide of the block being cut whose label has not been printed: nothing to confirm. */
  | { kind: 'notPrinted'; slideId: string }
  /** Not a slide of the block being cut: handled as before (its block is opened). */
  | { kind: 'otherWork' };

/** What a scanned slide label means for the block being cut. */
export function slideLabelScanOutcome(input: {
  scannedSlideId: string;
  fullAccession: string;
  stains: readonly { displayId?: string; printStatus?: string }[];
}): SlideLabelScan {
  const want = input.scannedSlideId.trim().toUpperCase();
  const match = input.stains.find(s => s.displayId && fullSlideId(input.fullAccession, s.displayId).toUpperCase() === want);
  if (!match?.displayId) return { kind: 'otherWork' };
  const slideId = fullSlideId(input.fullAccession, match.displayId);
  return match.printStatus === 'Printed' ? { kind: 'confirm', slideId } : { kind: 'notPrinted', slideId };
}

/** The label printed for the block being cut and not yet scanned, which holds back Print/Etch Next; null when none. */
export function labelAwaitingScan(awaiting: ReadonlySet<string>, fullAccession: string, stains: readonly { displayId?: string }[]): string | null {
  for (const s of stains) {
    if (!s.displayId) continue;
    const id = fullSlideId(fullAccession, s.displayId);
    if (awaiting.has(id.toUpperCase())) return id;
  }
  return null;
}

/** Batch 758: a printed label still waiting for its scan, with the slide it belongs to. */
export interface WaitingLabel { slideId: string; stainId: string }

/** Batch 758: every label printed for the block being cut and not yet scanned, in the grid's order (in Block mode all
 *  of a block's labels print at once and are scanned back in any order). */
export function labelsAwaitingScan(awaiting: ReadonlySet<string>, fullAccession: string, stains: readonly { id: string; displayId?: string; printStatus?: string }[]): WaitingLabel[] {
  const out: WaitingLabel[] = [];
  for (const s of stains) {
    if (!s.displayId || s.printStatus === 'Canceled') continue;
    const id = fullSlideId(fullAccession, s.displayId);
    if (awaiting.has(id.toUpperCase())) out.push({ slideId: id, stainId: s.id });
  }
  return out;
}

/** Batch 758 (Block mode): the block's slides whose labels print when the block is scanned: every one not printed yet
 *  (new, pending or failed), in the grid's order. */
export function blockLabelsToPrint(stains: readonly { id: string; printStatus?: string }[]): string[] {
  return stains.filter(s => s.printStatus === undefined || s.printStatus === 'Pending' || s.printStatus === 'Failed').map(s => s.id);
}

/** Batch 758 (Pete: "Active Block Lockout"): moving on from the block being cut (another block scanned, or Scan next)
 *  while some of its labels are not scanned back is held: the labels still waiting, or null to go on. Staying on the
 *  same block (its own label or the block scanned again) is never held. */
export function nextBlockLockout(waiting: readonly WaitingLabel[], movingToAnotherItem: boolean): WaitingLabel[] | null {
  return movingToAnotherItem && waiting.length > 0 ? [...waiting] : null;
}

/** Batch 758: the note on the station log for a label the tech chose to leave unscanned before the next block. */
export const UNSCANNED_LABEL_NOTE = 'Label not scanned before the next block';

/** Batch 758: the slide ids printed on the labels. A slide recorded before slide ids were stored has none; its label
 *  carries `<specimen><block>-<level>`, as the Microtome prints it. Without this, the dual scan never matched such a
 *  slide (found checking Batch 758 in the browser on seeded case S26-4403). */
export function withLabelIds<T extends { displayId?: string }>(stains: readonly T[], blockPrefix: string): T[] {
  return stains.map((s, i) => (s.displayId ? s : { ...s, displayId: `${blockPrefix}-${slideLevelOf(s, i)}` }));
}
