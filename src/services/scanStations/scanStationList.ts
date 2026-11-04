// src/services/scanStations/scanStationList.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 444: the Scan Stations screen's list decisions, moved out of
// ScanStationsSection.tsx (no decision logic in components).
//   • filterScanStations: search (name or barcode code), status, and the
//     group-level facility selector. A station is one physical bench in one
//     place, so the facility match is plain equality (no "Global" fallback,
//     unlike printer profiles).
//   • workflowStageKey: the locale key for a suggested stage, or null for an
//     admin's own wording, which is data and shown as typed.
// ─────────────────────────────────────────────────────────────────────────────

import { SCAN_STATION_WORKFLOW_STAGES, type ScanStation } from './IScanStationService';

export type ScanStationStatusFilter = 'All' | 'Active' | 'Inactive';

export interface ScanStationListFilter {
  search: string;
  status: ScanStationStatusFilter;
  facilityId?: string;
}

export function filterScanStations(stations: ScanStation[], f: ScanStationListFilter): ScanStation[] {
  const q = f.search.trim().toLowerCase();
  return stations.filter(s =>
    (!q || s.name.toLowerCase().includes(q) || s.barcodeCode.toLowerCase().includes(q))
    && (f.status === 'All' || s.status === f.status)
    && (!f.facilityId || s.facilityId === f.facilityId));
}

export const activeScanStations = (stations: ScanStation[]): ScanStation[] => stations.filter(s => s.status === 'Active');

const STAGE_KEYS: Record<(typeof SCAN_STATION_WORKFLOW_STAGES)[number], string> = {
  'Accessioning': 'accessioning',
  'Grossing': 'grossing',
  'Decal / Special Processing': 'decal',
  'Processing': 'processing',
  'Embedding': 'embedding',
  'Microtomy / Sectioning': 'microtomy',
  'Staining': 'staining',
  'Slide Distribution': 'slideDistribution',
  'Checkout': 'checkout',
  'External Referral': 'externalReferral',
  'Cytology Preparation': 'cytologyPreparation',
  'Cytology Processing': 'cytologyProcessing',
  'Cytology Staining': 'cytologyStaining',
  'Cytology Imaging': 'cytologyImaging',
  'Slide Archival': 'slideArchival',
  'Other': 'other',
};

export function workflowStageKey(stage: string | undefined): string | null {
  return stage && stage in STAGE_KEYS ? STAGE_KEYS[stage as keyof typeof STAGE_KEYS] : null;
}
