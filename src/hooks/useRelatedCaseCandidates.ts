// src/hooks/useRelatedCaseCandidates.ts
// Batch 613: the related released cases the signed-in user may choose from (see
// services/relatedCases/loadRelatedCandidates.ts). Reads only; decisions live in the service.
import { useEffect, useState } from 'react';
import { caseRouter } from '@/services/cases/CaseRouter';
import { intraoperativeService, patientIndexService } from '@/services';
import { loadRelatedCandidates } from '@/services/relatedCases/loadRelatedCandidates';
import type { RelatedCaseSnapshot } from '@/services/relatedCases/relatedCaseTypes';

export function useRelatedCaseCandidates(patientId: string | undefined, currentCaseId: string | undefined, enabled = true) {
  const [candidates, setCandidates] = useState<RelatedCaseSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !patientId) { setCandidates([]); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    loadRelatedCandidates({ patientId, currentCaseId }, {
      getVisibleCases: () => caseRouter.getAll(undefined, { includeOrchestration: true }) as never,
      getSamePersonIds: id => patientIndexService.getLinkedPatientIds(id, 'same_person'),
      getIntraopEntries: () => intraoperativeService.getAll() as never,
    })
      .then(list => { if (!cancelled) setCandidates(list); })
      .catch(() => { if (!cancelled) setCandidates([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, currentCaseId, enabled]);

  return { candidates, loading };
}
