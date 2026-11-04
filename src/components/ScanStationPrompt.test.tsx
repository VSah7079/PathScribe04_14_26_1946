// @vitest-environment happy-dom
// Batch 713: the sign-in station prompt offers only the stations the signed-in user may use, plus the "select" (none) choice.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { ScanStationPrompt } from './ScanStationPrompt';
import { setUnavailableStationIds } from '@/services/scanStations/stationAvailability';

const station = (id: string, facilityId: string) => ({ id, name: `Station ${id}`, barcodeCode: id, facilityId, status: 'Active', supportsEngraving: false, supportsPrinting: false });
const STATIONS = [station('a1', 'fac-a'), station('b1', 'fac-b')];

let facilityIds: string[] = [];
vi.mock('@/services', () => ({
  scanStationService: { getAll: async () => ({ ok: true, data: STATIONS }) },
  authorizationService: { snapshot: async () => ({ subject: { facilityIds }, roles: [] }) },
}));
vi.mock('@/services/workstationGroups/resolveStationBenchRoute', () => ({ resolveStationBenchRoute: async () => undefined }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'U1', name: 'Test User' } }) }));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, string>) => (o?.station ? `${k}|${o.station}` : k) }) }));

const optionLabels = () => screen.getAllByRole('option').map(o => o.textContent);

describe('ScanStationPrompt station list', () => {
  beforeEach(() => { facilityIds = []; localStorage.clear(); setUnavailableStationIds([]); });
  afterEach(cleanup);

  it('a user restricted to facility A sees only A\'s stations plus None', async () => {
    facilityIds = ['fac-a'];
    render(<ScanStationPrompt />);
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(2));
    expect(optionLabels()).toEqual(['scanStationPrompt.selectPlaceholder', 'Station a1']);
  });

  it('a user with no restriction sees every Active station plus None', async () => {
    render(<ScanStationPrompt />);
    await waitFor(() => expect(screen.getAllByRole('option').length).toBe(3));
    expect(optionLabels()).toEqual(['scanStationPrompt.selectPlaceholder', 'Station a1', 'Station b1']);
  });

  it('asks again, with a notice, when the station stored on this computer belongs to another facility', async () => {
    facilityIds = ['fac-a'];
    localStorage.setItem('pathscribe_current_scan_station_id', 'b1');
    localStorage.setItem('pathscribe_scan_station_prompted', '1');
    render(<ScanStationPrompt />);
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Station b1'));
    expect(optionLabels()).toEqual(['scanStationPrompt.selectPlaceholder', 'Station a1']);
    // Skip lasts for this sign-in and leaves the computer's stored value alone.
    fireEvent.click(screen.getByText('scanStationPrompt.skipButton'));
    expect(screen.queryByRole('status')).toBeNull();
    expect(localStorage.getItem('pathscribe_current_scan_station_id')).toBe('b1');
  });
});
