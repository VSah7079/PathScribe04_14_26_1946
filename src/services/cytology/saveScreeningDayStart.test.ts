// src/services/cytology/saveScreeningDayStart.test.ts — Batch 574.
import { describe, it, expect, vi } from 'vitest';
import { saveScreeningDayStart } from './saveScreeningDayStart';

const deps = (over: Record<string, unknown> = {}) => ({
  enforce: vi.fn(async () => ({ allowed: true })),
  get: async () => ({ ok: true, data: { screeningDayStartHour: 0 } }),
  update: vi.fn(async () => ({ ok: true })),
  logAudit: vi.fn(),
  ...over,
});

describe('saveScreeningDayStart', () => {
  it('checks the capability, saves, and audits the hour before and after', async () => {
    const d = deps();
    expect(await saveScreeningDayStart(6, { id: 'u1', name: 'Lab Director' }, d)).toBe('saved');
    expect(d.enforce).toHaveBeenCalledWith('config:cytology-workload-cap:manage');
    expect(d.update).toHaveBeenCalledWith({ screeningDayStartHour: 6 });
    expect(d.logAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Cytology screening day start changed', user: 'Lab Director', detail: expect.stringContaining('from 00:00 to 06:00') }));
  });
  it('refused without the capability; nothing saved or audited for an invalid or unchanged hour, or a failed save', async () => {
    const no = deps({ enforce: async () => ({ allowed: false }) });
    expect(await saveScreeningDayStart(6, { id: 'u1' }, no)).toBe('notPermitted');
    expect(no.update).not.toHaveBeenCalled();
    expect(await saveScreeningDayStart(24, { id: 'u1' }, deps())).toBe('invalid');
    const same = deps();
    expect(await saveScreeningDayStart(0, { id: 'u1' }, same)).toBe('unchanged');
    expect(same.logAudit).not.toHaveBeenCalled();
    const failed = deps({ update: async () => ({ ok: false }) });
    expect(await saveScreeningDayStart(6, { id: 'u1' }, failed)).toBe('failed');
    expect(failed.logAudit).not.toHaveBeenCalled();
  });
});
