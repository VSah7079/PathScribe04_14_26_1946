// src/pages/MolecularBatchPage/components/RackPlacementPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406 (Pete's Rack Loading requirements). Places a loaded extraction
// rack on an analyser's deck:
//   - instrument: the active analysers, this station's lab first;
//   - assay (a Field Requirements switch): narrows the slots to the ones its
//     control rule allows (Control Rules page);
//   - deck slot: a list of only the slots on that instrument that take this
//     rack type and suit the assay; required when more than one does;
//   - "Scan deck position": scanning the deck's LOC-INST-<instrument>-<slot>
//     barcode fills the instrument and slot, and a slot that doesn't take the
//     rack (or isn't the assay's) is shown as a warning and blocks placing.
// Stars and "Still required" follow the organisation's Field Requirements
// (page "molecularRack"); the rack service checks everything again. Saying
// "place rack" (MOLECULAR_PLACE_RACK) does what the button does.
// Decisions live in services/molecular/deckSlots.ts and
// services/fieldRequirements/molecularRackChecks.ts.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  actionRegistryService, slotsForRack, checkDeckSlot, resolveDeckScan, rackTypeOf, rackDeckSlotNeeded,
  molecularRackPlacementMissing, molecularRackFieldRequired,
  type Equipment, type MolecularExtractionRack, type MolecularAssayControlRule, type DeckScanResult,
} from '@/services';
import type { ResolvedFieldRequirement } from '@/services/fieldRequirements/fieldRequirementRules';
import type { StainType } from '@/services/stains/IStainService';
import { formatList } from '@/utils/formatList';
import { formatDateTime } from '@/utils/formatDate';

export interface RackPlacementChoice {
  instrumentCode: string;
  assayCode?: string;
  deckSlotId?: string;
  via: 'manual' | 'deckScan';
}

export interface RackPlacementPanelProps {
  rack: MolecularExtractionRack;
  /** Active analysers, in the order to offer them. */
  instruments: readonly Equipment[];
  assays: readonly StainType[];
  rules: readonly MolecularAssayControlRule[];
  requirements: readonly ResolvedFieldRequirement[];
  /** Resolves to an error code, or null when placed. */
  onPlace: (choice: RackPlacementChoice) => Promise<string | null>;
}

const SCAN_ONLY_PROBLEMS = ['notDeckBarcode', 'unknownInstrument', 'otherInstrument'];

