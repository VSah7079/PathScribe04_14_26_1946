// src/components/Billing/CaseBillingReview.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 460: the billing review panel with its two prompts (post-sign-out
// reason, applied-code correction), for screens other than the case report
// page: the Cytology Workspace drawer and Microtomy's full review. The
// changes come from useCaseBillingReview (services/billing does the work);
// this only renders.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import type { Case } from '@/types/case/Case';
import BillingReviewPanel from '@/pages/SynopticReportPage/components/BillingReviewPanel';
import { PostSignoutBillingChangeModal } from './PostSignoutBillingChangeModal';
import { CorrectAppliedCodeModal } from './CorrectAppliedCodeModal';
import type { useCaseBillingReview } from '@/hooks/useCaseBillingReview';


interface Props {
  caseData: Case;
  review: ReturnType<typeof useCaseBillingReview>;
  /** The header's "before …" context; the panel's default (sign-out) when omitted. */
  contextLabel?: string;
  /** The block or decant to select when the panel opens. */
  selectedMaterialId?: string;
}

export const CaseBillingReview: React.FC<Props> = ({ caseData, review, contextLabel, selectedMaterialId }) => (
  <>
    <BillingReviewPanel
      specimens={(caseData.specimens as any) ?? []}
      matrixBlocks={(caseData.matrixBlocks as any) ?? []}
      {...review.panelHandlers}
      onHighlight={() => undefined}
      materialSelectedBlockId={selectedMaterialId}
      caseId={caseData.id}
      contextLabel={contextLabel}
    />
    {review.postSignoutPrompt && (
      <PostSignoutBillingChangeModal summary={review.postSignoutPrompt.summary} onConfirm={review.confirmPostSignout} onCancel={review.cancelPostSignout} />
    )}
    {review.correctingCode && (
      <CorrectAppliedCodeModal originalCode={review.correctingCode.oldCode} caseId={caseData.id} onConfirm={review.confirmCorrection} onCancel={review.cancelCorrection} />
    )}
  </>
);
