// src/services/usEpath/epathReviewCodes.ts
// Batch 620 (part E, PS-800): the fixed codes behind a registry report parked for review, as the words the Outbound Queue
// shows (a locale key under outboundQueue.registryReview and its values). Pure.
//   field:PID-11 -> { key: 'field', params: { field: 'PID-11' } }   rule:finalReportOnly -> { key: 'rule.finalReportOnly' }
//   routing:noProfile -> { key: 'routing.noProfile' }
export interface EpathReviewWords { key: string; params?: { field: string } }

export function epathReviewWords(code: string): EpathReviewWords {
  const i = code.indexOf(':');
  const kind = i < 0 ? code : code.slice(0, i);
  const rest = i < 0 ? '' : code.slice(i + 1);
  if (kind === 'field') return { key: 'field', params: { field: rest } };
  if (kind === 'rule' || kind === 'routing') return { key: `${kind}.${rest}` };
  return { key: 'unknown' };
}
