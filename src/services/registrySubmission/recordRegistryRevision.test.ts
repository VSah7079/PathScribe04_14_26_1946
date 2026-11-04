// src/services/registrySubmission/recordRegistryRevision.test.ts
import { describe, it, expect, vi } from 'vitest';
import { recordRegistryRevision, recordRegistryResponse, reviewRegistryRevision, REGISTRY_REVISION_DEFICIENCY_TYPE, type RegistryRevisionDeps } from './recordRegistryRevision';
import { registryExceptionRows } from './registryExceptions';
import { registryCapaComment, registryRowsWithOpenCapa } from './captureRegistryExceptionAsCapa';

const G = 'aaaaaaaa-0000-8000-8000-0000000000aa';
function setup() {
  const entries: Record<string, any[]> = {
    cytology: [],
    cancer: [
      { id: 'k1', caseId: 'CASE-1', registryId: 'naaccr_us', status: 'SENT', registryStatus: 'accepted', queuedAt: '2026-09-30T00:00:00Z', maxRetriesExceeded: false, submission: { submissionGuid: G, submissionVersion: 1, masterTransactionId: 'm1' } },
      { id: 'k2', caseId: 'CASE-2', registryId: 'naaccr_us', status: 'SENT', registryStatus: 'awaitingAck', queuedAt: '2026-09-30T00:00:00Z', maxRetriesExceeded: false, submission: { submissionGuid: 'g2', submissionVersion: 1, masterTransactionId: 'm2' } },
    ],
  };
  const q = (name: string) => ({
    getAll: async () => ({ ok: true as const, data: entries[name] }),
    setRegistryRevisions: vi.fn(async (id: string, r: any) => { entries[name].find(e => e.id === id).registryRevisions = r; }),
  });
  const audits: any[] = [];
  const raised: any[] = [];
  const deps: RegistryRevisionDeps = {
    queues: { cytology: q('cytology'), cancer: q('cancer') },
    caseIdForAccession: async a => (a === 'S26-1' ? 'CASE-1' : undefined),
    raiseDeficiency: async d => { raised.push(d); return { ok: true, data: { id: `def-${raised.length}` } }; },
    logAudit: e => audits.push(e),
    now: () => new Date('2026-10-01T12:00:00.000Z'),
  };
  return { entries, deps, audits, raised };
}
const revised = (extra: object = {}) => JSON.stringify({ submissionId: G, status: 'REVISED', ackCode: 'AA', revisedPayload: { tnmStage: 'pT2' }, ...extra });

describe('recordRegistryRevision (Batch 425)', () => {
  it('records a revision of an accepted submission, raises a CAPA deficiency, audits; a repeat is a duplicate', async () => {
    const { entries, deps, audits, raised } = setup();
    expect(await recordRegistryRevision({ body: revised() }, deps)).toEqual({ outcome: 'recorded', queue: 'cancer', entryId: 'k1', deficiencyId: 'def-1' });
    expect(raised[0]).toMatchObject({ caseId: 'CASE-1', deficiencyTypeId: REGISTRY_REVISION_DEFICIENCY_TYPE, raisedBy: 'system' });
    expect(raised[0].comment).toContain('tnmStage → pT2');
    expect(raised[0].comment).toContain('[registry cancer:k1]');
    expect(entries.cancer[0].registryRevisions).toEqual([expect.objectContaining({ receivedAt: '2026-10-01T12:00:00.000Z', deficiencyId: 'def-1', responseCode: 'AA', updatedFields: [{ field: 'tnmStage', value: 'pT2' }] })]);
    expect(audits[0]).toMatchObject({ event: 'Registry revised after acceptance', caseId: 'CASE-1' });
    expect((await recordRegistryRevision({ body: revised() }, deps)).outcome).toBe('duplicate');
    expect(raised).toHaveLength(1);
  });
  it('finds the submission by accession and registry', async () => {
    const { deps } = setup();
    const body = JSON.stringify({ event: 'REGISTRY_RESPONSE_UPDATED', status: 'REVISED', accessionId: 'S26-1', registryId: 'naaccr_us', updatedFields: [{ field: 'site', value: 'C50.4' }] });
    expect(await recordRegistryRevision({ body }, deps)).toMatchObject({ outcome: 'recorded', entryId: 'k1' });
  });
  it('refuses a revision of something not accepted, an unknown submission, and garbage', async () => {
    const { deps, raised } = setup();
    expect((await recordRegistryRevision({ body: revised({ submissionId: 'g2' }) }, deps)).outcome).toBe('notAccepted');
    expect((await recordRegistryRevision({ body: revised({ submissionId: 'nope' }) }, deps)).outcome).toBe('unknownSubmission');
    expect((await recordRegistryRevision({ body: '{' }, deps)).outcome).toBe('unparseable');
    expect(raised).toEqual([]);
  });
  it('shows on the Registry Exceptions worklist until reviewed; the auto-raised deficiency counts as the row\'s CAPA', async () => {
    const { entries, deps } = setup();
    await recordRegistryRevision({ body: revised() }, deps);
    const rows = registryExceptionRows({ cytology: [], cancer: entries.cancer });
    expect(rows).toEqual([expect.objectContaining({ entryId: 'k1', kind: 'revisedPostAcceptance', canResend: false, findings: [{ severity: 'INFORMATIONAL', code: 'tnmStage', message: 'pT2' }] })]);
    expect(registryCapaComment(rows[0])).toContain('revised by the registry after acceptance');
    const withCapa = await registryRowsWithOpenCapa(rows, { getCaseDeficiencies: async () => [{ id: 'def-1', deficiencyTypeId: REGISTRY_REVISION_DEFICIENCY_TYPE, status: 'open', comment: 'x [registry cancer:k1]' }] });
    expect([...withCapa]).toEqual(['cancer:k1']);

    const enforce = vi.fn(async () => ({ allowed: false }));
    expect(await reviewRegistryRevision({ queue: 'cancer', entryId: 'k1' }, { id: 'u', name: 'Dr A' }, { ...deps, enforce })).toBe('notPermitted');
    expect(enforce).toHaveBeenCalledWith('registry:revision:review', { queueEntryId: 'k1' });
    const allow = async () => ({ allowed: true });
    expect(await reviewRegistryRevision({ queue: 'cancer', entryId: 'k1' }, { id: 'u', name: 'Dr A' }, { ...deps, enforce: allow })).toBe('reviewed');
    expect(entries.cancer[0].registryRevisions[0]).toMatchObject({ reviewedAt: '2026-10-01T12:00:00.000Z', reviewedBy: 'Dr A' });
    expect(registryExceptionRows({ cytology: [], cancer: entries.cancer })).toEqual([]);
    expect(await reviewRegistryRevision({ queue: 'cancer', entryId: 'k1' }, { id: 'u', name: 'Dr A' }, { ...deps, enforce: allow })).toBe('nothingToReview');
    expect(await reviewRegistryRevision({ queue: 'cancer', entryId: 'zz' }, { id: 'u', name: 'Dr A' }, { ...deps, enforce: allow })).toBe('notFound');
  });
  it('recordRegistryResponse sends a revision one way and an answer the other', async () => {
    const { deps } = setup();
    const answer = vi.fn(async () => ({ outcome: 'applied' }));
    expect(await recordRegistryResponse(revised(), { revision: deps, answer })).toEqual({ kind: 'revision', outcome: 'recorded' });
    expect(await recordRegistryResponse(JSON.stringify({ submissionId: G, status: 'ACCEPTED' }), { revision: deps, answer })).toEqual({ kind: 'answer', outcome: 'applied' });
    expect(answer).toHaveBeenCalledTimes(1);
  });
});
