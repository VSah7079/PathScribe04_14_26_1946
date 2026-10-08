// src/pages/SynopticReportPage/modals/PeerReviewGateModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): sign-out stops here only when this case's facility or
// department turned the peer-review gate on (off by default) and the review
// isn't done. The pathologist can:
//   • ask for the review (when none is asked for yet), then come back;
//   • sign out now for urgent patient care: a reason (and a note for
//     "other"), audited; the review is still owed within 24 hours.
// The decision is made by services/quality/peerReviewStatus.ts; the override
// is checked (case:peer-review:override) in peerReviewService.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { peerReviewService, peerReviewOverrideProblem, PEER_REVIEW_OVERRIDE_REASONS, type PeerReviewStatus } from '@/services';
import type { PeerReviewOverrideReason, PersonRef } from '@/types/quality/PeerReview';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { PeerReviewRequestForm } from '@/components/PeerReview/PeerReviewDialogs';
import '@/pathscribe.css';

const K = 'peerReview';

interface Props {
  caseId: string;
  accession?: string;
  status: PeerReviewStatus;
  reviewers: PersonRef[];
  currentUserId: string;
  /** The review was asked for: sign-out waits (the modal closes). */
  onRequested: () => void;
  /** Urgent-care override recorded: sign-out continues. */
  onContinue: () => void;
  onCancel: () => void;
}

export const PeerReviewGateModal: React.FC<Props> = ({ caseId, accession, status, reviewers, currentUserId, onRequested, onContinue, onCancel }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState<PeerReviewOverrideReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const override = async () => {
    const problem = peerReviewOverrideProblem(reason || undefined, note);
    if (problem) { setError(t(`${K}.errors.${problem}`)); return; }
    const res = await peerReviewService.override(caseId, { reason: reason as PeerReviewOverrideReason, note });
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    onContinue();
  };

  return (
    <div className="ps-ms-overlay">
      <div className="ps-ms-modal ps-ms-modal--wide" role="dialog" aria-modal="true">
        <div className="ps-ms-header">{t(`${K}.gate.title`)}</div>
        <p className="ps-specreq-meta"><span data-phi="accession">{accession ?? caseId}</span></p>
        <p className="ps-peer-review__gate-text">{t(`${K}.gate.${status.state}`, { reviewer: status.request?.reviewer.userName ?? '' })}</p>

        {status.state === 'needs-request' && (
          <section className="ps-peer-review__gate-section">
            <div className="ps-conf-card-title">{t(`${K}.gate.requestHeading`)}</div>
            <PeerReviewRequestForm
              caseId={caseId} accession={accession}
              trigger={status.firstTime ? 'first-time-malignancy' : 'requested'}
              triggerDetail={status.firstTime ? 'First-time malignancy: no prior malignant case for this patient.' : undefined}
              reviewers={reviewers} currentUserId={currentUserId}
              onDone={onRequested}
            />
          </section>
        )}

        <section className="ps-peer-review__gate-section">
          <div className="ps-conf-card-title">{t(`${K}.gate.overrideHeading`)}</div>
          <p className="ps-conf-field-hint">{t(`${K}.gate.overrideHint`)}</p>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="peer-override-reason">{t(`${K}.gate.overrideReason`)} <span className="ps-conf-required">*</span></label>
            <select id="peer-override-reason" className="ps-conf-select" value={reason} onChange={e => setReason(e.target.value as PeerReviewOverrideReason | '')}>
              <option value="">{t(`${K}.gate.overridePlaceholder`)}</option>
              {PEER_REVIEW_OVERRIDE_REASONS.map(r => <option key={r} value={r}>{t(`${K}.overrideReasons.${r}`)}</option>)}
            </select>
          </div>
          <div className="ps-conf-form-field">
            <label className="ps-conf-label" htmlFor="peer-override-note">{t(`${K}.gate.overrideNote`)}{reason === 'other-urgent-care' && <> <span className="ps-conf-required">*</span></>}</label>
            <textarea id="peer-override-note" className="ps-conf-input ps-peer-review__textarea" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {error && <div className="ps-conf-error-text">{error}</div>}
        </section>

        <div className="ps-ms-footer">
          <button className="ps-ms-btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <CapabilityButton capability="case:peer-review:override" context={{ caseId }} className="ps-btn-danger-solid" onClick={() => { void override(); }}>
            {t(`${K}.gate.overrideButton`)}
          </CapabilityButton>
        </div>
      </div>
    </div>
  );
};
