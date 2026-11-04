import { describe, it, expect, vi } from 'vitest';
import { completeDelegatedWork } from './completeDelegatedWork';
import type { DelegationRecord, IDelegationService } from './IDelegationService';

const rec = (over: Partial<DelegationRecord>): DelegationRecord => ({
  id: 'd1', caseId: 'c1', fromUserId: 'a', toUserId: 'b', delegationType: 'SECOND_OPINION', timestamp: 't', status: 'pending', ...over,
});

function fake(records: DelegationRecord[]) {
  const complete = vi.fn(async (id: string) => ({ ok: true as const, data: records.find(r => r.id === id)! }));
  const service = { list: vi.fn(async () => ({ ok: true as const, data: records })), complete, delegate: vi.fn() } as unknown as IDelegationService;
  return { service, complete };
}

describe('completeDelegatedWork', () => {
  it('completes only this user’s pending delegations on the case', async () => {
    const { service, complete } = fake([rec({ id: 'd1' }), rec({ id: 'd2', toUserId: 'z' }), rec({ id: 'd3', status: 'completed' })]);
    expect(await completeDelegatedWork(service, 'c1', 'b')).toBe(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith('d1');
  });
  it('does nothing without a case or user', async () => {
    const { service, complete } = fake([rec({})]);
    expect(await completeDelegatedWork(service, '', 'b')).toBe(0);
    expect(complete).not.toHaveBeenCalled();
  });
});
