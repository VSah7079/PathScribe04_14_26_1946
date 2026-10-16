// src/services/clinical/criticalFindingEmail.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 517 (PS-143): the secure email a pathologist sends from the critical
// findings window ("Secure email" as the notification method). Pre-filled with
// the case reference and each detected finding; the pathologist can edit it.
// It carries patient data, so it can only go through a gateway with its BAA or
// data processing agreement in force (secureMessaging/secureGatewayRules.ts).
//
// The text is in the sender's language (the `t` passed in); the findings
// themselves are clinical narrative and stay as written. Pure.
// ─────────────────────────────────────────────────────────────────────────────
import type { CriticalFindingFlag } from './detectCriticalFindings';

type Translate = (key: string, values?: Record<string, unknown>) => string;

export function criticalFindingEmail(
  findings: readonly Pick<CriticalFindingFlag, 'term' | 'sourceField' | 'sourceQuote'>[],
  caseReference: string | undefined,
  t: Translate,
): { subject: string; body: string } {
  const reference = caseReference?.trim() || t('criticalFindingsModal.email.noReference');
  const lines = [
    t('criticalFindingsModal.email.opening', { reference }),
    '',
    ...findings.flatMap(f => [
      t('criticalFindingsModal.email.findingLine', { term: f.term, sourceField: f.sourceField }),
      t('criticalFindingsModal.email.quoteLine', { quote: f.sourceQuote }),
    ]),
    '',
    t('criticalFindingsModal.email.closing'),
  ];
  return { subject: t('criticalFindingsModal.email.subject', { reference }), body: lines.join('\n') };
}
