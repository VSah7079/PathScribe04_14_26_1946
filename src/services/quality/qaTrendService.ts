// src/services/quality/qaTrendService.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-147 (Batch 442): discordance-pattern recommendations for the Lab
// Director (rules in qaTrendRules.ts).
//
//   list()        the recommendations; needs qa:pathologist-trend:view.
//   evaluate()    judges every group against its site's policy and adds a
//                 recommendation for each newly crossed one (one open per
//                 subject and lab); returns all groups' numbers. Needs
//                 qa:pathologist-trend:view. The mock runs it when the trend
//                 list opens; the server should run it after each QA record.
//   decide()      start a review, conclude it with a CAPA, or dismiss (with
//                 a reason). Needs qa:pathologist-trend:decide. Audited.
//
// Nothing here opens a CAPA by itself (Pete). Personnel-sensitive: the
// reviewed pathologist doesn't hold the view capability by default.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { QaTrendRecommendation, QaTrendPolicySettings } from '@/types/quality/QaTrend';
import type { NewAuditLog } from '../auditlog/IAuditService';
import {
  applyQaTrendDecision, newQaTrendRecommendations, qaTrendCandidates, qaTrendDecisionProblem,
  type QaTrendDecision, type QaTrendDecisionProblem, type TrendCandidate, type TrendRecord,
} from './qaTrendRules';

export interface QaTrendDeps {
  load(): QaTrendRecommendation[];
  persist(all: QaTrendRecommendation[]): void;
  trendRecords(): Promise<TrendRecord[]>;
  policy(): Promise<QaTrendPolicySettings>;
  enforce(capability: 'qa:pathologist-trend:view' | 'qa:pathologist-trend:decide'): Promise<{ allowed: boolean }>;
  audit(entry: NewAuditLog): Promise<unknown>;
  actor(): { userId: string; userName: string };
  now?: () => Date;
  newId?: () => string;
}

export type QaTrendError = QaTrendDecisionProblem | 'NOT_PERMITTED' | 'NOT_FOUND';

export function createQaTrendService(deps: QaTrendDeps) {
  const now = () => deps.now?.() ?? new Date();
  const newId = deps.newId ?? (() => `qtr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  const audit = (event: string, detail: string) =>
    deps.audit({ type: 'user', event, detail, user: deps.actor().userId, caseId: null, confidence: null }).catch(() => {});

  return {
    async list(): Promise<ServiceResult<QaTrendRecommendation[]>> {
      if (!(await deps.enforce('qa:pathologist-trend:view')).allowed) return { ok: false, error: 'NOT_PERMITTED' };
      return { ok: true, data: deps.load() };
    },

    async evaluate(): Promise<ServiceResult<{ candidates: TrendCandidate[]; added: QaTrendRecommendation[] }>> {
      if (!(await deps.enforce('qa:pathologist-trend:view')).allowed) return { ok: false, error: 'NOT_PERMITTED' };
      const at = now();
      const candidates = qaTrendCandidates(await deps.trendRecords(), await deps.policy(), at);
      const existing = deps.load();
      const added = newQaTrendRecommendations(candidates, existing, at, newId);
      if (added.length) {
        deps.persist([...existing, ...added]);
        for (const r of added) {
          await audit('QA_TREND_RECOMMENDED', `Discordance pattern (${r.kind}): ${r.subjectName}, ${r.majorCount} major of ${r.totalReviewed} reviewed (${r.ratePercent}%) since ${r.windowStart.slice(0, 10)}; ${r.status}.`);
        }
      }
      return { ok: true, data: { candidates, added } };
    },

    async decide(id: string, decision: QaTrendDecision): Promise<ServiceResult<QaTrendRecommendation>> {
      if (!(await deps.enforce('qa:pathologist-trend:decide')).allowed) return { ok: false, error: 'NOT_PERMITTED' };
      const all = deps.load();
      const rec = all.find(r => r.id === id);
      if (!rec) return { ok: false, error: 'NOT_FOUND' };
      const problem = qaTrendDecisionProblem(rec, decision);
      if (problem) return { ok: false, error: problem };
      const updated = applyQaTrendDecision(rec, decision, deps.actor(), now().toISOString());
      deps.persist(all.map(r => (r.id === id ? updated : r)));
      await audit('QA_TREND_DECIDED', `Discordance pattern (${rec.kind}) for ${rec.subjectName}: ${updated.status}${updated.note ? ` — ${updated.note.replace(/[.\s]+$/, '')}` : ''}.`);
      return { ok: true, data: updated };
    },
  };
}

export type IQaTrendService = ReturnType<typeof createQaTrendService>;
