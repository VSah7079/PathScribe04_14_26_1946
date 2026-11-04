// src/components/Workstation/ExhaustedBlockBanner.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 731 (Lab Workflow & Batch spec §10.6): "any station that scans an
// exhausted block shows the warning". Shown inline (no window to dismiss) at the
// Embedding, Microtome and Slide Distribution stations for the block at the
// bench: that it is exhausted, what remains (unstained slides already cut, the
// part's other blocks that can still be cut) and how many orders wait for it to
// be re-embedded. At the Embedding Station the tech can mark the block
// re-embedded, which releases those orders to the Microtome (needs
// material:reembed:complete; checked again in services/addOnOrders).
// Presentation only: the deciding is in utils/exhaustedBlockRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistologyBlock, Specimen } from '@/types/case/Specimen';
import { isExhausted } from '@/utils/blockExceptionStates';
import { whatRemains } from '@/utils/exhaustedBlockRules';
import { formatList } from '@/utils/formatList';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import './ExhaustedBlockBanner.css';

interface Props {
  specimen: Pick<Specimen, 'label' | 'blocks'>;
  block: HistologyBlock;
  /** At the Embedding Station: mark the block re-embedded (releases the waiting orders). */
  onReembedded?: () => Promise<{ ok: boolean; notPermitted?: boolean; released?: number }>;
}

const ExhaustedBlockBanner: React.FC<Props> = ({ specimen, block, onReembedded }) => {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ key: string; count?: number; warn: boolean } | null>(null);
  const remains = whatRemains(specimen, block.id);
  if (!remains || (!isExhausted(block) && remains.awaitingReembed === 0 && !message)) return null;

  const none = t('exhaustedBlock.none');
  const markReembedded = async () => {
    if (!onReembedded) return;
    setBusy(true);
    const r = await onReembedded();
    setBusy(false);
    setMessage(r.ok ? { key: 'exhaustedBlock.released', count: r.released ?? 0, warn: false }
      : { key: r.notPermitted ? 'exhaustedBlock.notPermitted' : 'exhaustedBlock.failed', warn: true });
  };

  return (
    <div className={`ps-exhausted-block-banner${isExhausted(block) ? '' : ' ps-exhausted-block-banner--ok'}`} role="status">
      {isExhausted(block) && (
        <>
          <strong>{t('exhaustedBlock.title', { block: remains.blockLabel })}</strong>
          <span>{t('exhaustedBlock.remains', {
            unstained: remains.unstained.length ? formatList(remains.unstained.map(s => s.level), i18n.language) : none,
            blocks: remains.otherBlocks.length ? formatList(remains.otherBlocks.map(b => b.label), i18n.language) : none,
          })}</span>
        </>
      )}
      {remains.awaitingReembed > 0 && (
        <span className="ps-exhausted-block-banner-line">
          {t('exhaustedBlock.awaitingReembed', { count: remains.awaitingReembed })}
          {onReembedded && (
            <CapabilityButton capability="material:reembed:complete" className="ps-btn-secondary ps-exhausted-block-banner-btn" disabled={busy} onClick={markReembedded}>
              {t('exhaustedBlock.markReembedded')}
            </CapabilityButton>
          )}
        </span>
      )}
      {message && <span className={message.warn ? 'ps-exhausted-block-banner-warn' : undefined} role={message.warn ? 'alert' : undefined}>{t(message.key, { count: message.count })}</span>}
    </div>
  );
};

export default ExhaustedBlockBanner;
