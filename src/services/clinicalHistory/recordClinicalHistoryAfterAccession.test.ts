// Batch 530 (Pete): clinical history added or reconciled after accession.
import { describe, it, expect, vi } from 'vitest';
import { recordClinicalHistoryAfterAccession, clinicalHistoryChangeAudit } from './recordClinicalHistoryAfterAccession';
import type { Case } from '@/types/case/Case';

const entry = (code: string | null) => ({ historyCode: code, categoryCode: 'SYM' as const, metadata: {}, ...(code ? {} : { unmappedTextFallback: 'patient said' }) });

const make = (c: Partial<Case>, allowed = true) => {
  let stored = { id: 'c1', version: 3, status: 'gross-complete', order: { clinicalIndication: '' }, ...c } as unknown as Case;
  const audit = vi.fn(async () => undefined);
  const deps = {
    getCase: async () => stored,
    updateCase: vi.fn(async (_id: string, updates: Partial<Case>, version: number) => {
      if (version !== (stored.version ?? 0)) throw new Error('conflict');
      stored = { ...stored, ...updates, version: version + 1 } as Case;
    }),
    enforce: vi.fn(async () => ({ allowed })),
    audit, actorName: () => 'Dr Res',
  };
  return { deps, audit, stored: () => stored };
};

describe('recording clinical history after accession', () => {
  it('needs case:clinical-history:record', async () => {
    const { deps } = make({}, false);
    expect(await recordClinicalHistoryAfterAccession('c1', [entry('SYM-01')], deps)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(deps.enforce).toHaveBeenCalledWith('case:clinical-history:record', { caseId: 'c1' });
    expect(deps.updateCase).not.toHaveBeenCalled();
  });
  it('saves the case-level entries with the case version and audits the codes', async () => {
    const { deps, audit, stored } = make({});
    const res = await recordClinicalHistoryAfterAccession('c1', [entry('SYM-01'), entry(null)], deps);
    expect(res).toMatchObject({ ok: true, version: 4 });
    expect(stored().order.clinicalHistory).toHaveLength(2);
    expect((audit.mock.calls[0] as unknown[])[0]).toMatchObject({
      event: 'CLINICAL_HISTORY_UPDATED', caseId: 'c1', user: 'Dr Res',
      detail: 'Clinical history recorded after accession: added SYM-01, SYM (unmapped text) (2 entries now).',
    });
    expect(JSON.stringify(audit.mock.calls)).not.toContain('patient said');
  });
  it('refused once the case is signed out (a change then needs an amendment); nothing changed is not saved', async () => {
    expect(await recordClinicalHistoryAfterAccession('c1', [entry('SYM-01')], make({ status: 'finalized' } as never).deps)).toEqual({ ok: false, reason: 'signedOut' });
    const same = make({ order: { clinicalHistory: [entry('SYM-01')] } } as never);
    expect(await recordClinicalHistoryAfterAccession('c1', [entry('SYM-01')], same.deps)).toEqual({ ok: false, reason: 'noChange' });
  });
  it('audit: removals are named; no change, no entry', () => {
    expect(clinicalHistoryChangeAudit('c1', [entry('A'), entry('B')], [entry('A')], 'X')?.detail).toBe('Clinical history recorded after accession: removed B (1 entry now).');
    expect(clinicalHistoryChangeAudit('c1', [entry('A')], [entry('A')], 'X')).toBeNull();
  });
});
