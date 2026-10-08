// src/pages/MicrotomyWorkstationPage/components/SlideGridPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-284's own Center Panel: "visual grid/queue of ordered
// slides, stain controls, slide creation/cancellation tools." Styled
// to match GrossingScreenPage's own ps-grossing-block-table exactly
// (same palette/spacing), per direct follow-up asking for visual
// consistency with the existing Grossing/Synoptic UI rather than a
// new visual language.
//
// Real, deliberate choice not to reuse StainMultiSelect
// (SynopticReportPage/modals/BlockStainEditorModal.tsx) verbatim
// here: that component's own onChange contract is a simple "replace
// the whole stains array" — the Quick-Picker this spec asks for needs
// strictly more (duplicate count, level depth in microns, a
// control-pairing checkbox) than that contract carries. This picker
// is purpose-built instead, sharing the exact same real stainTypes
// catalog and the same category-driven search idea.
//
// Batch 388 (PS-359): what "Add" needs comes from the organisation's Field
// Requirements (page "microtomy"): the stain is locked, the level depth (µm) is a
// switch. The picker stars those labels, shows "Still required: …", keeps Add off
// until they are filled, and "add stain" by voice (MICROTOMY_ADD_STAIN) acts
// exactly as the button. A reprint reason is checked the same way.
// ─────────────────────────────────────────────────────────────────────────────

import { slideLevelOf } from '@/services/material/slideLevels';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { StainOrder } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';
import { MICROTOMY_REPRINT_REASONS, MICROTOMY_REASON_KEYS } from '@/utils/microtomyOperations';
import { actionRegistryService, microtomyAddStainMissing, microtomyFieldRequired, microtomyReprintMissing } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';

const PICKER_CATEGORIES: { key: string; match: (s: StainType) => boolean }[] = [
  { key: 'special', match: s => s.category === 'Special Stain' },
  { key: 'ihc', match: s => s.category === 'IHC' },
  { key: 'cytology', match: s => s.category === 'Cytology' },
  { key: 'molecular', match: s => s.category === 'Molecular' },
  { key: 'other', match: s => !['Special Stain', 'IHC', 'Cytology', 'Molecular'].includes(s.category) },
];

function printBadgeClass(status: StainOrder['printStatus']): string {
  switch (status) {
    case 'Printing': return 'ps-microtomy-print-badge--printing';
    case 'Printed': return 'ps-microtomy-print-badge--printed';
    case 'Failed': return 'ps-microtomy-print-badge--failed';
    case 'Canceled': return 'ps-microtomy-print-badge--canceled';
    default: return 'ps-microtomy-print-badge--pending';
  }
}

export interface SlideGridPanelProps {
  stains: StainOrder[];
  stainTypes: StainType[];
  printMode: 'on_demand' | 'batch';
  batchSelection: Set<string>;
  onToggleSelect: (stainId: string) => void;
  onPrintOne: (stain: StainOrder) => void;
  onReprint: (stainId: string, reason: typeof MICROTOMY_REPRINT_REASONS[number]) => void;
  onAddLevel: (stain: StainOrder) => void;
  onRemove: (stainId: string) => void;
  onAddStain: (stainType: StainType, options: { duplicateCount?: number; levelDepthMicrons?: number; pairWithControl?: boolean }) => void;
  onOpenComments: (stain: StainOrder) => void;
  onReorder: (orderedStainIds: string[]) => void;
  supportsControlPairing: boolean;
  requirements: readonly ResolvedFieldRequirement[];
}

