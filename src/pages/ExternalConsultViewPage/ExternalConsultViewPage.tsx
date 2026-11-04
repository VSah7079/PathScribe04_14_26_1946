// src/pages/ExternalConsultViewPage/ExternalConsultViewPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-290 — External Consult / Second-Opinion Access, the OUTSIDE half.
// Public, unauthenticated route (`/consult#<token>`; Batch 522 moved the
// token after `#`, and `/consult/:token` still opens links issued before) — same real,
// deliberate "Station Identity, not per-user login" posture as
// /or-suite-dashboard and /facility-ops-dashboard, but for a
// completely different reason: there IS no PathScribe login for an
// outside consultant to have. The token itself is this page's entire
// authorization — see services/consultAccess/IConsultTokenService.ts's
// own header for the full, load-bearing caveat on what that actually
// means (NOT real cryptographic security).
//
// Batch 669 (access-11): the patient is shown masked (initials, birth year) unless the issuer opted in;
// the choice is made in the service (consultIdentityMask.ts), so a masked view never holds the full values.
//
// Batch 522: the page no longer reads the case itself. It asks the token
// service for the consult view (consultTokenService.openConsult), which
// checks the token, records the view and returns only what the link
// covers: the accession, the patient, and the specimens and slides in
// scope (services/consultAccess/consultLinkRules.ts). An opinion is sent
// with the token, which is checked again, so a link revoked meanwhile
// takes nothing; once a signed opinion is in, the link takes no more opinions and works for 3 more views or 48 hours (banner).
//
// i18n note: this page is a standalone, self-contained shell (its own
// dark theme, not the normal app chrome — see the "Station Identity"
// posture above), so its inline styles were converted to a dedicated
// `.ps-extconsult-*` class family rather than reused `.ps-conf-*`/
// `.ps-modal-dark-*` classes. Patient/specimen/slide identifiers stay
// as real data; `signedStatus`'s underlying 'Draft'/'Signed' values
// stay literal via SIGNED_STATUS_LABEL_KEY, translating only the
// displayed button label.
// ─────────────────────────────────────────────────────────────────────────────

