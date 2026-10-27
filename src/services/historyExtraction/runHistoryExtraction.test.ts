// Batch 621: the open/refresh flow: setting, permission, cache, save, audit.
import { describe, it, expect, vi } from 'vitest';
import { readStoredExtraction, runHistoryExtraction, type HistoryExtractionRunDeps } from './runHistoryExtraction';
import { hashSourceText, type HistoryExtraction, type HistoryExtractionSetting } from './historyExtraction';

const text = { diagnosis: 'Invasive ductal carcinoma', microscopic: 'Grade 2.' };
const on: HistoryExtractionSetting[] = [{ id: 's', facilityId: null, enabled: true, updatedAt: '' }];
const made: HistoryExtraction = { sourceCaseId: 'S26-1', sourceTextHash: hashSourceText(text), status: 'extracted', fields: [{ fieldId: 'g', label: 'G', value: '2', display: '2' }], templateId: 'breast', extractedAt: 't', verification: 'ai-unverified' };

function deps(over: Partial<HistoryExtractionRunDeps> = {}) {
  const audit = vi.fn();
  const d: HistoryExtractionRunDeps = {
    getSettings: async () => on, enforce: vi.fn(async () => ({ allowed: true })), getStored: async () => null,
    extract: vi.fn(async () => made), save: vi.fn(async () => undefined), audit, ...over,
  };
  return { d, audit };
}
const input = { sourceCaseId: 'S26-1', facilityId: 'fac-a', text };

describe('runHistoryExtraction', () => {
  it('does nothing when the setting is off (the default) and asks for no permission', async () => {
    const { d } = deps({ getSettings: async () => [] });
    expect(await runHistoryExtraction(input, d)).toEqual({ state: 'off' });
    expect(d.extract).not.toHaveBeenCalled();
    expect(d.enforce).not.toHaveBeenCalled();
  });
  it('honours a facility that turned it off over an enterprise that turned it on', async () => {
    const { d } = deps({ getSettings: async () => [...on, { id: 'f', facilityId: 'fac-a', enabled: false, updatedAt: '' }] });
    expect(await runHistoryExtraction(input, d)).toEqual({ state: 'off' });
  });
  it('does nothing without the permission', async () => {
    const { d } = deps({ enforce: async () => ({ allowed: false }) });
    expect(await runHistoryExtraction(input, d)).toEqual({ state: 'notPermitted' });
    expect(d.extract).not.toHaveBeenCalled();
  });
  it('runs, saves and audits once without patient text', async () => {
    const { d, audit } = deps();
    expect(await runHistoryExtraction(input, d)).toEqual({ state: 'ready', extraction: made, ran: true });
    expect(d.save).toHaveBeenCalledWith(made);
    expect(d.enforce).toHaveBeenCalledWith({ caseId: 'S26-1', facilityId: 'fac-a' });
    expect(audit).toHaveBeenCalledTimes(1);
    const entry = audit.mock.calls[0][0] as { event: string; detail: string; caseId: string };
    expect(entry.event).toBe('HISTORY_EXTRACTION_RUN');
    expect(entry.caseId).toBe('S26-1');
    expect(entry.detail).toContain('template breast');
    expect(entry.detail).not.toMatch(/carcinoma|Grade/i);
  });
  it('uses the stored extraction for the same text: no AI, no save, no audit', async () => {
    const { d, audit } = deps({ getStored: async () => made });
    expect(await runHistoryExtraction(input, d)).toEqual({ state: 'ready', extraction: made, ran: false });
    expect(d.extract).not.toHaveBeenCalled();
    expect(d.save).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });
  it('a failed save does not lose the result, and a failed run never throws', async () => {
    const a = deps({ save: async () => { throw new Error('storage'); } });
    expect((await runHistoryExtraction(input, a.d)).state).toBe('ready');
    const b = deps({ extract: async () => { throw new Error('boom'); } });
    expect(await runHistoryExtraction(input, b.d)).toEqual({ state: 'none' });
  });
  it('records a failed extraction and audits it with its code', async () => {
    const failed: HistoryExtraction = { ...made, status: 'failed', failure: 'vendorNotAllowed', fields: [], templateId: undefined };
    const { d, audit } = deps({ extract: async () => failed });
    await runHistoryExtraction(input, d);
    expect(d.save).toHaveBeenCalledWith(failed);
    expect((audit.mock.calls[0][0] as { detail: string }).detail).toContain('vendorNotAllowed');
  });
});

describe('readStoredExtraction', () => {
  it('shows what is stored without running anything, only when on and permitted', async () => {
    expect(await readStoredExtraction(input, deps({ getStored: async () => made }).d)).toEqual({ state: 'ready', extraction: made, ran: false });
    expect(await readStoredExtraction(input, deps().d)).toEqual({ state: 'none' });
    expect(await readStoredExtraction(input, deps({ getSettings: async () => [] }).d)).toEqual({ state: 'off' });
    expect(await readStoredExtraction(input, deps({ enforce: async () => ({ allowed: false }) }).d)).toEqual({ state: 'notPermitted' });
  });
});