const SlideGridPanel: React.FC<SlideGridPanelProps> = ({
  stains, stainTypes, printMode, batchSelection, onToggleSelect, onPrintOne, onReprint,
  onAddLevel, onRemove, onAddStain, onOpenComments, onReorder, supportsControlPairing, requirements,
}) => {
  const { t, i18n } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('special');
  const [query, setQuery] = useState('');
  const [selectedStainId, setSelectedStainId] = useState('');
  const [duplicateCount, setDuplicateCount] = useState(1);
  const [levelDepthMicrons, setLevelDepthMicrons] = useState<number | ''>('');
  const [pairWithControl, setPairWithControl] = useState(false);
  const [reprintPromptFor, setReprintPromptFor] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const activeCategoryDef = PICKER_CATEGORIES.find(c => c.key === activeCategory) ?? PICKER_CATEGORIES[0];
  const availableStains = stainTypes
    .filter(activeCategoryDef.match)
    .filter(s => !query || s.name.toLowerCase().includes(query.toLowerCase()));

  const missing = microtomyAddStainMissing(selectedStainId, String(levelDepthMicrons), requirements);
  const req = (id: string) => microtomyFieldRequired(requirements, id);

  const handleAdd = () => {
    if (missing.length > 0) return;
    const stainType = stainTypes.find(s => s.id === selectedStainId);
    if (!stainType) return;
    onAddStain(stainType, {
      duplicateCount,
      levelDepthMicrons: levelDepthMicrons === '' ? undefined : levelDepthMicrons,
      pairWithControl: supportsControlPairing ? pairWithControl : undefined,
    });
    setSelectedStainId(''); setDuplicateCount(1); setLevelDepthMicrons(''); setPairWithControl(false);
  };

  // Voice/keyboard "add stain": the same Add, with the same check.
  const addRef = useRef(handleAdd);
  addRef.current = handleAdd;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'MICROTOMY_ADD_STAIN') addRef.current();
  }), []);

  const handleDrop = (targetId: string) => {
    const draggedId = dragIdRef.current;
    dragIdRef.current = null;
    if (!draggedId || draggedId === targetId) return;
    const ids = stains.map(s => s.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedId);
    onReorder(ids);
  };

  return (
    <div className="ps-microtomy-panel">
      <p className="ps-microtomy-panel-title">{t('microtomyWorkstation.slideGrid.title')}</p>

      <table className="ps-microtomy-slide-table">
        <thead>
          <tr>
            {printMode === 'batch' && <th></th>}
            <th>{t('microtomyWorkstation.slideGrid.col.level')}</th>
            <th>{t('microtomyWorkstation.slideGrid.col.stain')}</th>
            <th>{t('microtomyWorkstation.slideGrid.col.status')}</th>
            <th>{t('microtomyWorkstation.slideGrid.col.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {stains.map((stain, idx) => (
            <tr
              key={stain.id}
              className={[
                batchSelection.has(stain.id) ? 'ps-microtomy-slide-row--selected' : '',
                stain.isControlSlide ? 'ps-microtomy-slide-row--control' : '',
              ].filter(Boolean).join(' ')}
              draggable={printMode === 'batch'}
              onDragStart={() => { dragIdRef.current = stain.id; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(stain.id)}
            >
              {printMode === 'batch' && (
                <td>
                  <input
                    type="checkbox" checked={batchSelection.has(stain.id)}
                    disabled={stain.printStatus === 'Printed' || stain.printStatus === 'Canceled'}
                    onChange={() => onToggleSelect(stain.id)}
                  />
                </td>
              )}
              <td>{t('microtomyWorkstation.slideGrid.levelShort', { n: slideLevelOf(stain, idx).slice(1) })}{stain.levelDepthMicrons ? ` (${stain.levelDepthMicrons}µm)` : ''}</td>
              <td>
                {stain.stainName}
                {stain.isControlSlide && <span className="ps-microtomy-control-badge">{t('microtomyWorkstation.slideGrid.control')}</span>}
                {stain.commentPrintsOnLabel && stain.comments?.length ? (
                  <span className="ps-microtomy-control-badge" title={t('microtomyWorkstation.slideGrid.commentOnLabelTitle')}>{t('microtomyWorkstation.slideGrid.onLabel')}</span>
                ) : null}
              </td>
              <td>
                <span className={`ps-microtomy-print-badge ${printBadgeClass(stain.printStatus)}`}>
                  {t(`microtomyWorkstation.printStatus.${stain.printStatus ?? 'Pending'}`)}
                </span>
                {stain.printFailureReason && stain.printStatus === 'Failed' && (
                  <div className="ps-microtomy-comment-meta" title={stain.printFailureReason}>{stain.printFailureReason}</div>
                )}
                {(stain.reprintCount ?? 0) > 0 && (
                  <div className="ps-microtomy-comment-meta">{t('microtomyWorkstation.slideGrid.reprintedCount', { count: stain.reprintCount })}</div>
                )}
              </td>
              <td>
                <div className="ps-microtomy-row-actions">
                  {printMode === 'on_demand' && stain.printStatus !== 'Printed' && stain.printStatus !== 'Canceled' && (
                    <button type="button" className="ps-microtomy-row-btn ps-microtomy-row-btn--primary" onClick={() => onPrintOne(stain)}>
                      {t('microtomyWorkstation.slideGrid.print')}
                    </button>
                  )}
                  {stain.printStatus === 'Printed' && (
                    reprintPromptFor === stain.id ? (
                      <select
                        className="ps-microtomy-field-select ps-microtomy-field--w120"
                        onChange={e => { if (e.target.value && microtomyReprintMissing(e.target.value, requirements).length === 0) { onReprint(stain.id, e.target.value as typeof MICROTOMY_REPRINT_REASONS[number]); setReprintPromptFor(null); } }}
                        defaultValue=""
                      >
                        <option value="" disabled>{t('microtomyWorkstation.slideGrid.reprintReasonPrompt')}</option>
                        {MICROTOMY_REPRINT_REASONS.map(r => <option key={r} value={r}>{t(`microtomyWorkstation.reasons.${MICROTOMY_REASON_KEYS[r]}`)}</option>)}
                      </select>
                    ) : (
                      <button type="button" className="ps-microtomy-row-btn" onClick={() => setReprintPromptFor(stain.id)}>
                        {t('microtomyWorkstation.slideGrid.reprint')}
                      </button>
                    )
                  )}
                  <button type="button" className="ps-microtomy-row-btn" onClick={() => onAddLevel(stain)} title={t('microtomyWorkstation.slideGrid.addLevelTitle')}>
                    {t('microtomyWorkstation.slideGrid.addLevel')}
                  </button>
                  <button type="button" className="ps-microtomy-row-btn" onClick={() => onOpenComments(stain)}>
                    💬{stain.comments?.length ? ` ${stain.comments.length}` : ''}
                  </button>
                  {stain.status !== 'Cancelled' && (
                    <button type="button" className="ps-microtomy-row-btn ps-microtomy-row-btn--danger" onClick={() => onRemove(stain.id)}>
                      {t('common.remove')}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ps-microtomy-add-stain-row">
        <div className="ps-microtomy-category-tabs">
          {PICKER_CATEGORIES.map(c => (
            <button
              key={c.key} type="button"
              className={`ps-microtomy-category-tab${activeCategory === c.key ? ' ps-microtomy-category-tab--active' : ''}`}
              onClick={() => { setActiveCategory(c.key); setSelectedStainId(''); }}
            >
              {t(`microtomyWorkstation.slideGrid.categories.${c.key}`)}
            </button>
          ))}
        </div>
        <input
          type="text" placeholder={t('microtomyWorkstation.slideGrid.searchStains') ?? ''} value={query}
          onChange={e => setQuery(e.target.value)}
          className="ps-microtomy-field-input ps-microtomy-field--w140"
        />
        <select className="ps-microtomy-field-select ps-microtomy-field--w200" value={selectedStainId} onChange={e => setSelectedStainId(e.target.value)}
          aria-label={t('fieldRequirements.fields.microtomy.stainType')}>
          <option value="">{t('microtomyWorkstation.slideGrid.selectStain')}</option>
          {availableStains.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {req('stainType') && <span className="ps-conf-required">*</span>}
        <label className="ps-microtomy-checkbox-label">
          {t('microtomyWorkstation.slideGrid.duplicateCount')}
          <input type="number" min={1} max={12} value={duplicateCount} onChange={e => setDuplicateCount(Math.max(1, parseInt(e.target.value, 10) || 1))} className="ps-microtomy-add-stain-input" />
        </label>
        <label className="ps-microtomy-checkbox-label">
          {t('microtomyWorkstation.slideGrid.levelDepth')}{req('levelDepth') && <span className="ps-conf-required"> *</span>}
          <input type="number" min={0} value={levelDepthMicrons} onChange={e => setLevelDepthMicrons(e.target.value === '' ? '' : Number(e.target.value))} className="ps-microtomy-add-stain-input" />
        </label>
        {supportsControlPairing && (
          <label className="ps-microtomy-checkbox-label">
            <input type="checkbox" checked={pairWithControl} onChange={e => setPairWithControl(e.target.checked)} />
            {t('microtomyWorkstation.slideGrid.pairControl')}
          </label>
        )}
        <button type="button" className="ps-btn-secondary" disabled={missing.length > 0} onClick={handleAdd}>
          + {t('common.add')}
        </button>
      </div>
      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.microtomy.${id}`)), i18n.language) })}
        </p>
      )}
    </div>
  );
};

export default SlideGridPanel;
