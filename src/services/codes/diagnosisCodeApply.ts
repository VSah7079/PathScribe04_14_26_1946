// src/services/codes/diagnosisCodeApply.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: saving diagnosis and procedure codes from the Codes window (AddCodeModal → the report page's or the
// Cytology Screening page's save) needs case:diagnosis-code:apply, checked here (audited) before anything is
// written. A refusal throws with the reason in the person's language; the Codes window shows it and stays open.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';

export interface DiagnosisCodeApplyDeps {
  enforce: (capability: string, context?: { caseId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;
}
const defaultDeps: DiagnosisCodeApplyDeps = { enforce: (c, ctx) => authorizationService.enforce(c, ctx) };

/** Stops (throws) unless this person may apply diagnosis codes to this case. */
export async function assertDiagnosisCodeApply(caseId: string, deps: DiagnosisCodeApplyDeps = defaultDeps): Promise<void> {
  const decision = await deps.enforce('case:diagnosis-code:apply', { caseId });
  if (!decision.allowed) throw new Error(i18n.t('caseActionPermissions.codeApply'));
}
