// src/components/QualityAssurance/SurgicalQaCaseBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete: "I would not want to force the pathologist to go to 2
// screens"). On a case's report page, the Surgical Post-Sign-Out QA items
// waiting on this case, with the same Record Review and Not Relevant buttons
// as the queue. Shown only when the case has an item waiting. When the last
// one is done, onAllDone runs (the page returns to the queue it came from).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QaReviewMessage } from './QaReviewMessage';
import { useSurgicalQaReview } from '@/hooks/useSurgicalQaReview';
import { SurgicalQaReviewModal } from './SurgicalQaReviewModal';
import type { SurgicalQaRow } from '@/services/quality/surgicalQaReview';

const ERROR_KEY: Record<string, string> = {
  notPermitted: 'surgicalQaWorklist.error.notPermitted',
  failed: 'surgicalQaWorklist.error.failed',
};

interface SurgicalQaCaseBarProps {
  caseId: string;
  onAllDone?: () => void;
}

export function SurgicalQaCaseBar({ caseId, onAllDone }: SurgicalQaCaseBarProps) {
  const { t } = useTranslation();
  const { rows, busy, message, activityTypeFor, record, dismiss } = useSurgicalQaReview(caseId);
  const [activeRow, setActiveRow] = useState<SurgicalQaRow | null>(null);
  const acted = useRef(false);
  const activeType = activeRow ? activityTypeFor(activeRow) : undefined;

  useEffect(() => {
    if (acted.current && rows.length === 0) { acted.current = false; onAllDone?.(); }
  }, [rows.length, onAllDone]);

  if (rows.length === 0) return null;

  return (
    <section className="ps-qa-case-bar" aria-label={t('surgicalQaWorklist.caseBarTitle')}>
      <div className="ps-qa-case-bar__title">{t('surgicalQaWorklist.caseBarTitle')}</div>
      <QaReviewMessage messageKey={message ? ERROR_KEY[message] : null} />
      {rows.map((row, i) => (
        <div key={`${row.kind}-${row.specimenId}-${i}`} className="ps-qa-case-bar__item">
          <span className="ps-qcqueue-badge-pill">
            {row.kind === 'peer_review'
              ? (row.caseData.specimens?.find(s => s.id === row.specimenId)?.surgicalPeerReview?.postSignOutPeerReviewFlag?.reason === 'targeted_high_risk'
                  ? t('surgicalQaWorklist.peerReviewTargeted')
                  : t('surgicalQaWorklist.peerReviewRandom'))
              : t('surgicalQaWorklist.correlationCandidate', { candidateCaseId: row.candidateCaseId })}
          </span>
          <div className="ps-qa-case-bar__actions">
            <button className="ps-conf-btn-primary" onClick={() => setActiveRow(row)}>{t('surgicalQaWorklist.recordReviewBtn')}</button>
            {row.kind === 'correlation' && (
              <button className="ps-conf-btn-secondary" disabled={busy} onClick={async () => { acted.current = await dismiss(row); }}>
                {t('surgicalQaWorklist.notRelevantBtn')}
              </button>
            )}
          </div>
        </div>
      ))}
      {activeRow && activeType && (
        <SurgicalQaReviewModal
          activityType={activeType}
          busy={busy}
          onClose={() => setActiveRow(null)}
          onSubmit={async submission => {
            if (await record(activeRow, submission)) { acted.current = true; setActiveRow(null); }
          }}
        />
      )}
    </section>
  );
}

export default SurgicalQaCaseBar;
