// src/components/ExternalConsult/ExternalConsultAccessModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-290 — External Consult / Second-Opinion Access. Pathologist-facing
// entry point: issue a scoped, time-limited link for an outside
// consultant, see/revoke what's already been issued for this case.
//
// Mirrors RequestReview/RequestReviewModal.tsx's own real conventions
// (ps-overlay/ps-modal-dark shell, ReactDOM.createPortal, inline-style
// buttons) rather than inventing a new modal shape, per this app's own
// established "match the existing sibling" guidance.
//
// LOUD, DELIBERATE DISCLOSURE — read before changing this file: every
// view here carries a visible warning that no PathScribe server checks the
// link yet, so it opens only in the browser that issued it (a demo). See
// services/consultAccess/IConsultTokenService.ts's header. Keep the banner
// until the API server serves links (docs/architecture/CONSULT_ACCESS_API.md).
//
// Batch 669 (access-11): the issue form has an opt-in, off by default, to show the consultant the patient's
// full name and date of birth; the page is masked otherwise. Greyed out without case:consult-link:reveal-identity.
//
// Batch 522: the link carries its token after `#` (consultLinkUrl); revoking
// takes the signed-in user in the service; refusals are translated codes.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ReactDOM from 'react-dom';
import type { Case } from '@/types/case/Case';
import { consultTokenService, outsideConsultAssessmentProblem, OUTSIDE_CONSULT_ASSESSMENTS, type OutsideConsultAssessment } from '@/services';
import type { ConsultOpinion } from '@/services/consultAccess/IConsultTokenService';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import type { ConsultToken } from '@/services/consultAccess/IConsultTokenService';
import { resolveConsultTokenStatus } from '@/services/consultAccess/IConsultTokenService';
import { consultLinkUrl } from '@/services/consultAccess/consultLinkRules';
import { computeDefaultConsultTokenExpiry } from '@/services/consultAccess/computeDefaultConsultTokenExpiry';
import { LoadingState } from '@/components/Common/LoadingState';
import { ConsultLifetimeLine } from './ConsultLifetimeLine';
import { useCapabilities } from '@/hooks/useCapabilities';

interface ExternalConsultAccessModalProps {
  isOpen: boolean;
  caseData: Case | null;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
}

interface SlideOption { stainOrderId: string; label: string; }

function flattenSlides(c: Case): SlideOption[] {
  const out: SlideOption[] = [];
  for (const sp of c.specimens ?? []) {
    for (const block of sp.blocks ?? []) {
      for (const stain of block.stains ?? []) {
        out.push({ stainOrderId: stain.id, label: `${sp.label}-${block.label} · ${stain.stainName}` });
      }
    }
  }
  return out;
}

// The real status value (used for the color lookup above, and as the
// underlying data) stays untouched; only the displayed badge text is
// translated via this label-key map — same pattern as WorklistPage's
// FILTER_LABEL_KEY / MolecularPlateBuilderPage's SAMPLE_TYPE_LABEL_KEY.
/** Batch 522: the token service's refusal codes, as text. */
const ISSUE_ERROR_KEY: Record<string, string> = {
  CONSULT_LINK_NOT_PERMITTED: 'externalConsultAccessModal.notPermitted',
  CONSULTANT_REQUIRED:        'externalConsultAccessModal.consultantRequired',
  CONSULT_CASE_REQUIRED:      'externalConsultAccessModal.issueFailed',
  CONSULT_REVEAL_NOT_PERMITTED: 'externalConsultAccessModal.revealNotPermitted',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  Active:  'externalConsultAccessModal.status.active',
  Expired: 'externalConsultAccessModal.status.expired',
  Revoked: 'externalConsultAccessModal.status.revoked',
};

const DisclosureBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="eca-disclosure-banner">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" className="eca-disclosure-icon"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span className="eca-disclosure-text">
        <strong>{t('externalConsultAccessModal.disclosureTitle')}</strong> {t('externalConsultAccessModal.disclosureBody')}
      </span>
    </div>
  );
};

