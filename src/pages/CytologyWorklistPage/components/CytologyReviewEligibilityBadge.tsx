// src/pages/CytologyWorklistPage/components/CytologyReviewEligibilityBadge.tsx
// Batch 451 (PS-163): a review card's "CT-eligible" / "Pathologist required"
// badge in the Cytology Workspace's review history. What it shows comes from
// the review's sign-out gate (cytologyReviewEligibility in
// services/cytology/cytologyWorkspaceView.ts); this only renders it.
import { useTranslation } from 'react-i18next';
import type { CytologySignOutGateResult } from '@/services/cytology/resolveCytologySignOutGate';

export function CytologyReviewEligibilityBadge({ gate, reasonsText }: { gate: CytologySignOutGateResult; reasonsText: string }) {
  const { t } = useTranslation();
  return (
    <span title={reasonsText} className={`ps-cytoscreen-review-eligibility ${gate.allowed ? 'ps-cytoscreen-review-eligibility--allowed' : 'ps-cytoscreen-review-eligibility--blocked'}`}>
      {(gate.allowed ? t('cytologyScreening.history.ctEligible') : t('cytologyScreening.history.pathRequired')).toUpperCase()}
    </span>
  );
}
