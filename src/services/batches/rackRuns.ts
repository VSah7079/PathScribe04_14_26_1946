// src/services/batches/rackRuns.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 761 (Pete, Nov 2, 2026: "the slide stainer [rack] may be permanent, or at least multiple runs until the barcode
// is no longer visible … rather than building the container, you simply scan the container, then load the container,
// then close the container. The system should warn if the container wasn't properly closed after the last stain run").
//
// A registered, reusable rack keeps its engraved barcode for every run, so each run is a batch with the same master
// barcode. These rules pick the run a scan means, say whether the last run was closed, and give the new run's details.
// Before this batch a scan found the rack's OLDEST run (already complete), so a second run could not be started by
// scanning the rack, and a stainer's status could be written to an old run. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { Batch } from './IBatchService';
import type { HardwareContainer } from '@/services/hardwareContainers/IHardwareContainerRegistryService';

const isOpen = (b: Pick<Batch, 'status'>) => b.status === 'active' || b.status === 'reconciling';

/** The run a barcode scan means: the open one (the newest, if somehow more than one), else the newest closed one. */
export function currentRunForBarcode<T extends Pick<Batch, 'masterBarcode' | 'status' | 'createdAt'>>(batches: readonly T[], barcode: string): T | undefined {
  const want = barcode.trim().toUpperCase();
  const runs = batches.filter(b => b.masterBarcode.toUpperCase() === want).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return runs.find(isOpen) ?? runs[0];
}

/** Where a reusable rack's last run stands:
 *  none / closed — the rack is free for a new run;
 *  loading       — still taking slides (open, not sealed, not on the stainer yet): carry on loading it;
 *  notClosed     — sealed, on the stainer or being unloaded, but never closed: warn before reusing the rack. */
export type RackRunState = 'none' | 'closed' | 'loading' | 'notClosed';

export function rackRunState(run: Pick<Batch, 'status' | 'sealedAt' | 'stainingInstrumentStatus'> | null | undefined): RackRunState {
  if (!run) return 'none';
  if (!isOpen(run)) return 'closed';
  if (run.status === 'reconciling' || run.sealedAt || run.stainingInstrumentStatus) return 'notClosed';
  return 'loading';
}

/** Whether a scanned rack can start a new run here: a registered staining rack that is free. */
export function rackStartsNewRun(rack: Pick<HardwareContainer, 'containerType' | 'status'> | null | undefined, last: RackRunState): boolean {
  return !!rack && rack.containerType === 'Staining Rack' && rack.status === 'Available' && (last === 'none' || last === 'closed');
}

/** The new run's details: a Staining batch on the rack itself (no form to fill). The protocol is left for the stainer
 *  program or Batch Management; nothing is made up. */
export function rackRunDraft(rack: Pick<HardwareContainer, 'rackId' | 'containerType' | 'supportsLargeFormat'>, ctx: { stationId?: string; userId: string; userName: string }) {
  return {
    processingNode: 'Staining' as const, protocol: '', priority: 'Routine' as const, identifierMode: 'semi_permanent' as const,
    rackId: rack.rackId, containerType: rack.containerType, stationId: ctx.stationId,
    createdByUserId: ctx.userId, createdByUserName: ctx.userName,
    ...(rack.supportsLargeFormat ? { largeFormat: true } : {}),
  };
}

/** The reason recorded when a supervisor closes a rack's forgotten run to reuse the rack (audit text stays English). */
export const RACK_REUSE_CLOSE_REASON = 'Reusable rack scanned for a new run; the last run on it was never closed.';
