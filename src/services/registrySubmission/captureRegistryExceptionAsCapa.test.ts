// src/services/registrySubmission/captureRegistryExceptionAsCapa.test.ts
// Batch 423: "Capture as CAPA" on the Registry Exceptions worklist, and the live-register hold showing there.
import { describe, it, expect, vi } from 'vitest';
import { captureRegistryExceptionAsCapa, registryCapaComment, registryRowsWithOpenCapa, REGISTRY_CAPA_DEFICIENCY_TYPE, type RegistryCapaDeps } from './captureRegistryExceptionAsCapa';
import { registryExceptionKind, type RegistryExceptionRow } from './registryExceptions';

const row: RegistryExceptionRow = {
  queue: 'cytology', entryId: 'q9', caseId: 'S26-1-CYT', registryId: 'csms_uk', kind: 'rejectedFatal',
  submissionVersion: 2, messageType: 'CORRECTION', environment: 'production', at: '2026-10-01T10:00:00Z',
  findings: [{ severity: 'FATAL', code: 'NHS-01', message: 'NHS number not recognised' }], canResend: true,
};

function makeDeps(existing: { id: string; deficiencyTypeId: string; status: string; comment?: string }[] = [], allowed = true) {
  const raised: any[] = [];
  const deps: RegistryCapaDeps = {
    enforce: vi.fn(async () => ({ allowed })),
    getCaseDeficiencies: async () => [...existing, ...raised.map((r, i) => ({ id: `d${i}`, status: 'open', ...r }))],
    raise: vi.fn(async d => { raised.push(d); return { ok: true, data: { id: `d${raised.length - 1}` } }; }),
    logAudit: vi.fn(),
  };
  return { deps, raised };
}

describe('captureRegistryExceptionAsCapa (Batch 423)', () => {
  it('raises an open case-level deficiency of the registry type, with what went wrong, and audits it', async () => {
    const { deps, raised } = makeDeps();
    const r = await captureRegistryExceptionAsCapa(row, { id: '3', name: 'Pete Nimmo' }, deps);
    expect(r).toEqual({ outcome: 'captured', deficiencyId: 'd0' });
    expect(deps.enforce).toHaveBeenCalledWith('screen:registry-exceptions:open', { queueEntryId: 'q9' });
    expect(raised[0]).toEqual({ caseId: 'S26-1-CYT', deficiencyTypeId: REGISTRY_CAPA_DEFICIENCY_TYPE, raisedBy: '3', comment: registryCapaComment(row) });
    expect(raised[0].comment).toBe('Registry submission rejected by the registry (csms_uk v2 CORRECTION, live register). Findings: FATAL NHS-01: NHS number not recognised. [registry cytology:q9]');
    expect(deps.logAudit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Registry exception captured as CAPA', caseId: 'S26-1-CYT' }));
  });

  it('one open CAPA per submission; a closed one doesn\'t count', async () => {
    const { deps } = makeDeps();
    await captureRegistryExceptionAsCapa(row, { id: '3', name: 'P' }, deps);
    expect((await captureRegistryExceptionAsCapa(row, { id: '3', name: 'P' }, deps)).outcome).toBe('alreadyCaptured');
    const closed = makeDeps([{ id: 'x', deficiencyTypeId: REGISTRY_CAPA_DEFICIENCY_TYPE, status: 'closed', comment: '[registry cytology:q9]' }]);
    expect((await captureRegistryExceptionAsCapa(row, { id: '3', name: 'P' }, closed.deps)).outcome).toBe('captured');
    expect(await registryRowsWithOpenCapa([row, { ...row, entryId: 'q10' }], deps)).toEqual(new Set(['cytology:q9']));
  });

  it('needs the worklist\'s screen capability', async () => {
    const { deps } = makeDeps([], false);
    expect((await captureRegistryExceptionAsCapa(row, { id: '3', name: 'P' }, deps)).outcome).toBe('notPermitted');
    expect(deps.raise).not.toHaveBeenCalled();
  });

  it('a submission held for want of a go-live approval is its own kind: held, attestation required (Batch 424)', () => {
    expect(registryExceptionKind({ id: 'q', caseId: 'c', registryId: 'csms_uk', status: 'FAILED', queuedAt: 't', errorCode: 'REGISTRY_LIVE_NOT_APPROVED', maxRetriesExceeded: false })).toBe('attestationRequired');
    expect(registryExceptionKind({ id: 'q', caseId: 'c', registryId: 'csms_uk', status: 'FAILED', queuedAt: 't', errorCode: 'REGISTRY_NOT_READY', maxRetriesExceeded: false })).toBe('held');
  });
});
