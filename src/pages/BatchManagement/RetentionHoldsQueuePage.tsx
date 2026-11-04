// src/pages/BatchManagement/RetentionHoldsQueuePage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entry #12): every active retention hold in one list — the case,
// the reason, who placed it and when — with a Release action and a CSV export.
// A hold keeps a case's material out of the disposal queue (Batch Management →
// Disposal); this is where someone sees what is being held and lets it go.
//
//   • Release needs case:retention-hold:release for the case's facility, and the
//     release note the organisation's Field Requirements ask for (the same
//     releaseHold the report page's Retention hold window uses, so it is audited).
//   • CSV export needs retention:holds-queue:export and goes through the export
//     service. The free-text note is not exported (it can name people).
//   • Accession numbers and notes are tagged data-phi.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import '../../pathscribe.css';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import { authorizationService, auditService } from '@/services';
import { caseRouter } from '@/services/cases/CaseRouter';
import { releaseHold } from '@/services/cases/caseHolds';
import { runExport } from '@/services/exports/runExport';
import { loadRetentionHoldsQueue } from '@/services/retentionHolds/loadRetentionHoldsQueue';
import { filterRetentionHoldRows, retentionHoldCsvRows, type RetentionHoldRow } from '@/services/retentionHolds/retentionHoldsQueue';
import { exportRetentionHoldsQueue } from '@/services/retentionHolds/exportRetentionHoldsQueue';
import { formatDateTime } from '@/utils/formatDate';
import type { RetentionHoldReason } from '@/types/case/RetentionHold';

const REASON_LABEL_KEY: Record<RetentionHoldReason, string> = {
  patient_requested_retention: 'retentionHoldModal.reason.patientRequestedRetention',
  litigation_hold:             'retentionHoldModal.reason.litigationHold',
  research_hold:               'retentionHoldModal.reason.researchHold',
  other:                       'intraopQueue.skipReasons.other',
};

const RetentionHoldsQueuePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { pushCrumb } = useBreadcrumb();
  const { user } = useAuth();
  const requirements = useFieldRequirements('report');
  useEffect(() => { pushCrumb(t('retentionHoldsQueue.pageTitle'), '/batch-management/retention-holds'); }, [pushCrumb, t]);

  const [rows, setRows] = useState<RetentionHoldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [releasing, setReleasing] = useState<RetentionHoldRow | null>(null);
  const [releaseNote, setReleaseNote] = useState('');
  const [busy, setBusy] = useState(false);

  const reasonLabel = useCallback((r: RetentionHoldReason) => t(REASON_LABEL_KEY[r]), [t]);
  const load = useCallback(async () => { setRows(await loadRetentionHoldsQueue()); setLoading(false); }, []);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => filterRetentionHoldRows(rows, text, reasonLabel), [rows, text, reasonLabel]);

  const handleRelease = async () => {
    if (!releasing || busy || !releaseNote.trim()) return;
    setBusy(true);
    const result = await releaseHold('retention', releasing.caseId, { releaseNote }, { id: user?.id ?? 'unknown', name: user?.name ?? 'unknown' }, requirements, {
      authorization: authorizationService,
      getCase: (id: string) => caseRouter.getCase(id),
      updateCase: (id: string, patch: Parameters<typeof caseRouter.updateCase>[1], version: number) => caseRouter.updateCase(id, patch, version),
      audit: auditService.logEvent.bind(auditService),
    });
    setBusy(false);
    if (result.ok === false) {
      toast.error(t(`retentionHoldsQueue.releaseRefused.${result.reason === 'notPermitted' || result.reason === 'missing' || result.reason === 'noActiveHold' || result.reason === 'caseNotFound' ? result.reason : 'other'}`));
      return;
    }
    setReleasing(null);
    setReleaseNote('');
    toast.success(t('retentionHoldsQueue.released'));
    await load();
  };

  const handleExport = async () => {
    const filename = `retention-holds-${new Date().toISOString().slice(0, 10)}`;
    const csv = retentionHoldCsvRows(shown, reasonLabel);
    await runExport('retention.holds-queue', filename, { text }, async () => {
      const res = await exportRetentionHoldsQueue(csv, filename, { allFacilities: true }, { authorization: authorizationService });
      if (!res.ok) toast.error(t('retentionHoldsQueue.export.notPermitted'));
    });
  };

  if (loading) return <LoadingState label={t('retentionHoldsQueue.loading')} />;

  return (
    <div className="ps-batch-page" data-testid="retention-holds-queue">
      <div className="ps-batch-scroll">
        <div className="ps-batch-inner">
          <div className="ps-batch-page-header">
            <h1 className="ps-batch-page-title">🔒 {t('retentionHoldsQueue.pageTitle')}</h1>
            <p className="ps-batch-page-subtitle">{t('retentionHoldsQueue.pageSubtitle')}</p>
          </div>

          <div className="ps-conf-form-row">
            <input
              type="text" className="ps-conf-search" value={text} onChange={e => setText(e.target.value)} data-dirty-ignore
              placeholder={t('retentionHoldsQueue.searchPlaceholder')} aria-label={t('retentionHoldsQueue.searchPlaceholder')}
            />
            <span className="ps-conf-value" data-testid="retention-holds-count">{t('retentionHoldsQueue.count', { count: shown.length })}</span>
            <CapabilityButton
              capability="retention:holds-queue:export" className="ps-auditlog-export-btn" disabled={shown.length === 0}
              context={{ allFacilities: true }} onClick={() => { void handleExport(); }}
            >
              {t('retentionHoldsQueue.export.button')}
            </CapabilityButton>
          </div>

          {shown.length === 0 ? (
            <p className="ps-conf-section-subtitle" data-testid="retention-holds-empty">{t('retentionHoldsQueue.empty')}</p>
          ) : (
            <div className="ps-conf-table-wrap"><div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky"><tr>
                  <th className="ps-conf-th">{t('retentionHoldsQueue.columns.case')}</th>
                  <th className="ps-conf-th">{t('retentionHoldsQueue.columns.reason')}</th>
                  <th className="ps-conf-th">{t('retentionHoldsQueue.columns.note')}</th>
                  <th className="ps-conf-th">{t('retentionHoldsQueue.columns.placedBy')}</th>
                  <th className="ps-conf-th">{t('retentionHoldsQueue.columns.placedAt')}</th>
                  <th className="ps-conf-th">{t('retentionHoldsQueue.columns.actions')}</th>
                </tr></thead>
                <tbody>
                  {shown.map(r => (
                    <tr key={r.holdId} className="ps-conf-tr">
                      <td className="ps-conf-td"><span data-phi="accession">{r.accession}</span></td>
                      <td className="ps-conf-td">{reasonLabel(r.reason)}</td>
                      <td className="ps-conf-td"><span data-phi="true">{r.note || '—'}</span></td>
                      <td className="ps-conf-td">{r.setByUserName}</td>
                      <td className="ps-conf-td">{formatDateTime(r.setAt, i18n.language)}</td>
                      <td className="ps-conf-td">
                        <CapabilityButton
                          capability="case:retention-hold:release" className="ps-conf-btn-row"
                          context={r.facilityId ? { facilityIds: [r.facilityId] } : undefined}
                          onClick={() => { setReleasing(r); setReleaseNote(''); }}
                        >
                          {t('retentionHoldsQueue.release.button')}
                        </CapabilityButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></div>
          )}
        </div>
      </div>

      {releasing && (
        <div className="ps-ms-overlay"><div className="ps-ms-modal" role="dialog" aria-label={t('retentionHoldsQueue.release.title')}>
          <div className="ps-ms-header">🔓 {t('retentionHoldsQueue.release.title')}</div>
          <div className="ps-ms-body">
            <p><span data-phi="accession">{releasing.accession}</span> · {reasonLabel(releasing.reason)}</p>
            <label className="ps-conf-label" htmlFor="rh-release-note">{t('retentionHoldsQueue.release.noteLabel')}</label>
            <textarea id="rh-release-note" className="ps-conf-input" rows={3} value={releaseNote} onChange={e => setReleaseNote(e.target.value)} data-phi="true" />
          </div>
          <div className="ps-ms-footer">
            <button className="ps-ms-btn-cancel" onClick={() => setReleasing(null)}>{t('common.cancel')}</button>
            <button className="ps-ms-btn-apply" disabled={busy || !releaseNote.trim()} onClick={() => { void handleRelease(); }}>{t('retentionHoldsQueue.release.confirm')}</button>
          </div>
        </div></div>
      )}
    </div>
  );
};

export default RetentionHoldsQueuePage;
