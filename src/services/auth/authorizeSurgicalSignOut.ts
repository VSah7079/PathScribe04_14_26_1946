// src/services/auth/authorizeSurgicalSignOut.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: who may sign out (Orchestration) or finalize (Assist) a surgical report, decided in two parts, both
// required, neither with a bypass for any role (CLAUDE.md rule 7; Superadmin included):
//
//   1. the capability surgical:report:sign-out (held through a role; checked and audited here), and
//   2. the case relationship: canFinalizeCase (an active participant whose participation type can finalize at the
//      performing lab, in its jurisdiction). The caller passes that decision in, already made.
//
// The capability is checked first, so a refusal is audited even when the person is not on the case. A resident's
// release for countersign happens before this check (useSignOutWorkflow routes it first), so it needs neither.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';
import type { CaseAccessDecision } from './caseAccessControl';

export interface SurgicalSignOutDeps {
  enforce: (capability: string, context?: { caseId?: string | null; facilityId?: string | null }) => Promise<Pick<CapabilityDecision, 'allowed'>>;
}

const defaultDeps: SurgicalSignOutDeps = { enforce: (c, ctx) => authorizationService.enforce(c, ctx) };

export async function authorizeSurgicalSignOut(
  caseData: { id?: string | null; order?: { facilityId?: string | null } | null } | null | undefined,
  participation: CaseAccessDecision,
  deps: SurgicalSignOutDeps = defaultDeps,
): Promise<CaseAccessDecision> {
  const decision = await deps.enforce('surgical:report:sign-out', { caseId: caseData?.id ?? null, facilityId: caseData?.order?.facilityId ?? null });
  if (!decision.allowed) return { granted: false, dimension: 'not-permitted', reason: i18n.t('caseActionPermissions.signOut') };
  return participation;
}
