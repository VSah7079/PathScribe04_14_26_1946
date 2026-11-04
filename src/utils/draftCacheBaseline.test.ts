// Batch 756: the report page's browser draft is written only after something changed since the page settled.
import { describe, it, expect } from 'vitest';
import { draftAutosaveDecision, draftStateJson } from './draftCacheBaseline';

describe('draftAutosaveDecision (Batch 756)', () => {
  it('takes the first settled state as the baseline, skips it unchanged, and saves once it differs', () => {
    const a = draftStateJson({ specimens: [{ blocks: 12 }] });
    const b = draftStateJson({ specimens: [{ blocks: 13 }] });
    expect(draftAutosaveDecision(null, 'u|c1', a)).toBe('baseline');
    expect(draftAutosaveDecision({ key: 'u|c1', json: a! }, 'u|c1', a)).toBe('skip');
    expect(draftAutosaveDecision({ key: 'u|c1', json: a! }, 'u|c1', b)).toBe('save');
  });
  it('starts again for another case or person, and never saves an empty state', () => {
    const a = draftStateJson({ x: 1 });
    expect(draftAutosaveDecision({ key: 'u|c1', json: a! }, 'u|c2', a)).toBe('baseline');
    expect(draftAutosaveDecision(null, 'u|c1', draftStateJson(null))).toBe('skip');
    expect(draftAutosaveDecision(null, 'u|c1', draftStateJson(undefined))).toBe('skip');
  });
  it('treats a state that cannot be written out as nothing to save', () => {
    const loop: Record<string, unknown> = {}; loop.self = loop;
    expect(draftStateJson(loop)).toBeNull();
  });
});
