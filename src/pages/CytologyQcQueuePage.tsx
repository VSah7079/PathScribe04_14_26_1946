// src/pages/CytologyQcQueuePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct resolution: "One Unified Peer Review Queue backed
// by dynamic rule prioritization" — the actual pathologist-facing
// screen. Real, per direct guidance ("no business logic in the UI"):
// sorting (sortQcQueueByPriority.ts, inside the service's own
// getUnifiedQueue()), tab filtering (resolveQcQueueTabFilter.ts), and
// SLA status (resolveQcSlaStatus.ts) are all pure functions this file
// only calls and renders. Built with useTranslation() from the start.
//
// Real, deliberate placement for now: a standalone page/route, not
// yet embedded in the main WorklistPage's own new Pathologist tiles
// (Parts 1/2 of the original worklist spec) — that integration is
// real, separate, deferred work; this component is built so it can
// be dropped into that later home unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { useOpenCase } from '@/hooks/useOpenCase';
import React, { useState, useEffect, useCallback } from 'react';
import { CytologyQcDiscrepancyModal } from '@/components/CytologyQc/CytologyQcDiscrepancyModal';
import { useCytologyQcActions, useMyQcReviewerRoles } from '@/hooks/useCytologyQcActions';
import { useCapabilities } from '@/hooks/useCapabilities';
import { resolveCytologyQcCaseReview } from '@/services/cytologyQc/resolveCytologyQcCaseReview';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import ReasonPromptModal from '@/components/Common/ReasonPromptModal';
import { useTranslation } from 'react-i18next';
import '../pathscribe.css';
import { useAuth } from '@contexts/AuthContext';
import { caseRouter } from '@/services/cases/CaseRouter';
import { cytologyQcCaseAssignmentService, cytologyQcRuleService, cytologyReviewRecordService, cytologyCategoryService } from '@/services';
import { AdvisorySeverityBadge } from '@/components/CytologyQc/AdvisorySeverityBadge';
import { CytologyQcCompliancePanel } from '@/components/CytologyQc/CytologyQcCompliancePanel';
import { resolveCytologyCaseSeverities } from '@/services/cytology/resolveCytologyCaseSeverities';
import type { AbnormalSeverity } from '@/services/abnormalDetection/IAbnormalTriggerRuleService';
import { qcSelectionReasonLabel, qcSelectionReasons } from '@/services/cytologyQc/qcSelectionReasonLabels';
import { formatList } from '@/utils/formatList';
import { resolveQcQueueTabFilter, type QcQueueTab } from '@/services/cytologyQc/resolveQcQueueTabFilter';
import { resolveQcSlaStatus, type QcSlaStatus } from '@/services/cytologyQc/resolveQcSlaStatus';
import { resolvePatientFullDisplayName } from '@/utils/personName';
import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';
import type { Case } from '@/types/case/Case';

const SLA_STATUS_CLASS: Record<QcSlaStatus, string> = {
  on_time: 'ps-qcqueue-sla--ontime',
  approaching: 'ps-qcqueue-sla--approaching',
  breached: 'ps-qcqueue-sla--breached',
};

const CytologyQcQueuePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  // Batch 432: the bypass shows only to people whose role holds it.
  const { has: can } = useCapabilities();
  const openCasePage = useOpenCase();
  const [activeTab, setActiveTab] = useState<QcQueueTab>('all');
  const [queue, setQueue] = useState<CytologyQcCaseAssignment[]>([]);
  const [casesById, setCasesById] = useState<Record<string, Case>>({});
  // Batch 501: rule names, for "Selected by".
  const [ruleNames, setRuleNames] = useState<Record<string, string>>({});
  // Batch 608 (#53, #54): the Compliance view, and each case's advisory severity.
  const [view, setView] = useState<'queue' | 'compliance'>('queue');
  const [severities, setSeverities] = useState<Record<string, AbnormalSeverity>>({});
  const [now, setNow] = useState(() => new Date().toISOString());
  const [discrepancyTargetId, setDiscrepancyTargetId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await cytologyQcCaseAssignmentService.getUnifiedQueue();
    if (!result.ok) return;
    setQueue(result.data);
    const uniqueCaseIds = [...new Set(result.data.map(a => a.caseId))];
    const resolvedCases = await Promise.all(uniqueCaseIds.map(id => caseRouter.getCase(id)));
    const nextCasesById: Record<string, Case> = {};
    uniqueCaseIds.forEach((id, i) => { const c = resolvedCases[i]; if (c) nextCasesById[id] = c; });
    setCasesById(nextCasesById);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    void cytologyQcRuleService.getAll().then(r => { if (r.ok) setRuleNames(Object.fromEntries(r.data.map(rule => [rule.id, rule.name]))); });
  }, []);
  useEffect(() => {
    void Promise.all([cytologyReviewRecordService.getAll(), cytologyCategoryService.getAll()]).then(([reviews, cats]) => {
      if (reviews.ok && cats.ok) setSeverities(resolveCytologyCaseSeverities(reviews.data, cats.data));
    });
  }, []);
  const list = (items: string[]) => formatList(items, i18n.language);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date().toISOString()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const visible = resolveQcQueueTabFilter(queue, activeTab);

  // Batch 396: the actions go through the same hook as the case screen's
  // review bar, and a refusal or failure is shown instead of ignored.
  const { busy, message, assignToMe, recordConcurrence, recordDiscrepancy, escalate, bypass } = useCytologyQcActions(refresh);
  const myPools = useMyQcReviewerRoles(user?.id);
  // Batch 432: escalating an SLA breach, and the supervisor bypass, each with a reason.
  const [escalateTargetId, setEscalateTargetId] = useState<string | null>(null);
  const [bypassTargetId, setBypassTargetId] = useState<string | null>(null);

  const handleDiscrepancySubmit = async (primary: string, secondary: string, severity: 'major' | 'minor', commentary: string, divergenceConfirmed: boolean) => {
    if (!discrepancyTargetId) return;
    await recordDiscrepancy(discrepancyTargetId, { primaryDiagnosticCode: primary, secondaryDiagnosticCode: secondary, severity, reviewerCommentary: commentary, divergenceConfirmed });
    setDiscrepancyTargetId(null);
  };

  return (
    <div className="ps-qcqueue-page">
      <h1 className="ps-qcqueue-title">{t('cytologyQcQueue.pageTitle')}</h1>
      {message && <div className="ps-qcqueue-error" role="alert">{t(`cytologyQcQueue.error.${message}`)}</div>}

      <div className="ps-qcqueue-tabs">
        {(['queue', 'compliance'] as const).map(v => (
          <button key={v} className={`ps-qcqueue-tab-btn${view === v ? ' ps-qcqueue-tab-btn--active' : ''}`} onClick={() => setView(v)}>
            {t(`cytologyQcQueue.view.${v}`)}
          </button>
        ))}
      </div>
      {view === 'compliance' && <CytologyQcCompliancePanel />}
      {view === 'queue' && <>
      <div className="ps-qcqueue-tabs">
        {(['all', 'escalations_discrepancies', 'routine_random'] as QcQueueTab[]).map(tab => (
          <button key={tab} className={`ps-qcqueue-tab-btn${activeTab === tab ? ' ps-qcqueue-tab-btn--active' : ''}`} onClick={() => setActiveTab(tab)}>
            {t(`cytologyQcQueue.tab.${tab}`)}
          </button>
        ))}
      </div>

      <div className="ps-qcqueue-list">
        {visible.map(assignment => {
          const relatedCase = casesById[assignment.caseId];
          const slaStatus = resolveQcSlaStatus(assignment.createdAt, assignment.slaDeadline, now);
          const suggestedSeverity = severities[assignment.caseId];
          const isAssignedToMe = user && assignment.assignedReviewerId === user.id;
          // Batch 434: Assign to Me and the verdicts follow cytology:qc-review:record
          // and the self-review rule (resolveCytologyQcCaseReview), as on the case's own bar.
          const review = resolveCytologyQcCaseReview([assignment], user?.id, can('cytology:qc-review:record'), myPools);

          return (
            <div key={assignment.id} className="ps-qcqueue-row">
              <div className="ps-qcqueue-row-patient" data-phi="true">
                {(relatedCase && resolvePatientFullDisplayName(relatedCase.patient, i18n.language)) ?? assignment.caseId}
                <span className="ps-qcqueue-row-accession" data-phi="accession">{relatedCase?.accession.accessionNumber}</span>
              </div>
              <div className="ps-qcqueue-row-badges">
                <span className={`ps-qcqueue-tier-badge ps-qcqueue-tier-badge--${assignment.priorityTier}`}>
                  {t(`cytologyQcRules.tier.${assignment.priorityTier}`)}
                </span>
                {suggestedSeverity && <AdvisorySeverityBadge severity={suggestedSeverity} />}
                {assignment.badges.map(badge => <span key={badge} className="ps-qcqueue-badge-pill">{badge}</span>)}
                <span className={`ps-qcqueue-sla-badge ${SLA_STATUS_CLASS[slaStatus]}`}>{t(`cytologyQcQueue.slaStatus.${slaStatus}`)}</span>
              </div>
              {/* Batch 501: every trigger that selected the specimen, and the reviewer pool it is routed to. */}
              <div className="ps-qcqueue-row-selection">
                <span>{t('cytologyQcQueue.selectedBy.label', { reasons: list(qcSelectionReasons(assignment).map(r => { const l = qcSelectionReasonLabel(r, ruleNames); return t(l.key, l.values); })) })}</span>
                {!!assignment.eligibleReviewerRoles?.length && (
                  <span>{t('cytologyQcQueue.selectedBy.reviewerPool', { roles: list(assignment.eligibleReviewerRoles) })}</span>
                )}
              </div>
              <div className="ps-qcqueue-row-actions">
                {/* Batch 396 (Pete): open the case to review it (slides, the
                    primary review) before recording a verdict. Back returns here. */}
                <button className="ps-conf-btn-secondary" onClick={() => void openCasePage(assignment.caseId, 'cytology', { state: { returnTo: '/worklist?view=cytologyQc' } })}>
                  {t('cytologyQcQueue.openCaseBtn')}
                </button>
                {review.canAssignToMe && (
                  <button className="ps-conf-btn-primary" disabled={busy} onClick={() => void assignToMe(assignment.id)}>{t('cytologyQcQueue.assignToMeBtn')}</button>
                )}
                {review.isOwnCase && <span className="ps-qcqueue-assigned-note">{t('cytologyQcQueue.error.selfReview')}</span>}
                {review.notInPool && <span className="ps-qcqueue-assigned-note">{t('cytologyQcQueue.error.notInPool')}</span>}
                {review.canRecordVerdict && (
                  <>
                    <button className="ps-conf-btn-primary" disabled={busy} onClick={() => void recordConcurrence(assignment.id)}>{t('cytologyQcQueue.recordConcurrenceBtn')}</button>
                    <button className="ps-conf-btn-secondary" onClick={() => setDiscrepancyTargetId(assignment.id)}>{t('cytologyQcQueue.recordDiscrepancyBtn')}</button>
                  </>
                )}
                {assignment.state === 'QC_IN_REVIEW' && !isAssignedToMe && (
                  <span className="ps-qcqueue-assigned-note">{t('cytologyQcQueue.assignedToOther')}</span>
                )}
                {assignment.state === 'QC_IN_REVIEW' && slaStatus === 'breached' && (
                  <CapabilityButton capability="cytology:qc-review:record" className="ps-conf-btn-secondary" disabled={busy} onClick={() => setEscalateTargetId(assignment.id)}>
                    {t('cytologyQcQueue.escalate.button')}
                  </CapabilityButton>
                )}
                {assignment.state !== 'FINAL_APPROVED' && assignment.state !== 'QC_DISCREPANCY_REVISE' && can('cytology:qc-review:bypass') && (
                  <button className="ps-conf-btn-secondary ps-qcqueue-bypass-btn" disabled={busy} onClick={() => setBypassTargetId(assignment.id)}>
                    {t('cytologyQcQueue.bypass.button')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <div className="ps-conf-empty-row">{t('cytologyQcQueue.emptyRow')}</div>}
      </div>
      </>}

      <ReasonPromptModal
        show={!!escalateTargetId}
        title={t('cytologyQcQueue.escalate.title')}
        message={t('cytologyQcQueue.escalate.message')}
        reasonLabel={t('cytologyQcQueue.escalate.reasonLabel')}
        confirmLabel={t('cytologyQcQueue.escalate.button')}
        onConfirm={reason => { const id = escalateTargetId; setEscalateTargetId(null); if (id) void escalate(id, reason); }}
        onCancel={() => setEscalateTargetId(null)}
      />
      <ReasonPromptModal
        show={!!bypassTargetId}
        title={t('cytologyQcQueue.bypass.title')}
        message={t('cytologyQcQueue.bypass.message')}
        reasonLabel={t('cytologyQcQueue.bypass.reasonLabel')}
        confirmLabel={t('cytologyQcQueue.bypass.button')}
        onConfirm={reason => { const id = bypassTargetId; setBypassTargetId(null); if (id) void bypass(id, reason); }}
        onCancel={() => setBypassTargetId(null)}
      />

      {discrepancyTargetId && (
        <CytologyQcDiscrepancyModal onSubmit={handleDiscrepancySubmit} onClose={() => setDiscrepancyTargetId(null)} />
      )}
    </div>
  );
};

export default CytologyQcQueuePage;
