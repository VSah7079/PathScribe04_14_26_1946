// src/pages/AddOnOrderPage/components/OrderBuilderPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per the spec's own §1 "Quick-Add Order Matrix" (Center Panel):
// Recuts/Deep Levels (micron depth), Special Stains, IHC (single-stain
// or panel search), Molecular/FISH/Send-out — plus §1's own
// Auto-Control Pairing and §2's own Cutting Instructions/Slide Media
// selector. One line is added to the cart at a time; the cart itself
// (and the block-selection/priority/routing/submit controls around it)
// lives in OrderSummaryRoutingPanel, per the spec's own Right Panel
// split.
//
// Batch 403 (PS-359): a recut's level depth follows the organisation's Field
// Requirements (page "addOnOrder"): starred when required, "Still required"
// under Add, and Add off until it is given. "add to order" by voice
// (ADD_ON_ADD_TO_ORDER) does exactly what the button does. The stain filter and
// the line building moved to utils/addOnOrderOperations.ts; IHC panel names are
// shown in the user's language.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StainType } from '@/services/stains/IStainService';
import { IHC_PANEL_PRESETS, type AddOnOrderKind, type ControlMode } from '@/types/case/AddOnOrder';
import { buildAddOnLines, filterStainsForKind, type AddOnOrderLineInput } from '@/utils/addOnOrderOperations';
import { actionRegistryService, addOnLineMissing, addOnOrderFieldRequired } from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import { formatList } from '@/utils/formatList';

export interface OrderBuilderPanelProps {
  stainTypes: StainType[];
  onAddLines: (lines: AddOnOrderLineInput[]) => void;
  requirements: readonly ResolvedFieldRequirement[];
}

const OrderBuilderPanel: React.FC<OrderBuilderPanelProps> = ({ stainTypes, onAddLines, requirements }) => {
  const { t, i18n } = useTranslation();
  const [orderKind, setOrderKind] = useState<AddOnOrderKind>('recut');
  const [search, setSearch] = useState('');
  const [selectedStainId, setSelectedStainId] = useState('');
  const [selectedPanelId, setSelectedPanelId] = useState('');
  const [levelDepthMicrons, setLevelDepthMicrons] = useState<string>('4');
  const [controlMode, setControlMode] = useState<ControlMode>('none');

  const availableStains = useMemo(() => filterStainsForKind(stainTypes, orderKind, search), [stainTypes, orderKind, search]);

  const selectedStain = stainTypes.find(s => s.id === selectedStainId);
  const selectedPanel = IHC_PANEL_PRESETS.find(p => p.id === selectedPanelId);

  const handleKindChange = (kind: AddOnOrderKind) => {
    setOrderKind(kind);
    setSelectedStainId('');
    setSelectedPanelId('');
    setControlMode('none');
  };

  const lines = buildAddOnLines({ orderKind, stain: selectedStain, panel: orderKind === 'ihc' ? selectedPanel : undefined, stainTypes, levelDepth: levelDepthMicrons, controlMode });
  const missing = lines.length === 0 ? [] : [...new Set(lines.flatMap(l => addOnLineMissing(l, requirements)))];
  const canAdd = lines.length > 0 && missing.length === 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAddLines(lines);
    setSelectedPanelId('');
    setSelectedStainId('');
    setSearch('');
  };
  const addRef = useRef(handleAdd);
  addRef.current = handleAdd;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'ADD_ON_ADD_TO_ORDER') addRef.current();
  }), []);

  const canShowControlToggle = selectedStain?.requiresTargetControl || (orderKind === 'ihc' && selectedPanel);

  return (
    <div className="ps-addon-panel">
      <p className="ps-addon-panel-title">{t('addOnOrder.builder.title')}</p>

      <div className="ps-addon-kind-toggle">
        {(['recut', 'special_stain', 'ihc', 'molecular'] as AddOnOrderKind[]).map(kind => (
          <button key={kind} type="button" className={`ps-addon-toggle-btn${orderKind === kind ? ' ps-addon-toggle-btn--active' : ''}`} onClick={() => handleKindChange(kind)}>
            {t(`addOnOrder.builder.kind.${kind}`)}
          </button>
        ))}
      </div>

      {orderKind === 'ihc' && (
        <>
          <label className="ps-addon-field-label">{t('addOnOrder.builder.panelPicker')}</label>
          <div className="ps-addon-picker-grid">
            {IHC_PANEL_PRESETS.map(panel => (
              <button key={panel.id} type="button" className={`ps-addon-picker-chip${selectedPanelId === panel.id ? ' ps-addon-picker-chip--active' : ''}`} onClick={() => { setSelectedPanelId(prev => prev === panel.id ? '' : panel.id); setSelectedStainId(''); }}>
                {t(`addOnOrder.panels.${panel.id}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {!(orderKind === 'ihc' && selectedPanelId) && (
        <>
          <input
            className="ps-addon-search-input"
            placeholder={t('addOnOrder.builder.searchStain') as string}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="ps-addon-picker-grid">
            {availableStains.slice(0, 24).map(stain => (
              <button key={stain.id} type="button" className={`ps-addon-picker-chip${selectedStainId === stain.id ? ' ps-addon-picker-chip--active' : ''}`} onClick={() => setSelectedStainId(prev => prev === stain.id ? '' : stain.id)}>
                {stain.name}
              </button>
            ))}
            {availableStains.length === 0 && <div className="ps-addon-empty">{t('addOnOrder.builder.noStains')}</div>}
          </div>
        </>
      )}

      {orderKind === 'recut' && (
        <>
          <label className="ps-addon-field-label" htmlFor="addon-level-depth">{t('addOnOrder.builder.levelDepth')}{addOnOrderFieldRequired(requirements, 'levelDepth') && <span className="ps-conf-required"> *</span>}</label>
          <input id="addon-level-depth" className="ps-addon-field-input" type="number" min={1} value={levelDepthMicrons} onChange={e => setLevelDepthMicrons(e.target.value)} />
        </>
      )}

      {canShowControlToggle && (
        <>
          <label className="ps-addon-field-label">{t('addOnOrder.builder.controlPairing')}</label>
          <div className="ps-addon-kind-toggle">
            {(['none', 'on_slide', 'separate_slide'] as ControlMode[]).map(mode => (
              <button key={mode} type="button" className={`ps-addon-toggle-btn${controlMode === mode ? ' ps-addon-toggle-btn--active' : ''}`} onClick={() => setControlMode(mode)}>
                {t(`addOnOrder.builder.controlMode.${mode}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.addOnOrder.${id}`)), i18n.language) })}
        </p>
      )}
      <button type="button" className="ps-btn-primary ps-addon-add-btn" disabled={!canAdd} onClick={handleAdd}>
        {t('addOnOrder.builder.addToCart')}
      </button>
    </div>
  );
};

export default OrderBuilderPanel;
