// src/hooks/useReviewQueueCounts.ts
// Batch 396 (Pete): the item counts for the Worklist's peer-review queue
// tiles. Reloaded whenever `refreshKey` changes (the Worklist passes the
// current view, so a count updates after a review is recorded and the reader
// switches tiles). Decisions are in services/quality/reviewQueueCounts.ts.

import { useEffect, useState } from 'react';
import { cytologyQcCaseAssignmentService, clinicalMismatchService } from '@/services';
import { caseRouter } from '@/services/cases/CaseRouter';
import { loadReviewQueueCounts, type ReviewQueueCounts } from '@/services/quality/reviewQueueCounts';

export function useReviewQueueCounts(which: { cytologyQc: boolean; surgicalQa: boolean }, refreshKey: unknown): ReviewQueueCounts {
  const [counts, setCounts] = useState<ReviewQueueCounts>({ cytologyQc: null, surgicalQa: null });
  const { cytologyQc, surgicalQa } = which;
  useEffect(() => {
    let cancelled = false;
    void loadReviewQueueCounts({
      cytologyQcQueueSize: () => cytologyQcCaseAssignmentService.getUnifiedQueue().then(r => (r.ok ? r.data.length : null)),
      listCases: () => caseRouter.getAll().then(r => (r.ok ? r.data : null)),
      mismatchQueueSize: () => clinicalMismatchService.secondaryReviewQueue().then(q => q.length),
    }, { cytologyQc, surgicalQa }).then(c => { if (!cancelled) setCounts(c); });
    return () => { cancelled = true; };
  }, [cytologyQc, surgicalQa, refreshKey]);
  return counts;
}
