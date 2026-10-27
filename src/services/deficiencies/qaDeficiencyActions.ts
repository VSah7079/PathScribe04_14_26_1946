// src/services/deficiencies/qaDeficiencyActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 649: the Quality Assurance screen's deficiency actions, each with its own capability, checked (and, being
// high risk, audited) here before anything changes. Moved out of QualityAssurancePage (no decisions in components):
//
//   raise      qa:deficiency:raise     a QA lead raises a case or specimen deficiency by hand ('open').
//   escalate   qa:deficiency:escalate  Escalate to CAPA: root cause and corrective action, 'pending-verification'.
//   contain    qa:deficiency:contain   Immediate containment: closed at once, no root cause.
//   verify     qa:deficiency:verify    the effectiveness check: effective closes it, recurred reopens it.
//   review     qa:management-review:submit   (Batch 659) a Management Review of closed deficiencies.
//
// Batch 651: each success is also written to the audit service, here, after the change was made: "Deficiency raised /
// escalated to CAPA / contained / effectiveness verified / reopened as recurred". Ids only (deficiency, deficiency type,
// resolution type, staff, case, facility), the outcome and the due date. The free text (comment, root cause, corrective
// and preventive action) is NEVER written: it can name the patient. A refusal writes nothing here (the high-risk
// capability check is already audited by the authorization service), and neither does a change the store reported as
// failed. Literal English.
//
// Each needs the Quality Assurance screen (requires). The check carries no case or facility: the screen's facility
// scope (useQaCaseScope) already decides which deficiencies are listed. A deficiency raised by the Engine (the
// Firestore-era store, fetchGlobalDeficiencies) goes to its /api/qa/deficiencies/* endpoint, as before; every
// other one to the specimen deficiency service. Raising from a bench screen (accessioning, grossing, embedding) is
// that screen's own act and is not this capability.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { authorizationService } from '../authorization/defaultAuthorizationService';
import type { CapabilityDecision } from '../authorization/evaluateCapability';
import type { IAuditService } from '../auditlog/IAuditService';
import type { ISpecimenDeficiencyService } from './IDeficiencyService';
import { specimenDeficiencyService } from './specimenDeficiencyServiceInstance';
import { managementReviewService } from './managementReviewServiceInstance';
import type { IManagementReviewService } from './IDeficiencyService';

export interface QaDeficiencyDeps {
  enforce: (capability: string, context?: Record<string, never>) => Promise<Pick<CapabilityDecision, 'allowed'>>;
  deficiencies: Pick<ISpecimenDeficiencyService, 'raise' | 'resolve' | 'containImmediately' | 'verifyEffectiveness'>;
  /** The Engine's deficiency endpoints (Engine-raised records only). */
  post: (path: string, body: unknown) => Promise<unknown>;
  /** Batch 659: the management review store (submit). */
  reviews?: Pick<IManagementReviewService, 'create'>;
  /** Batch 651: where successes are audited, who the actor is, and the case and facility of a deficiency (all optional: no audit without `auditService`). */
  auditService?: Pick<IAuditService, 'logEvent'>;
  actorName?: (userId: string) => Promise<string>;
  contextOf?: (ref: { deficiencyId?: string; caseId?: string }) => Promise<{ caseId: string | null; facilityId: string | null }>;
}

