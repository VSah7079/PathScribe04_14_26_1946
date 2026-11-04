// src/services/reports/sendReviewRequest.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: asking a colleague to look at a case (Review on the report page: an informal review, a consultation, a
// clinical observation or a second opinion). Moved here from RequestReviewModal (no decisions in components), with
// its capability, case:informal-review:request, checked first; a refusal sends nothing.
//
//   1. a message to the colleague (an immediate heads-up; the message keeps its English type label and wording,
//      as before: it is stored data the recipient reads later, not this screen's text);
//   2. for an informal review only, the request record that drives the colleague's worklist tile.
//
// A code review is not a request to a colleague: it goes to the billing review pool from the modal, as before.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';
import type { IMessageService } from '../messages/IMessageService';
import type { IInformalReviewService } from './IInformalReviewService';
import { messageService } from '../messages/messageServiceInstance';
import { informalReviewService } from './reportServicesInstance';

export interface ReviewRequestInput {
  caseId: string;
  caseLabel?: string;
  from: { id: string; name: string };
  to: { id: string; name: string };
  /** The note type's value ('informal_review', 'consultation', …) and its fixed English label for the message. */
  noteType: string;
  typeLabel: string;
  message: string;
}

export interface ReviewRequestDeps {
  enforce: (capability: string, context?: { caseId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;
  sendMessage: IMessageService['send'];
  createInformalReview: IInformalReviewService['create'];
  now: () => Date;
}

const defaultDeps: ReviewRequestDeps = {
  enforce: (c, ctx) => authorizationService.enforce(c, ctx),
  sendMessage: (m, o) => messageService.send(m, o),
  createInformalReview: r => informalReviewService.create(r),
  now: () => new Date(),
};

export type ReviewRequestOutcome = { ok: true } | { ok: false; error: 'notPermitted'; reason: string };

/** The message body sent to the colleague (stored data: English, as it always was). Pure. */
export function reviewRequestBody(input: Pick<ReviewRequestInput, 'caseId' | 'caseLabel' | 'typeLabel' | 'message'>): string {
  const head = `${input.typeLabel} requested for case ${input.caseId}${input.caseLabel ? ` (${input.caseLabel})` : ''}.`;
  const note = input.message.trim();
  return `${head}\n\n${note ? `${note}\n\n` : ''}Please open the case link below to review the report and leave an internal note.`;
}

export async function sendReviewRequest(input: ReviewRequestInput, deps: ReviewRequestDeps = defaultDeps): Promise<ReviewRequestOutcome> {
  const decision = await deps.enforce('case:informal-review:request', { caseId: input.caseId });
  if (!decision.allowed) return { ok: false, error: 'notPermitted', reason: i18n.t('caseActionPermissions.reviewRequest') };

  await deps.sendMessage({
    senderId: input.from.id,
    senderName: input.from.name,
    recipientId: input.to.id,
    recipientName: input.to.name,
    subject: `${input.typeLabel} request — ${input.caseLabel ?? input.caseId}`,
    body: reviewRequestBody(input),
    caseNumber: input.caseId,
    timestamp: deps.now(),
    isUrgent: false,
  });

  // Only an informal review gets the dedicated request record (the colleague's worklist tile); the other types are
  // message-only, as before.
  if (input.noteType === 'informal_review') {
    await deps.createInformalReview({
      caseId: input.caseId,
      caseLabel: input.caseLabel,
      fromUserId: input.from.id,
      fromUserName: input.from.name,
      toUserId: input.to.id,
      toUserName: input.to.name,
      note: input.message.trim() || undefined,
    });
  }
  return { ok: true };
}
