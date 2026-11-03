// src/hooks/useCaseRequisitions.ts
// Batch 762: the scanned requisitions linked to a case, and its open Missing requisition flag (case:requisition:view,
// checked in the service). Quietly empty without the capability or when there are none.
import { useEffect, useState } from 'react';
import { requisitionService, type MissingRequisition, type RequisitionLink } from '@/services';
import { useCapabilities } from '@/hooks/useCapabilities';

export function useCaseRequisitions(ref: { caseId?: string | null; accession?: string | null }, service = requisitionService): { links: RequisitionLink[]; missing: MissingRequisition | null } {
  const { has } = useCapabilities();
  const allowed = has('case:requisition:view');
  const [links, setLinks] = useState<RequisitionLink[]>([]);
  const [missing, setMissing] = useState<MissingRequisition | null>(null);
  useEffect(() => {
    if (!allowed || (!ref.caseId && !ref.accession)) { setLinks([]); setMissing(null); return; }
    let cancelled = false;
    void service.linksForCase(ref).then(r => { if (!cancelled) setLinks(r.ok ? r.data : []); });
    void service.missingForCase(ref).then(r => { if (!cancelled) setMissing(r.ok ? r.data : null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, ref.caseId, ref.accession, service]);
  return { links, missing };
}
