// src/components/QualityAssurance/SurgicalQaReviewModal.tsx
// Batch 396: the Surgical Post-Sign-Out QA review form in a modal, shared by
// the queue and the case's report page (Pete: record it where you review it).

import { QaReviewCaptureForm, type QaReviewCaptureSubmission } from './QaReviewCaptureForm';
import type { QaActivityType } from '@/types/quality/QaActivityType';

interface SurgicalQaReviewModalProps {
  activityType: QaActivityType;
  busy: boolean;
  onSubmit: (submission: QaReviewCaptureSubmission) => void;
  onClose: () => void;
}

export function SurgicalQaReviewModal({ activityType, busy, onSubmit, onClose }: SurgicalQaReviewModalProps) {
  return (
    <div data-capture-hide="true" className="ps-conf-backdrop" onClick={onClose}>
      <div className="ps-conf-modal" onClick={e => e.stopPropagation()}>
        <div className="ps-conf-modal-header">{activityType.name}</div>
        <div className="ps-conf-modal-body">
          <QaReviewCaptureForm activityType={activityType} busy={busy} onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}

export default SurgicalQaReviewModal;