const defaultDeps: QaDeficiencyDeps = {
  enforce: (c, ctx) => authorizationService.enforce(c, ctx),
  deficiencies: specimenDeficiencyService,
  reviews: managementReviewService,
  post: (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  auditService: { logEvent: async entry => (await import('../auditlog/auditServiceInstance')).auditService.logEvent(entry) },
  actorName: async userId => {
    const { userService } = await import('../users/userServiceInstance');
    const r = await userService.getById(userId);
    return r.ok ? [r.data.firstName, r.data.lastName].filter(Boolean).join(' ') || userId : userId;
  },
  contextOf: async ({ deficiencyId, caseId }) => {
    let id = caseId ?? null;
    if (!id && deficiencyId) {
      const all = await specimenDeficiencyService.getAll();
      id = all.ok ? all.data.find(d => d.id === deficiencyId)?.caseId ?? null : null;
    }
    if (!id) return { caseId: null, facilityId: null };
    const { caseRouter } = await import('../cases/CaseRouter');
    return { caseId: id, facilityId: (await caseRouter.getCase(id))?.order?.facilityId ?? null };
  },
};

/** A store or endpoint result that says the change did not happen. */
const failed = (r: unknown): boolean => !!r && typeof r === 'object' && (r as { ok?: unknown }).ok === false;

/** Writes the success entry; never throws (an audit failure must not undo the action). */
async function auditDeficiency(
  deps: QaDeficiencyDeps, event: string, detail: string, actorId: string, ref: { deficiencyId?: string; caseId?: string },
): Promise<void> {
  if (!deps.auditService) return;
  try {
    const [name, ctx] = await Promise.all([deps.actorName?.(actorId).catch(() => null), deps.contextOf?.(ref).catch(() => null)]);
    await deps.auditService.logEvent({
      type: 'user', event, detail, user: name || actorId,
      caseId: ctx?.caseId ?? ref.caseId ?? null, facilityId: ctx?.facilityId ?? null, confidence: null,
    });
  } catch { /* never block the action */ }
}

/** Batch 655: 'failed' = the store or endpoint reported (or threw) that the change did not happen: the person is told, never "done". */
export type QaDeficiencyOutcome = { ok: true } | { ok: false; error: 'notPermitted' | 'failed'; reason: string };
const refused = (key: string): QaDeficiencyOutcome => ({ ok: false, error: 'notPermitted', reason: i18n.t(`caseActionPermissions.${key}`) });
const done: QaDeficiencyOutcome = { ok: true };
const notSaved = (): QaDeficiencyOutcome => ({ ok: false, error: 'failed', reason: i18n.t('caseActionPermissions.deficiencyNotSaved') });
/** Runs the change; a thrown error counts as a failed change. Resolves to the store's result, or the failure marker. */
async function attempt(run: () => Promise<unknown>): Promise<{ result: unknown; didFail: boolean }> {
  try { const result = await run(); return { result, didFail: failed(result) }; } catch { return { result: undefined, didFail: true }; }
}

export async function raiseQaDeficiency(
  input: { caseId: string; specimenId?: string; specimenLabel?: string; deficiencyTypeId: string; comment: string; raisedBy: string },
  deps: QaDeficiencyDeps = defaultDeps,
): Promise<QaDeficiencyOutcome> {
  if (!(await deps.enforce('qa:deficiency:raise', {})).allowed) return refused('deficiencyRaise');
  const { result: r, didFail } = await attempt(() => deps.deficiencies.raise(input));
  if (didFail) return notSaved();
  {
    const created = (r as { data?: { id?: string } } | undefined)?.data?.id;
    await auditDeficiency(deps, 'Deficiency raised', `Deficiency${created ? ` ${created}` : ''} of type ${input.deficiencyTypeId} raised by hand${input.specimenId ? ` on specimen ${input.specimenId}` : ' on the case'}.`, input.raisedBy, { caseId: input.caseId });
  }
  return done;
}

export async function escalateQaDeficiency(
  id: string,
  fields: { resolutionTypeId: string; correctiveAction: string; rootCause: string; preventiveAction?: string; resolvedBy: string; verificationDueDate?: string },
  engineRaised: boolean,
  deps: QaDeficiencyDeps = defaultDeps,
): Promise<QaDeficiencyOutcome> {
  if (!(await deps.enforce('qa:deficiency:escalate', {})).allowed) return refused('deficiencyEscalate');
  const resolution = { ...fields, preventiveAction: fields.preventiveAction || undefined };
  const { didFail } = await attempt(() => (engineRaised ? deps.post('/api/qa/deficiencies/resolve', { deficiencyId: id, ...resolution }) : deps.deficiencies.resolve(id, resolution)));
  if (didFail) return notSaved();
  await auditDeficiency(deps, 'Deficiency escalated to CAPA', `Deficiency ${id} escalated to CAPA (resolution type ${fields.resolutionTypeId}${fields.verificationDueDate ? `; effectiveness check due ${fields.verificationDueDate}` : ''}); status pending verification.`, fields.resolvedBy, { deficiencyId: id });
  return done;
}

export async function containQaDeficiency(
  id: string,
  fields: { resolutionTypeId: string; resolutionComment: string; resolvedBy: string },
  engineRaised: boolean,
  deps: QaDeficiencyDeps = defaultDeps,
): Promise<QaDeficiencyOutcome> {
  if (!(await deps.enforce('qa:deficiency:contain', {})).allowed) return refused('deficiencyContain');
  const { didFail } = await attempt(() => (engineRaised ? deps.post('/api/qa/deficiencies/contain', { deficiencyId: id, ...fields }) : deps.deficiencies.containImmediately(id, fields)));
  if (didFail) return notSaved();
  await auditDeficiency(deps, 'Deficiency contained', `Deficiency ${id} contained and closed at once (resolution type ${fields.resolutionTypeId}).`, fields.resolvedBy, { deficiencyId: id });
  return done;
}

export async function verifyQaDeficiency(
  id: string,
  fields: { outcome: 'effective' | 'recurred'; comment: string; verifiedBy: string },
  engineRaised: boolean,
  deps: QaDeficiencyDeps = defaultDeps,
): Promise<QaDeficiencyOutcome> {
  if (!(await deps.enforce('qa:deficiency:verify', {})).allowed) return refused('deficiencyVerify');
  const { didFail } = await attempt(() => (engineRaised ? deps.post('/api/qa/deficiencies/verify', { deficiencyId: id, ...fields }) : deps.deficiencies.verifyEffectiveness(id, fields)));
  if (didFail) return notSaved();
  {
    const effective = fields.outcome === 'effective';
    await auditDeficiency(deps, effective ? 'Deficiency effectiveness verified' : 'Deficiency reopened as recurred',
      effective ? `Deficiency ${id} verified effective and closed.` : `Deficiency ${id} recurred after its corrective action; reopened.`, fields.verifiedBy, { deficiencyId: id });
  }
  return done;
}

/** Batch 659 (finding 12): submitting a Management Review checks its capability and says "not saved" when the store did not keep it. */
export async function submitManagementReview(
  fields: { reviewedBy: string; deficiencyIds: string[]; findings: string },
  deps: QaDeficiencyDeps = defaultDeps,
): Promise<QaDeficiencyOutcome> {
  if (!(await deps.enforce('qa:management-review:submit', {})).allowed) return refused('managementReviewSubmit');
  if (!deps.reviews) return notSaved();
  const { didFail } = await attempt(() => deps.reviews!.create(fields));
  if (didFail) return notSaved();
  await auditDeficiency(deps, 'Management review submitted', `Management review of ${fields.deficiencyIds.length} closed deficienc${fields.deficiencyIds.length === 1 ? 'y' : 'ies'} submitted.`, fields.reviewedBy, {});
  return done;
}
