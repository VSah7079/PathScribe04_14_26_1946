// Batch 450 (PS-282): a QA report export checks its own capability, then
// delivers the CSV and records DOCUMENT_EXPORTED in the audit log. A refusal
// produces no file and no export entry.
import { describe, expect, it, vi } from 'vitest';
import { exportQaReport, qaExportDocumentName, qaScopeContext } from './qaExport';

const rows = [{ Case_ID: 'C1', Outcome: 'major' }, { Case_ID: 'C2', Outcome: 'minor' }];

describe('exportQaReport (PS-282)', () => {
  it('checks the report\'s capability, delivers the CSV, and records the export', async () => {
    const enforce = vi.fn(async () => ({ allowed: true }));
    const deliver = vi.fn();
    const record = vi.fn(async () => undefined);
    const res = await exportQaReport('qa:discordance-report:export' as never, rows, 'discordance-client-F1.xlsx', { authorization: { enforce } as never, deliver, record }, qaScopeContext({ level: 'client', clientId: 'F1' } as never));
    expect(res).toEqual({ ok: true, rowCount: 2 });
    expect(enforce).toHaveBeenCalledWith('qa:discordance-report:export', { facilityIds: ['F1'] });
    expect(deliver).toHaveBeenCalledWith('discordance-client-F1', expect.stringContaining('Case_ID'));
    expect(record).toHaveBeenCalledWith({
      action: 'export', document: 'qa-discordance-report', destination: 'download discordance-client-F1.csv',
      status: 'success', format: 'csv', rowCount: 2, facilityId: 'F1',
    });
  });

  it('a refused export makes no file and records no export', async () => {
    const deliver = vi.fn();
    const record = vi.fn(async () => undefined);
    const res = await exportQaReport('qa:discordance-report:export' as never, rows, 'x.csv', { authorization: { enforce: async () => ({ allowed: false }) } as never, deliver, record }, qaScopeContext());
    expect(res).toEqual({ ok: false, reason: 'notPermitted' });
    expect(deliver).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('an enterprise-wide export is recorded without a facility', async () => {
    const record = vi.fn(async () => undefined);
    await exportQaReport('qa:intraop-linkage-report:export' as never, rows, 'linkage-enterprise.csv', { authorization: { enforce: async () => ({ allowed: true }) } as never, deliver: vi.fn(), record }, qaScopeContext());
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ document: 'qa-intraop-linkage-report', facilityId: null }));
  });

  it('names the audit document after the report', () => {
    expect(qaExportDocumentName('qa:registry-transmission-audit:export' as never)).toBe('qa-registry-transmission-audit');
  });
});

describe('Batch 549: an organisation scope is still checked as all facilities', () => {
  it('because its rows and the facility tree don\'t yet agree on an organisation\'s facilities (PS-610)', () => {
    expect(qaScopeContext({ level: 'organisation', organisationId: 'ORG-DVMC' })).toEqual({ allFacilities: true });
  });
});
