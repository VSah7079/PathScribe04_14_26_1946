// src/services/molecular/plateWellScan.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-235 (Batch 450): scanning (or manually entering) a specimen into a
// plate well. Moved out of MolecularPlateBuilderPage's assignSpecimenToWell
// handler, unchanged in behaviour:
//   1. who and where: the signed-in user (molecularActor) and this device's
//      scan station ('unknown' id when none is set);
//   2. where the specimen came from: an extraction-rack position when the
//      barcode is racked (secondary_rack, carrying that position's own
//      movement history forward), otherwise straight from the primary vial;
//   3. the well update: container barcode, matched accession (kept when the
//      scan has none), and the movement history with the new record appended;
//   4. the next empty patient-specimen well to arm for scanning.
// The rack service is passed in so this is testable without module mocks.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularMovementRecord, MolecularWell } from './IMolecularBatchService';
import type { IMolecularExtractionRackService } from './IMolecularExtractionRackService';
import { molecularActor, resolveMolecularMovementRecord, type MolecularMovementContext } from './resolveMolecularMovementRecord';

export interface PlateWellScanContext {
  session: { id: string; firstName?: string; lastName?: string } | null | undefined;
  stationId: string | null | undefined;
  stationName: string;
}

/** Who and where a plate-well movement is recorded against. */
export function plateWellMovementContext(ctx: PlateWellScanContext): MolecularMovementContext {
  return { ...molecularActor(ctx.session), stationId: ctx.stationId ?? 'unknown', stationName: ctx.stationName };
}

export interface PlateWellScan {
  /** The new movement record for this scan. */
  movement: MolecularMovementRecord;
  /** Movements the specimen already had in its extraction rack (empty when not racked). */
  priorMovements: MolecularMovementRecord[];
}

/** Resolves the movement record for a specimen scanned into `wellPosition`. */
export async function resolvePlateWellScan(
  raw: string,
  wellPosition: string,
  ctx: PlateWellScanContext,
  deps: { rackService: Pick<IMolecularExtractionRackService, 'findPositionByContainerBarcode'> },
  now: Date = new Date(),
): Promise<PlateWellScan> {
  const rackLookup = await deps.rackService.findPositionByContainerBarcode(raw);
  const racked = rackLookup.ok && rackLookup.data ? rackLookup.data : null;
  const priorMovements = racked ? (racked.position.movementHistory ?? []) : [];
  const fromLevel = racked ? 'secondary_rack' : 'primary_vial';
  const fromBarcode = racked ? `${racked.rack.rackBarcode}:${racked.position.positionLabel}` : raw;
  const movement = resolveMolecularMovementRecord(
    fromLevel, 'plate_well', fromBarcode, `well:${wellPosition}`, plateWellMovementContext(ctx), now,
  );
  return { movement, priorMovements };
}

/** Applies a resolved scan to the well list (a new array; unknown well → unchanged list). */
export function applyPlateWellScan(
  wells: MolecularWell[],
  wellPosition: string,
  raw: string,
  matchedAccession: string | undefined,
  scan: PlateWellScan,
): MolecularWell[] {
  const idx = wells.findIndex(w => w.wellPosition === wellPosition);
  if (idx === -1) return wells;
  const updated = [...wells];
  updated[idx] = {
    ...updated[idx], containerBarcode: raw, accessionNumber: matchedAccession ?? updated[idx].accessionNumber,
    movementHistory: [...scan.priorMovements, ...(updated[idx].movementHistory ?? []), scan.movement],
  };
  return updated;
}

/** The next patient-specimen well after `currentPosition` with nothing scanned in yet. */
export function nextUnscannedSpecimenWell(wells: MolecularWell[], currentPosition: string): MolecularWell | undefined {
  const currentIdx = wells.findIndex(w => w.wellPosition === currentPosition);
  return wells.slice(currentIdx + 1).find(w => w.sampleType === 'PATIENT_SPECIMEN' && !w.containerBarcode);
}
