// src/components/Workstation/BlockPieceMapPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 732 (Lab Workflow & Batch spec §11.1, §11.2, §11.5, §11.6): the block's
// type, the size of the slides it produces, and its piece map, at the Embedding
// Station and the Microtome. Each piece shows its position, part, description,
// orientation and ink, and whether it is used up. At the Microtome a piece can
// be marked used up ("Piece exhausted", material:end-state:record, checked again
// in services/material/pieceExhaustion.ts); the last one makes the block
// Exhausted. A standard block with no pieces shows nothing.
// Presentation only: the deciding is in utils/blockPieceRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BlockPiece, BlockType, SlideSize } from '@/types/case/blockPieces';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import './BlockPieceMapPanel.css';

interface Props {
  blockType: BlockType;
  slideSize: SlideSize;
  pieces: BlockPiece[];
  /** At the Microtome: mark a piece used up. */
  onMarkExhausted?: (pieceId: string) => Promise<{ ok: boolean; notPermitted?: boolean; blockExhausted?: boolean }>;
}

const BlockPieceMapPanel: React.FC<Props> = ({ blockType, slideSize, pieces, onMarkExhausted }) => {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ key: string; warn: boolean } | null>(null);
  if (blockType === 'standard' && pieces.length === 0 && slideSize === 'standard') return null;

  const mark = async (pieceId: string) => {
    if (!onMarkExhausted) return;
    setBusy(pieceId);
    const r = await onMarkExhausted(pieceId);
    setBusy(null);
    setMessage(r.ok ? { key: r.blockExhausted ? 'blockPieces.lastPieceUsed' : 'blockPieces.pieceMarked', warn: !!r.blockExhausted }
      : { key: r.notPermitted ? 'blockPieces.notPermitted' : 'blockPieces.notSaved', warn: true });
  };

  return (
    <section className="ps-piece-panel" aria-label={t('blockPieces.title')}>
      <p className="ps-piece-panel-head">
        <strong>{t(`blockPieces.types.${blockType}`)}</strong>
        <span>{t('blockPieces.slidesAre', { size: t(`blockPieces.slideSizes.${slideSize}`) })}</span>
      </p>
      {pieces.length > 0 && (
        <ul className="ps-piece-panel-list">
          {pieces.map(p => (
            <li key={p.id} className={p.exhaustedAt ? 'ps-piece-panel-item ps-piece-panel-item--used' : 'ps-piece-panel-item'}>
              <span>{t('blockPieces.pieceLabel', { position: p.position, part: p.partLabel })}</span>
              {[p.description, p.orientation, p.ink].filter(Boolean).map(x => <span key={x} className="ps-piece-panel-meta">{x}</span>)}
              {p.exhaustedAt
                ? <span className="ps-piece-panel-badge">{t('blockPieces.exhausted')}</span>
                : onMarkExhausted && (
                  <CapabilityButton capability="material:end-state:record" className="ps-piece-panel-btn" disabled={busy !== null} onClick={() => { void mark(p.id); }}>
                    {t('blockPieces.markExhausted')}
                  </CapabilityButton>
                )}
            </li>
          ))}
        </ul>
      )}
      {message && <p className={message.warn ? 'ps-piece-panel-warn' : 'ps-piece-panel-note'} role={message.warn ? 'alert' : 'status'}>{t(message.key)}</p>}
    </section>
  );
};

export default BlockPieceMapPanel;
