// src/services/molecular/plateWellScan.test.ts
import { describe, it, expect, vi } from 'vitest';
import type { MolecularMovementRecord, MolecularWell } from './IMolecularBatchService';
import type { MolecularExtractionRack, MolecularRackPosition } from './IMolecularExtractionRackService';
import { resolvePlateWellScan, applyPlateWellScan, nextUnscannedSpecimenWell, plateWellMovementContext } from './plateWellScan';

const NOW = new Date('2026-09-07T10:00:00.000Z');
const SESSION = { id: 'u7', firstName: 'Ana', lastName: 'Ruiz' };
const CTX = { session: SESSION, stationId: 'station-3', stationName: 'Molecular Bench 3' };

const notRacked = { findPositionByContainerBarcode: vi.fn(async () => ({ ok: true as const, data: null })) };

const RACK_MOVE: MolecularMovementRecord = {
  fromLevel: 'primary_vial', toLevel: 'secondary_rack', fromBarcode: 'SPEC-1', toBarcode: 'RACK-MOLE-00004:2',
  at: '2026-09-07T09:00:00.000Z', byUserId: 'u2', byUserName: 'Rack Tech', stationId: 'station-1', stationName: 'Rack Bench',
};
function racked(position: Partial<MolecularRackPosition> = {}) {
  const pos: MolecularRackPosition = { positionLabel: '2', containerBarcode: 'SPEC-1', movementHistory: [RACK_MOVE], ...position };
  const rack = { rackBarcode: 'RACK-MOLE-00004', positions: [pos] } as unknown as MolecularExtractionRack;
  return { findPositionByContainerBarcode: vi.fn(async () => ({ ok: true as const, data: { rack, position: pos } })) };
}

const WELLS: MolecularWell[] = [
  { wellPosition: 'A01', sampleType: 'CONTROL_NTC' },
  { wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN' },
  { wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-OLD' },
  { wellPosition: 'A04', sampleType: 'PATIENT_SPECIMEN' },
];

describe('plateWellScan (PS-235) — scanning a specimen into a plate well', () => {
  it('appends a movement record carrying the logged-in user and the current station (vial to well)', async () => {
    const scan = await resolvePlateWellScan('SPEC-1', 'A02', CTX, { rackService: notRacked }, NOW);
    const wells = applyPlateWellScan(WELLS, 'A02', 'SPEC-1', 'PS26-1', scan);
    expect(wells[1]).toEqual({
      wellPosition: 'A02', sampleType: 'PATIENT_SPECIMEN', containerBarcode: 'SPEC-1', accessionNumber: 'PS26-1',
      movementHistory: [{
        fromLevel: 'primary_vial', toLevel: 'plate_well', fromBarcode: 'SPEC-1', toBarcode: 'well:A02',
        at: '2026-09-07T10:00:00.000Z', byUserId: 'u7', byUserName: 'Ana Ruiz', stationId: 'station-3', stationName: 'Molecular Bench 3',
      }],
    });
    // other wells untouched, input not mutated
    expect(wells[0]).toBe(WELLS[0]);
    expect(WELLS[1].containerBarcode).toBeUndefined();
  });

  it('a racked specimen records rack-to-well and carries the rack position\'s earlier movements forward', async () => {
    const scan = await resolvePlateWellScan('SPEC-1', 'A02', CTX, { rackService: racked() }, NOW);
    const wells = applyPlateWellScan(WELLS, 'A02', 'SPEC-1', undefined, scan);
    const history = wells[1].movementHistory!;
    expect(history).toHaveLength(2);
    expect(history[0]).toEqual(RACK_MOVE);
    expect(history[1]).toMatchObject({ fromLevel: 'secondary_rack', toLevel: 'plate_well', fromBarcode: 'RACK-MOLE-00004:2', toBarcode: 'well:A02', byUserId: 'u7', stationId: 'station-3' });
  });

  it('appends to a well\'s existing history rather than replacing it, and keeps an existing accession when the scan has none', async () => {
    const earlier: MolecularMovementRecord = { ...RACK_MOVE, toLevel: 'plate_well', toBarcode: 'well:A03' };
    const start: MolecularWell[] = [{ wellPosition: 'A03', sampleType: 'PATIENT_SPECIMEN', accessionNumber: 'PS26-9', movementHistory: [earlier] }];
    const scan = await resolvePlateWellScan('SPEC-9', 'A03', CTX, { rackService: notRacked }, NOW);
    const [well] = applyPlateWellScan(start, 'A03', 'SPEC-9', undefined, scan);
    expect(well.accessionNumber).toBe('PS26-9');
    expect(well.movementHistory).toEqual([earlier, scan.movement]);
  });

  it('records an unknown user and station plainly when nobody is signed in and no station is set', async () => {
    expect(plateWellMovementContext({ session: null, stationId: null, stationName: 'Unknown Station' }))
      .toEqual({ byUserId: 'unknown', byUserName: 'Unknown User', stationId: 'unknown', stationName: 'Unknown Station' });
    const scan = await resolvePlateWellScan('SPEC-1', 'A02', { session: { id: 'u8' }, stationId: undefined, stationName: 'Unknown Station' }, { rackService: notRacked }, NOW);
    expect(scan.movement).toMatchObject({ byUserId: 'u8', byUserName: 'u8', stationId: 'unknown', stationName: 'Unknown Station' });
  });

  it('a failed rack lookup falls back to a direct vial-to-well movement', async () => {
    const failing = { findPositionByContainerBarcode: vi.fn(async () => ({ ok: false as const, error: 'boom' })) };
    const scan = await resolvePlateWellScan('SPEC-1', 'A02', CTX, { rackService: failing as any }, NOW);
    expect(scan.priorMovements).toEqual([]);
    expect(scan.movement).toMatchObject({ fromLevel: 'primary_vial', fromBarcode: 'SPEC-1' });
  });

  it('an unknown well leaves the well list unchanged', async () => {
    const scan = await resolvePlateWellScan('SPEC-1', 'H12', CTX, { rackService: notRacked }, NOW);
    expect(applyPlateWellScan(WELLS, 'H12', 'SPEC-1', undefined, scan)).toBe(WELLS);
  });

  it('advances to the next unscanned patient specimen well after the current one, or none', () => {
    expect(nextUnscannedSpecimenWell(WELLS, 'A02')?.wellPosition).toBe('A04'); // skips scanned A03
    expect(nextUnscannedSpecimenWell(WELLS, 'A04')).toBeUndefined();
  });
});