/**
 * Batch 439 (PS-148): the opinions consultants sent back, and the
 * pathologist's assessment of each against the case (agrees / minor
 * difference / major discordance), once. A major discordance on a report
 * already released recommends a CAPA to the QA lead (outsideConsultRules.ts).
 */
const OpinionCard: React.FC<{ opinion: ConsultOpinion; onAssessed: () => void }> = ({ opinion, onAssessed }) => {
  const { t, i18n } = useTranslation();
  const [assessment, setAssessment] = useState<OutsideConsultAssessment | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const K = 'externalConsultAccessModal.opinions';

  const submit = async () => {
    const problem = outsideConsultAssessmentProblem(opinion, assessment || undefined, note);
    if (problem) { setError(t(`${K}.errors.${problem}`)); return; }
    const res = await consultTokenService.assessOpinion(opinion.id, { assessment: assessment as OutsideConsultAssessment, note });
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    onAssessed();
  };

  return (
    <div className="eca-token-card eca-opinion-card">
      <div className="eca-token-identifier">{opinion.consultantIdentifier}</div>
      <div className="eca-token-meta">
        {t(`${K}.submitted`, { date: formatDateTime(opinion.submittedAt, i18n.language) })} · {t(`${K}.signedStatus.${opinion.signedStatus}`)}
        {opinion.diagnosticCategory ? ` · ${opinion.diagnosticCategory}` : ''}
      </div>
      <p className="eca-opinion-text">{opinion.opinionText}</p>
      {opinion.assessment ? (
        <div className={`eca-opinion-assessed eca-opinion-assessed--${opinion.assessment}`}>
          {t(`${K}.assessedLine`, { assessment: t(`${K}.assessments.${opinion.assessment}`), name: opinion.assessedBy?.userName ?? '', date: formatDateTime(opinion.assessedAt, i18n.language) })}
          {opinion.assessment === 'major-discordance' && <div>{t(opinion.assessedAfterRelease ? `${K}.capaRecommended` : `${K}.beforeRelease`)}</div>}
          {opinion.assessmentNote && <div className="eca-token-meta">{opinion.assessmentNote}</div>}
        </div>
      ) : opinion.signedStatus === 'Signed' ? (
        <div className="eca-opinion-assess">
          <div className="fm-eyebrow">{t(`${K}.assessLabel`)}</div>
          <div className="eca-scope-row">
            {OUTSIDE_CONSULT_ASSESSMENTS.map(a => (
              <button key={a} className={`eca-scope-btn${assessment === a ? ' eca-scope-btn--active' : ''}`} onClick={() => setAssessment(a)}>
                {t(`${K}.assessments.${a}`)}
              </button>
            ))}
          </div>
          {assessment && assessment !== 'agrees' && (
            <textarea className="ps-modal-dark-input rrm-textarea" rows={2} placeholder={t(`${K}.notePlaceholder`)} value={note} onChange={e => setNote(e.target.value)} aria-label={t(`${K}.noteLabel`)} />
          )}
          {error && <div className="eca-issue-error">{error}</div>}
          <div className="eca-form-actions">
            <CapabilityButton capability="case:outside-consult:assess" context={{ caseId: opinion.caseId }} className="eca-submit-btn" onClick={() => { void submit(); }}>
              {t(`${K}.assessButton`)}
            </CapabilityButton>
          </div>
        </div>
      ) : (
        <div className="eca-token-meta">{t(`${K}.draftOnly`)}</div>
      )}
    </div>
  );
};

