// src/services/molecular/rackWorklist.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The Extraction Racks list's rows: newest first, how full each
// rack is, and where it stands (Pete's Rack Loading requirements):
//   placed          on an instrument (and slot, when recorded)
//   needsSampleIds  a tube on it doesn't name its accession yet
//   loading         otherwise
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularExtractionRack } from './IMolecularExtractionRackService';
import { rackPositionsMissingSampleId } from '../fieldRequirements/molecularRackChecks';

export type RackWorklistStatus = 'placed' | 'needsSampleIds' | 'loading';

export interface RackWorklistRow {
  id: string;
  rackBarcode: string;
  capacity: number;
  occupied: number;
  createdAt: string;
  status: RackWorklistStatus;
  instrumentCode?: string;
  deckSlotId?: string;
}

export function rackWorklistRows(racks: readonly MolecularExtractionRack[]): RackWorklistRow[] {
  return [...racks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(r => ({
      id: r.id,
      rackBarcode: r.rackBarcode,
      capacity: r.capacity,
      occupied: r.positions.filter(p => (p.containerBarcode ?? '').trim()).length,
      createdAt: r.createdAt,
      status: r.placement ? 'placed' : rackPositionsMissingSampleId(r.positions).length > 0 ? 'needsSampleIds' : 'loading',
      instrumentCode: r.placement?.instrumentCode,
      deckSlotId: r.placement?.deckSlotId,
    }));
}