const RackPlacementPanel: React.FC<RackPlacementPanelProps> = ({ rack, instruments, assays, rules, requirements, onPlace }) => {
  const { t, i18n } = useTranslation();
  const [instrumentCode, setInstrumentCode] = useState(rack.placement?.instrumentCode ?? '');
  const [assayCode, setAssayCode] = useState(rack.placement?.assayCode ?? '');
  const [deckSlotId, setDeckSlotId] = useState(rack.placement?.deckSlotId ?? '');
  const [via, setVia] = useState<'manual' | 'deckScan'>('manual');
  const [scanArmed, setScanArmed] = useState(false);
  const [scan, setScan] = useState<DeckScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rackType = rackTypeOf(rack);
  const instrument = instruments.find(i => i.code === instrumentCode);
  const allowed = rules.find(r => r.assayCode === assayCode)?.allowedSampleRackSlotIds;
  const slotOptions = slotsForRack(instrument, rackType, allowed);
  const slotNeeded = rackDeckSlotNeeded({ rack, instrument });
  const slotProblem = instrument && deckSlotId ? checkDeckSlot(instrument, deckSlotId, rackType, allowed) : null;
  const missing = molecularRackPlacementMissing({ rack, instrument, assayCode, deckSlotId }, requirements);
  const star = (fieldId: string) => molecularRackFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;
  const canPlace = !busy && missing.length === 0 && !slotProblem;

  const chooseInstrument = (code: string) => { setInstrumentCode(code); setDeckSlotId(''); setScan(null); setVia('manual'); };

  // Scanning the deck position's barcode fills the slot (and the instrument, if none is chosen).
  useEffect(() => {
    if (!scanArmed) return;
    const handler = (e: Event) => {
      const raw = ((e as CustomEvent).detail as { raw?: string } | undefined)?.raw;
      if (!raw) return;
      setScanArmed(false);
      const result = resolveDeckScan(raw, instruments, instrumentCode || undefined, rackType, allowed);
      setScan(result);
      if (result.problem && SCAN_ONLY_PROBLEMS.includes(result.problem)) return;
      setInstrumentCode(result.instrumentCode ?? '');
      setDeckSlotId(result.slotId ?? '');
      setVia('deckScan');
    };
    window.addEventListener('PATHSCRIBE_SCAN', handler);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', handler);
  }, [scanArmed, instruments, instrumentCode, rackType, allowed]);

  const place = async () => {
    if (!canPlace) return;
    setBusy(true);
    setError(null);
    const code = await onPlace({ instrumentCode, assayCode: assayCode || undefined, deckSlotId: deckSlotId || undefined, via });
    setBusy(false);
    if (code) setError(code);
  };
  const placeRef = useRef(place);
  placeRef.current = place;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'MOLECULAR_PLACE_RACK') void placeRef.current();
  }), []);

  const scanOnly = scan?.problem && SCAN_ONLY_PROBLEMS.includes(scan.problem) ? scan : null;
  // A scanned slot that isn't in the filtered list still shows, flagged, so the tech sees what was scanned.
  const flaggedSlot = deckSlotId && !slotOptions.some(sl => sl.id === deckSlotId) ? deckSlotId : null;

  return (
    <section className="ps-panel-box ps-mt-16 ps-rack-placement" aria-labelledby="rack-placement-title">
      <h2 id="rack-placement-title" className="ps-panel-title">{t('molecularRackLoadingPage.placement.title')}</h2>
      {rack.placement && (
        <p className="ps-rack-placed" role="status">
          {t(rack.placement.deckSlotId ? 'molecularRackLoadingPage.placement.placedSlot' : 'molecularRackLoadingPage.placement.placed', {
            instrument: rack.placement.instrumentCode, slot: rack.placement.deckSlotId,
            name: rack.placement.placedByUserName, when: formatDateTime(rack.placement.placedAt, i18n.language),
          })}
        </p>
      )}

      <div className="ps-rack-placement-grid">
        <div>
          <label className="ps-label" htmlFor="rack-instrument">{t('molecularRackLoadingPage.placement.instrument')}{star('instrument')}</label>
          <select id="rack-instrument" className="ps-input-dark" value={instrumentCode} onChange={e => chooseInstrument(e.target.value)}>
            <option value="">{t('molecularRackLoadingPage.placement.selectInstrument')}</option>
            {instruments.map(i => <option key={i.id} value={i.code}>{t('molecularPlateBuilderPage.instrumentOption', { name: i.name, code: i.code })}</option>)}
          </select>
        </div>
        <div>
          <label className="ps-label" htmlFor="rack-assay">{t('molecularRackLoadingPage.placement.assay')}{star('assay')}</label>
          <select id="rack-assay" className="ps-input-dark" value={assayCode} onChange={e => { setAssayCode(e.target.value); setScan(null); }}>
            <option value="">{t('molecularRackLoadingPage.placement.selectAssay')}</option>
            {assays.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {allowed?.length ? <div className="mb-field-hint">{t('molecularRackLoadingPage.placement.assaySlots', { slots: formatList(allowed, i18n.language) })}</div> : null}
        </div>
        <div>
          <label className="ps-label" htmlFor="rack-deck-slot">{t('molecularRackLoadingPage.placement.deckSlot')}{slotNeeded && star('deckSlot')}</label>
          <select
            id="rack-deck-slot"
            className={`ps-input-dark${slotProblem ? ' ps-rack-slot--invalid' : ''}`}
            value={deckSlotId}
            disabled={!instrument}
            onChange={e => { setDeckSlotId(e.target.value); setVia('manual'); setScan(null); }}
          >
            <option value="">{t('molecularRackLoadingPage.placement.selectSlot')}</option>
            {slotOptions.map(sl => (
              <option key={sl.id} value={sl.id}>
                {sl.deck ? t('molecularRackLoadingPage.placement.slotOnDeck', { slot: sl.id, deck: sl.deck }) : sl.id}
              </option>
            ))}
            {flaggedSlot && <option value={flaggedSlot}>{t('molecularRackLoadingPage.placement.slotFlagged', { slot: flaggedSlot })}</option>}
          </select>
          {instrument && !slotNeeded && (
            <div className="mb-field-hint">{t(slotOptions.length === 1 ? 'molecularRackLoadingPage.placement.singleSlot' : 'molecularRackLoadingPage.placement.noDeckLayout')}</div>
          )}
          {instrument && slotNeeded && slotOptions.length === 0 && (
            <div className="mb-field-hint">{t('molecularRackLoadingPage.placement.noSlotsForAssay')}</div>
          )}
        </div>
      </div>

      <button className={`ps-btn-small ps-mt-16${scanArmed ? ' ps-btn-small--armed' : ''}`} onClick={() => { setScanArmed(a => !a); setScan(null); }}>
        {scanArmed ? t('molecularRackLoadingPage.placement.waitingForDeckScan') : t('molecularRackLoadingPage.placement.scanDeck')}
      </button>

      {(slotProblem || scanOnly) && (
        <div className="ps-rack-slot-warning" role="alert">
          {slotProblem
            ? t(`molecularRackLoadingPage.placement.slotProblem.${slotProblem}`, { slot: deckSlotId, instrument: instrumentCode })
            : t(`molecularRackLoadingPage.placement.scanProblem.${scanOnly!.problem}`, { instrument: scanOnly!.instrumentCode ?? '', chosen: instrumentCode })}
        </div>
      )}
      {!slotProblem && !scanOnly && scan && via === 'deckScan' && (
        <p className="ps-rack-scan-ok" role="status">{t('molecularRackLoadingPage.placement.scanFilled', { instrument: instrumentCode, slot: deckSlotId })}</p>
      )}

      {missing.length > 0 && (
        <p className="ps-field-still-required" role="status">
          {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(f => t(`fieldRequirements.fields.molecularRack.${f}`)), i18n.language) })}
        </p>
      )}
      {error && <div className="ps-error-text" role="alert">{t(`molecularRackLoadingPage.errors.${error}`, { defaultValue: t('molecularRackLoadingPage.genericLoadError') })}</div>}

      <div className="ps-mt-16">
        <button className="ps-conf-btn-secondary" disabled={!canPlace} onClick={() => void place()}>
          {busy ? t('molecularRackLoadingPage.placement.placing') : t(rack.placement ? 'molecularRackLoadingPage.placement.movePlace' : 'molecularRackLoadingPage.placement.place')}
        </button>
      </div>
    </section>
  );
};

export default RackPlacementPanel;
