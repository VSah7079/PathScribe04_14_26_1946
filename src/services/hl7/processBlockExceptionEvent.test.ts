// src/services/hl7/processBlockExceptionEvent.test.ts
// PS-71 (Batch 458): an inbound block exception never overwrites a newer
// case with a stale specimens array.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getCase, updateCase } = vi.hoisted(() => ({ getCase: vi.fn(), updateCase: vi.fn() }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: { getCase, updateCase } }));

import { processBlockExceptionEvent, _resetProcessedMessageIdsForTests } from './processBlockExceptionEvent';
import { ConcurrencyConflictError } from '../cases/ConcurrencyConflictError';

const caseAt = (version: number, block2Status = 'Grossed') => ({
  id: 'S26-1', version,
  specimens: [{ id: 'SP-1', label: 'A', blocks: [{ id: 'BLK-1', label: '1', status: 'Grossed' }, { id: 'BLK-2', label: '2', status: block2Status }] }],
});
const payload = { messageId: 'm-1', timestamp: '2026-10-04T00:00:00Z', accessionNumber: 'S26-1', specimenLetter: 'A', blockNumber: '1', status: 'Lost' } as any;

describe('processBlockExceptionEvent — PS-71 versioned save', () => {
  beforeEach(() => { getCase.mockReset(); updateCase.mockReset(); _resetProcessedMessageIdsForTests(); });

  it('saves with the version it read', async () => {
    getCase.mockResolvedValue(caseAt(4));
    updateCase.mockResolvedValue(undefined);
    const r = await processBlockExceptionEvent(payload);
    expect(r.outcome).toBe('applied');
    expect(r.blockId).toBe('BLK-1');
    expect(updateCase).toHaveBeenCalledTimes(1);
    expect(updateCase.mock.calls[0][2]).toBe(4);
  });

  it('on a conflict, rebuilds from the newer case so the other person\'s change survives', async () => {
    getCase.mockResolvedValueOnce(caseAt(1)).mockResolvedValueOnce(caseAt(1)).mockResolvedValue(caseAt(2, 'Embedded'));
    updateCase.mockRejectedValueOnce(new ConcurrencyConflictError('S26-1', 1, 2)).mockResolvedValue(undefined);
    const r = await processBlockExceptionEvent(payload);
    expect(r.outcome).toBe('applied');
    expect(updateCase).toHaveBeenCalledTimes(2);
    const [, patch, version] = updateCase.mock.calls[1];
    expect(version).toBe(2);
    expect(patch.specimens[0].blocks[0].status).toBe('Lost');
    expect(patch.specimens[0].blocks[1].status).toBe('Embedded');
  });

  it('never saves without a version, and does not mark the message processed when every try conflicts', async () => {
    getCase.mockResolvedValue(caseAt(1));
    updateCase.mockRejectedValue(new ConcurrencyConflictError('S26-1', 1, 2));
    await expect(processBlockExceptionEvent(payload)).rejects.toBeInstanceOf(ConcurrencyConflictError);
    expect(updateCase.mock.calls.every(c => typeof c[2] === 'number')).toBe(true);
    updateCase.mockReset(); updateCase.mockResolvedValue(undefined);
    expect((await processBlockExceptionEvent(payload)).outcome).toBe('applied');
  });

  it('block-not-found when the block is not on the case', async () => {
    getCase.mockResolvedValue(caseAt(1));
    const r = await processBlockExceptionEvent({ ...payload, blockNumber: '9' });
    expect(r.outcome).toBe('block-not-found');
    expect(updateCase).not.toHaveBeenCalled();
  });
});
