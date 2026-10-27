// Batch 669 (everyday-22): "Apply STAT Flag" really applies STAT.
import { describe, expect, it, vi } from 'vitest';
import { applyStatFlagToCase, findStatFlag, STAT_FLAG_MESSAGE_KEY, type ApplyStatDeps } from './applyStatFlag';

const defs = [
  { id: 'f2', name: 'Malignant', lisCode: 'MAL', level: 'case', active: true },
  { id: 'f1', name: 'STAT — Rush Processing', lisCode: 'STAT', level: 'case', active: true },
];
const deps = (over: Partial<ApplyStatDeps> = {}): ApplyStatDeps => ({
  enforce: vi.fn(async () => ({ allowed: true })),
  getCase: vi.fn(async () => ({ caseFlags: [] })),
  applyFlag: vi.fn(async () => undefined),
  audit: vi.fn(),
  ...over,
});

describe('applyStatFlagToCase', () => {
  it('finds the active case-level flag with the STAT code', () => {
    expect(findStatFlag(defs)?.id).toBe('f1');
    expect(findStatFlag([{ ...defs[1], active: false }])).toBeUndefined();
    expect(findStatFlag([{ ...defs[1], level: 'specimen' }])).toBeUndefined();
  });

  it('applies STAT and audits it like a Flag Manager save', async () => {
    const d = deps();
    expect(await applyStatFlagToCase({ caseId: 'C1', definitions: defs }, d)).toBe('applied');
    expect(d.enforce).toHaveBeenCalledWith('case:flag:apply', { caseId: 'C1' });
    expect(d.applyFlag).toHaveBeenCalledWith({ caseId: 'C1', flagDefinitionId: 'f1' });
    expect(d.audit).toHaveBeenCalledWith({ action: 'flag_applied', caseId: 'C1', flagName: 'STAT — Rush Processing' });
  });

  it('without the capability nothing is applied or audited', async () => {
    const d = deps({ enforce: vi.fn(async () => ({ allowed: false })) });
    expect(await applyStatFlagToCase({ caseId: 'C1', definitions: defs }, d)).toBe('notPermitted');
    expect(d.applyFlag).not.toHaveBeenCalled(); expect(d.audit).not.toHaveBeenCalled();
  });

  it('a case already STAT is left alone (never toggled off)', async () => {
    const d = deps({ getCase: vi.fn(async () => ({ caseFlags: [{ flagDefinitionId: 'f1', deletedAt: null }] })) });
    expect(await applyStatFlagToCase({ caseId: 'C1', definitions: defs }, d)).toBe('alreadyStat');
    expect(d.applyFlag).not.toHaveBeenCalled(); expect(d.audit).not.toHaveBeenCalled();
  });

  it('a removed STAT flag does not count as STAT', async () => {
    const d = deps({ getCase: vi.fn(async () => ({ caseFlags: [{ flagDefinitionId: 'f1', deletedAt: 'x' }] })) });
    expect(await applyStatFlagToCase({ caseId: 'C1', definitions: defs }, d)).toBe('applied');
  });

  it('reports a missing STAT flag and a failed apply, auditing neither', async () => {
    const d1 = deps();
    expect(await applyStatFlagToCase({ caseId: 'C1', definitions: [defs[0]] }, d1)).toBe('noStatFlag');
    const d2 = deps({ applyFlag: vi.fn(async () => { throw new Error('x'); }) });
    expect(await applyStatFlagToCase({ caseId: 'C1', definitions: defs }, d2)).toBe('failed');
    expect(d1.audit).not.toHaveBeenCalled(); expect(d2.audit).not.toHaveBeenCalled();
  });

  it('every outcome has a message key', () => {
    expect(Object.keys(STAT_FLAG_MESSAGE_KEY).sort()).toEqual(['alreadyStat', 'applied', 'failed', 'noStatFlag', 'notPermitted']);
  });
});
