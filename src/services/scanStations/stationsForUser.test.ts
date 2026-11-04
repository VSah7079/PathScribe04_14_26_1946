import { describe, expect, it } from 'vitest';
import type { ScanStation } from './IScanStationService';
import { canUseStation, stationsForUser, unavailableStationIds } from './stationsForUser';

const st = (id: string, facilityId: string, status: ScanStation['status'] = 'Active'): ScanStation => ({
  id, name: id, barcodeCode: id.toUpperCase(), facilityId, status, supportsEngraving: false, supportsPrinting: false,
});
const ALL = [st('a1', 'fac-a'), st('a2', 'fac-a', 'Inactive'), st('b1', 'fac-b'), st('c1', 'fac-c')];

describe('stationsForUser (Batch 713)', () => {
  it('a user restricted to facility A is offered only A\'s Active stations', () => {
    expect(stationsForUser(ALL, ['fac-a']).map(s => s.id)).toEqual(['a1']);
  });
  it('a user with several facilities is offered the union', () => {
    expect(stationsForUser(ALL, ['fac-a', 'fac-c']).map(s => s.id)).toEqual(['a1', 'c1']);
  });
  it('an empty, absent or null list means no restriction: every Active station', () => {
    for (const f of [[], undefined, null]) expect(stationsForUser(ALL, f).map(s => s.id)).toEqual(['a1', 'b1', 'c1']);
  });
  it('a facility with no stations offers none (the screens still offer No station)', () => {
    expect(stationsForUser(ALL, ['fac-z'])).toEqual([]);
  });
  it('canUseStation ignores Active/Inactive and judges the facility only', () => {
    expect(canUseStation(ALL[1], ['fac-a'])).toBe(true);
    expect(canUseStation(ALL[2], ['fac-a'])).toBe(false);
    expect(canUseStation(ALL[2], [])).toBe(true);
  });
  it('unavailableStationIds lists known stations in other facilities, not unknown ids', () => {
    expect(unavailableStationIds(['b1', 'a1', 'gone', null, undefined, 'b1'], ALL, ['fac-a'])).toEqual(['b1']);
    expect(unavailableStationIds(['b1'], ALL, [])).toEqual([]);
  });
});
