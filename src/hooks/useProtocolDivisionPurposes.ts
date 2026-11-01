// src/hooks/useProtocolPathways.ts
// Batch 741: a protocol's suggested division (Divide specimen pre-fills its aliquot rows from it).
import { useEffect, useState } from 'react';
import { protocolService } from '@/services';
import type { AliquotPurpose } from '@/types/case/Material';

export function useProtocolDivisionPurposes(protocolId: string | undefined): AliquotPurpose[] | undefined {
  const [pathways, setPathways] = useState<AliquotPurpose[] | undefined>(undefined);
  useEffect(() => {
    let live = true;
    if (!protocolId) { setPathways(undefined); return; }
    void protocolService.getAll().then(r => { if (live && r.ok) setPathways(r.data.find(p => p.id === protocolId)?.divisionPurposes); });
    return () => { live = false; };
  }, [protocolId]);
  return pathways;
}
