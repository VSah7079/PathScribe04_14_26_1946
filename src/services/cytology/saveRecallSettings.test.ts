// Batch 640: saving one country's recall windows and wording.
import { describe, it, expect, vi } from 'vitest';
import { saveRecallSettings, withJurisdictionWording, recallSettingsAuditDetail } from './saveRecallSettings';
import { DEFAULT_RECALL_WINDOWS } from './recallWindows';

function setup(initial: object = { screeningStrategy: 'co_testing' }) {
  let stored: any = initial;
  const strategy: any = { get: vi.fn(async () => ({ ok: true, data: stored })), update: vi.fn(async (p: any) => { stored = p; return { ok: true, data: p }; }) };
  return { strategy, logAudit: vi.fn(), get stored() { return stored; } };
}
const user = { name: 'Pat Admin' };

describe('saveRecallSettings', () => {
  it('saves one country, keeps the other, trims the text, and audits who changed what', async () => {
    const s = setup({ screeningStrategy: 'co_testing', selfCollectedRecallWording: { NZ: { repeat_collection: { en: 'NZ text' } } }, selfCollectedRecallWindowsByJurisdiction: { NZ: DEFAULT_RECALL_WINDOWS } });
    const windows = { ...DEFAULT_RECALL_WINDOWS, urgent: { min: 1, max: 2 } };
    const out = await saveRecallSettings({ jurisdiction: 'AU', windows, wording: { AU: { clinician_lbc: { en: '  Custom {{type}}  ', fr: '   ' } } } }, user, s);
    expect(out).toBe('saved');
    expect(s.stored.selfCollectedRecallWindowsByJurisdiction.AU.urgent).toEqual({ min: 1, max: 2 });
    expect(s.stored.selfCollectedRecallWindowsByJurisdiction.NZ).toEqual(DEFAULT_RECALL_WINDOWS);
    expect(s.stored.selfCollectedRecallWording).toEqual({ AU: { clinician_lbc: { en: 'Custom {{type}}' } }, NZ: { repeat_collection: { en: 'NZ text' } } });
    expect(s.logAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'RECALL_SETTINGS_CHANGED', user: 'Pat Admin', detail: expect.stringContaining('urgent 1-2 weeks') }));
  });
  it('refuses an invalid window or wording without saving or auditing', async () => {
    const s = setup();
    expect(await saveRecallSettings({ jurisdiction: 'AU', windows: { ...DEFAULT_RECALL_WINDOWS, routine: { min: 9, max: 3 } }, wording: {} }, user, s)).toBe('invalid');
    expect(await saveRecallSettings({ jurisdiction: 'AU', windows: DEFAULT_RECALL_WINDOWS, wording: { AU: { clinician_lbc: { en: '{{bad}}' } } } }, user, s)).toBe('invalid');
    expect(s.strategy.update).not.toHaveBeenCalled();
    expect(s.logAudit).not.toHaveBeenCalled();
  });
  it('a failed write is reported and not audited', async () => {
    const s = setup(); s.strategy.update = vi.fn(async () => ({ ok: false }));
    expect(await saveRecallSettings({ jurisdiction: 'NZ', windows: DEFAULT_RECALL_WINDOWS, wording: {} }, user, s)).toBe('failed');
    expect(s.logAudit).not.toHaveBeenCalled();
  });
  it('emptying all wording for a country removes it; the audit text names built-in text when none is set', () => {
    expect(withJurisdictionWording({ AU: { clinician_lbc: { en: 'x' } } }, 'AU', {})).toEqual({});
    expect(recallSettingsAuditDetail('NZ', DEFAULT_RECALL_WINDOWS, {}, 'Pat')).toContain('none (built-in text)');
  });
});
