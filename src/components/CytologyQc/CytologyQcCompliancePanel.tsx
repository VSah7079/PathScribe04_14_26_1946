// src/components/CytologyQc/CytologyQcCompliancePanel.tsx
// Batch 608 (#53): the QC compliance report (rescreening totals, discrepancy
// rate, per-reviewer rates) for audits, from every QC assignment on file.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cytologyQcCaseAssignmentService, userService } from '@/services';
import { resolveCytologyQcComplianceReport } from '@/services/cytologyQc/resolveCytologyQcComplianceReport';
import type { CytologyQcCaseAssignment } from '@/types/cytologyQc/CytologyQcRule';

export function CytologyQcCompliancePanel() {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<CytologyQcCaseAssignment[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    void cytologyQcCaseAssignmentService.getAll().then(r => { if (r.ok) setAssignments(r.data); });
    void userService.getAll().then(r => { if (r.ok) setNames(Object.fromEntries(r.data.map(u => [u.id, `${u.firstName} ${u.lastName}`.trim()]))); });
  }, []);
  const report = useMemo(() => resolveCytologyQcComplianceReport(assignments), [assignments]);
  const pct = (n: number | undefined) => (n === undefined ? t('cytologyQcCompliance.noData') : `${n.toFixed(1)}%`);

  return (
    <section className="ps-qccomp" aria-label={t('cytologyQcCompliance.title')}>
      <h2 className="ps-qccomp-title">{t('cytologyQcCompliance.title')}</h2>
      <dl className="ps-qccomp-grid">
        <div><dt>{t('cytologyQcCompliance.total')}</dt><dd>{report.totalAssignments}</dd></div>
        <div><dt>{t('cytologyQcCompliance.resolved')}</dt><dd>{report.totalResolved}</dd></div>
        <div><dt>{t('cytologyQcCompliance.concordant')}</dt><dd>{report.totalConcordant}</dd></div>
        <div><dt>{t('cytologyQcCompliance.discrepancies')}</dt><dd>{report.totalDiscrepancies}</dd></div>
        <div><dt>{t('cytologyQcCompliance.rate')}</dt><dd>{pct(report.discrepancyRatePercent)}</dd></div>
        <div><dt>{t('cytologyQcCompliance.major')}</dt><dd>{report.majorDiscrepancyCount}</dd></div>
        <div><dt>{t('cytologyQcCompliance.minor')}</dt><dd>{report.minorDiscrepancyCount}</dd></div>
        <div><dt>{t('cytologyQcCompliance.slaEscalations')}</dt><dd>{report.totalSlaBreachEscalations}</dd></div>
        <div><dt>{t('cytologyQcCompliance.bypasses')}</dt><dd>{report.totalSupervisorBypasses}</dd></div>
      </dl>
      <h3 className="ps-qccomp-sub">{t('cytologyQcCompliance.byReviewer')}</h3>
      {report.byReviewer.length === 0 ? (
        <div className="ps-conf-empty-row">{t('cytologyQcCompliance.noReviewers')}</div>
      ) : (
        <table className="ps-conf-table">
          <thead><tr>
            <th>{t('cytologyQcCompliance.reviewer')}</th><th>{t('cytologyQcCompliance.reviewed')}</th>
            <th>{t('cytologyQcCompliance.discrepancies')}</th><th>{t('cytologyQcCompliance.rate')}</th>
          </tr></thead>
          <tbody>
            {report.byReviewer.map(s => (
              <tr key={s.reviewerId}>
                <td>{names[s.reviewerId] ?? s.reviewerId}</td><td>{s.casesReviewed}</td>
                <td>{s.discrepancyCount}</td><td>{pct(s.discrepancyRatePercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
