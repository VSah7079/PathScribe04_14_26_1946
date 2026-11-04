// src/services/quality/capaRecommendationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 to PS-148 (Batch 438): the shared CAPA recommendation engine.
//
//   recommend(input)  a trigger hands in an event. It becomes a pending
//                     recommendation, or is linked to the live one for the
//                     same problem (capaRecommendationRules.findLinkTarget).
//                     Audited as CAPA_RECOMMENDED / CAPA_RECOMMENDATION_LINKED.
//   confirm(id, …)    the QA lead opens the CAPA: an open deficiency of the
//                     recommendation's type, assigned to the owner they chose,
//                     carrying the root cause. Audited.
//   dismiss(id, …)    the QA lead dismisses it; the reason is required and
//                     audited.
//
// Deciding needs qa:capa-recommendation:decide, checked here. The mock keeps
// recommendations in browser storage (pathscribe_capa_recommendations); the
// API server keeps them in a table (docs/architecture/AUTHORIZATION_API.md).
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { CapaRecommendation, CapaRecommendationInput } from '@/types/quality/CapaRecommendation';
import type { ISpecimenDeficiencyService } from '../deficiencies/IDeficiencyService';
import type { NewAuditLog } from '../auditlog/IAuditService';
import { capaComment, decisionProblem, findLinkTarget, type CapaDecisionProblem } from './capaRecommendationRules';

export interface CapaRecommendationDeps {
  load(): CapaRecommendation[];
  persist(all: CapaRecommendation[]): void;
  deficiencies: Pick<ISpecimenDeficiencyService, 'getAll' | 'raise'>;
  audit(entry: NewAuditLog): Promise<unknown>;
  enforce(context: { caseId: string }): Promise<{ allowed: boolean }>;
  actor(): { id: string; name: string };
  now?: () => Date;
  newId?: () => string;
}

export type CapaDecisionError = CapaDecisionProblem | 'NOT_FOUND' | 'NOT_PERMITTED' | 'RAISE_FAILED';

export interface ICapaRecommendationService {
  getAll(): Promise<ServiceResult<CapaRecommendation[]>>;
  getPending(): Promise<ServiceResult<CapaRecommendation[]>>;
  recommend(input: CapaRecommendationInput): Promise<ServiceResult<{ action: 'created' | 'linked'; recommendation: CapaRecommendation }>>;
  confirm(id: string, decision: { assignedTo: string; assignedToName: string; note?: string }): Promise<ServiceResult<CapaRecommendation>>;
  dismiss(id: string, reason: string): Promise<ServiceResult<CapaRecommendation>>;
}

export function createCapaRecommendationService(deps: CapaRecommendationDeps): ICapaRecommendationService {
  const now = () => (deps.now ?? (() => new Date()))();
  const newId = deps.newId ?? (() => `capa-rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`);
  const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
  const fail = <T>(error: CapaDecisionError): ServiceResult<T> => ({ ok: false, error });

  const closedCapas = async (): Promise<(id: string) => boolean> => {
    const res = await deps.deficiencies.getAll();
    const closed = new Set(res.ok ? res.data.filter(d => d.status === 'closed').map(d => d.id) : []);
    return id => closed.has(id);
  };

  const save = (rec: CapaRecommendation) => {
    const all = deps.load();
    deps.persist(all.some(r => r.id === rec.id) ? all.map(r => (r.id === rec.id ? rec : r)) : [rec, ...all]);
  };

  const audit = (event: string, rec: CapaRecommendation, detail: string, user: string) =>
    deps.audit({ type: user === 'system' ? 'system' : 'user', event, detail, user, caseId: rec.caseId, confidence: null }).catch(() => {});

  return {
    async getAll() { return ok(deps.load()); },
    async getPending() { return ok(deps.load().filter(r => r.status === 'pending')); },

    async recommend(input) {
      const target = findLinkTarget(deps.load(), input, await closedCapas());
      const at = now().toISOString();
      if (target) {
        const linked: CapaRecommendation = {
          ...target,
          linkedEvents: [...(target.linkedEvents ?? []), { source: input.source, sourceRecordId: input.sourceRecordId, summary: input.summary, at }],
        };
        save(linked);
        await audit('CAPA_RECOMMENDATION_LINKED', linked, `${input.source} event ${input.sourceRecordId} linked to recommendation ${linked.id} (${linked.status}) instead of a second recommendation: ${input.summary}`, input.createdBy);
        return ok({ action: 'linked' as const, recommendation: linked });
      }
      const rec: CapaRecommendation = { ...input, id: newId(), status: 'pending', createdAt: at };
      save(rec);
      await audit('CAPA_RECOMMENDED', rec, `${rec.source}; deficiency type ${rec.deficiencyTypeId}; source ${rec.sourceRecordId}; ${rec.summary}`, input.createdBy);
      return ok({ action: 'created' as const, recommendation: rec });
    },

    async confirm(id, decision) {
      const rec = deps.load().find(r => r.id === id);
      if (!rec) return fail('NOT_FOUND');
      const problem = decisionProblem(rec, { kind: 'confirm', assignedTo: decision.assignedTo });
      if (problem) return fail(problem);
      if (!(await deps.enforce({ caseId: rec.caseId })).allowed) return fail('NOT_PERMITTED');
      const actor = deps.actor();
      const raised = await deps.deficiencies.raise({
        caseId: rec.caseId,
        specimenId: rec.specimenId ?? undefined,
        deficiencyTypeId: rec.deficiencyTypeId,
        raisedBy: actor.id,
        comment: capaComment(rec, decision.note ?? ''),
        rootCause: rec.rootCause,
        assignedTo: decision.assignedTo,
        assignedToName: decision.assignedToName,
        capaRecommendationId: rec.id,
      });
      if (!raised.ok) return fail('RAISE_FAILED');
      const done: CapaRecommendation = {
        ...rec, status: 'confirmed', decidedBy: actor.id, decidedByName: actor.name, decidedAt: now().toISOString(),
        assignedTo: decision.assignedTo, assignedToName: decision.assignedToName, deficiencyId: raised.data.id,
      };
      save(done);
      await audit('CAPA_RECOMMENDATION_CONFIRMED', done, `Recommendation ${done.id} confirmed; CAPA ${raised.data.id} opened and assigned to ${decision.assignedToName}.`, actor.name);
      return ok(done);
    },

    async dismiss(id, reason) {
      const rec = deps.load().find(r => r.id === id);
      if (!rec) return fail('NOT_FOUND');
      const problem = decisionProblem(rec, { kind: 'dismiss', reason });
      if (problem) return fail(problem);
      if (!(await deps.enforce({ caseId: rec.caseId })).allowed) return fail('NOT_PERMITTED');
      const actor = deps.actor();
      const done: CapaRecommendation = {
        ...rec, status: 'dismissed', decidedBy: actor.id, decidedByName: actor.name, decidedAt: now().toISOString(), dismissReason: reason.trim(),
      };
      save(done);
      await audit('CAPA_RECOMMENDATION_DISMISSED', done, `Recommendation ${done.id} dismissed. Reason: ${reason.trim()}`, actor.name);
      return ok(done);
    },
  };
}
