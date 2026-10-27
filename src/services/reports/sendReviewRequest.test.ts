// src/services/reports/sendReviewRequest.test.ts
// Batch 649: asking a colleague for a review needs case:informal-review:request (moved out of RequestReviewModal).
import { describe, expect, it, vi } from 'vitest';
import { reviewRequestBody, sendReviewRequest, type ReviewRequestDeps } from './sendReviewRequest';

const input = { caseId: 'C1', caseLabel: 'Doe, Jane', from: { id: 'P1', name: 'Dr P' }, to: { id: 'P2', name: 'Dr Q' }, noteType: 'informal_review', typeLabel: 'Informal Review', message: ' Margin? ' };
const deps = (allowed: boolean) => ({
  enforce: vi.fn(async () => ({ allowed })),
  sendMessage: vi.fn(async () => ({ ok: true }) as never),
  createInformalReview: vi.fn(async () => ({ ok: true }) as never),
  now: () => new Date('2026-10-22T10:00:00Z'),
}) satisfies ReviewRequestDeps;

describe('sendReviewRequest (Batch 649)', () => {
  it('allowed: the message goes, and an informal review also gets its worklist request', async () => {
    const d = deps(true);
    expect(await sendReviewRequest(input, d)).toEqual({ ok: true });
    expect(d.enforce).toHaveBeenCalledWith('case:informal-review:request', { caseId: 'C1' });
    expect(d.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ recipientId: 'P2', subject: 'Informal Review request — Doe, Jane', caseNumber: 'C1' }));
    expect(d.createInformalReview).toHaveBeenCalledWith(expect.objectContaining({ toUserId: 'P2', note: 'Margin?' }));
  });

  it('a second opinion is message-only, as before', async () => {
    const d = deps(true);
    await sendReviewRequest({ ...input, noteType: 'second_opinion', typeLabel: 'Second Opinion' }, d);
    expect(d.sendMessage).toHaveBeenCalled();
    expect(d.createInformalReview).not.toHaveBeenCalled();
  });

  it('refused: nothing is sent', async () => {
    const d = deps(false);
    expect(await sendReviewRequest(input, d)).toMatchObject({ ok: false, error: 'notPermitted' });
    expect(d.sendMessage).not.toHaveBeenCalled();
    expect(d.createInformalReview).not.toHaveBeenCalled();
  });

  it('the message body is the wording it always had', () => {
    expect(reviewRequestBody({ caseId: 'C1', typeLabel: 'Consultation', message: '' }))
      .toBe('Consultation requested for case C1.\n\nPlease open the case link below to review the report and leave an internal note.');
    expect(reviewRequestBody({ caseId: 'C1', caseLabel: 'L', typeLabel: 'Consultation', message: 'Hi' }))
      .toBe('Consultation requested for case C1 (L).\n\nHi\n\nPlease open the case link below to review the report and leave an internal note.');
  });
});
