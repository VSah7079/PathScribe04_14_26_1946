import { describe, expect, it, vi } from 'vitest';
import { authorisePatientSummaryPrint, summaryCases, type PatientSummaryDeps } from './patientSummary';
import type { RelatedCaseSnapshot } from './relatedCaseTypes';

const snap = (id: string, releasedAt: string): RelatedCaseSnapshot => ({
  sourceCaseId: id, accession: `S26-${id}`, releasedAt, sourceVersion: 1, specimens: [], diagnosis: 'Secret diagnosis', copyToPhysicians: [],
});

const deps = (allowed: boolean) => {
  const audit = vi.fn();
  const d: PatientSummaryDeps = { enforce: vi.fn(async () => ({ allowed })), audit };
  return { d, audit };
};

describe('patient summary print', () => {
  it('orders by release date', () => {
    expect(summaryCases([snap('b', '2026-02-01'), snap('a', '2026-01-01')]).map(c => c.sourceCaseId)).toEqual(['a', 'b']);
  });
  it('needs at least one chosen case', async () => {
    const { d } = deps(true);
    expect(await authorisePatientSummaryPrint({ patientId: 'P1', chosen: [], user: 'u' }, d)).toEqual({ ok: false, reason: 'nothingChosen' });
  });
  it('is refused without the capability and writes no audit entry', async () => {
    const { d, audit } = deps(false);
    expect(await authorisePatientSummaryPrint({ patientId: 'P1', chosen: [snap('a', '2026-01-01')], user: 'u' }, d)).toEqual({ ok: false, reason: 'notPermitted' });
    expect(audit).not.toHaveBeenCalled();
  });
  it('audits who, which patient and how many, never case text', async () => {
    const { d, audit } = deps(true);
    const r = await authorisePatientSummaryPrint({ patientId: 'P1', currentCaseId: 'cur', chosen: [snap('a', '2026-01-01')], user: 'u' }, d);
    expect(r).toEqual({ ok: true });
    const e = audit.mock.calls[0][0];
    expect(e.event).toBe('PATIENT_SUMMARY_PRINTED');
    expect(e.detail).toContain('1 released case');
    expect(e.detail).not.toContain('S26-a');
    expect(e.detail).not.toContain('Secret diagnosis');
  });
});
