// src/pages/GrossingScreenPage/GrossingMatrixBlocks.tsx
// Batch 659 (finding 8): Complete grossing counts a matrix block (one cassette shared by several specimens) for the
// piece count and piece description rules, but the screen had nowhere to enter them. This lists the case's matrix
// blocks with those two fields. It shows and dispatches; the save is the screen's hook.
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { MatrixBlock } from '@/types/case/MatrixBlock';

export const GrossingMatrixBlocks: React.FC<{
  matrixBlocks: readonly MatrixBlock[];
  onChange: (matrixBlockId: string, patch: { pieceCount?: number; pieceDescription?: string }) => void;
}> = ({ matrixBlocks, onChange }) => {
  const { t } = useTranslation();
  if (matrixBlocks.length === 0) return null;
  return (
    <section className="ps-grossing-matrix-blocks">
      <h2 className="ps-grossing-margins-title">{t('grossingScreen.matrix.title')}</h2>
      <table className="ps-grossing-block-table">
        <thead>
          <tr>
            <th>{t('grossingScreen.col.blockId')}</th>
            <th>{t('grossingScreen.col.pieceCount')}</th>
            <th>{t('grossingScreen.col.pieceDescription')}</th>
          </tr>
        </thead>
        <tbody>
          {matrixBlocks.map(m => (
            <tr key={m.id}>
              <td>{m.label}</td>
              <td>
                <input aria-label={t('a11y.fields.pieceCount')} type="number" min={0} className="ps-grossing-piece-count-input" defaultValue={m.pieceCount ?? ''}
                  onBlur={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n) && n !== m.pieceCount) onChange(m.id, { pieceCount: n }); }} />
              </td>
              <td>
                <input aria-label={t('a11y.fields.pieceDescription')} className="ps-grossing-piece-description-input" defaultValue={m.pieceDescription ?? ''}
                  onBlur={e => { if (e.target.value.trim() !== (m.pieceDescription ?? '')) onChange(m.id, { pieceDescription: e.target.value }); }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
