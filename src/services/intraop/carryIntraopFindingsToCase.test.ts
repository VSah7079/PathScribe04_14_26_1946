import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IntraoperativeEntry } from '@/types/intraop/IntraoperativeEntry';

const store = vi.hoisted(() => ({ c: null as null | Record<string, unknown> }));
const audit = vi.hoisted(() => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../cases/CaseRouter', () => ({
  caseRouter: {
    getCase: async () => store.c,
    updateCase: async (_id: string, u: Record<string, unknown>) => { store.c = { ...store.c!, ...u, version: ((store.c!.version as number) ?? 0) + 1 }; },
  },
}));
vi.mock('../auditlog/mockAuditService', () => ({ mockAuditService: audit }));

import { buildIntraopFindings, carryIntraopFindingsToCase, mergeIntraopFindings } from './carryIntraopFindingsToCase';

const entry = (over: Partial<IntraoperativeEntry> = {}): IntraoperativeEntry => ({
  id: 'sess-1',
  patientMatch: { source: 'barcode', patientName: 'X', mrn: '1', confirmedAt: 't' },
  performedBy: { userId: 'u', userName: 'Dr U' },
  orNumber: 'OR1', surgeon: 'S', status: 'pending', createdAt: 't',
  specimens: [
    { id: 'a', specimenLabel: 'A: breast', arrivalTimestamp: 't', milestones: [], preparations: [],
      frozenSectionDiagnosis: 'Invasive carcinoma', frozenCategory: 'malignant', frozenDiagnosisRenderedAt: 'r',
      digitalAssets: [{ id: 'p1', kind: 'gross_photo', url: 'https://x/p1', capturedAt: 't' } as never] },
    { id: 'b', specimenLabel: 'B: node', arrivalTimestamp: 't', milestones: [], preparations: [] },
  ],
  ...over,
} as IntraoperativeEntry);

beforeEach(() => {
  audit.logEvent.mockClear();
  store.c = { id: 'C1', version: 1, diagnostic: { finalDiagnosis: 'FINAL' }, intraoperativeFindings: [{ sessionId: 'other', intraopSpecimenId: 'z' }] };
});

describe('carryIntraopFindingsToCase', () => {
  it('builds one labelled finding per specimen that has a diagnosis or a photo', () => {
    const f = buildIntraopFindings(entry(), 'me', 'now');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: 'intraoperative', sessionId: 'sess-1', frozenSectionDiagnosis: 'Invasive carcinoma', frozenCategory: 'malignant' });
    expect(f[0].photos[0].url).toBe('https://x/p1');
  });

  it('writes onto the case, keeps other sessions, never touches the final diagnosis, and audits', async () => {
    const r = await carryIntraopFindingsToCase(entry(), 'C1', 'me');
    expect(r).toEqual({ ok: true, carried: 1 });
    const c = store.c as { diagnostic: unknown; intraoperativeFindings: { sessionId: string }[] };
    expect(c.diagnostic).toEqual({ finalDiagnosis: 'FINAL' });
    expect(c.intraoperativeFindings.map(x => x.sessionId).sort()).toEqual(['other', 'sess-1']);
    expect(audit.logEvent).toHaveBeenCalledTimes(1);
  });

  it('a repeat carry replaces, not duplicates', async () => {
    await carryIntraopFindingsToCase(entry(), 'C1', 'me');
    await carryIntraopFindingsToCase(entry(), 'C1', 'me');
    const c = store.c as { intraoperativeFindings: { sessionId: string }[] };
    expect(c.intraoperativeFindings.filter(x => x.sessionId === 'sess-1')).toHaveLength(1);
    expect(mergeIntraopFindings(undefined, [], 's')).toEqual([]);
  });

  it('a session with nothing to carry writes nothing', async () => {
    const e = entry({ specimens: [entry().specimens[1]] });
    expect(await carryIntraopFindingsToCase(e, 'C1', 'me')).toEqual({ ok: true, carried: 0 });
    expect(audit.logEvent).not.toHaveBeenCalled();
  });
});
