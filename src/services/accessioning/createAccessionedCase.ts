// src/services/accessioning/createAccessionedCase.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: creating a case on the Accession screen needs case:accession:create (high risk, audited; it requires
// the Accession screen, screen:accession:open). Checked here, before the case is saved; a refusal throws with the
// reason in the person's language, which the Accession screen shows, and nothing is saved. Other ways a case comes
// into being (an order arriving from the LIS, a legacy import, a control slide) are not this action.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import type { Case } from '@/types/case/Case';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';
import { caseRouter } from '../cases/CaseRouter';

export interface CreateAccessionedCaseDeps {
  enforce: (capability: string, context?: { caseId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;
  createCase: (caseData: Case) => Promise<unknown>;
}

const defaultDeps: CreateAccessionedCaseDeps = {
  enforce: (c, ctx) => authorizationService.enforce(c, ctx),
  createCase: c => caseRouter.createCase(c),
};

/** Thrown when the person may not create a case (the message is in their language). */
export class AccessionNotPermittedError extends Error {
  constructor() { super(i18n.t('caseActionPermissions.accessionCreate')); this.name = 'AccessionNotPermittedError'; }
}

export async function createAccessionedCase(caseData: Case, deps: CreateAccessionedCaseDeps = defaultDeps): Promise<void> {
  // No case or facility context: the case does not exist yet, and its ordering facility is not a scope the person works in.
  const decision = await deps.enforce('case:accession:create', {});
  if (!decision.allowed) throw new AccessionNotPermittedError();
  await deps.createCase(caseData);
}
