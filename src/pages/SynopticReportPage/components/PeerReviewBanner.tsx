// src/pages/SynopticReportPage/components/PeerReviewBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 (Batch 439): peer review before sign-out, on the report page.
//   • A first-time malignancy (from the patient's prior cases): a review is
//     recommended, or required when the facility or department turned the
//     gate on (off by default).
//   • Waiting: the reviewer records their independent read here; the
//     requester can withdraw.
//   • Disagreement: either pathologist records consensus reached or
//     unresolved (only unresolved recommends a CAPA).
//   • Any pathologist may also ask for a review on any case not yet signed out.
// State comes from usePeerReview (services/quality/peerReviewStatus.ts).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { caseSignedOut, type PeerReviewStatus } from '@/services';
import type { PersonRef } from '@/types/quality/PeerReview';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { PeerReviewDialog, PeerReviewRequestForm, type PeerReviewDialogMode } from '@/components/PeerReview/PeerReviewDialogs';
import { formatDateTime } from '@/utils/formatDate';
import '@/pathscribe.css';

const K = 'peerReview';

interface Props {
  caseId: string;
  accession?: string;
  caseStatus?: string;
  currentUser: { id: string; name: string };
  status: PeerReviewStatus | null;
  reviewers: PersonRef[];
  onChanged: () => void;
}

export const PeerReviewBanner: React.FC<Props> = ({ caseId, accession, caseStatus, currentUser, status, reviewers, onChanged }) => {
  const { t, i18n } = useTranslation();
  const [requesting, setRequesting] = useState(false);
  const [dialog, setDialog] = useState<PeerReviewDialogMode | null>(null);
  if (!status) return null;

  const { state, request, gateOn } = status;
  const signedOut = caseSignedOut(caseStatus);
  const isReviewer = request?.reviewer.userId === currentUser.id;
  const isRequester = request?.primaryPathologist.userId === currentUser.id;
  const done = () => { setRequesting(false); setDialog(null); onChanged(); };

  let message: React.ReactNode = null;
  let tone = 'info';
  let actions: React.ReactNode = null;

  const requestButton = (
    <CapabilityButton capability="case:peer-review:request" context={{ caseId }} className="ps-conf-btn-secondary" onClick={() => setRequesting(true)}>
      {t(`${K}.banner.request`)}
    </CapabilityButton>
  );

  switch (state) {
    case 'needs-request':
      tone = gateOn ? 'warn' : 'info';
      message = t(gateOn ? `${K}.banner.firstTimeRequired` : `${K}.banner.firstTimeRecommended`);
      actions = requestButton;
      break;
    case 'pending':
      message = t(`${K}.banner.pending`, { reviewer: request?.reviewer.userName ?? '', date: formatDateTime(request?.requestedAt, i18n.language) });
      actions = (
        <>
          {isReviewer && (
            <CapabilityButton capability="case:peer-review:record" context={{ caseId }} className="ps-conf-btn-primary" onClick={() => setDialog('read')}>
              {t(`${K}.banner.recordRead`)}
            </CapabilityButton>
          )}
          {isRequester && <button className="ps-conf-btn-secondary" onClick={() => setDialog('withdraw')}>{t(`${K}.banner.withdraw`)}</button>}
        </>
      );
      break;
    case 'disagreement':
      tone = 'warn';
      message = t(`${K}.banner.disagreement`, { reviewer: request?.reviewer.userName ?? '', diagnosis: request?.reviewerDiagnosis ?? '', severity: t(`${K}.severity.${request?.disagreementSeverity ?? 'medium'}`) });
      actions = (isReviewer || isRequester) && (
        <button className="ps-conf-btn-primary" onClick={() => setDialog('resolve')}>{t(`${K}.banner.recordOutcome`)}</button>
      );
      break;
    case 'overridden': {
      const latest = status.overrides[0];
      tone = 'warn';
      message = t(`${K}.banner.overridden`, { date: formatDateTime(latest?.retrospectiveDueAt, i18n.language) });
      actions = !request && requestButton;
      break;
    }
    case 'clear':
      tone = 'done';
      message = request?.result === 'concordant'
        ? t(`${K}.banner.clearAgreed`, { reviewer: request.reviewer.userName })
        : request?.result === 'consensus-reached'
          ? t(`${K}.banner.clearConsensus`, { diagnosis: request.consensusDiagnosis ?? '' })
          : t(`${K}.banner.clearUnresolved`);
      break;
    case 'not-required':
      if (signedOut) return null;
      return (
        <div className="ps-peer-review ps-peer-review--quiet">
          <span className="ps-peer-review__message">{t(`${K}.banner.optional`)}</span>
          <div className="ps-peer-review__actions">{requestButton}</div>
          {requesting && renderRequest()}
        </div>
      );
  }

  function renderRequest() {
    return (
      <div className="ps-ms-overlay ps-overlay--above-dialogs">
        <div className="ps-ms-modal ps-ms-modal--medium" role="dialog" aria-modal="true">
          <div className="ps-ms-header">{t(`${K}.requestTitle`)}</div>
          <p className="ps-specreq-meta"><span data-phi="accession">{accession ?? caseId}</span></p>
          <PeerReviewRequestForm
            caseId={caseId} accession={accession}
            trigger={status?.firstTime ? 'first-time-malignancy' : 'requested'}
            triggerDetail={status?.firstTime ? 'First-time malignancy: no prior malignant case for this patient.' : undefined}
            reviewers={reviewers} currentUserId={currentUser.id}
            onDone={done} onCancel={() => setRequesting(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`ps-peer-review ps-peer-review--${tone}`}>
      <span className="ps-peer-review__label">{t(`${K}.banner.label`)}</span>
      <span className="ps-peer-review__message">{message}</span>
      {actions && <div className="ps-peer-review__actions">{actions}</div>}
      {requesting && renderRequest()}
      {dialog && request && (
        <PeerReviewDialog mode={dialog} request={request} currentUserId={currentUser.id} onDone={done} onCancel={() => setDialog(null)} />
      )}
    </div>
  );
};
