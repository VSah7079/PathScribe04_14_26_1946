// src/services/hl7/hpvResultInboundResponse.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 629 (PS-174). An hrHPV result from the molecular platform reaches PathScribe through the interface engine
// (docs/architecture/HPV_RESULT_INBOUND.md). processInboundHpvResultEvent applies it and reports what happened; this
// says what the API answers the engine for each outcome (engineEdgeContract.ts INBOUND_RESPONSES), so the server
// route does not decide it again. PathScribe decides *what* is retried and what is refused; the engine only does it.
//
//   applied           -> applied      (200, ack)
//   already-applied   -> duplicate    (200, ack: same answer as the first time)
//   case-not-found    -> retryLater   (409): the result can beat the order into PathScribe, so the engine tries
//                                      again on its schedule for up to INBOUND_RETRY.maxAgeHours, then dead-letters
//   specimen-not-found-> rejected     (422, AE): the case is there but has no such specimen letter; waiting will not fix it
//   invalid-payload   -> rejected     (422, AE): missing field, or abnormal flag contradicting the result
// ─────────────────────────────────────────────────────────────────────────────

import type { InboundOutcome, InboundRejection } from '../interfaceEngine/engineEdgeContract';
import type { ProcessInboundHpvResultEventResult } from './processInboundHpvResultEvent';

export interface HpvInboundResponse {
  outcome: InboundOutcome;
  /** Present for a rejection: the code and plain English (no patient data) the engine dead-letters with. */
  rejection?: InboundRejection;
}

export function hpvResultInboundResponse(result: Pick<ProcessInboundHpvResultEventResult, 'outcome'>): HpvInboundResponse {
  switch (result.outcome) {
    case 'applied': return { outcome: 'applied' };
    case 'already-applied': return { outcome: 'duplicate' };
    case 'case-not-found': return { outcome: 'retryLater' };
    case 'specimen-not-found':
      return { outcome: 'rejected', rejection: { code: 'HPV_SPECIMEN_NOT_FOUND', message: 'The case has no specimen with that letter.', hl7Ack: 'AE' } };
    case 'invalid-payload':
      return { outcome: 'rejected', rejection: { code: 'HPV_RESULT_INVALID', message: 'The result is missing a required field, or its abnormal flag contradicts the result.', hl7Ack: 'AE' } };
  }
}
