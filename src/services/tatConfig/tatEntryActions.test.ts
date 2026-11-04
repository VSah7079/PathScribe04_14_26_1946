// @vitest-environment happy-dom
// Batch 450 (PS-38): the TAT settings actions write their audit entries, and a
// change the service refuses writes none. Runs against the real mock service.
import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockTatTargetService, TAT_TARGET_STORAGE_KEY } from './mockTatTargetService';
import { SYSTEM_DEFAULT_TAT_ENTRIES } from './systemDefaultTatEntries';
import { saveTatEntry, toggleTatEntry, deleteTatEntry, type TatAuditLog } from './tatEntryActions';
import type { TATEntry } from '@/types/quality/TatConfigEntry';

const custom = (over: Partial<TATEntry> = {}): TATEntry => ({
  id: 'tat-ps38', type: 'TOTAL_CASE', targetHours: 12, urgency: 'ROUTINE', facilityId: 'c1', performingLabFacilityId: null,
  specimenId: null, subspecialtyId: null, roleId: null, active: true, notes: '', createdAt: '2026-10-03T00:00:00Z', ...over,
});
const all = async () => { const r = await mockTatTargetService.getAll(); return r.ok ? r.data : []; };

describe('TAT settings actions write the audit trail (PS-38)', () => {
  let log: ReturnType<typeof vi.fn> & TatAuditLog;
  beforeEach(() => { localStorage.removeItem(TAT_TARGET_STORAGE_KEY); log = vi.fn() as typeof log; });

  it('adding a target is saved and audited as tat_entry_created', async () => {
    const res = await saveTatEntry(mockTatTargetService, log, custom(), 'add');
    expect(res.ok).toBe(true);
    expect((await all()).some(e => e.id === 'tat-ps38')).toBe(true);
    expect(log).toHaveBeenCalledWith('tat_entry_created', { type: 'TOTAL_CASE', targetHours: 12, facilityId: 'c1', roleId: null });
  });

  it('editing a target is saved and audited as tat_entry_updated with the new hours', async () => {
    await saveTatEntry(mockTatTargetService, log, custom(), 'add');
    await saveTatEntry(mockTatTargetService, log, custom({ targetHours: 8 }), 'edit');
    expect((await all()).find(e => e.id === 'tat-ps38')?.targetHours).toBe(8);
    expect(log).toHaveBeenLastCalledWith('tat_entry_updated', { id: 'tat-ps38', type: 'TOTAL_CASE', changes: ['targetHours: 8h'] });
  });

  it('switching a target off and on is saved and audited each time', async () => {
    await saveTatEntry(mockTatTargetService, log, custom(), 'add');
    await toggleTatEntry(mockTatTargetService, log, await all(), 'tat-ps38');
    expect((await all()).find(e => e.id === 'tat-ps38')?.active).toBe(false);
    expect(log).toHaveBeenLastCalledWith('tat_entry_toggled', { id: 'tat-ps38', type: 'TOTAL_CASE', active: false });
    await toggleTatEntry(mockTatTargetService, log, await all(), 'tat-ps38');
    expect(log).toHaveBeenLastCalledWith('tat_entry_toggled', { id: 'tat-ps38', type: 'TOTAL_CASE', active: true });
  });

  it('a system default can be switched off, and that is audited', async () => {
    const sys = SYSTEM_DEFAULT_TAT_ENTRIES[0];
    const res = await toggleTatEntry(mockTatTargetService, log, await all(), sys.id);
    expect(res?.ok).toBe(true);
    expect(log).toHaveBeenCalledWith('tat_entry_toggled', { id: sys.id, type: sys.type, active: !sys.active });
  });

  it('deleting a custom target removes it and is audited as tat_entry_deleted', async () => {
    await saveTatEntry(mockTatTargetService, log, custom(), 'add');
    const res = await deleteTatEntry(mockTatTargetService, log, await all(), 'tat-ps38');
    expect(res.ok).toBe(true);
    expect((await all()).some(e => e.id === 'tat-ps38')).toBe(false);
    expect(log).toHaveBeenLastCalledWith('tat_entry_deleted', { id: 'tat-ps38', type: 'TOTAL_CASE' });
  });

  it('deleting a system default is refused, the target stays, and nothing is audited', async () => {
    const sys = SYSTEM_DEFAULT_TAT_ENTRIES[0];
    const res = await deleteTatEntry(mockTatTargetService, log, await all(), sys.id);
    expect(res).toEqual({ ok: false, error: 'systemDefault' });
    expect((await all()).some(e => e.id === sys.id)).toBe(true);
    expect(log).not.toHaveBeenCalled();
  });

  it('a change the service refuses (e.g. no permission) is not audited', async () => {
    const refusing = {
      add: async () => ({ ok: false as const, error: 'forbidden' }),
      update: async () => ({ ok: false as const, error: 'forbidden' }),
      remove: async () => ({ ok: false as const, error: 'forbidden' }),
    } as unknown as Parameters<typeof saveTatEntry>[0];
    await saveTatEntry(refusing, log, custom(), 'add');
    await toggleTatEntry(refusing, log, [custom()], 'tat-ps38');
    await deleteTatEntry(refusing, log, [custom()], 'tat-ps38');
    expect(log).not.toHaveBeenCalled();
  });

  it('switching an unknown id does nothing', async () => {
    expect(await toggleTatEntry(mockTatTargetService, log, [], 'missing')).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });
});
