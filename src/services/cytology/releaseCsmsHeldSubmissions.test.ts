// Batch 638: the eligibility answer releases or closes the held CSMS message.
import { describe, it, expect, vi } from 'vitest';
import { releaseCsmsHeldSubmissions, type ReleaseCsmsDeps } from './releaseCsmsHeldSubmissions';

const ACTOR = { id: 'u', name: 'Pat QA' };
function setup(entries: any[], resend: 'resent' | 'stillHeld' = 'resent') {
  const markFailed = vi.fn(async () => undefined);
  const port = {
    get: async (id: string) => entries.find(e => e.id === id),
    retryDispatch: async (id: string) => ({ ok: true as const, data: { id, submission: { submissionGuid: 'g' } as any } }),
    markSent: vi.fn(async () => undefined), markFailed,
  };
  const dispatch = vi.fn(async () => ({ ok: true }));
  const deps: ReleaseCsmsDeps = {
    getByCaseId: async () => ({ ok: true, data: entries }), markFailed,
    logAudit: vi.fn(),
    resendDeps: {
      enforce: vi.fn(async () => ({ allowed: false })), queues: { cytology: port as any, cancer: port as any },
      rebuild: async () => resend === 'resent' ? { status: 'ready', body: {}, contentHash: 'h' } : { status: 'held', message: 'No NHS number' },
      submitNewVersion: vi.fn(async () => ({ outcome: 'sent' })), dispatch, logAudit: vi.fn(),
    },
  };
  return { deps, markFailed, dispatch };
}
const waiting = (id = 'q1') => ({ id, caseId: 'C1', registryId: 'csms_uk', status: 'FAILED', errorCode: 'AWAITING_ELIGIBILITY', maxRetriesExceeded: false, queuedAt: 'x', contentHash: 'h', submission: { submissionVersion: 1, masterTransactionId: 'M' } });

describe('releaseCsmsHeldSubmissions', () => {
  it('Verified sends the waiting message', async () => {
    const { deps, dispatch } = setup([waiting()]);
    expect(await releaseCsmsHeldSubmissions({ caseId: 'C1', decision: { kind: 'verified' }, actor: ACTOR }, deps)).toEqual({ released: 1, stillHeld: 0, closed: 0 });
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
  it('Verified but not ready for another reason: not sent, held with that reason', async () => {
    const { deps, markFailed, dispatch } = setup([waiting()], 'stillHeld');
    expect((await releaseCsmsHeldSubmissions({ caseId: 'C1', decision: { kind: 'verified' }, actor: ACTOR }, deps)).stillHeld).toBe(1);
    expect(markFailed).toHaveBeenCalledWith('q1', expect.objectContaining({ errorCode: 'REGISTRY_NOT_READY', errorMessage: 'No NHS number' }));
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('Not eligible closes it with the reason and never sends', async () => {
    const { deps, markFailed, dispatch } = setup([waiting()]);
    expect(await releaseCsmsHeldSubmissions({ caseId: 'C1', decision: { kind: 'not_eligible', reason: 'ceased' }, actor: ACTOR }, deps)).toEqual({ released: 0, stillHeld: 0, closed: 1 });
    expect(markFailed).toHaveBeenCalledWith('q1', expect.objectContaining({ errorCode: 'NOT_ELIGIBLE', maxRetriesExceeded: true, errorMessage: expect.stringContaining('ceased from the programme') }));
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('entries that are not waiting are left alone', async () => {
    const { deps, markFailed } = setup([{ ...waiting(), errorCode: 'REGISTRY_NOT_READY' }]);
    expect(await releaseCsmsHeldSubmissions({ caseId: 'C1', decision: { kind: 'verified' }, actor: ACTOR }, deps)).toEqual({ released: 0, stillHeld: 0, closed: 0 });
    expect(markFailed).not.toHaveBeenCalled();
  });
});
