import { recordSimulatedPrint, simulationAllowed } from '@/services/printing/simulatedPrint';
// src/utils/labels/dispatchSlideLabel.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct follow-up: "I think I would expect to
// reprint a slide label but that print icon is for the cassette...
// perhaps we need a larger modal window to manage reprints at the
// Req/Container/Cassette and slide level." Slide-level label printing
// genuinely didn't exist anywhere in this app before this — confirmed
// directly (no buildSlideLabelData, no dispatchSlideLabel, nothing).
//
// Mirrors dispatchCassetteLabel.ts's own real, honest stub exactly —
// same open SCRUM-41 question (ZPL + local print agent vs. Cerebro's
// own native hardware) applies here too, and a slide label is, if
// anything, an even smaller/more specialized physical label than a
// cassette one, so it's extremely unlikely to resolve to a different
// answer than the cassette side of that same decision.
// ─────────────────────────────────────────────────────────────────────────────

export interface SlideLabelDispatchRequest {
  fullAccession: string;
  specimenLabel: string;
  blockLabel: string;
  /** e.g. "L1", "L2" — the real, ordered level within the block, not
   *  the stain name alone (a block can carry more than one slide of
   *  the same stain across different levels). */
  level: string;
  stainName: string;
  slideId: string;
  /** Batch 715: the case's slide setting; Letters prints the level as "La" (text only, the slide id keeps L1). */
  slideDesignation?: 'letters' | 'numbers';
}

export interface SlideLabelDispatchResult {
  dispatched: boolean;
  /** Always 'stub' until SCRUM-41 resolves — see this file's own
   *  header comment. */
  method: 'stub';
}

const DISPATCHED_LOG: SlideLabelDispatchRequest[] = [];

// Batch 606 (PS-14): a slide label is produced once. The scan at microtome
// (this file) and the Microtome Workstation print (printSlideLabel) both
// consult and update this ledger, so one slide never gets two labels. A
// deliberate reprint ignores it.
const OUTPUT_LEDGER = new Set<string>();
export const wasSlideLabelOutput = (slideId: string): boolean => OUTPUT_LEDGER.has(slideId);
export const markSlideLabelOutput = (slideId: string): void => { OUTPUT_LEDGER.add(slideId); };

/**
 * Real, honest stand-in for the real slide-label print dispatch.
 * Never throws — same posture as dispatchCassetteLabel.ts and every
 * other fire-and-forget dispatch in this app. Logs to console AND an
 * in-memory, inspectable log so this is visibly, honestly a
 * placeholder rather than something that looks like it printed when
 * nothing did.
 */
export async function dispatchSlideLabel(
  request: SlideLabelDispatchRequest,
): Promise<SlideLabelDispatchResult> {
  if (wasSlideLabelOutput(request.slideId)) {
    return { dispatched: false, method: 'stub' };
  }
  markSlideLabelOutput(request.slideId);
  DISPATCHED_LOG.push(request);
  console.info(
    `[PathScribe] Slide label dispatch — STUB, no real print pipeline wired yet (SCRUM-41 still open). ` +
    `Would print: ${request.slideId}`,
  );
  if (simulationAllowed()) recordSimulatedPrint({ kind: 'engrave', transport: 'slide printer', destination: 'slide printer / engraver' });
  return { dispatched: true, method: 'stub' };
}

/** Real, dedicated inspection method — for tests, and so a real UI
 *  could eventually show "what would have printed" while SCRUM-41 is
 *  still unresolved. */
export function getDispatchedSlideLabels(): readonly SlideLabelDispatchRequest[] {
  return DISPATCHED_LOG;
}

/** Test-only reset — the log is a real, deliberate module-level array
 *  (not a class), so tests need a way to clear it between cases. */
export function _resetDispatchedSlideLabelsForTests(): void {
  DISPATCHED_LOG.length = 0;
  OUTPUT_LEDGER.clear();
}
