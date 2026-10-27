// Batch 651: case and specimen comments are audited by the service that posts them (ids and length only, never the text).
import { describe, expect, it, vi } from 'vitest';
import { postCaseComment } from './postCaseComment';
import type { Case } from '@/types/case/Case';

const TEXT = '<p>Patient Mary Smith DOB 1/2/1950 called about the biopsy</p>';
const caseData = { id: 'S26-7', order: { facilityId: 'F1' }, specimens: [{ id: 'SP-A', comments: [] }, { id: 'SP-B' }] } as unknown as Case;
const author = { id: 'U1', name: 'Dr One' };
const mk = (fail = false) => {
  const auditService = { logEvent: vi.fn(async () => ({ ok: true }) as any) };
  const savePatch = vi.fn(async () => { if (fail) throw new Error('conflict'); });
  return { auditService, savePatch, deps: { savePatch, auditService, newId: () => 'cmt-1', now: () => '2026-10-22T10:00:00Z' } };
};

describe('postCaseComment', () => {
  it('case comment: appends to the thread, saves, then writes one audit entry without the text', async () => {
    const { deps, savePatch, auditService } = mk();
    const r = await postCaseComment({ kind: 'case', caseData, caseComments: [], text: TEXT, author, stationId: 'ST1' }, deps);
    expect(r.ok).toBe(true);
    expect(savePatch).toHaveBeenCalledWith('S26-7', { order: expect.objectContaining({ caseComments: [expect.objectContaining({ id: 'cmt-1', text: TEXT, origin: 'pathscribe', syncStatus: 'pending', stationId: 'ST1' })] }) });
    expect(auditService.logEvent).toHaveBeenCalledTimes(1);
    const entry = (auditService.logEvent.mock.calls[0] as any[])[0];
    expect(entry).toMatchObject({ type: 'user', event: 'Case comment added', user: 'Dr One', caseId: 'S26-7', facilityId: 'F1' });
    expect(entry.detail).toContain(`Comment cmt-1 (${TEXT.length} characters)`);
    expect(JSON.stringify(entry)).not.toMatch(/Mary|Smith|1950|biopsy/);
  });

  it('specimen comment: goes on that specimen only, audited with the specimen id', async () => {
    const { deps, savePatch, auditService } = mk();
    await postCaseComment({ kind: 'specimen', caseData, specimenId: 'SP-B', text: TEXT, author }, deps);
    const patch = (savePatch.mock.calls[0] as any[])[1];
    expect(patch.specimens[0].comments).toEqual([]);
    expect(patch.specimens[1].comments).toHaveLength(1);
    const entry = (auditService.logEvent.mock.calls[0] as any[])[0];
    expect(entry).toMatchObject({ event: 'Specimen comment added', caseId: 'S26-7', facilityId: 'F1' });
    expect(entry.detail).toContain('specimen SP-B');
    expect(JSON.stringify(entry)).not.toMatch(/Mary|Smith/);
  });

  it('nothing is audited when the save throws, or when the specimen or case is missing', async () => {
    const failing = mk(true);
    await expect(postCaseComment({ kind: 'case', caseData, text: TEXT, author }, failing.deps)).rejects.toThrow('conflict');
    expect(failing.auditService.logEvent).not.toHaveBeenCalled();
    const ok = mk();
    expect(await postCaseComment({ kind: 'specimen', caseData, specimenId: 'NOPE', text: TEXT, author }, ok.deps)).toEqual({ ok: false, reason: 'noSpecimen' });
    expect(await postCaseComment({ kind: 'case', caseData: {} as Case, text: TEXT, author }, ok.deps)).toEqual({ ok: false, reason: 'noCase' });
    expect(ok.savePatch).not.toHaveBeenCalled();
    expect(ok.auditService.logEvent).not.toHaveBeenCalled();
  });

  it('a failing audit write never undoes the comment', async () => {
    const { deps } = mk();
    const r = await postCaseComment({ kind: 'case', caseData, text: TEXT, author }, { ...deps, auditService: { logEvent: vi.fn(async () => { throw new Error('down'); }) as any } });
    expect(r.ok).toBe(true);
  });
});
