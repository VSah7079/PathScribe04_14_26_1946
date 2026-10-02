// Batch 407: exporting the disposal report is its own permission.
import { describe, it, expect, vi } from 'vitest';
import { exportDisposalReport, disposalReportContext } from './exportDisposalReport';

describe('exportDisposalReport', () => {
  const rows = [{ Item: 'S26-1-A1', When: '2026-09-30' }];

  it('checks retention:disposal-report:export at the report\'s facility, then delivers the CSV', async () => {
    const enforce = vi.fn(async () => ({ allowed: true }));
    const deliver = vi.fn();
    const res = await exportDisposalReport(rows, 'waste', 'fac-1', { authorization: { enforce } as never, deliver });
    expect(enforce).toHaveBeenCalledWith('retention:disposal-report:export', { facilityIds: ['fac-1'] });
    expect(res).toEqual({ ok: true, rowCount: 1 });
    expect(deliver).toHaveBeenCalledWith('waste', expect.stringContaining('S26-1-A1'));
  });

  it('writes nothing when refused; "all facilities" needs every facility', async () => {
    const deliver = vi.fn();
    const res = await exportDisposalReport(rows, 'waste', 'all', { authorization: { enforce: async () => ({ allowed: false }) } as never, deliver });
    expect(res).toEqual({ ok: false, reason: 'notPermitted' });
    expect(deliver).not.toHaveBeenCalled();
    expect(disposalReportContext('all')).toEqual({ allFacilities: true });
  });
});
