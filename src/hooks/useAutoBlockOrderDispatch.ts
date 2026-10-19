// Batch 605: when a block appears on the open case (created or routed at grossing), hand its order to the
// (simulated) engine and show the hand-off. Blocks already on the case when it opens are not re-sent.
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import i18n from '@/i18n/config';
import { isEngineSimulated } from '@/services/mockInterfaceEngine/simulatedEngineReceiver';
import { dispatchBlockOrder } from '@/services/interfaceDispatch/dispatchHardwareOrders';

type BlockLike = { id: string; label?: string };
type SpecimenLike = { id: string; label?: string; blocks?: BlockLike[] };

export function blockKeys(specimens: SpecimenLike[] | undefined): string[] {
  return (specimens ?? []).flatMap(s => (s.blocks ?? []).map(b => `${s.id}::${b.id}`));
}
export function newBlockKeys(known: ReadonlySet<string>, specimens: SpecimenLike[] | undefined): string[] {
  return blockKeys(specimens).filter(k => !known.has(k));
}

export function useAutoBlockOrderDispatch(caseData: { id: string; patient: unknown; specimens?: SpecimenLike[] } | null | undefined, actor: string): void {
  const known = useRef<{ caseId: string; keys: Set<string> } | null>(null);
  useEffect(() => {
    if (!caseData) return;
    if (!known.current || known.current.caseId !== caseData.id) {
      known.current = { caseId: caseData.id, keys: new Set(blockKeys(caseData.specimens)) };
      return;
    }
    const fresh = newBlockKeys(known.current.keys, caseData.specimens);
    if (fresh.length === 0) return;
    fresh.forEach(k => known.current!.keys.add(k));
    if (!isEngineSimulated()) return;
    for (const k of fresh) {
      const [specId, blockId] = k.split('::');
      const specimen = caseData.specimens?.find(s => s.id === specId);
      const block = specimen?.blocks?.find((b: BlockLike) => b.id === blockId);
      if (!specimen || !block) continue;
      void dispatchBlockOrder({ caseData: caseData as never, specimen: specimen as never, block: block as never, actor }).then(r => {
        if (r.ok) toast.info(i18n.t('sendBlockOrder.autoSent', { block: `${specimen.label}${block.label}` }));
        else toast.error(i18n.t('sendBlockOrder.failed'));
      });
    }
  }, [caseData, actor]);
}
