// src/pages/AddOnOrderPage/components/BlockContextPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the spec's own Left Panel: "Block & Tissue Context —
// available blocks, tissue description, remaining block volume/
// thickness warnings, prior levels cut, grossing notes." Block
// selection here (checkbox) is what "Block Selection" in §1's own
// Quick-Add Order Matrix drives — one order can target several blocks
// at once, each getting its own real StainOrder(s) when submitted.
// Batch 731 (spec §10.6): an exhausted block can be selected; the builder then says what remains and asks for each
// line's alternative (ExhaustedBlockChoices.tsx). Lost, damaged and cancelled blocks still cannot.
// Batch 732 (spec §11.4, §11.5): a ticked block with a piece map lists its pieces; ticking pieces orders for those
// pieces only (none ticked: the whole block). A used-up piece is marked and can be ticked to get the alternatives.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Specimen, HistologyBlock } from '@/types/case/Specimen';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import { isExhausted, isLost, isDamaged } from '@/utils/blockExceptionStates';
import { piecesOf, blockTypeOf } from '@/utils/blockPieceRules';
import './ExhaustedBlockChoices.css';

export interface BlockContextPanelProps {
  specimens: Specimen[];
  selectedBlockIds: string[];
  onToggleBlock: (blockId: string) => void;
  /** Batch 732: the pieces chosen per block (none: the whole block). */
  pieceTargets?: Record<string, string[]>;
  onTogglePiece?: (blockId: string, pieceId: string) => void;
  /** Batch 737 (spec §11.4): the case's matrix blocks (one cassette shared by several parts); an order can be for the
   *  whole block or some of its parts. */
  matrixBlocks?: MatrixBlock[];
}