import './externalConsultDraft.css';
import './externalConsultLifetime.css';
import React, { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { consultTokenService } from '@/services';
import type { ConsultOpinionSignedStatus } from '@/services/consultAccess/IConsultTokenService';
import { consultSubmitConfirmationKey, type ConsultCaseView } from '@/services/consultAccess/consultLinkRules';
import { useConsultLinkToken } from '@/hooks/useConsultLinkToken';
import { formatDateTime } from '@/utils/formatDate';
import { LoadingState } from '@/components/Common/LoadingState';

const SIGNED_STATUS_LABEL_KEY: Record<ConsultOpinionSignedStatus, string> = {
  Draft:  'externalConsultViewPage.status.draft',
  Signed: 'externalConsultViewPage.status.signed',
};

/** Batch 522: the service's refusal codes, as text. */
const SUBMIT_ERROR_KEY: Record<string, string> = {
  OPINION_REQUIRED:       'externalConsultViewPage.requiredOpinionError',
  OPINION_ALREADY_SIGNED: 'externalConsultViewPage.errors.alreadySigned',
  CONSULT_LINK_INVALID:   'externalConsultViewPage.errors.linkNoLongerActive',
};

const DisclosureBanner: React.FC = () => (
  <div className="ps-extconsult-disclosure-banner">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="ps-extconsult-disclosure-icon"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    <span className="ps-extconsult-disclosure-text">
      <Trans i18nKey="externalConsultViewPage.disclosureBanner" components={{ strong: <strong /> }} />
    </span>
  </div>
);

const ExternalConsultViewPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const token = useConsultLinkToken();
  const [status, setStatus] = useState<'loading' | 'invalid' | 'ready'>('loading');
  const [view, setView] = useState<ConsultCaseView | null>(null);

  const [diagnosticCategory, setDiagnosticCategory] = useState('');
  const [signedStatus, setSignedStatus] = useState<ConsultOpinionSignedStatus>('Draft');
  const [opinionText, setOpinionText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedAs, setSubmittedAs] = useState<ConsultOpinionSignedStatus | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!token) { setStatus('invalid'); return; }
    // One call: the token is checked, the view recorded, and only the link's scope comes back.
    consultTokenService.openConsult(token).then(res => {
      if (cancelled) return;
      if (!res.ok) { setStatus('invalid'); return; }
      setView(res.data);
      setStatus('ready');
    });
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmitOpinion = async () => {
    if (!token || !view) return;
    if (!opinionText.trim()) { setSubmitError(t('externalConsultViewPage.requiredOpinionError')); return; }
    setSubmitting(true);
    setSubmitError(null);
    const res = await consultTokenService.submitOpinion(token, {
      diagnosticCategory: diagnosticCategory.trim() || undefined,
      signedStatus,
      opinionText: opinionText.trim(),
    });
    setSubmitting(false);
    if (!res.ok) {
      const error = (res as { ok: false; error: string }).error;
      setSubmitError(t(SUBMIT_ERROR_KEY[error] ?? 'externalConsultViewPage.errors.failed'));
      return;
    }
    setSubmittedAs(signedStatus);
  };

  if (status === 'loading') {
    return <div className="ps-extconsult-shell"><LoadingState variant="inline" className="ps-extconsult-card ps-extconsult-card--loading" label={t('externalConsultViewPage.loading')} /></div>;
  }

  if (status === 'invalid' || !view) {
    return (
      <div className="ps-extconsult-shell">
        <div className="ps-extconsult-card">
          <DisclosureBanner />
          <div className="ps-extconsult-invalid-content">
            <div className="ps-extconsult-invalid-title">{t('externalConsultViewPage.invalidLink.title')}</div>
            <div className="ps-extconsult-invalid-desc">{t('externalConsultViewPage.invalidLink.description')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ps-extconsult-shell">
      <div className="ps-extconsult-card">
        <DisclosureBanner />

        <div className="ps-extconsult-section">
          <div className="ps-extconsult-eyebrow">{t('externalConsultViewPage.eyebrow')}</div>
          <div className="ps-extconsult-accession" data-phi="accession">{view.accessionNumber}</div>
          {/* Batch 669 (access-11): the service already chose the projection; a masked view holds no surname or full date. */}
          <div className="ps-extconsult-patient-line" data-phi="true">
            {view.patient.identity === 'full' ? (
              <>
                {t('externalConsultViewPage.patientName', { lastName: view.patient.lastName, firstName: view.patient.firstName })}
                {view.patient.dateOfBirth && <>{t('externalConsultViewPage.separator')}{t('externalConsultViewPage.dobPrefix', { date: view.patient.dateOfBirth })}</>}
              </>
            ) : (
              <>
                {view.patient.maskedName}
                {view.patient.birthYearMasked && <>{t('externalConsultViewPage.separator')}{t('externalConsultViewPage.dobPrefix', { date: view.patient.birthYearMasked })}</>}
              </>
            )}
          </div>
          {view.patient.identity === 'masked' && <div className="ps-extconsult-empty-note">{t('externalConsultViewPage.identityMaskedNote')}</div>}
          {/* Batch 669: after a signed opinion the link stops at the first of 3 views or 48 hours; the server counts both (consultLinkLifetime.ts). */}
          {view.lifetime && (
            <div className="ps-extconsult-lifetime-banner" role="status">
              {t('consultLifetime.banner', {
                views: t('consultLifetime.views', { count: view.lifetime.remainingViews }),
                hours: t('consultLifetime.hours', { count: view.lifetime.hoursRemaining }),
              })}
            </div>
          )}
          <div className="ps-extconsult-scope-line">
            {view.scopedSlideCount ? t('externalConsultViewPage.scopedAccess', { count: view.scopedSlideCount }) : t('externalConsultViewPage.fullCaseAccess')}
            {t('externalConsultViewPage.separator')}
            {t('externalConsultViewPage.linkExpires', { date: formatDateTime(view.expiresAt, i18n.language) })}
          </div>
        </div>

        <div className="ps-extconsult-section">
          <div className="ps-extconsult-section-heading">{t('externalConsultViewPage.specimensAndSlides')}</div>
          {view.specimens.map(sp => (
            <div key={sp.id} className="ps-extconsult-specimen-row">
              <div className="ps-extconsult-specimen-text">{t('externalConsultViewPage.specimenLine', { label: sp.label, description: sp.description })}</div>
            </div>
          ))}
          <div className="ps-extconsult-slides-list">
            {view.slides.length === 0 ? (
              <div className="ps-extconsult-empty-note">{t('externalConsultViewPage.noSlidesInScope')}</div>
            ) : view.slides.map(s => (
              <div key={s.id} className="ps-extconsult-slide-row">{s.label}</div>
            ))}
          </div>
        </div>

        <div className="ps-extconsult-section-plain">
          <div className="ps-extconsult-section-heading">{t('externalConsultViewPage.yourOpinionHeading')}</div>
          {submittedAs === 'Signed' || view.opinionSigned ? (
            <div className="ps-extconsult-submitted-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span className="ps-extconsult-submitted-text">{submittedAs ? t(consultSubmitConfirmationKey(submittedAs)) : t('externalConsultViewPage.errors.alreadySigned')}</span>
            </div>
          ) : (
            <>
              {submittedAs === 'Draft' && (
                <div className="ps-extconsult-submitted-box ps-extconsult-submitted-box--draft" role="status">
                  <span className="ps-extconsult-submitted-text">{t(consultSubmitConfirmationKey('Draft'))}</span>
                </div>
              )}
              <div className="ps-extconsult-form-row">
                <div className="ps-extconsult-field-flex">
                  <label className="ps-extconsult-field-label">{t('externalConsultViewPage.diagnosticCategoryLabel')}</label>
                  <input aria-label={t('externalConsultViewPage.diagnosticCategoryLabel')} type="text" value={diagnosticCategory} onChange={e => setDiagnosticCategory(e.target.value)} placeholder={t('externalConsultViewPage.diagnosticCategoryPlaceholder')}
                    className="ps-extconsult-input" />
                </div>
                <div>
                  <label className="ps-extconsult-field-label">{t('externalConsultViewPage.statusLabel')}</label>
                  <div className="ps-extconsult-status-group">
                    {(['Draft', 'Signed'] as const).map(s => (
                      <button key={s} onClick={() => setSignedStatus(s)} className={`ps-extconsult-status-btn${signedStatus === s ? ' ps-extconsult-status-btn--active' : ''}`}>
                        {t(SIGNED_STATUS_LABEL_KEY[s])}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <textarea value={opinionText} onChange={e => setOpinionText(e.target.value)} rows={5}
                placeholder={t('externalConsultViewPage.opinionPlaceholder')}
                className="ps-extconsult-textarea" />
              {signedStatus === 'Signed' && <div className="ps-extconsult-empty-note">{t('externalConsultViewPage.signedIsFinal')}</div>}
              {submitError && <div className="ps-extconsult-submit-error">{submitError}</div>}
              <div className="ps-extconsult-submit-row">
                <button onClick={handleSubmitOpinion} disabled={submitting} className="ps-extconsult-submit-btn">
                  {submitting ? t('externalConsultViewPage.submittingButton') : t('externalConsultViewPage.submitOpinionButton')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalConsultViewPage;
