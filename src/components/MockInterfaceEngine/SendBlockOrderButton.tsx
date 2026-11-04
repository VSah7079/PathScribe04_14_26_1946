// src/components/MockInterfaceEngine/SendBlockOrderButton.tsx
// Batch 605: "Send block order to instrument". Builds the block's ORM^O01, sends it through the
// interface dispatch, and shows the message and the result. Labelled Simulated while the
// simulated engine answers.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { caseRouter } from '@/services/cases/CaseRouter';
import { dispatchBlockOrder, dispatchSlideOrder, dispatchSpecimenLabelOrder, type HardwareDispatchResult } from '@/services/interfaceDispatch/dispatchHardwareOrders';

type BlockLike = { id: string; label: string; stains?: { stainName: string }[] };
type SpecimenLike = { id: string; label: string; blocks?: BlockLike[]; container?: { type?: string } };
type CaseLike = { id: string; specimens?: SpecimenLike[]; accession?: { fullAccession?: string } };

interface Props { fullAccession: string; specimenId: string; blockId: string; actor: string }

const SendBlockOrderButton: React.FC<Props> = ({ fullAccession, specimenId, blockId, actor }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HardwareDispatchResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const send = async (what: 'block' | 'slides' | 'label' = 'block') => {
    setBusy(true); setProblem(null);
    try {
      const all = await caseRouter.getAll(undefined, { includeOrchestration: true } as never);
      const c = all.ok ? (all.data as unknown as CaseLike[]).find(x => x?.accession?.fullAccession === fullAccession) : undefined;
      const specimen = c?.specimens?.find(s => s.id === specimenId);
      const block = specimen?.blocks?.find(bl => bl.id === blockId);
      if (!c || !specimen || !block) { setProblem(t('sendBlockOrder.notFound')); return; }
      let r: HardwareDispatchResult;
      if (what === 'slides') {
        const stains = block.stains ?? [];
        const results: HardwareDispatchResult[] = [];
        for (const [i, st] of stains.entries()) {
          results.push(await dispatchSlideOrder({ caseId: c.id, accession: fullAccession, specimenLabel: specimen.label, blockLabel: block.label, slideLabel: String(i + 1), stainName: st.stainName, barcode: `${fullAccession}-${specimen.label}${block.label}-${i + 1}`, actor }));
        }
        if (results.length === 0) { setProblem(t('sendBlockOrder.noStains')); return; }
        r = { ...results[results.length - 1], ok: results.every(x => x.ok), messageText: results.map(x => x.messageText).join('\n') };
      } else if (what === 'label') {
        r = await dispatchSpecimenLabelOrder({ caseId: c.id, accession: fullAccession, specimenLabel: specimen.label, container: specimen.container?.type, barcode: `${fullAccession}-${specimen.label}`, actor });
      } else {
        r = await dispatchBlockOrder({ caseData: c as never, specimen: specimen as never, block: block as never, actor });
      }
      setResult(r);
      if (r.ok) toast.success(t(r.simulated ? 'sendBlockOrder.sentSimulated' : 'sendBlockOrder.sent'));
      else toast.error(t('sendBlockOrder.failed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="ps-blockstain-send-order" data-testid="send-block-order">
      <button type="button" className="ps-blockstain-create-spare-btn" disabled={busy} onClick={() => send('block')}>{t('sendBlockOrder.button')}</button>
      <button type="button" className="ps-blockstain-create-spare-btn" disabled={busy} onClick={() => send('slides')}>{t('sendBlockOrder.slidesButton')}</button>
      <button type="button" className="ps-blockstain-create-spare-btn" disabled={busy} onClick={() => send('label')}>{t('sendBlockOrder.labelButton')}</button>
      {problem && <div className="ps-fixgate-intro ps-blockstain-inline-status ps-blockstain-inline-status--error">{problem}</div>}
      {result && (
        <div className="ps-fixgate-intro ps-blockstain-inline-status">
          {result.simulated && <span className="ps-conf-badge">{t('sendBlockOrder.badge')}</span>}{' '}
          {result.ok ? t('sendBlockOrder.resultOk') : `${t('sendBlockOrder.failed')} ${result.error ?? ''}`}
          <pre data-phi="name">{result.messageText.split('\r').join('\n')}</pre>
        </div>
      )}
    </div>
  );
};

export default SendBlockOrderButton;
