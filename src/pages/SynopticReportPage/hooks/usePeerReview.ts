// src/pages/SynopticReportPage/hooks/usePeerReview.ts
// PS-144 (Batch 439): where this case stands on peer review, and the
// pathologists who could review it. Decisions are in
// services/quality/peerReviewStatus.ts; this loads and reloads.

import { useCallback, useEffect, useState } from 'react';
import { peerReviewStatusFor, peerReviewerOptions, roleService, userService, type PeerReviewStatus } from '@/services';
import type { CaseForPeerReview } from '@/services/quality/peerReviewStatus';
import type { PersonRef } from '@/types/quality/PeerReview';

export function usePeerReview(caseData: CaseForPeerReview | null | undefined, primaryPathologistId: string | undefined) {
  const [status, setStatus] = useState<PeerReviewStatus | null>(null);
  const [reviewers, setReviewers] = useState<PersonRef[]>([]);

  const reload = useCallback(async () => {
    if (!caseData?.id) { setStatus(null); return; }
    setStatus(await peerReviewStatusFor(caseData).catch(() => null));
  }, [caseData]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!primaryPathologistId) return;
    Promise.all([userService.getAll(), roleService.getAll()]).then(([users, roles]) => {
      if (users.ok && roles.ok) setReviewers(peerReviewerOptions(users.data, primaryPathologistId, roles.data));
    }).catch(() => {});
  }, [primaryPathologistId]);

  return { status, reviewers, reload };
}
