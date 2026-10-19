// src/components/CytologyQc/CytologyQcCaseBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete: "I would not want to force the pathologist to go to 2
// screens"). On a case's cytology screening page, its open QC peer review
// with the queue's buttons: Assign to Me, then Record Concurrence or Record
// Discrepancy. Shown only when the case has an open QC review. After a
// verdict, onRecorded runs (the page returns to the queue it came from).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QaReviewMessage } from '@/components/QualityAssurance/QaReviewMessage';
import { useCytologyQcCaseReview } from '@/hooks/useCytologyQcActions';
import { CytologyQcDiscrepancyModal } from './CytologyQcDiscrepancyModal';

const ERROR_KEY: Record<string, string> = {
  notPermitted: 'cytologyQcQueue.error.notPermitted',
  selfReview: 'cytologyQcQueue.error.selfReview',
  notInPool: 'cytologyQcQueue.error.notInPool',
  failed: 'cytologyQcQueue.error.failed',
};

interface CytologyQcCaseBarProps {
  caseId: string | undefined;
  onRecorded?: () => void;
}

export function CytologyQcCaseBar({ caseId, onRecorded }: CytologyQcCaseBarProps) {
  const { t } = useTranslation();
  const { review, busy, message, assignToMe, recordConcurrence, recordDiscrepancy } = useCytologyQcCaseReview(caseId);
  const [discrepancyOpen, setDiscrepancyOpen] = useState(false);
  const a = review.assignment;
  if (!a) return null;

  return (
    <section className="ps-qa-case-bar" aria-label={t('cytologyQcQueue.caseBarTitle')}>
      <div className="ps-qa-case-bar__title">{t('cytologyQcQueue.caseBarTitle')}</div>
      <QaReviewMessage messageKey={message ? ERROR_KEY[message] : null} />
      <div className="ps-qa-case-bar__item">
        <span className={`ps-qcqueue-tier-badge ps-qcqueue-tier-badge--${a.priorityTier}`}>{t(`cytologyQcRules.tier.${a.priorityTier}`)}</span>
        <div className="ps-qa-case-bar__actions">
          {review.canAssignToMe && (
            <button className="ps-conf-btn-primary" disabled={busy} onClick={() => void assignToMe(a.id)}>{t('cytologyQcQueue.assignToMeBtn')}</button>
          )}
          {review.canRecordVerdict && (
            <>
              <button className="ps-conf-btn-primary" disabled={busy} onClick={async () => { if (await recordConcurrence(a.id)) onRecorded?.(); }}>
                {t('cytologyQcQueue.recordConcurrenceBtn')}
              </button>
              <button className="ps-conf-btn-secondary" disabled={busy} onClick={() => setDiscrepancyOpen(true)}>{t('cytologyQcQueue.recordDiscrepancyBtn')}</button>
            </>
          )}
          {review.assignedToOther && <span className="ps-qa-case-bar__note">{t('cytologyQcQueue.assignedToOther')}</span>}
          {review.isOwnCase && <span className="ps-qa-case-bar__note">{t('cytologyQcQueue.error.selfReview')}</span>}
          {review.notInPool && <span className="ps-qa-case-bar__note">{t('cytologyQcQueue.error.notInPool')}</span>}
        </div>
      </div>
      {discrepancyOpen && (
        <CytologyQcDiscrepancyModal
          onClose={() => setDiscrepancyOpen(false)}
          onSubmit={async (primary, secondary, severity, commentary) => {
            const ok = await recordDiscrepancy(a.id, { primaryDiagnosticCode: primary, secondaryDiagnosticCode: secondary, severity, reviewerCommentary: commentary });
            setDiscrepancyOpen(false);
            if (ok) onRecorded?.();
          }}
        />
      )}
    </section>
  );
}

export default CytologyQcCaseBar;
