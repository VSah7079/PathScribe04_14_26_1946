import { describe, it, expect } from 'vitest';
import { filterScanStations, activeScanStations, workflowStageKey } from './scanStationList';
import { SCAN_STATION_WORKFLOW_STAGES, type ScanStation } from './IScanStationService';

const st = (id: string, name: string, code: string, status: 'Active' | 'Inactive', facilityId: string) =>
  ({ id, name, barcodeCode: code, status, facilityId, workflowStage: 'Grossing' } as ScanStation);
const ALL = [st('1', 'Grossing 1', 'GROSS-01', 'Active', 'lab-a'), st('2', 'Embedding', 'EMB-01', 'Inactive', 'lab-a'), st('3', 'Grossing 2', 'GROSS-02', 'Active', 'lab-b')];

describe('filterScanStations (Batch 444)', () => {
  it('matches name or barcode code, ignoring case and spaces', () => {
    expect(filterScanStations(ALL, { search: ' gross ', status: 'All' }).map(s => s.id)).toEqual(['1', '3']);
    expect(filterScanStations(ALL, { search: 'emb-01', status: 'All' }).map(s => s.id)).toEqual(['2']);
  });
  it('filters by status and by facility (plain equality)', () => {
    expect(filterScanStations(ALL, { search: '', status: 'Inactive' }).map(s => s.id)).toEqual(['2']);
    expect(filterScanStations(ALL, { search: '', status: 'All', facilityId: 'lab-b' }).map(s => s.id)).toEqual(['3']);
  });
  it('activeScanStations keeps only active ones', () => {
    expect(activeScanStations(ALL).map(s => s.id)).toEqual(['1', '3']);
  });
});

describe('workflowStageKey', () => {
  it('has a key for every suggested stage, and none for free text', () => {
    for (const stage of SCAN_STATION_WORKFLOW_STAGES) expect(workflowStageKey(stage)).toBeTruthy();
    expect(workflowStageKey('Our frozen-section bench')).toBeNull();
    expect(workflowStageKey(undefined)).toBeNull();
  });
});