const BlockContextPanel: React.FC<BlockContextPanelProps> = ({ specimens, selectedBlockIds, onToggleBlock, pieceTargets = {}, onTogglePiece, matrixBlocks = [] }) => {
  const { t } = useTranslation();

  const blockDisabled = (block: Pick<HistologyBlock, 'status'>) => isLost(block) || isDamaged(block) || block.status === 'Cancelled';
  const blockStatusLabel = (block: Pick<HistologyBlock, 'status'>): string | null => {
    if (isExhausted(block)) return t('addOnOrder.blockContext.exhausted');
    if (isLost(block)) return t('addOnOrder.blockContext.lost');
    if (isDamaged(block)) return t('addOnOrder.blockContext.damaged');
    if (block.status === 'Cancelled') return t('addOnOrder.blockContext.cancelled');
    return null;
  };

  return (
    <div className="ps-addon-panel">
      <p className="ps-addon-panel-title">{t('addOnOrder.blockContext.title')}</p>
      {specimens.length === 0 ? (
        <div className="ps-addon-empty">{t('addOnOrder.blockContext.empty')}</div>
      ) : (
        specimens.map(specimen => (
          <div key={specimen.id} className="ps-addon-specimen-group">
            <p className="ps-addon-specimen-label">{t('addOnOrder.blockContext.specimen', { label: specimen.label, description: specimen.description ?? '' })}</p>
            {(specimen.blocks ?? []).length === 0 ? (
              <div className="ps-addon-empty">{t('addOnOrder.blockContext.noBlocks')}</div>
            ) : (
              (specimen.blocks ?? []).map(block => {
                const disabled = blockDisabled(block);
                const statusLabel = blockStatusLabel(block);
                const selected = selectedBlockIds.includes(block.id);
                const pieces = piecesOf(block);
                return (
                  <React.Fragment key={block.id}>
                  <label className={`ps-addon-block-row${selected ? ' ps-addon-block-row--selected' : ''}${disabled ? ' ps-addon-block-row--disabled' : ''}`}>
                    <input type="checkbox" checked={selected} disabled={disabled} onChange={() => onToggleBlock(block.id)} />
                    <div className="ps-addon-block-row-body">
                      <div className="ps-addon-block-row-top">
                        <strong>{specimen.label}{block.label}</strong>
                        {statusLabel && <span className="ps-addon-block-status-badge">{statusLabel}</span>}
                      </div>
                      <div className="ps-addon-block-row-meta">
                        {t('addOnOrder.blockContext.levelsCut', { count: block.stains.length })}
                        {block.tinyTissue && <span className="ps-addon-block-flag"> · {t('addOnOrder.blockContext.tinyTissue')}</span>}
                        {block.fragile && <span className="ps-addon-block-flag"> · {t('addOnOrder.blockContext.fragile')}</span>}
                        {blockTypeOf(block) !== 'standard' && <span className="ps-addon-block-flag"> · {t(`blockPieces.types.${blockTypeOf(block)}`)}</span>}
                      </div>
                    </div>
                  </label>
                  {selected && pieces.length > 0 && onTogglePiece && (
                    <fieldset className="ps-addon-piece-list">
                      <legend className="ps-addon-field-label">{t('blockPieces.orderFor')}</legend>
                      {pieces.map(p => (
                        <label key={p.id} className="ps-addon-piece-row">
                          <input type="checkbox" checked={(pieceTargets[block.id] ?? []).includes(p.id)} onChange={() => onTogglePiece(block.id, p.id)} />
                          {t('blockPieces.pieceLabel', { position: p.position, part: p.partLabel })}
                          {p.description ? ` · ${p.description}` : ''}
                          {p.exhaustedAt && <span className="ps-addon-block-status-badge">{t('blockPieces.exhausted')}</span>}
                        </label>
                      ))}
                      <span className="ps-addon-exhausted-note">{t('blockPieces.wholeBlockHint')}</span>
                    </fieldset>
                  )}
                  </React.Fragment>
                );
              })
            )}
          </div>
        ))
      )}
      {matrixBlocks.length > 0 && (
        <div className="ps-addon-specimen-group">
          <p className="ps-addon-specimen-label">{t('addOnOrder.blockContext.matrixTitle')}</p>
          {matrixBlocks.map(mb => {
            const disabled = blockDisabled(mb);
            const statusLabel = blockStatusLabel(mb);
            const selected = selectedBlockIds.includes(mb.id);
            const parts = piecesOf(mb, specimens);
            return (
              <React.Fragment key={mb.id}>
                <label className={`ps-addon-block-row${selected ? ' ps-addon-block-row--selected' : ''}${disabled ? ' ps-addon-block-row--disabled' : ''}`}>
                  <input type="checkbox" checked={selected} disabled={disabled} onChange={() => onToggleBlock(mb.id)} />
                  <div className="ps-addon-block-row-body">
                    <div className="ps-addon-block-row-top">
                      <strong>{mb.label}</strong>
                      {statusLabel && <span className="ps-addon-block-status-badge">{statusLabel}</span>}
                    </div>
                    <div className="ps-addon-block-row-meta">
                      {t('addOnOrder.blockContext.levelsCut', { count: (mb.slides ?? []).length })}
                      {' · '}{t('addOnOrder.blockContext.matrixParts', { parts: parts.map(p => p.partLabel).join(', ') })}
                    </div>
                  </div>
                </label>
                {selected && onTogglePiece && (
                  <fieldset className="ps-addon-piece-list">
                    <legend className="ps-addon-field-label">{t('blockPieces.orderFor')}</legend>
                    {parts.map(p => (
                      <label key={p.id} className="ps-addon-piece-row">
                        <input type="checkbox" checked={(pieceTargets[mb.id] ?? []).includes(p.id)} onChange={() => onTogglePiece(mb.id, p.id)} />
                        {t('blockPieces.pieceLabel', { position: p.position, part: p.partLabel })}
                        {p.description ? ` · ${p.description}` : ''}
                        {p.exhaustedAt && <span className="ps-addon-block-status-badge">{t('blockPieces.exhausted')}</span>}
                      </label>
                    ))}
                    <span className="ps-addon-exhausted-note">{t('blockPieces.wholeBlockHint')}</span>
                  </fieldset>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlockContextPanel;
