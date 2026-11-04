import { describe, it, expect } from 'vitest';
import { scanOpensCaseView } from './scanRoutePolicy';

describe('what an accession scanned with nothing focused opens (touch spec T1)', () => {
  it('stays on the station screens that handle their own scans', () => {
    for (const p of ['/accession', '/accession/new', '/workstations/embedding', '/workstations/microtomy', '/workstations/slide-distribution', '/add-on-orders', '/batch-management', '/batch-management/disposal']) {
      expect(scanOpensCaseView(p)).toBeNull();
    }
  });
  it('opens the grossing screen from grossing, and the report elsewhere', () => {
    expect(scanOpensCaseView('/workstations/grossing')).toBe('grossing');
    expect(scanOpensCaseView('/case/abc/grossing')).toBe('grossing');
    expect(scanOpensCaseView('/worklist')).toBe('synoptic');
    expect(scanOpensCaseView('/batch-managementx')).toBe('synoptic');
  });
});
