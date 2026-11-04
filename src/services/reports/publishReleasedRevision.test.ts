// src/services/reports/publishReleasedRevision.test.ts
// Batch 535: a correction or addendum released at re-sign-out goes out as such, through the release delay.
import { describe, it, expect, vi } from 'vitest';
import { publishReleasedRevision, type ReleasedRevisionDeps } from './publishReleasedRevision';

const base = {
  caseId: 'C1', instance: { instanceId: 'I1', templateId: 'T1', lastRevisionType: 'addendum' }, releasedBy: { id: 'P1', name: 'Dr P' },
  performingFacilityId: 'F1', previousStatus: 'in-progress',
};
const deps = (): ReleasedRevisionDeps => ({
  resolvePreviousText: vi.fn(async () => 'Tubular adenoma.'),
  release: vi.fn(async () => ({ held: {} as never })),
});

describe('publishReleasedRevision', () => {
  it('a correction: CORRECTED for its instance, with what it read before, recallable and reopening its record', async () => {
    const d = deps();
    const generatePdf = vi.fn();
    await publishReleasedRevision({ ...base, generatePdf, record: { id: 'amd-1', type: 'correction', originalReportSnapshot: { answers: { dx: 'Tubular adenoma.' } } } }, d);
    expect(d.resolvePreviousText).toHaveBeenCalledWith('T1', { dx: 'Tubular adenoma.' });
    const [event, hold] = vi.mocked(d.release).mock.calls[0];
    expect(event).toMatchObject({ caseId: 'C1', instanceId: 'I1', reportType: 'CORRECTED', previouslyReportedAs: 'Tubular adenoma.', performingFacilityId: 'F1', generatePdf, releasedBy: { id: 'P1', name: 'Dr P' } });
    expect(hold).toEqual({ kind: 'surgical-amendment', releasedBy: { userId: 'P1', userName: 'Dr P' },
      subject: { recordId: 'amd-1', instanceId: 'I1', previousStatus: 'in-progress', previousRevisionType: 'addendum' } });
  });
  it('an addendum: ADDENDUM, never a "previously reported as"', async () => {
    const d = deps();
    await publishReleasedRevision({ ...base, record: { id: 'add-1', type: 'addendum' } }, d);
    expect(d.resolvePreviousText).not.toHaveBeenCalled();
    const [event] = vi.mocked(d.release).mock.calls[0];
    expect(event.reportType).toBe('ADDENDUM');
    expect(event.previouslyReportedAs).toBeUndefined();
  });
  it('a previous text that can\'t be worked out still sends the correction', async () => {
    const d = { ...deps(), resolvePreviousText: vi.fn(async () => { throw new Error('no template'); }) };
    await publishReleasedRevision({ ...base, record: { id: 'amd-2', type: 'amendment', originalReportSnapshot: { answers: {} } } }, d);
    expect(vi.mocked(d.release).mock.calls[0][0]).toMatchObject({ reportType: 'CORRECTED' });
  });
});
