// src/services/reports/publishDirectAddendum.test.ts
// Batch 649: an addendum released straight from the dialog is actually sent, through the same path as one released with its workup.
import { describe, it, expect, vi } from 'vitest';
import { publishDirectAddendum, type DirectAddendumDeps } from './publishDirectAddendum';

const record = { id: 'add-1', type: 'addendum' as const, reportInstanceId: 'I1', addendumTitle: 'ER/PR', body: 'ER positive.' };
const caseOf = (mode: string) => ({ id: 'C1', status: 'finalized', reportingMode: mode, order: { facilityId: 'F1' },
  synopticReports: [{ instanceId: 'I1', templateId: 'T1', lastRevisionType: undefined }] }) as never;
const deps = (o: Partial<DirectAddendumDeps> = {}): DirectAddendumDeps => ({ publishRevision: vi.fn(async () => ({})), sendToLis: vi.fn(async () => ({ ok: true })), ...o });

describe('publishDirectAddendum', () => {
  it('Orchestration: ADDENDUM for its instance through publishReleasedRevision (the release delay)', async () => {
    const d = deps();
    const generatePdf = vi.fn();
    expect(await publishDirectAddendum({ caseData: caseOf('orchestrator'), record, releasedBy: { id: 'P1', name: 'Dr P' }, generatePdf }, d)).toEqual({ sent: true });
    expect(d.publishRevision).toHaveBeenCalledWith(expect.objectContaining({
      caseId: 'C1', instance: expect.objectContaining({ instanceId: 'I1', templateId: 'T1' }), record, previousStatus: 'finalized', performingFacilityId: 'F1', generatePdf,
    }));
    expect(d.sendToLis).not.toHaveBeenCalled();
  });
  it('Assist: to the LIS for its instance; a failed send is reported', async () => {
    const d = deps({ sendToLis: vi.fn(async () => ({ ok: false })) });
    expect(await publishDirectAddendum({ caseData: caseOf('assist'), record, releasedBy: { id: 'P1', name: 'Dr P' } }, d)).toEqual({ sent: false, reason: 'sendFailed' });
    expect(d.sendToLis).toHaveBeenCalledWith({ kind: 'corrected_with_addition', caseId: 'C1', instanceId: 'I1', addendumTitle: 'ER/PR', payloadBody: 'ER positive.' });
  });
  it('an addendum on no report instance is reported as not sent', async () => {
    const d = deps();
    expect(await publishDirectAddendum({ caseData: caseOf('orchestrator'), record: { ...record, reportInstanceId: undefined }, releasedBy: { id: 'P1', name: 'Dr P' } }, d)).toEqual({ sent: false, reason: 'noInstance' });
    expect(d.publishRevision).not.toHaveBeenCalled();
  });
});
