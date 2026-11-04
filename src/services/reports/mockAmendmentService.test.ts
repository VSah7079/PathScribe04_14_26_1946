// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Batch 649: the release capability allows unless a test refuses it (decide.allowed).
const decide = vi.hoisted(() => ({ allowed: true, calls: [] as string[] }));
vi.mock('../authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async (capability: string) => { decide.calls.push(capability); return { allowed: decide.allowed }; } },
}));
import { mockAmendmentService } from './mockAmendmentService';

const authoringPathologist = { userId: 'user-1', userName: 'Dr. Test' };

describe('mockAmendmentService - real reasonId gating, per the detailed post-sign-out revision taxonomy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('captureFields (amendment/correction, Stage 1)', () => {
    it('rejects an amendment with no reasonId, even with a real explanation and notification', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-1', type: 'amendment', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const res = await mockAmendmentService.captureFields(draft.data.id, {
        explanationOfChange: 'Margin status revised.',
        notification: { clinicianName: 'Dr. Referring', method: 'verbal_phone', notifiedAt: new Date().toISOString() },
        originalReportSnapshot: {},
        reasonId: '',
      });
      expect(res.ok).toBe(false);
    });

    it('rejects a correction with no reasonId', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-2', type: 'correction', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const res = await mockAmendmentService.captureFields(draft.data.id, {
        explanationOfChange: 'Fixed a typo.',
        originalReportSnapshot: {},
        reasonId: '',
      });
      expect(res.ok).toBe(false);
    });

    it('accepts a real amendment with a real reasonId, explanation, and notification, and persists reasonId', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-3', type: 'amendment', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const res = await mockAmendmentService.captureFields(draft.data.id, {
        explanationOfChange: 'Margin status revised from negative to focally positive.',
        notification: { clinicianName: 'Dr. Referring', method: 'verbal_phone', notifiedAt: new Date().toISOString() },
        originalReportSnapshot: {},
        reasonId: 'AMEND_MARGIN',
      });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.reasonId).toBe('AMEND_MARGIN');
    });
  });

  describe('release (addendum single-stage, and the amendment/correction fallback gate)', () => {
    it('rejects an addendum released with no reasonId', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-4', type: 'addendum', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const res = await mockAmendmentService.release(draft.data.id, {
        addendumTitle: 'Addendum: Molecular Results',
        body: 'HER2 FISH results received and appended.',
      });
      expect(res.ok).toBe(false);
    });

    it('accepts a real addendum with a real reasonId and persists it', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-5', type: 'addendum', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const res = await mockAmendmentService.release(draft.data.id, {
        addendumTitle: 'Addendum: Molecular Results',
        body: 'HER2 FISH results received and appended.',
        reasonId: 'ADD_MOLECULAR',
      });
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.data.reasonId).toBe('ADD_MOLECULAR');
    });

    it('rejects a direct-release amendment/correction call (skipping captureFields) with no reasonId', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-6', type: 'correction', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const res = await mockAmendmentService.release(draft.data.id, {
        explanationOfChange: 'Corrected specimen label.',
        body: 'Corrected specimen label from left to right.',
      });
      expect(res.ok).toBe(false);
    });

    it('does not re-require reasonId at release when captureFields already captured it', async () => {
      const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-7', type: 'correction', authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      const captured = await mockAmendmentService.captureFields(draft.data.id, {
        explanationOfChange: 'Corrected specimen label.',
        originalReportSnapshot: {},
        reasonId: 'CORR_SPEC',
      });
      expect(captured.ok).toBe(true);
      const released = await mockAmendmentService.release(draft.data.id, {
        body: 'Corrected specimen label from left to right per accession record.',
      });
      expect(released.ok).toBe(true);
      if (released.ok) expect(released.data.reasonId).toBe('CORR_SPEC');
    });
  });
});

