// Batch 407: exporting the disposal report is its own permission.
import { describe, it, expect, vi } from 'vitest';
import { exportDisposalReport, disposalReportContext } from './exportDisposalReport';

describe('exportDisposalReport', () => {
  const rows = [{ Item: 'S26-1-A1', When: '2026-09-30' }];

  it('checks retention:disposal-report:export at the report\'s facility, then delivers the CSV', async () => {
    const enforce = vi.fn(async () => ({ allowed: true }));
    const deliver = vi.fn();
    const record = vi.fn(async () => {});
    const res = await exportDisposalReport(rows, 'waste', 'fac-1', { authorization: { enforce } as never, deliver, record });
    expect(enforce).toHaveBeenCalledWith('retention:disposal-report:export', { facilityIds: ['fac-1'] });
    expect(res).toEqual({ ok: true, rowCount: 1 });
    expect(deliver).toHaveBeenCalledWith('waste', expect.stringContaining('S26-1-A1'));
    // Batch 543 (F9): recorded as an export, like every other export of case data.
    expect(record).toHaveBeenCalledWith({ action: 'export', document: 'disposal-report', destination: 'download waste.csv', status: 'success', format: 'csv', rowCount: 1, facilityId: 'fac-1' });
  });

  it('writes nothing when refused; "all facilities" needs every facility', async () => {
    const deliver = vi.fn();
    const record = vi.fn(async () => {});
    const res = await exportDisposalReport(rows, 'waste', 'all', { authorization: { enforce: async () => ({ allowed: false }) } as never, deliver, record });
    expect(res).toEqual({ ok: false, reason: 'notPermitted' });
    expect(deliver).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
    expect(disposalReportContext('all')).toEqual({ allFacilities: true });
  });
});
