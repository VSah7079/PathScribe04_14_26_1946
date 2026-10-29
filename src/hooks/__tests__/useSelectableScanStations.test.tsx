// @vitest-environment happy-dom
// Batch 713: the station picker offers only the stations the signed-in user may use.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useSelectableScanStations } from '../useSelectableScanStations';
import { getUnavailableStationIds, setUnavailableStationIds } from '@/services/scanStations/stationAvailability';

const station = (id: string, facilityId: string, status = 'Active') => ({ id, name: id, barcodeCode: id, facilityId, status, supportsEngraving: false, supportsPrinting: false });
const STATIONS = [station('a1', 'fac-a'), station('b1', 'fac-b'), station('b2', 'fac-b', 'Inactive')];

let facilityIds: string[] = [];
let authUser: { id: string; defaultScanStationId?: string } | null = { id: 'U1' };
vi.mock('@/services', () => ({
  scanStationService: { getAll: async () => ({ ok: true, data: STATIONS }) },
  authorizationService: { snapshot: async () => ({ subject: { facilityIds }, roles: [] }) },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));

describe('useSelectableScanStations', () => {
  beforeEach(() => { facilityIds = []; authUser = { id: 'U1' }; setUnavailableStationIds([]); localStorage.clear(); });
  afterEach(cleanup);

  it('a user restricted to facility A sees only A\'s stations', async () => {
    facilityIds = ['fac-a'];
    const { result } = renderHook(() => useSelectableScanStations());
    await waitFor(() => expect(result.current.stations.length).toBeGreaterThan(0));
    expect(result.current.stations.map(s => s.id)).toEqual(['a1']);
  });

  it('a user with no restriction sees every Active station', async () => {
    const { result } = renderHook(() => useSelectableScanStations());
    await waitFor(() => expect(result.current.stations.length).toBeGreaterThan(0));
    expect(result.current.stations.map(s => s.id)).toEqual(['a1', 'b1']);
  });

  it('marks the station stored on this computer unavailable when it is in another facility, and keeps the stored value', async () => {
    facilityIds = ['fac-a'];
    localStorage.setItem('pathscribe_current_scan_station_id', 'b1');
    const { result } = renderHook(() => useSelectableScanStations());
    await waitFor(() => expect(getUnavailableStationIds().has('b1')).toBe(true));
    expect(result.current.stations.map(s => s.id)).toEqual(['a1']);
    expect(localStorage.getItem('pathscribe_current_scan_station_id')).toBe('b1');
  });
});