const ExternalConsultAccessModal: React.FC<ExternalConsultAccessModalProps> = ({ isOpen, caseData, currentUserId, currentUserName, onClose }) => {
  const { t, i18n } = useTranslation();
  const [opinions, setOpinions] = useState<ConsultOpinion[]>([]);
  const [view, setView] = useState<'list' | 'issue' | 'created'>('list');
  const [tokens, setTokens] = useState<ConsultToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Issue form state
  const [consultantIdentifier, setConsultantIdentifier] = useState('');
  const [consultantOrganization, setConsultantOrganization] = useState('');
  const [note, setNote] = useState('');
  const [scopeMode, setScopeMode] = useState<'full' | 'slides'>('full');
  const [selectedSlideIds, setSelectedSlideIds] = useState<string[]>([]);
  // Batch 669 (access-11): off by default; the consultant sees a masked patient unless ticked.
  const [revealIdentity, setRevealIdentity] = useState(false);
  const { has } = useCapabilities();
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadTokens = () => {
    if (!caseData) return;
    setLoading(true);
    consultTokenService.getByCaseId(caseData.id).then(res => {
      if (res.ok) setTokens(res.data);
      setLoading(false);
    });
    consultTokenService.getOpinionsByCaseId(caseData.id).then(res => {
      if (res.ok) setOpinions(res.data.slice().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)));
    });
  };

  useEffect(() => {
    if (isOpen) {
      setView('list');
      setConsultantIdentifier(''); setConsultantOrganization(''); setNote('');
      setScopeMode('full'); setSelectedSlideIds([]); setRevealIdentity(false); setIssueError(null); setCreatedLink(null); setCopied(false);
      loadTokens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, caseData?.id]);

  if (!isOpen) return null;

  const canRevealOnly = has('case:consult-link:reveal-identity', { caseId: caseData?.id ?? null }) && !has('case:consult-link:issue', { caseId: caseData?.id ?? null });
  const slideOptions = caseData ? flattenSlides(caseData) : [];
  const previewExpiry = computeDefaultConsultTokenExpiry(new Date());
  const caseLabel = caseData ? `${caseData.patient?.lastName}, ${caseData.patient?.firstName}` : undefined;

  const handleIssue = async () => {
    if (!caseData) return;
    if (!consultantIdentifier.trim()) { setIssueError(t('externalConsultAccessModal.consultantRequired')); return; }
    if (scopeMode === 'slides' && selectedSlideIds.length === 0) { setIssueError(t('externalConsultAccessModal.selectAtLeastOneSlide')); return; }

    setIssuing(true);
    setIssueError(null);
    const res = await consultTokenService.issue({
      scope: {
        caseId: caseData.id,
        caseAccessionNumber: caseData.accession?.accessionNumber ?? caseData.id,
        slideIds: scopeMode === 'slides' ? selectedSlideIds : undefined,
      },
      issuedByUserId: currentUserId,
      issuedByName: currentUserName,
      consultantIdentifier: consultantIdentifier.trim(),
      consultantOrganization: consultantOrganization.trim() || undefined,
      note: note.trim() || undefined,
      ...(revealIdentity ? { revealIdentity: true } : {}),
    });
    setIssuing(false);

    if (!res.ok) {
      const error = (res as { ok: false; error: string }).error;
      setIssueError(t(ISSUE_ERROR_KEY[error] ?? 'externalConsultAccessModal.issueFailed'));
      return;
    }
    setCreatedLink(consultLinkUrl(window.location.origin, res.data.token));
    setView('created');
  };

  const handleRevoke = async (id: string) => {
    // Batch 515: a refusal changes nothing; the list reloads either way.
    await consultTokenService.revoke(id);
    loadTokens();
  };

  const toggleSlide = (id: string) => {
    setSelectedSlideIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    try {
      await navigator.clipboard.writeText(createdLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the link is still shown, selectable by hand */ }
  };

  return ReactDOM.createPortal(
    <div onClick={onClose} className="ps-overlay">
      <div onClick={e => e.stopPropagation()} className="ps-modal-dark ps-review-req-shell eca-modal">
        {/* Header */}
        <div className="eca-header">
          <div>
            <div className="eca-header-eyebrow">
              {t('externalConsultAccessModal.eyebrow')}
            </div>
            <div className="eca-header-title">
              {view === 'issue' ? t('externalConsultAccessModal.issueTitle') : view === 'created' ? t('externalConsultAccessModal.createdTitle') : t('externalConsultAccessModal.listTitle')}
            </div>
            {caseLabel && <div className="eca-header-case" data-phi="true">{caseData?.accession?.accessionNumber} · {caseLabel}</div>}
          </div>
          <button onClick={onClose} className="ps-close-btn" aria-label={t('externalConsultAccessModal.close')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="eca-body">
          <DisclosureBanner />

          {view === 'list' && (
            <>
              {/* Batch 669: someone who may reveal identity but not issue links gets a plain reason, not a dead end
                  (their identity preview is in Audit Log → Consult links). */}
              <CapabilityButton
                capability="case:consult-link:issue"
                context={{ caseId: caseData?.id ?? null }}
                onClick={() => setView('issue')}
                className="eca-issue-btn"
                {...(canRevealOnly ? { disabled: true, disabledTitle: t('externalConsultAccessModal.requiresIssuePermission') } : {})}
              >
                {t('externalConsultAccessModal.issueNewLink')}
              </CapabilityButton>

              {loading ? (
                <LoadingState variant="inline" className="eca-list-empty" label={t('externalConsultAccessModal.loading')} />
              ) : tokens.length === 0 ? (
                <div className="eca-list-empty">{t('externalConsultAccessModal.noLinksYet')}</div>
              ) : (
                <div className="eca-token-list">
                  {tokens.map(tok => {
                    const status = resolveConsultTokenStatus(tok);
                    return (
                      <div key={tok.id} className="eca-token-card">
                        <div className="eca-token-row">
                          <div className="eca-token-info">
                            {/* Not data-phi: this is the outside consultant's
                                own name, not patient-identifying data. */}
                            <div className="eca-token-identifier">{tok.consultantIdentifier}</div>
                            {tok.consultantOrganization && <div className="eca-token-org">{tok.consultantOrganization}</div>}
                            <div className="eca-token-meta">
                              {tok.scope.slideIds?.length
                                ? t('externalConsultAccessModal.slideCount', { count: tok.scope.slideIds.length })
                                : t('externalConsultAccessModal.fullCase')}
                              {' · '}{t('externalConsultAccessModal.issuedAt', { date: formatDateTime(tok.issuedAt, i18n.language) })}
                              {' · '}{t('externalConsultAccessModal.expiresAt', { date: formatDateTime(tok.expiresAt, i18n.language) })}
                            </div>
                            <ConsultLifetimeLine link={tok} />
                            {tok.revealIdentity && <div className="eca-token-viewed">{t('externalConsultAccessModal.identityShownBadge')}</div>}
                            {tok.accessCount > 0 && (
                              <div className="eca-token-viewed">
                                {t('externalConsultAccessModal.viewedCount', {
                                  count: tok.accessCount,
                                  last: formatDateTime(tok.lastAccessedAt, i18n.language),
                                })}
                              </div>
                            )}
                          </div>
                          <div className="eca-token-actions">
                            <span className={`eca-status-badge eca-status-badge--${status.toLowerCase()}`}>
                              {t(STATUS_LABEL_KEY[status] ?? status)}
                            </span>
                            {status === 'Active' && (
                              <CapabilityButton capability="case:consult-link:revoke" context={{ caseId: caseData?.id ?? null }} onClick={() => handleRevoke(tok.id)} className="eca-revoke-btn">{t('externalConsultAccessModal.revoke')}</CapabilityButton>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {view === 'list' && opinions.length > 0 && (
            <section className="eca-opinions">
              <div className="fm-eyebrow">{t('externalConsultAccessModal.opinions.heading', { count: opinions.length })}</div>
              {opinions.map(o => <OpinionCard key={o.id} opinion={o} onAssessed={loadTokens} />)}
            </section>
          )}

          {view === 'issue' && (
            <>
              <div>
                <div className="fm-eyebrow">{t('externalConsultAccessModal.consultantIdentifierLabel')} <span className="ps-conf-required">*</span></div>
                <input aria-label={t('externalConsultAccessModal.consultantIdentifierLabel')} type="text" placeholder={t('externalConsultAccessModal.consultantIdentifierPlaceholder')} value={consultantIdentifier} onChange={e => setConsultantIdentifier(e.target.value)} className="ps-modal-dark-input" />
                <div className="eca-field-hint">{t('externalConsultAccessModal.noDirectoryLookupHint')}</div>
              </div>

              <div>
                <div className="fm-eyebrow">{t('externalConsultAccessModal.organizationLabel')} <span className="rrm-optional-label">{t('externalConsultAccessModal.optional')}</span></div>
                <input aria-label={t('externalConsultAccessModal.organizationLabel')} type="text" placeholder={t('externalConsultAccessModal.organizationPlaceholder')} value={consultantOrganization} onChange={e => setConsultantOrganization(e.target.value)} className="ps-modal-dark-input" />
              </div>

              <div>
                <div className="fm-eyebrow">{t('externalConsultAccessModal.accessScopeLabel')}</div>
                <div className="eca-scope-row">
                  {(['full', 'slides'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setScopeMode(m)}
                      className={`eca-scope-btn${scopeMode === m ? ' eca-scope-btn--active' : ''}`}
                    >
                      {m === 'full' ? t('externalConsultAccessModal.fullCaseOption') : t('externalConsultAccessModal.specificSlidesOption')}
                    </button>
                  ))}
                </div>
                {scopeMode === 'slides' && (
                  <div className="eca-slide-list">
                    {slideOptions.length === 0 ? (
                      <div className="eca-slide-list-empty">{t('externalConsultAccessModal.noSlidesRecorded')}</div>
                    ) : slideOptions.map(s => (
                      <label key={s.stainOrderId} className="eca-slide-option">
                        <input type="checkbox" checked={selectedSlideIds.includes(s.stainOrderId)} onChange={() => toggleSlide(s.stainOrderId)} />
                        {s.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="fm-eyebrow">{t('externalConsultAccessModal.noteLabel')} <span className="rrm-optional-label">{t('externalConsultAccessModal.noteHint')}</span></div>
                <textarea aria-label={t('externalConsultAccessModal.noteLabel')} placeholder={t('externalConsultAccessModal.notePlaceholder')} value={note} onChange={e => setNote(e.target.value)} rows={2} className="ps-modal-dark-input rrm-textarea" />
              </div>

              <div>
                <label className="eca-slide-option">
                  <input type="checkbox" checked={revealIdentity} disabled={!has('case:consult-link:reveal-identity', { caseId: caseData?.id ?? null })} onChange={e => setRevealIdentity(e.target.checked)} />
                  {t('externalConsultAccessModal.revealIdentityLabel')}
                </label>
                <div className="eca-field-hint">{t('externalConsultAccessModal.revealIdentityHint')}</div>
              </div>

              <div className="eca-expiry-note">
                {t('externalConsultAccessModal.defaultLifespan')}{' '}
                {t('externalConsultAccessModal.expiresAround')} <strong className="rrm-strong">{formatDateTime(previewExpiry.toISOString(), i18n.language)}</strong>.
              </div>

              {issueError && <div className="eca-issue-error">{issueError}</div>}

              <div className="eca-form-actions">
                <button onClick={() => setView('list')} className="rrm-cancel-btn">{t('externalConsultAccessModal.back')}</button>
                <button onClick={handleIssue} disabled={issuing} className="eca-submit-btn">
                  {issuing ? t('externalConsultAccessModal.issuing') : t('externalConsultAccessModal.issueLink')}
                </button>
              </div>
            </>
          )}

          {view === 'created' && createdLink && (
            <>
              <div className="eca-created-notice">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                <span className="eca-created-notice-text">{t('externalConsultAccessModal.linkCreatedNotice')}</span>
              </div>
              <div className="eca-created-link-row">
                <input aria-label={t('a11y.fields.consultLink')} readOnly value={createdLink} className="ps-modal-dark-input eca-created-link-input" onFocus={e => e.currentTarget.select()} />
                <button onClick={handleCopy} className="eca-copy-btn">
                  {copied ? t('externalConsultAccessModal.copied') : t('externalConsultAccessModal.copy')}
                </button>
              </div>
              <div className="eca-done-row">
                <button onClick={() => { setView('list'); loadTokens(); }} className="eca-done-btn">
                  {t('externalConsultAccessModal.done')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ExternalConsultAccessModal;
