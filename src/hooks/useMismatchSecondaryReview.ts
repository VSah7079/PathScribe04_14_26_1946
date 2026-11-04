// src/hooks/useMismatchSecondaryReview.ts
// Batch 530 (PS-554): the secondary review queue — low-risk clinical mismatches
// a pathologist deferred at report review (clinicalMismatchService.secondaryReviewQueue).
import { useCallback, useEffect, useState } from 'react';
import { clinicalMismatchService } from '@/services';
import type { QaActivityRecord } from '@/types/quality/QaActivityRecord';

export function useMismatchSecondaryReview() {
  const [queue, setQueue] = useState<QaActivityRecord[]>([]);
  const reload = useCallback(async () => { setQueue(await clinicalMismatchService.secondaryReviewQueue()); }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { queue, reload };
}
