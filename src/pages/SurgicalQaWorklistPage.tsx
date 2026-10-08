// src/pages/SurgicalQaWorklistPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-324. The real, minimal worklist surface for the two surgical
// post-sign-out QA activities this ticket built: cases flagged for
// Post-Sign-Out Peer Review (random/targeted sampling, PS-117 engine +
// this ticket's own subspecialty risk-weighting) and specimens with an
// unresolved Biopsy-to-Resection Correlation candidate. Deliberately a
// standalone page/route for now, not embedded in the main worklist's
// own tiles yet — same real, disclosed placement CytologyQcQueuePage.tsx's
// own header already established for exactly this reason, and this
// page is built the same size/shape so it can move there unchanged
// later.
//
// Real, deliberate scope: this page's own job is finding and listing
// the real, already-detected flags/candidates (applySurgicalPostSignOutQa.ts
// is what actually detects them, at sign-out) and letting a reviewer
// record the actual review through the existing, generic
// QaReviewCaptureForm (PS-118) — it owns no detection or validation
// logic of its own.
//
// File-by-file cleanup sweep: this page's own header used to disclose a
// deliberate i18n gap ("real, separate follow-up work, not bundled into
// the same pass that built the underlying engine") — this sweep is that
// follow-up, per direct instruction. Every visible string now goes through
// useTranslation()/t() (surgicalQaWorklist.* in all five locale files). The
// duplicated patient-display-name helper this file used to carry its own
// copy of is now the shared resolvePatientFullDisplayName()
// (utils/personName.ts) — the same consolidation applied to
// CytologyQcQueuePage.tsx, which had copy-pasted the identical logic.
// ─────────────────────────────────────────────────────────────────────────────

// Batch 396: loading, recording and dismissing now go through
// hooks/useSurgicalQaReview.ts and services/quality/surgicalQaReview.ts, so the
// case's report page can record the same review (Pete: "I would not want to
// force the pathologist to go to 2 screens"). Each row can also open the
// case's report, which has the same buttons.

import { useOpenCase } from '@/hooks/useOpenCase';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../pathscribe.css';
import { useSurgicalQaReview } from '@/hooks/useSurgicalQaReview';
import { SurgicalQaReviewModal } from '@/components/QualityAssurance/SurgicalQaReviewModal';
import { resolvePatientFullDisplayName } from '@/utils/personName';
import type { SurgicalQaRow } from '@/services/quality/surgicalQaReview';

const SurgicalQaWorklistPage: React.FC = () => {
  const { t } = useTranslation();
  const openCasePage = useOpenCase();
  const { rows, busy, message, activityTypeFor, record, dismiss } = useSurgicalQaReview();
  const [activeRow, setActiveRow] = useState<SurgicalQaRow | null>(null);
  const activeType = activeRow ? activityTypeFor(activeRow) : undefined;

  return (
    <div className="ps-qcqueue-page">
      <h1 className="ps-qcqueue-title">{t('surgicalQaWorklist.pageTitle')}</h1>
      {message && <div className="ps-qcqueue-error" role="alert">{t(`surgicalQaWorklist.error.${message}`)}</div>}

      <div className="ps-qcqueue-list">
        {rows.map((row, i) => (
          <div key={`${row.kind}-${row.caseId}-${row.specimenId}-${i}`} className="ps-qcqueue-row">
            <div className="ps-qcqueue-row-patient" data-phi="true">
              {resolvePatientFullDisplayName(row.caseData.patient) ?? row.caseData.id}
              <span className="ps-qcqueue-row-accession" data-phi="accession">{row.caseData.accession?.accessionNumber}</span>
            </div>
            <div className="ps-qcqueue-row-badges">
              {row.kind === 'peer_review' ? (
                <span className="ps-qcqueue-badge-pill">
                  {row.caseData.specimens?.find(s => s.id === row.specimenId)?.surgicalPeerReview?.postSignOutPeerReviewFlag?.reason === 'targeted_high_risk'
                    ? t('surgicalQaWorklist.peerReviewTargeted')
                    : t('surgicalQaWorklist.peerReviewRandom')}
                </span>
              ) : (
                <span className="ps-qcqueue-badge-pill">{t('surgicalQaWorklist.correlationCandidate', { candidateCaseId: row.candidateCaseId })}</span>
              )}
            </div>
            <div className="ps-qcqueue-row-actions">
              <button className="ps-conf-btn-secondary" onClick={() => void openCasePage(row.caseId, 'report', { state: { returnTo: '/worklist?view=surgicalQa' } })}>
                {t('surgicalQaWorklist.openCaseBtn')}
              </button>
              <button className="ps-conf-btn-primary" onClick={() => setActiveRow(row)}>{t('surgicalQaWorklist.recordReviewBtn')}</button>
              {row.kind === 'correlation' && (
                <button className="ps-conf-btn-secondary" disabled={busy} onClick={() => void dismiss(row)}>{t('surgicalQaWorklist.notRelevantBtn')}</button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="ps-conf-empty-row">{t('surgicalQaWorklist.emptyRow')}</div>}
      </div>

      {activeRow && activeType && (
        <SurgicalQaReviewModal
          activityType={activeType}
          busy={busy}
          onClose={() => setActiveRow(null)}
          onSubmit={async submission => { if (await record(activeRow, submission)) setActiveRow(null); }}
        />
      )}
    </div>
  );
};

export default SurgicalQaWorklistPage;
