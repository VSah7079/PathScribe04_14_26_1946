// @vitest-environment happy-dom
// Batch 713: a station on this computer that the signed-in user may not use counts as no station, and is kept for the next person.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useCurrentScanStation } from '../useCurrentScanStation';
import { getEffectiveScanStationId } from '@/utils/effectiveScanStation';
import { setUnavailableStationIds } from '@/services/scanStations/stationAvailability';

describe('useCurrentScanStation with an unavailable station', () => {
  beforeEach(() => { localStorage.clear(); setUnavailableStationIds([]); localStorage.setItem('pathscribe_current_scan_station_id', 'b1'); });
  afterEach(() => { cleanup(); setUnavailableStationIds([]); });

  it('returns the stored station while it is available', () => {
    const { result } = renderHook(() => useCurrentScanStation());
    expect(result.current.stationId).toBe('b1');
    expect(getEffectiveScanStationId()).toBe('b1');
  });

  it('returns no station (and says which was refused) once it is unavailable, without clearing the stored value', () => {
    const { result } = renderHook(() => useCurrentScanStation());
    act(() => setUnavailableStationIds(['b1']));
    expect(result.current.stationId).toBeNull();
    expect(result.current.unavailableStationId).toBe('b1');
    expect(getEffectiveScanStationId()).toBeNull();
    expect(localStorage.getItem('pathscribe_current_scan_station_id')).toBe('b1');
    act(() => setUnavailableStationIds([]));
    expect(result.current.stationId).toBe('b1');
  });
});
