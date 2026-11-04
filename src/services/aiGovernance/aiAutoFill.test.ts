// Batch 689: auto-filled AI values are recorded, never silently kept.
import { describe, it, expect, vi } from 'vitest';
import { applyAiAutoFill, aiAutoFillAudit, recordAiAutoFill } from './aiAutoFill';

describe('applyAiAutoFill', () => {
  const sugg = { a: { value: 'x', confidence: 90 }, b: { value: ['y'], confidence: 60 }, c: { value: 'z', confidence: 95 }, d: { value: 'w', confidence: 80 } };
  it('fills only empty fields at or above the threshold and reports which', () => {
    const r = applyAiAutoFill({ c: 'typed', d: [] }, sugg, 75);
    expect(r.answers).toEqual({ a: 'x', c: 'typed', d: 'w' });
    expect(r.filled.sort()).toEqual(['a', 'd']);
  });
  it('does not change the input', () => {
    const input = { c: 'typed' }; applyAiAutoFill(input, sugg, 75); expect(input).toEqual({ c: 'typed' });
  });
});
describe('aiAutoFillAudit', () => {
  it('nothing filled, nothing recorded', () => expect(aiAutoFillAudit(0, 'page-load', { caseId: 'c', userName: 'u' })).toBeNull());
  it('names the count and trigger, never a value', () => {
    const e = aiAutoFillAudit(2, 'regenerate-from-gross', { caseId: 'c1', userName: 'Dr Chen' })!;
    expect(e.event).toBe('AI_VALUES_AUTOFILLED');
    expect(e.detail).toContain('2 fields');
    expect(e.detail).toContain('Regenerate from Gross');
    expect(e.caseId).toBe('c1');
  });
  it('a failed audit write is swallowed', async () => {
    const logEvent = vi.fn().mockRejectedValue(new Error('x'));
    recordAiAutoFill({ logEvent }, 1, 'page-load', { caseId: 'c', userName: 'u' });
    await Promise.resolve(); expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
