// Batch 759 (Patient Verification spec §2.2): the Manual Entry flag on the audit trail and the station scan log.
import { describe, it, expect, vi } from 'vitest';
import { manualEntryAudit, recordManualEntry, workspaceModuleOf, type ManualEntry } from './manualEntryLog';

const entry = (over: Partial<ManualEntry> = {}): ManualEntry => ({
  value: 'S26-0001-A3', module: 'embedding', via: 'scanField', caseAccession: 'S26-0001', itemId: 'S26-0001-A3', materialType: 'block',
  stationId: 'st-emb-1', userId: 'u-7', userName: 'Kevin Brooks', ...over,
});

describe('manualEntryLog (Batch 759)', () => {
  it('names every Pathology Workspace module from the screen address', () => {
    expect(workspaceModuleOf('/workstations/grossing')).toBe('grossing');
    expect(workspaceModuleOf('/workstations/microtomy')).toBe('microtome');
    expect(workspaceModuleOf('/add-on-orders')).toBe('addOnOrders');
    expect(workspaceModuleOf('/margin-exception-review')).toBe('marginExceptionReview');
    expect(workspaceModuleOf('/cytology-worklist/c1')).toBe('cytology');
    expect(workspaceModuleOf('/batch-management/disposal')).toBe('batchManagement');
    expect(workspaceModuleOf('/case/c1/grossing')).toBe('caseScreens');
    expect(workspaceModuleOf('/home')).toBe('other');
  });

  it('the audit entry has the case, the workstation, the user and what was typed (no patient details)', () => {
    expect(manualEntryAudit(entry())).toEqual({
      type: 'user', event: 'Manual Entry', user: 'Kevin Brooks', caseId: 'S26-0001', confidence: null, stationId: 'st-emb-1',
      detail: 'Typed, not scanned, in the Embedding scan field: "S26-0001-A3". User Kevin Brooks (u-7); workstation st-emb-1.',
    });
    expect(manualEntryAudit(entry({ via: 'search', stationId: null, module: 'caseScreens' })).detail).toMatch(/Case screens search.*workstation not set/);
  });

  it('writes the audit entry and a `typed` station event; no station event without a station or an item', async () => {
    const audit = vi.fn(async () => undefined);
    const station = vi.fn(async () => undefined);
    await recordManualEntry(entry(), { audit, station });
    expect(audit).toHaveBeenCalledTimes(1);
    expect(station).toHaveBeenCalledWith([expect.objectContaining({ itemId: 'S26-0001-A3', action: 'typed', result: 'ok', stationId: 'st-emb-1', caseAccession: 'S26-0001', note: 'Manual entry (Embedding)' })]);
    station.mockClear();
    await recordManualEntry(entry({ stationId: null }), { audit, station });
    await recordManualEntry(entry({ itemId: undefined }), { audit, station });
    expect(station).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledTimes(3);
  });

  it('never throws when a log is down', async () => {
    await expect(recordManualEntry(entry(), { audit: async () => { throw new Error('down'); }, station: async () => { throw new Error('down'); } })).resolves.toBeUndefined();
  });
});
