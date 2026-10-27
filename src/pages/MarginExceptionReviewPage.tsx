// src/pages/MarginExceptionReviewPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 491 (deferred from Batch 490's own margin-distance extraction layer;
// see services/marginExtraction/README.md). Every Pending
// MarginExtractionException — a margin-distance free-text answer the
// extraction layer couldn't confidently parse into a number — needs a human
// to either tag the real distance (Resolve) or close it with no numeric tag
// (Dismiss, with a reason). Both actions are the service's own
// case:margin-exception:resolve capability (CapabilityButton here is
// presentation only; mockMarginExtractionService enforces it again).
// Rendering only — the extraction/exception rules live in
// services/marginExtraction/.
// ─────────────────────────────────────────────────────────────────────────────

import './marginExceptionHistory.css';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../pathscribe.css';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useOpenCase } from '@/hooks/useOpenCase';
import { useMarginExceptionReview } from '@/hooks/useMarginExceptionReview';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { isServiceOk } from '@/services/types';
import { formatDisplayNameForLanguage } from '@/utils/personName';
import { formatDateTime } from '@/utils/formatDate';

const MarginExceptionReviewPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const openCasePage = useOpenCase();
  const { pushCrumb } = useBreadcrumb();
  // Batch 492: this page never registered a breadcrumb either (same real
  // gap as TumorBoardWorkspacePage.tsx) — AppShell only shows the
  // breadcrumb bar once crumbs.length > 1, so it was silently absent.
  useEffect(() => { pushCrumb(t('marginExceptionReview.pageTitle'), '/margin-exception-review'); }, [pushCrumb, t]);
  const { rows, decidedRows, notices, loading, error, resolve, dismiss, busyId } = useMarginExceptionReview();
  const [resolveValues, setResolveValues] = useState<Record<string, string>>({});
  const [resolveError, setResolveError] = useState<{ id: string; message: string } | null>(null);
  const [dismissing, setDismissing] = useState<{ id: string; reason: string } | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);

  const onResolve = async (id: string) => {
    if (!user) return;
    setResolveError(null);
    const raw = resolveValues[id] ?? '';
    const valueMm = Number(raw);
    if (!raw.trim() || !Number.isFinite(valueMm) || valueMm < 0) {
      setResolveError({ id, message: t('marginExceptionReview.errors.valueMmInvalid') });
      return;
    }
    const res = await resolve(id, valueMm, user.id, user.name);
    if (isServiceOk(res)) {
      setResolveValues(prev => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setResolveError({ id, message: t(`marginExceptionReview.errors.${res.error}`, { defaultValue: t('marginExceptionReview.errors.saveFailed') }) });
    }
  };

  const onDismiss = async () => {
    if (!user || !dismissing) return;
    const res = await dismiss(dismissing.id, dismissing.reason, user.id, user.name);
    if (isServiceOk(res)) { setDismissing(null); setDismissError(null); }
    else setDismissError(t(`marginExceptionReview.errors.${res.error}`, { defaultValue: t('marginExceptionReview.errors.saveFailed') }));
  };

  return (
    <div className="ps-qcqueue-page ps-mex-page">
      <h1 className="ps-qcqueue-title">{t('marginExceptionReview.pageTitle')}</h1>
      <p className="ps-mex-subtitle">{t('marginExceptionReview.subtitle')}</p>
      {error && <div className="ps-qcqueue-error" role="alert">{error}</div>}
      {notices.map(n => (
        <div key={n.key} className={`ps-conf-hint ${n.kind === 'warning' ? 'ps-conf-hint--warning' : 'ps-conf-hint--success'}`} role="status">
          {t(n.key, n.params?.board ? { board: t(`tumorBoard.boards.${n.params.board}`, { defaultValue: n.params.board }) } : undefined)}
        </div>
      ))}

      <div className="ps-qcqueue-list">
        {rows.map(({ exception: exc, caseAccession, patientName }) => (
          <div key={exc.id} className="ps-qcqueue-row ps-mex-row">
            <div className="ps-qcqueue-row-patient" data-phi="name">
              {(patientName && formatDisplayNameForLanguage(patientName, i18n.language)) || exc.caseId}
              <span className="ps-qcqueue-row-accession" data-phi="accession">{caseAccession}</span>
            </div>
            <div className="ps-mex-problem">
              <div className="ps-mex-field-label">{exc.fieldLabel}</div>
              <div className="ps-mex-raw-text" data-phi="true">{exc.rawText}</div>
              <div className="ps-mex-reason">{t(`marginExceptionReview.reasons.${exc.reason}`, { defaultValue: exc.reason })}</div>
            </div>
            <div className="ps-qcqueue-row-actions ps-mex-row-actions">
              <div className="ps-mex-resolve-group">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="ps-conf-input ps-mex-value-input"
                  aria-label={t('marginExceptionReview.valueMmLabel')}
                  placeholder={t('marginExceptionReview.valueMmPlaceholder')}
                  value={resolveValues[exc.id] ?? ''}
                  onChange={e => setResolveValues(prev => ({ ...prev, [exc.id]: e.target.value }))}
                />
                <CapabilityButton
                  capability="case:margin-exception:resolve"
                  className="ps-conf-btn-primary"
                  context={{ caseId: exc.caseId }}
                  disabled={busyId === exc.id}
                  onClick={() => void onResolve(exc.id)}
                >
                  {t('marginExceptionReview.resolveBtn')}
                </CapabilityButton>
              </div>
              <CapabilityButton
                capability="case:margin-exception:resolve"
                className="ps-conf-btn-secondary"
                context={{ caseId: exc.caseId }}
                disabled={busyId === exc.id}
                onClick={() => { setDismissError(null); setDismissing({ id: exc.id, reason: '' }); }}
              >
                {t('marginExceptionReview.dismissBtn')}
              </CapabilityButton>
              <button className="ps-conf-btn-secondary" onClick={() => void openCasePage(exc.caseId, 'report', { state: { returnTo: '/margin-exception-review' } })}>
                {t('marginExceptionReview.openCaseBtn')}
              </button>
            </div>
            {resolveError?.id === exc.id && <div className="ps-conf-hint ps-conf-hint--warning ps-mex-row-error">{resolveError.message}</div>}
          </div>
        ))}
        {!loading && rows.length === 0 && <div className="ps-conf-empty-row">{t('marginExceptionReview.emptyRow')}</div>}
      </div>

      <h2 className="ps-mex-history-title">{t('marginExceptionReview.history.title')}</h2>
      <div className="ps-qcqueue-list" data-testid="mex-history">
        {decidedRows.map(({ exception: exc, caseAccession, patientName }) => (
          <div key={exc.id} className="ps-qcqueue-row ps-mex-row ps-mex-history-row">
            <div className="ps-qcqueue-row-patient" data-phi="name">
              {(patientName && formatDisplayNameForLanguage(patientName, i18n.language)) || exc.caseId}
              <span className="ps-qcqueue-row-accession" data-phi="accession">{caseAccession}</span>
            </div>
            <div className="ps-mex-problem">
              <div className="ps-mex-field-label">{exc.fieldLabel}</div>
              <div className="ps-mex-raw-text" data-phi="true">{exc.rawText}</div>
              <div className="ps-mex-outcome" data-phi="true">
                {exc.status === 'Resolved'
                  ? t('marginExceptionReview.history.resolved', { value: exc.resolvedValueMm })
                  : t('marginExceptionReview.history.dismissed', { reason: exc.dismissReason })}
              </div>
              <div className="ps-mex-field-label">
                {t('marginExceptionReview.history.by', { name: exc.resolvedByUserName, when: formatDateTime(exc.resolvedAt, i18n.language) })}
              </div>
            </div>
            <div className="ps-qcqueue-row-actions ps-mex-row-actions">
              <button className="ps-conf-btn-secondary" onClick={() => void openCasePage(exc.caseId, 'report', { state: { returnTo: '/margin-exception-review' } })}>
                {t('marginExceptionReview.openCaseBtn')}
              </button>
            </div>
          </div>
        ))}
        {!loading && decidedRows.length === 0 && <div className="ps-conf-empty-row">{t('marginExceptionReview.history.empty')}</div>}
      </div>

      {dismissing && (
        <div data-capture-hide="true" className="ps-conf-backdrop" onClick={() => setDismissing(null)}>
          <div className="ps-conf-modal" onClick={e => e.stopPropagation()}>
            <div className="ps-conf-modal-header">{t('marginExceptionReview.dismissModal.title')}</div>
            <div className="ps-conf-modal-body">
              <label className="ps-conf-label" htmlFor="mex-dismiss-reason">{t('marginExceptionReview.dismissModal.reasonLabel')}</label>
              <textarea
                id="mex-dismiss-reason"
                className="ps-conf-input"
                value={dismissing.reason}
                onChange={e => setDismissing({ ...dismissing, reason: e.target.value })}
              />
              {dismissError && <div className="ps-conf-hint ps-conf-hint--warning">{dismissError}</div>}
            </div>
            <div className="ps-conf-modal-footer">
              <button className="ps-conf-btn-secondary" onClick={() => setDismissing(null)}>{t('marginExceptionReview.dismissModal.cancelBtn')}</button>
              <button className="ps-conf-btn-primary" disabled={!dismissing.reason.trim()} onClick={() => void onDismiss()}>
                {t('marginExceptionReview.dismissModal.submitBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarginExceptionReviewPage;