describe('mockAmendmentService - real reportInstanceId/specimenId structured linkage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('startDraft persists the real reportInstanceId/specimenId when given', async () => {
    const res = await mockAmendmentService.startDraft({
      caseId: 'CASE-LINK-1', type: 'addendum', authoringPathologist,
      reportInstanceId: 'sri-42', specimenId: 'sp-A',
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.reportInstanceId).toBe('sri-42');
      expect(res.data.specimenId).toBe('sp-A');
    }
  });

  it('a real, case-level amendment (no single report instance) leaves both genuinely undefined, never fabricated', async () => {
    const res = await mockAmendmentService.startDraft({ caseId: 'CASE-LINK-2', type: 'addendum', authoringPathologist });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.reportInstanceId).toBeUndefined();
      expect(res.data.specimenId).toBeUndefined();
    }
  });
});

describe('changeDraftType (Batch 380)', () => {
  beforeEach(() => { localStorage.clear(); });
  it('a new draft follows the modal to a minor amendment or an addendum, renumbered for that type', async () => {
    const prior = await mockAmendmentService.startDraft({ caseId: 'CASE-T', type: 'addendum', authoringPathologist });
    await mockAmendmentService.release(prior.ok ? prior.data.id : '', { body: 'IHC', addendumTitle: 'IHC', reasonId: 'r1' });
    const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-T', type: 'amendment', authoringPathologist });
    if (!draft.ok) throw new Error('no draft');
    const minor = await mockAmendmentService.changeDraftType(draft.data.id, 'correction');
    expect(minor.ok && [minor.data.type, minor.data.sequenceNumber]).toEqual(['correction', 1]);
    // Saved as a minor amendment, it no longer needs the clinician notification.
    expect((await mockAmendmentService.captureFields(draft.data.id, { explanationOfChange: 'Typo', reasonId: 'r1', originalReportSnapshot: null })).ok).toBe(true);
    const add = await mockAmendmentService.startDraft({ caseId: 'CASE-T', type: 'amendment', authoringPathologist });
    if (!add.ok) throw new Error('no draft');
    const addendum = await mockAmendmentService.changeDraftType(add.data.id, 'addendum');
    expect(addendum.ok && [addendum.data.type, addendum.data.sequenceNumber]).toEqual(['addendum', 2]);
  });
  it('a draft whose fields were already captured keeps its type; the same type is a no-op', async () => {
    const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-U', type: 'correction', authoringPathologist });
    if (!draft.ok) throw new Error('no draft');
    await mockAmendmentService.captureFields(draft.data.id, { explanationOfChange: 'Typo', reasonId: 'r1', originalReportSnapshot: null });
    expect((await mockAmendmentService.changeDraftType(draft.data.id, 'correction')).ok).toBe(true);
    expect((await mockAmendmentService.changeDraftType(draft.data.id, 'addendum')).ok).toBe(false);
  });
});

// Batch 438 (PS-146): releasing a clinically significant revision recommends a CAPA.
describe('mockAmendmentService.release recommends a CAPA for a clinically significant revision', () => {
  beforeEach(() => { localStorage.clear(); });
  const release = async (caseId: string, type: 'amendment' | 'correction' | 'addendum', reasonId: string) => {
    const draft = await mockAmendmentService.startDraft({ caseId, type, authoringPathologist });
    if (!draft.ok) throw new Error('draft failed');
    return mockAmendmentService.release(draft.data.id, {
      body: 'Revised.', addendumTitle: type === 'addendum' ? 'Molecular' : undefined, reasonId,
      explanationOfChange: 'Stage revised after re-review.',
      notification: { clinicianName: 'Dr. Referring', method: 'verbal_phone', notifiedAt: new Date().toISOString() },
    });
  };
  const recsFor = async (caseId: string) => {
    const { mockCapaRecommendationService } = await import('../quality/mockCapaRecommendationService');
    const r = await mockCapaRecommendationService.getAll();
    return r.ok ? r.data.filter(x => x.caseId === caseId) : [];
  };
  it('a staging amendment recommends one; a typo correction and an addendum do not', async () => {
    expect((await release('CASE-SIG', 'amendment', 'AMEND_STAGE')).ok).toBe(true);
    expect(await recsFor('CASE-SIG')).toEqual([expect.objectContaining({ source: 'clinical-correction', status: 'pending' })]);
    await release('CASE-TYPO', 'correction', 'CORR_TYPO');
    await release('CASE-ADD', 'addendum', 'ADD_IHC');
    expect(await recsFor('CASE-TYPO')).toHaveLength(0);
    expect(await recsFor('CASE-ADD')).toHaveLength(0);
  });
});

