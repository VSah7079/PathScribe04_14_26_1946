// src/pages/GrossingScreenPage/components/BlockPieceMapEditor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 732 (Lab Workflow & Batch spec §11.1, §11.2). A block's type (standard,
// megablock, multi-piece) and its piece map, set at grossing: an ordered list of
// pieces, each with the specimen part it came from, an optional description,
// orientation or ink, and its position in the block. The block keeps one barcode;
// the pieces are data on it. Closed until opened ("Type & pieces"), so a routine
// block costs no extra click. A megablock produces large-format slides and uses a
// mega mold. Presentation only: the checks are utils/blockPieceRules.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistologyBlock } from '@/types/case/Specimen';
import { BLOCK_TYPES, type BlockPiece, type BlockType } from '@/types/case/blockPieces';
import { pieceMapProblems, pieceRemovalProblems, blockTypeOf, BLOCK_TYPE_PROFILES } from '@/utils/blockPieceRules';
import './BlockPieceMapEditor.css';

interface Props {
  block: HistologyBlock;
  /** The case's part labels (A, B…), for the piece's part. */
  partLabels: string[];
  defaultPart: string;
  onSave: (blockType: Exclude<BlockType, 'matrix'>, pieces: BlockPiece[]) => Promise<boolean>;
}

let pieceCounter = 0;
const newPieceId = () => { pieceCounter += 1; return `piece-${Date.now().toString(36)}-${pieceCounter}`; };

const BlockPieceMapEditor: React.FC<Props> = ({ block, partLabels, defaultPart, onSave }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Exclude<BlockType, 'matrix'>>((block.blockType as Exclude<BlockType, 'matrix'>) ?? 'standard');
  const [pieces, setPieces] = useState<BlockPiece[]>(block.pieces ?? []);
  const [message, setMessage] = useState<{ key: string; warn: boolean } | null>(null);
  const problems = [...pieceMapProblems(type, pieces), ...pieceRemovalProblems(block, pieces)];
  const current = blockTypeOf(block);

  const update = (id: string, patch: Partial<BlockPiece>) => setPieces(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const add = () => setPieces(prev => [...prev, { id: newPieceId(), position: prev.reduce((m, p) => Math.max(m, p.position), 0) + 1, partLabel: defaultPart }]);
  const save = async () => {
    const ok = await onSave(type, pieces);
    setMessage(ok ? { key: 'blockPieces.saved', warn: false } : { key: 'blockPieces.notSaved', warn: true });
    if (ok) setOpen(false);
  };

  if (!open) {
    return (
      <div className="ps-piece-map-summary">
        <span>{t(`blockPieces.types.${current}`)}{(block.pieces?.length ?? 0) > 0 ? ` · ${t('blockPieces.pieceCount', { count: block.pieces!.length })}` : ''}</span>
        <button type="button" className="ps-piece-map-toggle" onClick={() => { setOpen(true); setMessage(null); setType((block.blockType as Exclude<BlockType, 'matrix'>) ?? 'standard'); setPieces(block.pieces ?? []); }}>
          {t('blockPieces.edit')}
        </button>
        {message && <span className={message.warn ? 'ps-piece-map-warn' : 'ps-piece-map-ok'} role={message.warn ? 'alert' : 'status'}>{t(message.key)}</span>}
      </div>
    );
  }

  return (
    <div className="ps-piece-map" role="group" aria-label={t('blockPieces.title')}>
      <label className="ps-piece-map-label" htmlFor={`ps-piece-type-${block.id}`}>{t('blockPieces.typeLabel')}</label>
      <select id={`ps-piece-type-${block.id}`} className="ps-piece-map-input" value={type} onChange={e => setType(e.target.value as Exclude<BlockType, 'matrix'>)}>
        {BLOCK_TYPES.map(bt => <option key={bt} value={bt}>{t(`blockPieces.types.${bt}`)}</option>)}
      </select>
      <p className="ps-piece-map-note">{t('blockPieces.typeNote', { slideSize: t(`blockPieces.slideSizes.${BLOCK_TYPE_PROFILES[type].slideSize}`) })}</p>
      {pieces.length > 0 && (
        <table className="ps-piece-map-table">
          <thead>
            <tr>
              <th scope="col">{t('blockPieces.cols.position')}</th>
              <th scope="col">{t('blockPieces.cols.part')}</th>
              <th scope="col">{t('blockPieces.cols.description')}</th>
              <th scope="col">{t('blockPieces.cols.orientation')}</th>
              <th scope="col">{t('blockPieces.cols.ink')}</th>
              <th scope="col"><span className="ps-sr-only">{t('blockPieces.cols.remove')}</span></th>
            </tr>
          </thead>
          <tbody>
            {pieces.map(p => (
              <tr key={p.id}>
                <td><input aria-label={t('blockPieces.cols.position')} type="number" min={1} className="ps-piece-map-input ps-piece-map-input--narrow" value={p.position} onChange={e => update(p.id, { position: Number(e.target.value) })} /></td>
                <td>
                  <select aria-label={t('blockPieces.cols.part')} className="ps-piece-map-input" value={p.partLabel} onChange={e => update(p.id, { partLabel: e.target.value })}>
                    {partLabels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </td>
                <td><input aria-label={t('blockPieces.cols.description')} className="ps-piece-map-input" value={p.description ?? ''} onChange={e => update(p.id, { description: e.target.value || undefined })} /></td>
                <td><input aria-label={t('blockPieces.cols.orientation')} className="ps-piece-map-input" value={p.orientation ?? ''} onChange={e => update(p.id, { orientation: e.target.value || undefined })} /></td>
                <td><input aria-label={t('blockPieces.cols.ink')} className="ps-piece-map-input" value={p.ink ?? ''} onChange={e => update(p.id, { ink: e.target.value || undefined })} /></td>
                <td><button type="button" className="ps-piece-map-remove" aria-label={t('blockPieces.cols.remove')} onClick={() => setPieces(prev => prev.filter(x => x.id !== p.id))}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button type="button" className="ps-btn-secondary" onClick={add}>{t('blockPieces.addPiece')}</button>
      {problems.length > 0 && <p className="ps-piece-map-warn" role="status">{problems.map(pr => t(`blockPieces.problems.${pr}`)).join(' ')}</p>}
      <div className="ps-piece-map-actions">
        <button type="button" className="ps-btn-primary" disabled={problems.length > 0} onClick={() => { void save(); }}>{t('blockPieces.save')}</button>
        <button type="button" className="ps-btn-secondary" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
      </div>
    </div>
  );
};

export default BlockPieceMapEditor;
