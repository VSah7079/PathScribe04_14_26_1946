import { describe, it, expect } from 'vitest';
import { summariseReadings, recentReadings } from './coldChainStatus';
import type { TelemetryReading } from './ITelemetryReadingService';

const r = (id: string, at: string, isExcursion: boolean, temp = -18): TelemetryReading => ({ id, assetType: 'storage_unit', assetId: 'su-1', temperatureCelsius: temp, recordedAt: at, isExcursion });

describe('summariseReadings', () => {
  it('has no status when there are no readings', () => {
    expect(summariseReadings([])).toEqual({ status: 'none', readingCount: 0, excursionCount: 0 });
  });
  it('takes the status from the latest reading, whatever order they arrive in', () => {
    const s = summariseReadings([r('b', '2026-10-18T10:00:00Z', false), r('a', '2026-10-18T09:00:00Z', true)]);
    expect(s.status).toBe('ok');
    expect(s.latest?.id).toBe('b');
    expect(s.excursionCount).toBe(1);
    expect(s.readingCount).toBe(2);
  });
  it('shows an excursion when the latest reading is one', () => {
    expect(summariseReadings([r('a', '2026-10-18T09:00:00Z', false), r('b', '2026-10-18T10:00:00Z', true)]).status).toBe('excursion');
  });
});

describe('recentReadings', () => {
  it('lists newest first and caps the list', () => {
    const list = [r('a', '2026-10-18T09:00:00Z', false), r('c', '2026-10-18T11:00:00Z', false), r('b', '2026-10-18T10:00:00Z', false)];
    expect(recentReadings(list, 2).map(x => x.id)).toEqual(['c', 'b']);
  });
});
