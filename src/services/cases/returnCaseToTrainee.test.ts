import { describe, it, expect, vi } from 'vitest';
import { returnCaseToTrainee as returnCytologyToTrainee, type ReturnCaseToTraineeDeps } from './returnCaseToTrainee';

const record = { id: 'r1', caseId: 'C1', specimenId: 'S1', residentId: 'RES', residentName: 'Resident', status: 'pending' };
function deps(over: Partial<{ rec: unknown; rejectOk: boolean }> = {}) {
  const reject = vi.fn(async () => (over.rejectOk === false ? { ok: false as const, error: 'nope' } : { ok: true as const, data: { ...record, status: 'returned' } }));
  const updateCase = vi.fn(async () => undefined);
  const d = {
    countersign: { reject, getForSpecimen: vi.fn(async () => ({ ok: true as const, data: ('rec' in over ? over.rec : record) as never })), getForCase: vi.fn(async () => ({ ok: true as const, data: ('rec' in over ? over.rec : record) as never })) },
    write: { getCase: vi.fn(async () => ({ id: 'C1', version: 3, status: 'pending-countersign', participants: [] }) as never), updateCase },
  } as unknown as ReturnCaseToTraineeDeps;
  return { d, reject, updateCase };
}
const input = { caseId: 'C1', specimenId: 'S1', attending: { id: 'ATT', name: 'Attending' }, feedback: 'Please re-screen the cluster.' };

describe('returnCaseToTrainee (Batch 608, #32 #84)', () => {
  it('requires feedback and does nothing without it', async () => {
    const { d, reject } = deps();
    expect(await returnCytologyToTrainee({ ...input, feedback: '  ' }, d)).toEqual({ outcome: 'feedbackRequired' });
    expect(reject).not.toHaveBeenCalled();
  });
  it('refuses when nothing is pending for the specimen', async () => {
    expect((await returnCytologyToTrainee(input, deps({ rec: null }).d)).outcome).toBe('notPending');
  });
  it('refuses to return your own release', async () => {
    expect((await returnCytologyToTrainee({ ...input, attending: { id: 'RES', name: 'Resident' } }, deps().d)).outcome).toBe('ownRelease');
  });
  it('returns it: rejects the record, sets status returned and hands the case back', async () => {
    const { d, reject, updateCase } = deps();
    const r = await returnCytologyToTrainee(input, d);
    expect(r.outcome).toBe('returned');
    expect(reject).toHaveBeenCalledWith(expect.objectContaining({ specimenId: 'S1', attendingFeedback: 'Please re-screen the cluster.' }));
    expect(updateCase).toHaveBeenCalledWith('C1', expect.objectContaining({ status: 'returned', returnedBy: 'ATT' }), 3);
  });
  it('an autopsy report (no specimen) is found by case and rejected without a specimen', async () => {
    const { d, reject } = deps();
    const r = await returnCytologyToTrainee({ caseId: 'C1', attending: input.attending, feedback: 'Revise.' }, d);
    expect(r.outcome).toBe('returned');
    expect(reject).toHaveBeenCalledWith(expect.objectContaining({ caseId: 'C1', specimenId: undefined }));
    expect((d.countersign.getForSpecimen as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
  it('reports a refused rejection without touching the case', async () => {
    const { d, updateCase } = deps({ rejectOk: false });
    expect((await returnCytologyToTrainee(input, d)).outcome).toBe('failed');
    expect(updateCase).not.toHaveBeenCalled();
  });
});