describe('Batch 535: reopen (Recall within the release delay)', () => {
  beforeEach(() => { localStorage.clear(); });
  it('a released record goes back to draft; what it said stays; the recall is kept', async () => {
    const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-R1', type: 'addendum', authoringPathologist });
    if (!draft.ok) throw new Error('draft failed');
    const released = await mockAmendmentService.release(draft.data.id, { addendumTitle: 'Addendum: IHC', body: 'Stains received.', reasonId: 'r1' });
    if (!released.ok) throw new Error('release failed');
    const res = await mockAmendmentService.reopen(draft.data.id, { userId: 'user-1', userName: 'Dr. Test' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatchObject({ status: 'draft', body: 'Stains received.', addendumTitle: 'Addendum: IHC' });
    expect(res.data.releasedAt).toBeUndefined();
    expect(res.data.recalls).toEqual([{ at: expect.any(String), by: { userId: 'user-1', userName: 'Dr. Test' }, releasedAt: released.data.releasedAt }]);
  });
  it('only a released record can be reopened; an unknown one is refused', async () => {
    const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-R2', type: 'correction', authoringPathologist });
    if (!draft.ok) throw new Error('draft failed');
    expect((await mockAmendmentService.reopen(draft.data.id, { userId: 'u', userName: 'U' })).ok).toBe(false);
    expect((await mockAmendmentService.reopen('nope', { userId: 'u', userName: 'U' })).ok).toBe(false);
  });
});

describe('Batch 540: no correction or addendum while the report is in its release delay', () => {
  it('startDraft is refused while the case\'s original report is held, and allowed once it is out', async () => {
    const { mockHeldReleaseService } = await import('../reportRelease/mockHeldReleaseService');
    const { REVISION_IN_RELEASE_DELAY } = await import('../reportRelease/revisionDuringDelay');
    const by = { userId: 'P1', userName: 'Dr P' };
    await mockHeldReleaseService.add({
      id: 'held-540', caseId: 'CASE-540', kind: 'cytology-sign-out', event: { caseId: 'CASE-540', reportType: 'FINAL', releasedAt: 'T' },
      followUps: [], heldAt: 'T', expiresAt: '2099-01-01T00:00:00Z', releasedBy: by, status: 'held',
    } as any);
    const refused = await mockAmendmentService.startDraft({ caseId: 'CASE-540', type: 'addendum', authoringPathologist: by });
    expect(refused).toEqual({ ok: false, error: REVISION_IN_RELEASE_DELAY });
    await mockHeldReleaseService.settle('held-540', 'released', 'T2');
    expect((await mockAmendmentService.startDraft({ caseId: 'CASE-540', type: 'addendum', authoringPathologist: by })).ok).toBe(true);
  });
});

describe('Batch 649: releasing a revision needs the capability for its kind', () => {
  beforeEach(() => { localStorage.clear(); decide.allowed = true; decide.calls = []; });

  it('checks surgical:amendment|correction|addendum:release by the record type', async () => {
    for (const [type, capability] of [['amendment', 'surgical:amendment:release'], ['correction', 'surgical:correction:release'], ['addendum', 'surgical:addendum:release']] as const) {
      const draft = await mockAmendmentService.startDraft({ caseId: `CASE-CAP-${type}`, type, authoringPathologist });
      if (!draft.ok) throw new Error('draft failed');
      decide.calls = [];
      await mockAmendmentService.release(draft.data.id, { body: 'x' });
      expect(decide.calls).toEqual([capability]);
    }
  });

  it('refused: nothing is released, and the record stays a draft', async () => {
    const draft = await mockAmendmentService.startDraft({ caseId: 'CASE-CAP-NO', type: 'addendum', authoringPathologist });
    if (!draft.ok) throw new Error('draft failed');
    decide.allowed = false;
    const res = await mockAmendmentService.release(draft.data.id, { body: 'Stains received.', addendumTitle: 'IHC', reasonId: 'r1' });
    expect(res.ok).toBe(false);
    const all = await mockAmendmentService.getByCaseId('CASE-CAP-NO');
    expect(all.ok && all.data[0].status).toBe('draft');
  });
});
