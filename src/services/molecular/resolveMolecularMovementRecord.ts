// src/services/molecular/resolveMolecularMovementRecord.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the given specification's own §5.1 "Complete Lifecycle
// Tracking": "Every sample movement (Primary Vial → Secondary Rack →
// Molecular Plate Well) is recorded with timestamp, User ID, and
// Station ID." A real, pure builder — the real caller supplies who,
// where, and when; this function only shapes the record, matching
// this module's own established posture elsewhere (barcode/payload
// builders).
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularMovementLevel, MolecularMovementRecord } from './IMolecularBatchService';

export interface MolecularMovementContext {
  byUserId: string;
  byUserName: string;
  stationId: string;
  stationName: string;
}

export function resolveMolecularMovementRecord(
  fromLevel: MolecularMovementLevel,
  toLevel: MolecularMovementLevel,
  fromBarcode: string,
  toBarcode: string,
  context: MolecularMovementContext,
  now: Date = new Date(),
): MolecularMovementRecord {
  return {
    fromLevel, toLevel, fromBarcode, toBarcode,
    at: now.toISOString(),
    byUserId: context.byUserId, byUserName: context.byUserName,
    stationId: context.stationId, stationName: context.stationName,
  };
}

/**
 * Batch 406: who and where a movement (or rack placement) is recorded
 * against, from the signed-in user and the device's scan station. Moved out
 * of the Rack Loading page. The fallbacks are record data, in English like
 * audit text, not screen text.
 */
export const UNKNOWN_STATION_NAME = 'Unknown Station';
export function molecularActor(session: { id: string; firstName?: string; lastName?: string } | null | undefined): { byUserId: string; byUserName: string } {
  if (!session) return { byUserId: 'unknown', byUserName: 'Unknown User' };
  return { byUserId: session.id, byUserName: `${session.firstName ?? ''} ${session.lastName ?? ''}`.trim() || session.id };
}
