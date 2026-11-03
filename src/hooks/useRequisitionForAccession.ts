// src/hooks/useRequisitionForAccession.ts
// Batch 762 (Pete, Nov 2, 2026: "…or trigger a quick-create case"): Accession opened from a queued scan
// (/accession?fromRequisition=<id>). Holds the scan being accessioned for, and links it to the case as soon as the
// case is saved (requisitionService.reassociate, audited "to the case created from it").
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { requisitionService, type RequisitionLink, type UnmatchedRequisition } from '@/services';

export function useRequisitionForAccession(savedAccession: string | null | undefined, service = requisitionService) {
  const [params, setParams] = useSearchParams();
  const id = params.get('fromRequisition');
  const [item, setItem] = useState<UnmatchedRequisition | null>(null);
  const [linked, setLinked] = useState<RequisitionLink | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!id) { setItem(null); return; }
    void service.getInbox().then(r => setItem(r.ok ? r.data.unmatched.find(u => u.id === id) ?? null : null));
  }, [id, service]);

  useEffect(() => {
    if (!item || !savedAccession || done.current === savedAccession) return;
    done.current = savedAccession;
    void service.reassociate(item.id, savedAccession, 'newCase').then(r => {
      if (r.ok) { setLinked(r.data); setItem(null); params.delete('fromRequisition'); setParams(params, { replace: true }); }
      else setFailed(r.error);
    });
  }, [item, savedAccession, service, params, setParams]);

  return { item, linked, failed, dismissLinked: () => setLinked(null) };
}
