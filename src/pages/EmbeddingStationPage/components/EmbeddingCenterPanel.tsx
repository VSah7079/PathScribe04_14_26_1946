// src/pages/EmbeddingStationPage/components/EmbeddingCenterPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-285's own Center Panel: "Piece Count Verification,
// Base Mold Size Picker, Orientation Instructions, Discrepancy
// Reporting (one-touch buttons), Multi-Cassette / Split-Block
// Tracking." Same real "alert badges + context fields + row actions"
// panel shape as MicrotomyWorkstationPage.tsx's own left-panel block
// context, under this page's own ps-embedding-* prefix.
//
// Real, deliberate split: Tiny Tissue/Fragile/Decal Required stay
// toggleable badges (real, stored booleans — same as Microtomy's own
// handleSetAlertFlags); Biopsy/Needle Core are rendered read-only
// (ps-embedding-alert-badge--readonly) since they're derived, not
// stored — see resolveEmbeddingAlertBadges's own doc comment. This
// component never guesses which badges are which; the caller passes
// the already-resolved alertBadges array and this panel just renders
// the toggleable ones (from the block's own real flags) plus the
// derived ones by name.
//
// Batch 401 (PS-359): Confirm takes what it needs from the organisation's
// Field Requirements (page "embedding"): the observed count (locked), and the
// mold size and orientation instructions when the organisation requires them.
// Required labels are starred, "Still required: …" says what is missing, Confirm
// stays off until it is complete, and "confirm count" by voice
// (EMBEDDING_CONFIRM_PIECE_COUNT) acts exactly as the button. Confirm sends the
// orientation box's current text with it, so text typed just before is kept.
// Block status, mold sizes, quick fills and discrepancy reasons are shown in
// the user's language (they are stored in English).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HistologyBlock, Specimen, EmbeddingMoldSize, EmbeddingDiscrepancyReason } from '@/types/case/Specimen';
import { actionRegistryService, embeddingConfirmMissing, embeddingFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import {
  EMBEDDING_DISCREPANCY_REASONS, EMBEDDING_MOLD_SIZES, EMBEDDING_ORIENTATION_QUICK_FILLS,
  EMBEDDING_MOLD_SIZE_KEYS, EMBEDDING_DISCREPANCY_REASON_KEYS, BLOCK_STATUS_KEYS, splitBlockCandidates,
} from '@/utils/embeddingOperations';
import { formatList } from '@/utils/formatList';

export interface EmbeddingCenterPanelProps {
  specimen: Specimen;
  block: HistologyBlock;
  alertBadges: Array<'Tiny Tissue' | 'Fragile' | 'Decal Required' | 'Biopsy' | 'Needle Core'>;
  splitBlockGroupStatus: { siblings: HistologyBlock[]; allEmbedded: boolean } | null;
  onToggleAlertFlag: (flag: 'tinyTissue' | 'fragile' | 'requiresDecal') => void;
  /** The observed-count text and the orientation box's current text. */
  onConfirmPieceCount: (observedCountText: string, orientationInstructions: string) => void;
  onFlagDiscrepancy: (reason: EmbeddingDiscrepancyReason) => void;
  onSetMoldAndOrientation: (changes: { moldSize?: EmbeddingMoldSize; orientationInstructions?: string }) => void;
  onGroupSplitBlocks: (siblingBlockIds: string[]) => void;
  onOpenComments: () => void;
  requirements: readonly ResolvedFieldRequirement[];
}

const STORED_FLAGS = ['tinyTissue', 'fragile', 'requiresDecal'] as const;
const DERIVED_BADGE_LABELS: Record<string, string> = { Biopsy: 'Biopsy', 'Needle Core': 'Needle Core' };

const EmbeddingCenterPanel: React.FC<EmbeddingCenterPanelProps> = ({
  specimen, block, alertBadges, splitBlockGroupStatus,
  onToggleAlertFlag, onConfirmPieceCount, onFlagDiscrepancy, onSetMoldAndOrientation, onGroupSplitBlocks, onOpenComments, requirements,
}) => {
  const { t, i18n } = useTranslation();
  const [observedCount, setObservedCount] = useState<string>(block.pieceCount != null ? String(block.pieceCount) : '');
  const [orientationText, setOrientationText] = useState<string>(block.orientationInstructions ?? '');
  const [groupPicker, setGroupPicker] = useState<Set<string>>(new Set());

  const siblingCandidates = splitBlockCandidates(specimen, block.id);
  const isEmbedded = block.status === 'Embedded';
  const missing = isEmbedded ? [] : embeddingConfirmMissing({ observedCount, moldSize: block.moldSize, orientationInstructions: orientationText }, requirements);
  const canConfirm = !isEmbedded && missing.length === 0;
  const star = (fieldId: string) => !isEmbedded && embeddingFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;

  const discrepancyLabel = (reason: EmbeddingDiscrepancyReason) => {
    const key = EMBEDDING_DISCREPANCY_REASON_KEYS[reason];
    return key ? t(`embeddingStation.discrepancy.reason.${key}`) : reason;
  };

  const handleConfirmClick = () => {
    if (!canConfirm) return;
    onConfirmPieceCount(observedCount, orientationText);
  };
  const confirmRef = useRef(handleConfirmClick);
  confirmRef.current = handleConfirmClick;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'EMBEDDING_CONFIRM_PIECE_COUNT') confirmRef.current();
  }), []);

  const handleOrientationBlur = () => {
    if (orientationText !== (block.orientationInstructions ?? '')) onSetMoldAndOrientation({ orientationInstructions: orientationText });
  };

  return (
    <>
      <div className="ps-embedding-panel ps-mb-14">
        <p className="ps-embedding-panel-title">{t('embeddingStation.context.title')}</p>

        <div className="ps-embedding-alert-badges">
          {STORED_FLAGS.map(flag => (
            <button
              key={flag} type="button"
              className={`ps-embedding-alert-badge${block[flag] ? '' : ' ps-embedding-alert-badge--off'}`}
              onClick={() => onToggleAlertFlag(flag)}
            >
              {t(`embeddingStation.context.flag.${flag}`)}
            </button>
          ))}
          {alertBadges.filter(b => b in DERIVED_BADGE_LABELS).map(b => (
            <span key={b} className="ps-embedding-alert-badge ps-embedding-alert-badge--readonly">
              {t(`embeddingStation.context.derivedBadge.${b === 'Biopsy' ? 'biopsy' : 'needleCore'}`)}
            </span>
          ))}
        </div>

        <div className="ps-embedding-context-field">{t('embeddingStation.context.status')}<strong>{t(`embeddingStation.blockStatus.${BLOCK_STATUS_KEYS[block.status] ?? 'pending'}`)}</strong></div>
        {block.tissueDescription && (
          <div className="ps-embedding-context-field">{t('embeddingStation.context.tissueDescription')}<strong>{block.tissueDescription}</strong></div>
        )}

        <button type="button" className="ps-embedding-row-btn" onClick={onOpenComments}>
          💬 {t('embeddingStation.context.blockComments')}{block.comments?.length ? ` (${block.comments.length})` : ''}
        </button>
      </div>

      <div className="ps-embedding-panel ps-mb-14">
        <p className="ps-embedding-panel-title">{t('embeddingStation.pieceCount.title')}</p>
        <div className="ps-embedding-context-field">{t('embeddingStation.pieceCount.expected')}<strong>{block.pieceCount ?? '—'}</strong></div>
        <label className="ps-embedding-field-label" htmlFor="embedding-observed-count">
          {t('embeddingStation.pieceCount.observedLabel')}{star('observedPieceCount')}
        </label>
        <div className="ps-embedding-piece-count-row">
          <input id="embedding-observed-count"
            type="number" min={0} step={1} className="ps-embedding-field-input ps-embedding-field-input--narrow"
            value={observedCount} onChange={e => setObservedCount(e.target.value)}
            disabled={isEmbedded}
          />
          <button type="button" className="ps-btn-primary" disabled={!canConfirm} onClick={handleConfirmClick}>
            ✅ {t('embeddingStation.pieceCount.confirm')}
          </button>
        </div>
        {missing.length > 0 && (
          <p className="ps-field-still-required" role="status">
            {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.embedding.${id}`)), i18n.language) })}
          </p>
        )}
        {isEmbedded && (
          <div className="ps-embedding-context-field ps-mt-8">
            {t('embeddingStation.pieceCount.observed')}<strong>{block.pieceCountAtEmbedding}</strong>
          </div>
        )}

        <p className="ps-embedding-panel-title ps-mt-14">{t('embeddingStation.discrepancy.title')}</p>
        <div className="ps-embedding-discrepancy-grid">
          {EMBEDDING_DISCREPANCY_REASONS.map(reason => (
            <button key={reason} type="button" className="ps-embedding-discrepancy-btn" onClick={() => onFlagDiscrepancy(reason)}>
              {t(`embeddingStation.discrepancy.reason.${EMBEDDING_DISCREPANCY_REASON_KEYS[reason]}`)}
            </button>
          ))}
        </div>
        {block.lastDiscrepancyReason && (
          <div className="ps-embedding-discrepancy-active">
            ⚠ {t('embeddingStation.discrepancy.lastFlagged', { reason: discrepancyLabel(block.lastDiscrepancyReason), by: block.lastDiscrepancyReportedBy ?? '—' })}
          </div>
        )}
      </div>

      <div className="ps-embedding-panel ps-mb-14">
        <p className="ps-embedding-panel-title">{t('embeddingStation.mold.title')}{star('moldSize')}</p>
        <div className="ps-embedding-mold-grid">
          {EMBEDDING_MOLD_SIZES.map(size => (
            <button
              key={size} type="button"
              className={`ps-embedding-mold-chip${block.moldSize === size ? ' ps-embedding-mold-chip--active' : ''}`}
              onClick={() => onSetMoldAndOrientation({ moldSize: size })}
            >
              {t(`embeddingStation.mold.size.${EMBEDDING_MOLD_SIZE_KEYS[size]}`)}
            </button>
          ))}
        </div>

        <label className="ps-embedding-field-label ps-mt-10" htmlFor="embedding-orientation">{t('embeddingStation.orientation.title')}{star('orientationInstructions')}</label>
        <textarea id="embedding-orientation"
          className="ps-embedding-comment-textarea"
          value={orientationText}
          placeholder={t('embeddingStation.orientation.placeholder') ?? ''}
          onChange={e => setOrientationText(e.target.value)}
          onBlur={handleOrientationBlur}
        />
        <div className="ps-embedding-orientation-quickfills">
          {EMBEDDING_ORIENTATION_QUICK_FILLS.map(key => {
            const fill = t(`embeddingStation.orientation.quickFill.${key}`);
            return (
              <button
                key={key} type="button" className="ps-embedding-row-btn"
                onClick={() => { setOrientationText(fill); onSetMoldAndOrientation({ orientationInstructions: fill }); }}
              >
                {fill}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ps-embedding-panel">
        <p className="ps-embedding-panel-title">{t('embeddingStation.splitBlock.title')}</p>
        {splitBlockGroupStatus ? (
          <div className={`ps-embedding-split-banner${splitBlockGroupStatus.allEmbedded ? ' ps-embedding-split-banner--complete' : ''}`}>
            {t(splitBlockGroupStatus.allEmbedded ? 'embeddingStation.splitBlock.allEmbedded' : 'embeddingStation.splitBlock.pending', {
              labels: splitBlockGroupStatus.siblings.map(b => b.label).join(', '),
            })}
          </div>
        ) : siblingCandidates.length === 0 ? (
          <div className="ps-embedding-context-field">{t('embeddingStation.splitBlock.none')}</div>
        ) : (
          <>
            <div className="ps-embedding-context-field">{t('embeddingStation.splitBlock.pickPrompt')}</div>
            {siblingCandidates.map(sib => (
              <label key={sib.id} className="ps-embedding-checkbox-label ps-mb-4">
                <input
                  type="checkbox" checked={groupPicker.has(sib.id)}
                  onChange={e => setGroupPicker(prev => { const next = new Set(prev); e.target.checked ? next.add(sib.id) : next.delete(sib.id); return next; })}
                />
                {sib.label}
              </label>
            ))}
            <button
              type="button" className="ps-btn-secondary ps-mt-6"
              disabled={groupPicker.size === 0}
              onClick={() => { onGroupSplitBlocks(Array.from(groupPicker)); setGroupPicker(new Set()); }}
            >
              {t('embeddingStation.splitBlock.group')}
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default EmbeddingCenterPanel;
