import { describe, it, expect, vi } from 'vitest';
import { buildSurgicalQaRows, recordSurgicalQaReview, dismissSurgicalCorrelationCandidate, activityTypeForSurgicalQaRow, type SurgicalQaReviewDeps } from './surgicalQaReview';
import { SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID } from './mockQaActivityTypeService';

const flagged = { id: 'SP-1', description: 'Colon', surgicalPeerReview: { postSignOutPeerReviewFlag: { reason: 'random_selection' } } };
const candidate = { id: 'SP-2', description: 'Resection', surgicalPeerReview: { biopsyToResectionCandidates: [{ candidateCaseId: 'B1', candidateSpecimenId: 'BS1' }] } };
const theCase = { id: 'S26-1', specimens: [flagged, candidate] } as any;

const deps = (over: Partial<SurgicalQaReviewDeps> = {}): SurgicalQaReviewDeps => ({
  enforce: vi.fn().mockResolvedValue({ allowed: true }),
  createRecord: vi.fn().mockResolvedValue({ ok: true, data: { id: 'REC-1' } }),
  getCase: vi.fn().mockResolvedValue(theCase),
  updateCase: vi.fn().mockResolvedValue(undefined),
  ...over,
});

const submission = { fieldValues: {}, outcome: 'concordant' } as any;

describe('surgicalQaReview (Batch 396)', () => {
  it('lists the peer review flag and the open correlation candidate', () => {
    const rows = buildSurgicalQaRows([theCase]);
    expect(rows.map(r => r.kind)).toEqual(['peer_review', 'correlation']);
  });

  it('a recorded or dismissed candidate is not listed', () => {
    const done = { ...candidate, surgicalPeerReview: { biopsyToResectionCandidates: [{ candidateCaseId: 'B1', candidateSpecimenId: 'BS1', dismissedAsNotRelevant: true }] } };
    expect(buildSurgicalQaRows([{ id: 'S26-2', specimens: [done] } as any])).toEqual([]);
  });

  it('picks the activity type for a row', () => {
    const [row] = buildSurgicalQaRows([theCase]);
    expect(activityTypeForSurgicalQaRow(row, [{ id: SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID } as any])?.id).toBe(SURGICAL_PEER_REVIEW_ACTIVITY_TYPE_ID);
  });

  it('recording checks surgical:qa-review:record and stops on a refusal', async () => {
    const d = deps({ enforce: vi.fn().mockResolvedValue({ allowed: false }) });
    const [row] = buildSurgicalQaRows([theCase]);
    expect(await recordSurgicalQaReview(row, { id: 'T' } as any, submission, { userId: 'u', userName: 'U' }, d)).toEqual({ ok: false, notPermitted: true });
    expect(d.enforce).toHaveBeenCalledWith('surgical:qa-review:record', { caseId: 'S26-1' });
    expect(d.createRecord).not.toHaveBeenCalled();
  });

  it('recording a peer review links the record on the specimen', async () => {
    const d = deps();
    const [row] = buildSurgicalQaRows([theCase]);
    expect(await recordSurgicalQaReview(row, { id: 'T' } as any, submission, { userId: 'u', userName: 'U' }, d)).toEqual({ ok: true });
    const specimens = vi.mocked(d.updateCase).mock.calls[0][1].specimens as any[];
    expect(specimens.find(s => s.id === 'SP-1').surgicalPeerReview.peerReviewRecordedActivityRecordId).toBe('REC-1');
  });

  it('dismissing a correlation candidate marks it not relevant, with the same check', async () => {
    const d = deps();
    const row = buildSurgicalQaRows([theCase])[1] as any;
    expect(await dismissSurgicalCorrelationCandidate(row, d)).toEqual({ ok: true });
    expect(d.enforce).toHaveBeenCalledWith('surgical:qa-review:record', { caseId: 'S26-1' });
    const specimens = vi.mocked(d.updateCase).mock.calls[0][1].specimens as any[];
    expect(specimens.find(s => s.id === 'SP-2').surgicalPeerReview.biopsyToResectionCandidates[0].dismissedAsNotRelevant).toBe(true);
  });
});
