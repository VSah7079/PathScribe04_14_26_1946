// src/components/Config/System/DeckLayoutEditor.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406 (Pete: "Instrument Profile Definition … Slot Layout & Schema;
// Rack Type Compatibility"). An analyser's deck layout in the equipment
// editor: each slot's id (it goes into the deck-location barcode
// LOC-INST-<code>-<slot>), the deck or bay it sits on, and the rack types it
// takes. Rack Loading and the plate builder offer only the slots that fit.
// The rules are services/equipment/equipmentRules.ts (deckSlotsValid).
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { DECK_RACK_TYPES, type DeckSlot, type DeckRackType } from '../../../services';

interface Props {
  slots: DeckSlot[];
  onChange: (slots: DeckSlot[]) => void;
  error?: string | null;
}

const DeckLayoutEditor: React.FC<Props> = ({ slots, onChange, error }) => {
  const { t } = useTranslation();
  const update = (index: number, patch: Partial<DeckSlot>) => onChange(slots.map((sl, i) => (i === index ? { ...sl, ...patch } : sl)));
  const toggleType = (index: number, type: DeckRackType) => {
    const have = slots[index].rackTypes;
    update(index, { rackTypes: have.includes(type) ? have.filter(x => x !== type) : [...have, type] });
  };

  return (
    <fieldset className="ps-deck-layout">
      <legend className="ps-conf-label">{t('equipmentSection.deck.title')}</legend>
      <span className="ps-conf-field-hint">{t('equipmentSection.deck.hint')}</span>
      {slots.length === 0 && <p className="ps-conf-field-hint">{t('equipmentSection.deck.none')}</p>}
      {slots.map((sl, i) => (
        <div key={i} className="ps-deck-slot-row">
          <input className="ps-conf-input ps-deck-slot-id" aria-label={t('equipmentSection.deck.slotId')} placeholder={t('equipmentSection.deck.slotIdPlaceholder')}
            value={sl.id} onChange={e => update(i, { id: e.target.value.toUpperCase() })} />
          <input className="ps-conf-input ps-deck-slot-deck" aria-label={t('equipmentSection.deck.deck')} placeholder={t('equipmentSection.deck.deckPlaceholder')}
            value={sl.deck ?? ''} onChange={e => update(i, { deck: e.target.value })} />
          <div className="ps-deck-slot-types" role="group" aria-label={t('equipmentSection.deck.rackTypes')}>
            {DECK_RACK_TYPES.map(type => (
              <label key={type} className="ps-deck-slot-type">
                <input type="checkbox" checked={sl.rackTypes.includes(type)} onChange={() => toggleType(i, type)} /> {t(`equipmentSection.deck.rackType.${type}`)}
              </label>
            ))}
          </div>
          <button type="button" className="ps-btn-small" onClick={() => onChange(slots.filter((_, idx) => idx !== i))}>{t('equipmentSection.deck.remove')}</button>
        </div>
      ))}
      <button type="button" className="ps-btn-small" onClick={() => onChange([...slots, { id: '', rackTypes: ['sample_tube_rack'] }])}>{t('equipmentSection.deck.add')}</button>
      {error && <span className="ps-conf-error-text">{error}</span>}
    </fieldset>
  );
};

export default DeckLayoutEditor;
