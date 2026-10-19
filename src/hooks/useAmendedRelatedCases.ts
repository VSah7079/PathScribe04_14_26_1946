// src/hooks/useAmendedRelatedCases.ts
// Batch 613: thin hook over loadAmendedRelatedCases (all rules live in the service).
import { useEffect, useState } from 'react';
import { caseRouter } from '@/services/cases/CaseRouter';
import { loadAmendedRelatedCases } from '@/services/relatedCases/loadAmendedRelatedCases';
import { subscribeRelatedCaseAttachments } from '@/services/relatedCases/relatedCaseAttachments';
import type { AmendedRelatedCase } from '@/services/relatedCases/relatedCaseTypes';

const getVersions = async (): Promise<Map<string, number>> => {
  const res = await caseRouter.getAll(undefined, { includeOrchestration: true });
  const map = new Map<string, number>();
  if (res.ok) for (const c of res.data) if (typeof c.version === 'number') map.set(c.id, c.version);
  return map;
};

export function useAmendedRelatedCases(caseId: string | undefined, status: string | undefined): AmendedRelatedCase[] {
  const [amended, setAmended] = useState<AmendedRelatedCase[]>([]);
  useEffect(() => {
    if (!caseId) { setAmended([]); return; }
    let live = true;
    const run = () => { void loadAmendedRelatedCases(caseId, { getVersions }).then(a => { if (live) setAmended(a); }); };
    run();
    const off = subscribeRelatedCaseAttachments(run);
    return () => { live = false; off(); };
  }, [caseId, status]);
  return amended;
}
