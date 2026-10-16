// Batch 550 (PS-539 phase 2d): a QA export goes through the export service with its kind, title, filters and facility.
import { describe, it, expect, vi } from 'vitest';
import { runQaExport } from './runQaExport';

describe('runQaExport', () => {
  it('maps the capability to its kind, the file name to a title and the checked context to the facility', async () => {
    const run = vi.fn(async () => ({ via: 'server' as const, result: 'preparing' as const, exportId: 'x' }));
    const build = vi.fn();
    await runQaExport('qa:reconciliation:export', 'reconciliation-F1-2026-10-13.csv', { facilityIds: ['F1'] }, { scope: { level: 'client', clientId: 'F1' } }, build, { run });
    expect(run).toHaveBeenCalledWith({
      kind: 'qa.reconciliation', title: 'reconciliation-F1', parameters: { scope: { level: 'client', clientId: 'F1' } }, facilityId: 'F1', buildInBrowser: build,
    });
  });
  it('"all facilities" is sent as all', async () => {
    const run = vi.fn(async () => ({ via: 'browser' as const }));
    await runQaExport('qa:enterprise-rollup:export', 'enterprise-rollup-2026-10-13.csv', { allFacilities: true }, {}, vi.fn(), { run });
    expect(run).toHaveBeenCalledWith(expect.objectContaining({ kind: 'qa.enterprise-rollup', facilityId: 'all' }));
  });
  it('a capability with no export kind is built in the browser as before', async () => {
    const run = vi.fn();
    const build = vi.fn(async () => 'built');
    expect(await runQaExport('qa:not-a-kind:export', 'x.csv', {}, {}, build, { run })).toBe('built');
    expect(run).not.toHaveBeenCalled();
  });
});
