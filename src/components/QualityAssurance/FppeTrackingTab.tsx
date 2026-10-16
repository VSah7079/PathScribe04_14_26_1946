// src/components/QualityAssurance/FppeTrackingTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Department-wide FPPE oversight — separate from the resident/attending
// Countersign Turnaround tab, since these represent genuinely different
// audiences and regulatory contexts (Joint Commission credentialing
// verification for new hires, not ACGME trainee milestones). Real data
// from qaSupervisionAssignmentService, FPPE activity only (Batch 515, PS-124:
// the legacy fppeAssignmentService is retired) — active assignments, their real progress
// toward the configured end condition, and completed ones with how they
// actually concluded.
//
// i18n note: `a.completedReason` is a real, persisted enum value —
// its display text below reuses the identical, already-translated
// strings from the admin-config counterpart, `fppeAssignmentsSection`
// (`Config/System/`), which also supplies almost every other label on
// this page (same real FPPE assignment concept, admin vs. tracking
// views). CSV export headers in `handleExport` stay literal English
// (persisted/exported data).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { qaSupervisionAssignmentService, subspecialtyService } from '@/services';
import type { Subspecialty } from '@/services';
import type { QaSupervisionAssignment } from '@/types/quality/QaSupervisionAssignment';
import { splitFppeAssignments, fppeProgressPercent as progressPercent, overdueFppeAssignments, fppeTrackingCsvRows } from '@/services/quality/fppeAssignmentForm';
import { formatDate } from '@/utils/formatDate';
import { exportQaReportRows } from './qaReportUtils';
import { QaScopeSwitcher } from './QaScopeSwitcher';
import { useQaCaseScope } from '@/hooks/useQaCaseScope';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';

export const FppeTrackingTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [assignments, setAssignments] = useState<QaSupervisionAssignment[]>([]);
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([qaSupervisionAssignmentService.getAll(), subspecialtyService.getAll()]).then(([aRes, sRes]) => {
      if (aRes.ok) setAssignments(aRes.data);
      if (sRes.ok) setSubspecialties(sRes.data);
      setLoading(false);
    });
  }, []);

  const subspecialtyName = (id?: string) => id ? (subspecialties.find(s => s.id === id)?.name ?? id) : t('fppeAssignmentsSection.form.allSubspecialties');
  // Batch 544: one facility or all. An assignment with no facility shows only enterprise-wide (qaScopeRows.ts).
  const qa = useQaCaseScope();
  const scoped = qa.filter(assignments, a => ({ facilityId: a.facilityId }));
  // Batch 515: FPPE only; progress, overdue and CSV rows come from services/quality/fppeAssignmentForm.ts.
  const { active, completed } = splitFppeAssignments(scoped, '');
  const overdue = overdueFppeAssignments(active); // hit the threshold but not yet formally graduated

  const handleExport = () => {
    const rows = fppeTrackingCsvRows([...active, ...completed], subspecialtyName);
    void exportQaReportRows('qa:fppe-tracking:export', rows, qa.filename('fppe-tracking'), qa.context, { scope: qa.scope });
  };

  if (loading) return <LoadingState label={t('fppeAssignmentsSection.loading')} />;

  return (
    <div>
      <div className="ps-qa-tab-toolbar">
        <QaScopeSwitcher facilitiesOnly scope={qa.scope} onChange={qa.setScope} visibleClientIds={qa.facilityIds(assignments, a => ({ facilityId: a.facilityId }))} />
        <CapabilityButton capability="qa:fppe-tracking:export" context={qa.context} className="ps-conf-btn-secondary" onClick={handleExport}>{t('qualityAssurance.common.export')}</CapabilityButton>
      </div>

      <div className="ps-qa-summary-tiles">
        <div className="ps-qa-tile"><div className="ps-qa-tile-value">{active.length}</div><div className="ps-qa-tile-label">{t('fppeTrackingTab.tileActiveAssignments')}</div></div>
        <div className="ps-qa-tile"><div className="ps-qa-tile-value">{completed.length}</div><div className="ps-qa-tile-label">{t('fppeAssignmentsSection.table.headers.completed')}</div></div>
        <div className={`ps-qa-tile${overdue.length > 0 ? ' ps-qa-tile--overdue' : ''}`}>
          <div className={`ps-qa-tile-value${overdue.length > 0 ? ' ps-qa-tile-value--overdue' : ''}`}>{overdue.length}</div>
          <div className="ps-qa-tile-label">{t('fppeTrackingTab.tileThresholdReached')}</div>
        </div>
      </div>

      <div className="ps-defic-review-banner ps-mt-20 ps-mb-8">
        <span className="ps-fw-600">{t('fppeAssignmentsSection.banners.active', { count: active.length })}</span>
      </div>
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead><tr><th className="ps-conf-th">{t('fppeAssignmentsSection.form.provisionalHireLabel')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.form.proctorLabel')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.scope')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.casesReviewed')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.progress')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.started')}</th></tr></thead>
          <tbody>
            {active.length === 0 && <tr><td className="ps-conf-td" colSpan={6}>{t('fppeAssignmentsSection.table.emptyActiveGlobal')}</td></tr>}
            {active.map(a => {
              const pct = progressPercent(a);
              return (
                <tr key={a.id}>
                  <td className="ps-conf-td">{a.superviseeUserName}</td>
                  <td className="ps-conf-td">{a.supervisorUserName}</td>
                  <td className="ps-conf-td">{subspecialtyName(a.subspecialtyId)}</td>
                  <td className="ps-conf-td">{a.casesReviewedCount}</td>
                  <td className={`ps-conf-td${pct !== null && pct >= 100 ? ' ps-conf-td--overdue' : ''}`}>{pct !== null ? `${pct.toFixed(0)}%` : '—'}</td>
                  <td className="ps-conf-td">{formatDate(a.startedAt, i18n.language)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ps-defic-review-banner ps-mt-20 ps-mb-8">
        <span className="ps-fw-600">{t('fppeAssignmentsSection.banners.completed', { count: completed.length })}</span>
      </div>
      <div className="ps-conf-table-wrap">
        <table className="ps-conf-table">
          <thead><tr><th className="ps-conf-th">{t('fppeAssignmentsSection.form.provisionalHireLabel')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.form.proctorLabel')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.casesReviewed')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.completed')}</th><th className="ps-conf-th">{t('fppeAssignmentsSection.table.headers.reason')}</th></tr></thead>
          <tbody>
            {completed.length === 0 && <tr><td className="ps-conf-td" colSpan={5}>{t('fppeAssignmentsSection.table.emptyCompletedGlobal')}</td></tr>}
            {completed.map(a => (
              <tr key={a.id}>
                <td className="ps-conf-td">{a.superviseeUserName}</td>
                <td className="ps-conf-td">{a.supervisorUserName}</td>
                <td className="ps-conf-td">{a.casesReviewedCount}</td>
                <td className="ps-conf-td">{a.completedAt ? formatDate(a.completedAt, i18n.language) : ''}</td>
                <td className="ps-conf-td">
                  {a.completedReason === 'manually_graduated'
                    ? t('fppeAssignmentsSection.table.completedReason.graduatedEarly')
                    : a.completedReason === 'case_count_met'
                      ? t('fppeAssignmentsSection.form.endConditionCaseCount')
                      : t('fppeAssignmentsSection.form.endConditionDuration')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
