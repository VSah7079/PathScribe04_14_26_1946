// src/pages/MolecularBatchPage/MolecularRackLoadingPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up: "Implement the load into extraction
// rack workflow step (§5.1's secondary_rack stage)." The real, missing
// workflow step this module's own type system (Phase 8) already
// anticipated but nothing emitted: a tech scans a real specimen vial
// and places it at a real, specific position on a real extraction
// rack, ahead of eventual plate loading. This is that real step.
//
// Real, deliberate reuse: the same, already-established
// PATHSCRIBE_SCAN event and useCurrentScanStation()/getSessionUser()
// pattern the plate builder's own scan-to-well flow already uses — no
// second, competing scan mechanism, no separate station/user
// resolution logic.
//
// Batch 406 (Pete's required fields for Rack Loading, Field Requirements page
// "molecularRack"):
//   - Rack identifier / barcode: the physical rack's own barcode, scanned or
//     typed when the rack is created; left blank, one is generated.
//   - Sample ID for every occupied position: a tube typed in by hand now takes
//     its accession too, and a tube on the rack without one is flagged and can
//     be given one (click it).
//   - Instrument and deck slot: RackPlacementPanel (slot required only where
//     the instrument has more than one slot for a sample rack).
// Services come from @/services (off the deployment baseline); error codes are
// translated; accession numbers are tagged data-phi.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useNavigate, useParams } from 'react-router';
import '../../pathscribe.css';
import {
  molecularExtractionRackService, molecularAssayControlRuleService, scanStationService, equipmentService, stainTypeService,
  resolveMolecularMovementRecord, molecularActor, UNKNOWN_STATION_NAME, molecularAssayTypes, actionRegistryService,
  rackPositionsMissingSampleId, molecularRackFieldRequired,
  type Equipment, type MolecularExtractionRack, type MolecularAssayControlRule,
} from '@/services';
import { equipmentForPicker } from '@/services/equipment/equipmentRules';
import { getSessionUser } from '@/services/auth/caseAccessControl';
import type { StainType } from '@/services/stains/IStainService';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { useCurrentScanStation } from '@/hooks/useCurrentScanStation';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { formatList } from '@/utils/formatList';
import RackPlacementPanel, { type RackPlacementChoice } from './components/RackPlacementPanel';
import { LoadingState } from '@/components/Common/LoadingState';

const MolecularRackLoadingPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { rackId } = useParams<{ rackId: string }>();
  // Batch 495: this page never registered a breadcrumb (same gap fixed on
  // TumorBoardWorkspacePage/MarginExceptionReviewPage in Batch 492) — AppShell
  // only shows the breadcrumb bar once crumbs.length > 1.
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('molecularRackLoadingPage.pageTitle'), `/molecular-rack/${rackId}`); }, [pushCrumb, t, rackId]);
  const isNew = rackId === 'new';
  const requirements = useFieldRequirements('molecularRack');

  const [loading, setLoading] = useState(!isNew);
  const [rack, setRack] = useState<MolecularExtractionRack | null>(null);
  const [capacity, setCapacity] = useState(24);
  const [newRackBarcode, setNewRackBarcode] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [selectedPositionLabel, setSelectedPositionLabel] = useState<string | null>(null);
  const [armedForScan, setArmedForScan] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Molecular voice commands ("place rack") while this page is open.
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.MOLECULAR);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  const { stationId } = useCurrentScanStation();
  const [stationName, setStationName] = useState<string>(UNKNOWN_STATION_NAME);
  const [stationFacilityId, setStationFacilityId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!stationId) { setStationName(UNKNOWN_STATION_NAME); setStationFacilityId(undefined); return; }
    scanStationService.getById(stationId).then(res => { if (res.ok) { setStationName(res.data.name); setStationFacilityId(res.data.facilityId); } });
  }, [stationId]);

  // What the placement panel offers.
  const [instruments, setInstruments] = useState<Equipment[]>([]);
  const [assays, setAssays] = useState<StainType[]>([]);
  const [rules, setRules] = useState<MolecularAssayControlRule[]>([]);
  useEffect(() => {
    if (isNew) return;
    equipmentService.getActive('analyser').then(res => { if (res.ok) setInstruments(res.data); });
    stainTypeService.getAll().then(res => { if (res.ok) setAssays(molecularAssayTypes(res.data)); });
    molecularAssayControlRuleService.getAll().then(res => { if (res.ok) setRules(res.data); });
  }, [isNew]);
  const instrumentOptions = equipmentForPicker(instruments, { kind: 'analyser', preferredFacilityId: stationFacilityId });

  useEffect(() => {
    if (isNew || !rackId) return;
    molecularExtractionRackService.getById(rackId).then(res => {
      if (res.ok) setRack(res.data);
      setLoading(false);
    });
  }, [rackId, isNew]);

  useEffect(() => {
    if (!armedForScan || !selectedPositionLabel || !rack) return;
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { raw: string; matchedAccession?: string } | undefined;
      if (!detail?.raw) return;
      setArmedForScan(false);
      await loadSpecimenAtSelectedPosition(detail.raw, detail.matchedAccession);
    };
    window.addEventListener('PATHSCRIBE_SCAN', handler);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the handler reads only the armed position, rack and station (listed); re-subscribing on those is enough
  }, [armedForScan, selectedPositionLabel, rack, stationId, stationName]);

  // Real, per direct follow-up: "If the scan doesn't work, they need
  // a way to input the specimen manually." Real, shared core logic
  // — extracted so the manual path produces the exact same real
  // movement record and rack-loading outcome as a successful scan,
  // never a second, divergent code path.
  const loadSpecimenAtSelectedPosition = async (raw: string, accessionNumber?: string) => {
    if (!selectedPositionLabel || !rack) return;
    setLoadError(null);
    const movement = resolveMolecularMovementRecord(
      'primary_vial', 'secondary_rack', raw, `${rack.rackBarcode}:${selectedPositionLabel}`,
      { ...molecularActor(getSessionUser()), stationId: stationId ?? 'unknown', stationName },
    );
    const res = await molecularExtractionRackService.loadSpecimenIntoPosition(
      rack.id, selectedPositionLabel, { accessionNumber, containerBarcode: raw }, movement,
    );
    if (!res.ok) { setLoadError('error' in res ? res.error : 'generic'); return; }
    setRack(res.data);

    // Real, per the plate builder's own established pattern: auto-
    // advance to the next real, empty position so a tech can load a
    // whole rack of specimens in sequence without re-selecting each
    // time.
    const next = res.data.positions.find(p => !p.containerBarcode);
    if (next) { setSelectedPositionLabel(next.positionLabel); setArmedForScan(true); }
  };

  // Batch 406: manual entry takes the tube's accession too (Pete: every
  // occupied position has its sample ID).
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualEntryValue, setManualEntryValue] = useState('');
  const [manualAccession, setManualAccession] = useState('');
  const handleManualEntrySubmit = async () => {
    const trimmed = manualEntryValue.trim();
    if (!trimmed) return;
    await loadSpecimenAtSelectedPosition(trimmed, manualAccession.trim() || undefined);
    setManualEntryValue('');
    setManualAccession('');
    setManualEntryOpen(false);
  };

  // Batch 406: giving a tube already on the rack its accession.
  const [accessionDraft, setAccessionDraft] = useState('');
  const saveAccession = async () => {
    if (!rack || !selectedPositionLabel || !accessionDraft.trim()) return;
    const res = await molecularExtractionRackService.setPositionAccession(rack.id, selectedPositionLabel, accessionDraft);
    if (!res.ok) { setLoadError('error' in res ? res.error : 'generic'); return; }
    setRack(res.data);
    setAccessionDraft('');
    setSelectedPositionLabel(null);
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const actor = molecularActor(getSessionUser());
      const res = await molecularExtractionRackService.create({
        capacity, rackBarcode: newRackBarcode, createdByUserId: actor.byUserId, createdByUserName: actor.byUserName,
      });
      if (res.ok) navigate(`/molecular-rack/${res.data.id}`);
      else setCreateError('error' in res ? res.error : 'generic');
    } finally {
      setCreating(false);
    }
  };

  const placeRack = async (choice: RackPlacementChoice): Promise<string | null> => {
    if (!rack) return 'rackNotFound';
    const actor = molecularActor(getSessionUser());
    const res = await molecularExtractionRackService.placeOnDeck(rack.id, { ...choice, placedByUserId: actor.byUserId, placedByUserName: actor.byUserName }, requirements);
    if (!res.ok) return 'error' in res ? res.error : 'generic';
    setRack(res.data);
    return null;
  };

  const errorText = (code: string) => t(`molecularRackLoadingPage.errors.${code}`, { defaultValue: t('molecularRackLoadingPage.genericLoadError') });

  if (loading) return <LoadingState label={t('molecularRackLoadingPage.loading')} />;

  const unmapped = rack ? rackPositionsMissingSampleId(rack.positions) : [];
  const selected = rack?.positions.find(p => p.positionLabel === selectedPositionLabel);
  const selectedUnmapped = !!selected && unmapped.includes(selected.positionLabel);

  return (
    <div className="ps-app-root ps-page-container ps-page-container--narrow">
      <button className="ps-btn-small ps-back-btn" onClick={() => navigate('/molecular-rack')}>{t('molecularRackLoadingPage.backToRacks')}</button>

      {isNew && (
        <div className="ps-panel-box">
          <h1 className="ps-section-title">{t('molecularRackLoadingPage.newRackTitle')}</h1>
          <label className="ps-label" htmlFor="rack-barcode">
            {t('fieldRequirements.fields.molecularRack.rackBarcode')}
            {molecularRackFieldRequired(requirements, 'rackBarcode') && <span className="ps-conf-required"> *</span>}
          </label>
          <input id="rack-barcode" className="ps-input-dark" value={newRackBarcode} onChange={e => setNewRackBarcode(e.target.value)} placeholder={t('molecularRackLoadingPage.rackBarcodePlaceholder')} />
          <div className="mb-field-hint">{t('molecularRackLoadingPage.rackBarcodeHint')}</div>
          <label className="ps-label ps-mt-16" htmlFor="rack-capacity">{t('molecularRackLoadingPage.capacityLabel')}</label>
          <input id="rack-capacity" className="ps-input-dark" type="number" min={1} max={384} value={capacity} onChange={e => setCapacity(Number(e.target.value) || 1)} />
          {createError && <div className="ps-error-text ps-mt-16" role="alert">{errorText(createError)}</div>}
          <div className="ps-mt-16">
            <button className="ps-conf-btn-secondary" disabled={creating} onClick={handleCreate}>{creating ? t('molecularRackLoadingPage.creating') : t('molecularRackLoadingPage.createRack')}</button>
          </div>
        </div>
      )}

      {!isNew && rack && (
        <>
          <h1 className="ps-section-title">{rack.rackBarcode}</h1>
          <p className="ps-helper-text ps-rack-loading-help">
            {t('molecularRackLoadingPage.helperText')}
          </p>
          {loadError && <div className="ps-error-text" role="alert">{errorText(loadError)}</div>}
          {unmapped.length > 0 && (
            <p className="ps-field-still-required" role="status">
              {t('molecularRackLoadingPage.positionsMissingSampleId', { positions: formatList(unmapped, i18n.language) })}
            </p>
          )}
          <div className="ps-rack-position-grid">
            {rack.positions.map(p => {
              const isSelected = p.positionLabel === selectedPositionLabel;
              const occupied = !!p.containerBarcode;
              const needsId = occupied && unmapped.includes(p.positionLabel);
              return (
                <button
                  key={p.positionLabel}
                  data-phi={p.accessionNumber ? 'accession' : undefined}
                  onClick={() => (!occupied || needsId) && setSelectedPositionLabel(p.positionLabel)}
                  title={occupied
                    ? (p.accessionNumber
                      ? t('molecularRackLoadingPage.positionTube', { position: p.positionLabel, barcode: p.containerBarcode, accession: p.accessionNumber })
                      : t('molecularRackLoadingPage.positionNeedsSampleId', { position: p.positionLabel, barcode: p.containerBarcode }))
                    : t('molecularRackLoadingPage.positionEmpty', { position: p.positionLabel })}
                  className={`ps-rack-position${occupied ? ' ps-rack-position--occupied' : ''}${needsId ? ' ps-rack-position--unmapped' : ''}${isSelected ? ' ps-rack-position--selected' : ''}`}>
                  {p.positionLabel}
                </button>
              );
            })}
          </div>

          {selected && selectedUnmapped && (
            <div className="ps-mt-16 ps-flex-row-gap-8">
              <label className="ps-label ps-label-inline" htmlFor="rack-accession">
                {t('molecularRackLoadingPage.accessionFor', { position: selected.positionLabel, barcode: selected.containerBarcode })}
                <span className="ps-conf-required"> *</span>
              </label>
              <input id="rack-accession" className="ps-input" data-phi="accession" autoFocus value={accessionDraft}
                placeholder={t('molecularRackLoadingPage.accessionPlaceholder')}
                onChange={e => setAccessionDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveAccession(); }} />
              <button className="ps-btn-small" disabled={!accessionDraft.trim()} onClick={() => void saveAccession()}>{t('molecularRackLoadingPage.saveAccession')}</button>
            </div>
          )}

          {selected && !selected.containerBarcode && (
            <>
              <button className={`ps-btn-small ps-mt-16${armedForScan ? ' ps-btn-small--armed' : ''}`} onClick={() => setArmedForScan(a => !a)}>
                {armedForScan ? t('molecularRackLoadingPage.waitingForScan', { position: selected.positionLabel }) : t('molecularRackLoadingPage.scanIntoPosition', { position: selected.positionLabel })}
              </button>
              {!manualEntryOpen ? (
                <button className="ps-btn-small ps-mt-16" onClick={() => setManualEntryOpen(true)}>
                  {t('molecularRackLoadingPage.manualEntryPrompt')}
                </button>
              ) : (
                <div className="ps-mt-16 ps-flex-row-gap-8">
                  <input
                    className="ps-input"
                    autoFocus
                    aria-label={t('molecularRackLoadingPage.manualEntryPlaceholder')}
                    placeholder={t('molecularRackLoadingPage.manualEntryPlaceholder')}
                    value={manualEntryValue}
                    onChange={e => setManualEntryValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void handleManualEntrySubmit(); }}
                  />
                  <input
                    className="ps-input"
                    data-phi="accession"
                    aria-label={t('molecularRackLoadingPage.accessionPlaceholder')}
                    placeholder={t('molecularRackLoadingPage.accessionPlaceholder')}
                    value={manualAccession}
                    onChange={e => setManualAccession(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void handleManualEntrySubmit(); }}
                  />
                  <button className="ps-btn-small" onClick={() => void handleManualEntrySubmit()} disabled={!manualEntryValue.trim()}>{t('molecularRackLoadingPage.load')}</button>
                  <button className="ps-btn-small" onClick={() => { setManualEntryOpen(false); setManualEntryValue(''); setManualAccession(''); }}>{t('molecularRackLoadingPage.cancel')}</button>
                </div>
              )}
            </>
          )}

          <RackPlacementPanel
            key={rack.placement?.placedAt ?? 'unplaced'}
            rack={rack}
            instruments={instrumentOptions}
            assays={assays}
            rules={rules}
            requirements={requirements}
            onPlace={placeRack}
          />
        </>
      )}
    </div>
  );
};

export default MolecularRackLoadingPage;
