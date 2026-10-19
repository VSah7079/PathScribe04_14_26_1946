// src/pages/MolecularBatchPage/MolecularPlateBuilderPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up ("Continue with the plate/well layout
// UI") — Phase 2 of the given "Full Molecular Testing Execution
// Module" specification, §3.1/§3.2.
//
// Real, deliberate scope for this phase: full batch creation +
// plate/well editing for a NEW batch. An already-created batch opens
// in a real, view-only mode here — editing a batch's own plate layout
// after creation (re-gating, re-validating in-flight wells) is a real,
// separate concern not attempted in this phase.
//
// Real, deliberate reuse: scan-to-well listens to the same real,
// global PATHSCRIBE_SCAN event this app's own ScannerProvider already
// dispatches (contexts/ScannerProvider.tsx) — no second, competing
// scan-detection mechanism.
//
// Real, honest "Auto-populate" scope: this app has no real, existing
// worklist of pending specimens to pull from for this feature yet
// (that integration is real, separate, later work) — so auto-populate
// marks the next N empty wells as PATIENT_SPECIMEN in the requested
// fill order, ready for a tech to scan each real specimen into its
// own designated well afterward — matching the real, physical lab
// workflow (decide the layout, then scan specimens in) rather than
// fabricating specimen data that was never actually scanned.
//
// Batch 405 (PS-359): Create follows the organisation's Field Requirements
// (page "molecularBatch", services/fieldRequirements/molecularBatchChecks.ts).
// The assay, instrument and each control well's lot and expiry stay locked;
// every patient well must name its specimen (new, locked, Pete). The deck
// slot, a reagent lot and each patient well's volume are switches. Required
// labels are starred, "Still required" lists what is missing (and which
// patient wells), and Create stays off until it is complete. Clone &
// Supersede needs molecular:batch:supersede (checked in the service). "create
// plate" by voice (MOLECULAR_CREATE_PLATE) does what Create does. Reagent
// components and gating reasons are translated, and the services come from
// @/services (off the deployment baseline).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useNavigate, useParams } from 'react-router';
import '../../pathscribe.css';
import { resolveMolecularReagentLotGating } from '../../services/molecular/resolveMolecularReagentLotGating';
import { resolveMolecularControlRequirementValidation } from '../../services/molecular/resolveMolecularControlRequirementValidation';
import { emptyPlateWells, autoPopulatePlateWells, plateGridWells, plateWellTitle } from '../../services/molecular/plateBuilderWells';
import {
  MOLECULAR_PLATE_LAYOUTS, MOLECULAR_REAGENT_COMPONENT_TYPES, MOLECULAR_SAMPLE_TYPES,
} from '../../services/molecular/IMolecularBatchService';
import type {
  MolecularBatch, MolecularPlateLayout, MolecularReagentLot, MolecularWell, MolecularSampleType,
  MolecularReagentComponentType, NewMolecularBatch, MolecularMovementLevel,
} from '../../services/molecular/IMolecularBatchService';
import { getSessionUser } from '../../services/auth/caseAccessControl';
import type { MolecularAssayControlRule } from '../../services/molecular/IMolecularAssayControlRuleService';
import { printMolecularSpecimenLabels, printMolecularPlateLabel, printMolecularDeckLocationLabel } from '../../utils/labels/printMolecularLabels';
import { useCurrentScanStation } from '../../hooks/useCurrentScanStation';
import {
  equipmentService, equipmentLogService, type Equipment, type EquipmentLogEntry,
  molecularBatchService, molecularAssayControlRuleService, scanStationService, molecularExtractionRackService, stainTypeService,
  actionRegistryService, slotsForRack, molecularActor, molecularCreateMissing, molecularWellsMissingSpecimen, molecularSupersedeMissing, molecularFieldRequired,
} from '../../services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { equipmentForPicker } from '../../services/equipment/equipmentRules';
import { isServiceAlert, serviceStatesById } from '../../services/equipment/equipmentLogRules';
import { useSystemConfig } from '@/contexts/SystemConfigContext';
import { getFacilityIsoDate } from '../../utils/facilityTime';
import { MOLECULAR_BATCH_INSTRUMENT_UNAVAILABLE, MOLECULAR_BATCH_WELL_SPECIMEN_MISSING, MOLECULAR_BATCH_NOT_PERMITTED, MOLECULAR_BATCH_DECK_SLOT_INVALID } from '../../services/molecular/IMolecularBatchService';
import { formatList } from '../../utils/formatList';
import { formatDateTime } from '../../utils/formatDate';
import { workcenterTabForStatus } from '../MolecularWorkcenterPage/MolecularWorkcenterPage';
import { resolvePlateWellScan, applyPlateWellScan, nextUnscannedSpecimenWell } from '../../services/molecular/plateWellScan';
import { resolveMolecularHistoricalTrace } from '../../services/molecular/resolveMolecularHistoricalTrace';
import { dispatchMolecularWorklist } from '../../services/molecular/dispatchMolecularWorklist';
import { canStartMolecularDispatch, canConfirmMolecularDispatch, molecularDispatchFeedback } from '../../services/molecular/molecularDispatchPanel';
import type { StainType } from '../../services/stains/IStainService';
import { pressable } from '@/utils/a11y/pressable';
import { LoadingState } from '@/components/Common/LoadingState';

const SAMPLE_TYPE_COLOR: Record<MolecularSampleType, string> = {
  CONTROL_NTC: '#ef4444', CONTROL_PTC_HIGH: '#10B981', CONTROL_PTC_LOW: '#65A30D',
  CALIBRATOR: '#8B5CF6', PATIENT_SPECIMEN: '#38bdf8',
};
// Real label-key-map — MolecularSampleType itself (used for color
// indexing/filtering/backend) stays untouched; only the displayed
// label is resolved via i18n, at render time.
const SAMPLE_TYPE_LABEL_KEY: Record<MolecularSampleType, string> = {
  CONTROL_NTC: 'molecularPlateBuilderPage.sampleType.CONTROL_NTC',
  CONTROL_PTC_HIGH: 'molecularPlateBuilderPage.sampleType.CONTROL_PTC_HIGH',
  CONTROL_PTC_LOW: 'molecularPlateBuilderPage.sampleType.CONTROL_PTC_LOW',
  CALIBRATOR: 'molecularPlateBuilderPage.sampleType.CALIBRATOR',
  PATIENT_SPECIMEN: 'molecularPlateBuilderPage.sampleType.PATIENT_SPECIMEN',
};
const MOVEMENT_LEVEL_LABEL_KEY: Record<MolecularMovementLevel, string> = {
  primary_vial:   'molecularPlateBuilderPage.movementLevel.primary_vial',
  secondary_rack: 'molecularPlateBuilderPage.movementLevel.secondary_rack',
  plate_well:     'molecularPlateBuilderPage.movementLevel.plate_well',
};

const PLATE_LAYOUT_LABEL_KEY: Record<MolecularPlateLayout, string> = {
  '8_strip': 'molecularPlateBuilderPage.plateLayout.8_strip',
  '12_strip': 'molecularPlateBuilderPage.plateLayout.12_strip',
  '6_well': 'molecularPlateBuilderPage.plateLayout.6_well',
  '12_well': 'molecularPlateBuilderPage.plateLayout.12_well',
  '24_well': 'molecularPlateBuilderPage.plateLayout.24_well',
  '48_well': 'molecularPlateBuilderPage.plateLayout.48_well',
  '96_well': 'molecularPlateBuilderPage.plateLayout.96_well',
  '384_well': 'molecularPlateBuilderPage.plateLayout.384_well',
  '1536_well': 'molecularPlateBuilderPage.plateLayout.1536_well',
};

const MolecularPlateBuilderPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  // Batch 495: this page never registered a breadcrumb (same gap fixed on
  // TumorBoardWorkspacePage/MarginExceptionReviewPage in Batch 492) — AppShell
  // only shows the breadcrumb bar once crumbs.length > 1.
  const { pushCrumb } = useBreadcrumb();
  useEffect(() => { pushCrumb(t('molecularPlateBuilderPage.pageTitle'), `/molecular-batch/${batchId}`); }, [pushCrumb, t, batchId]);
  const isNew = batchId === 'new';
  const requirements = useFieldRequirements('molecularBatch');
  const star = (fieldId: string) => molecularFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;
  const stillRequired = (ids: string[]) => ids.length > 0 && (
    <p className="ps-field-still-required" role="status">
      {t('fieldRequirements.stillRequired', { fields: formatList(ids.map(id => t(`fieldRequirements.fields.molecularBatch.${id}`)), i18n.language) })}
    </p>
  );

  // Batch 405: this page has its own voice/keyboard context ("create plate").
  useEffect(() => {
    actionRegistryService.setCurrentContext(VOICE_CONTEXT.MOLECULAR);
    return () => { actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); };
  }, []);

  const [loading, setLoading] = useState(!isNew);
  const [existingBatch, setExistingBatch] = useState<MolecularBatch | null>(null);

  const [assayCode, setAssayCode] = useState('');
  const [assayName, setAssayName] = useState('');
  // Real, per direct follow-up ("wouldn't we use the existing process
  // catalog to define the assays?") — the real, existing Diagnostic
  // Catalog's own Molecular-category entries; assayName above is now
  // derived from the selected entry's own real name, never
  // independently typed.
  const [molecularAssayTypes, setMolecularAssayTypes] = useState<StainType[]>([]);
  useEffect(() => {
    stainTypeService.getAll().then(res => {
      if (res.ok) setMolecularAssayTypes(res.data.filter(at => at.category === 'Molecular' && at.active));
    });
  }, []);
  const [targetInstrumentId, setTargetInstrumentId] = useState('');
  // Batch 356 (PS-326): the target instrument is picked from the register's
  // active analysers (Batch 358), this station's lab first. It used to be free text.
  const [instruments, setInstruments] = useState<Equipment[]>([]);
  // Batch 361: an analyser with an open malfunction or past due is shown in
  // red here, and named under the picker when chosen. Flagged, not blocked.
  const [instrumentLog, setInstrumentLog] = useState<EquipmentLogEntry[]>([]);
  const { config: systemConfig } = useSystemConfig();
  useEffect(() => {
    equipmentService.getActive('analyser').then(res => { if (res.ok) setInstruments(res.data); });
    equipmentLogService.list().then(res => { if (res.ok) setInstrumentLog(res.data); });
  }, []);
  const [deckSlot, setDeckSlot] = useState('');
  const [plateLayout, setPlateLayout] = useState<MolecularPlateLayout>('96_well');
  const [reagentLots, setReagentLots] = useState<MolecularReagentLot[]>([]);
  // Real, per the given specification's own §3.2 "Dynamic Control
  // Rules"/"Position Enforcements" — fetched once, since real,
  // admin-defined rules don't change per keystroke the way this
  // page's own live reagent-lot gating already reacts to.
  const [controlRules, setControlRules] = useState<MolecularAssayControlRule[]>([]);
  useEffect(() => {
    molecularAssayControlRuleService.getAll().then(res => { if (res.ok) setControlRules(res.data); });
  }, []);
  const [wells, setWells] = useState<MolecularWell[]>(() => emptyPlateWells('96_well'));
  const [selectedWellPos, setSelectedWellPos] = useState<string | null>(null);
  const [armedForScan, setArmedForScan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expandedTraceWellPos, setExpandedTraceWellPos] = useState<string | null>(null);
  const [dispatchPanelOpen, setDispatchPanelOpen] = useState(false);
  const [scannedPlateBarcode, setScannedPlateBarcode] = useState<string | undefined>(undefined);
  const [scannedDeckLocationLabel, setScannedDeckLocationLabel] = useState<string | undefined>(undefined);
  const [armedDispatchScanTarget, setArmedDispatchScanTarget] = useState<'plate' | 'deck' | null>(null);
  // Real bug fix, found while converting: this used to be a single
  // `dispatchResultMessage: string | null`, with the success/failure
  // color decided by string-matching the *displayed* text
  // (`.startsWith('Worklist dispatched')`) — which only worked because
  // that text was a hardcoded English literal. Once the success
  // message is translated, that match would silently break in every
  // other locale. Tracking success as its own boolean fixes this.
  const [dispatchResult, setDispatchResult] = useState<{ message: string; success: boolean } | null>(null);
  // Real, per direct guidance on Clone & Supersede over live-editing
  // an already-created batch — see molecularBatchService.ts's own
  // cloneAndSupersede() header for the full architectural reasoning.
  const [clonePanelOpen, setClonePanelOpen] = useState(false);
  const [cloneReason, setCloneReason] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneResultMessage, setCloneResultMessage] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);

  // Real, per this file's own header (§5.1): the real, already-
  // established, sticky, per-device scan station (useCurrentScanStation.ts)
  // — never a station typed or guessed per scan.
  const { stationId } = useCurrentScanStation();
  const [stationName, setStationName] = useState<string>('Unknown Station');
  const [stationFacilityId, setStationFacilityId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!stationId) { setStationName('Unknown Station'); setStationFacilityId(undefined); return; }
    scanStationService.getById(stationId).then(res => { if (res.ok) { setStationName(res.data.name); setStationFacilityId(res.data.facilityId); } });
  }, [stationId]);
  const instrumentOptions = equipmentForPicker(instruments, { kind: 'analyser', preferredFacilityId: stationFacilityId });
  const instrumentStates = serviceStatesById(instruments, instrumentLog, getFacilityIsoDate(new Date(), systemConfig.facilityTimezone));
  const selectedInstrument = instrumentOptions.find(i => i.code === targetInstrumentId);
  const selectedInstrumentState = selectedInstrument ? instrumentStates.get(selectedInstrument.id) : undefined;
  const plateSlots = slotsForRack(selectedInstrument, 'extraction_plate');
  const selectedInstrumentAlert = selectedInstrumentState && isServiceAlert(selectedInstrumentState) ? selectedInstrumentState : undefined;

  useEffect(() => {
    if (isNew || !batchId) return;
    molecularBatchService.getById(batchId).then(res => {
      if (res.ok) setExistingBatch(res.data);
      setLoading(false);
    });
  }, [batchId, isNew]);

  // Real, per this file's own header: listens to the same real, global
  // scan event this app's own ScannerProvider already dispatches — no
  // second, competing scan mechanism.
  useEffect(() => {
    if (!armedForScan || !selectedWellPos) return;
    const handler = async (e: Event) => {
      const detail = (e as CustomEvent).detail as { raw: string; matchedAccession?: string } | undefined;
      if (!detail?.raw) return;
      await assignSpecimenToWell(detail.raw, detail.matchedAccession);
    };
    window.addEventListener('PATHSCRIBE_SCAN', handler);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the handler reads only the armed well, station and plate through functional updates; re-subscribing on those is enough
  }, [armedForScan, selectedWellPos, stationId, stationName]);

  // Real, per direct follow-up: "If the scan doesn't work, they need
  // a way to input the specimen manually." Confirmed directly before
  // building this — no fallback existed when a barcode is damaged,
  // unreadable, or a scanner malfunctions. Real, shared core logic —
  // extracted so the manual path produces the exact same real rack-
  // lookup, movement-record, and well-assignment outcome as a
  // successful scan, never a second, divergent code path.
  const assignSpecimenToWell = async (raw: string, matchedAccession?: string) => {
    if (!selectedWellPos) return;
    // PS-235 (Batch 450): who/where, rack lookup, the movement record and the
    // well update are decided in services/molecular/plateWellScan.ts.
    const scan = await resolvePlateWellScan(
      raw, selectedWellPos, { session: getSessionUser(), stationId, stationName },
      { rackService: molecularExtractionRackService },
    );
    setWells(prev => applyPlateWellScan(prev, selectedWellPos, raw, matchedAccession, scan));
    setArmedForScan(false);
    // Real, per this file's own header: auto-advance to the next
    // empty PATIENT_SPECIMEN well, so a tech can scan a whole rack of
    // specimens in sequence without re-selecting a well each time.
    setWells(prev => {
      const next = nextUnscannedSpecimenWell(prev, selectedWellPos);
      if (next) { setSelectedWellPos(next.wellPosition); setArmedForScan(true); }
      return prev;
    });
  };

  const [manualWellEntryOpen, setManualWellEntryOpen] = useState(false);
  const [manualWellEntryValue, setManualWellEntryValue] = useState('');
  const handleManualWellEntrySubmit = async () => {
    const trimmed = manualWellEntryValue.trim();
    if (!trimmed) return;
    // Real, honest posture: a manually-typed barcode has no real
    // accession auto-match the way a real scan's own resolution
    // pipeline (ScannerProvider) provides — left undefined, same as
    // any other real, unmatched scan.
    await assignSpecimenToWell(trimmed, undefined);
    setManualWellEntryValue('');
    setManualWellEntryOpen(false);
  };

  // Real, per the given specification's own §3.4 "Scan-to-Verify
  // Workflow" — a real, separate scan listener for dispatch
  // verification, distinct from the well-scanning listener above
  // (different context: verifying the plate/deck location, not
  // assigning a specimen to a well). Same real, established
  // PATHSCRIBE_SCAN event, no second scan mechanism.
  useEffect(() => {
    if (!armedDispatchScanTarget) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { raw: string } | undefined;
      if (!detail?.raw) return;
      if (armedDispatchScanTarget === 'plate') setScannedPlateBarcode(detail.raw);
      else setScannedDeckLocationLabel(detail.raw);
      setArmedDispatchScanTarget(null);
    };
    window.addEventListener('PATHSCRIBE_SCAN', handler);
    return () => window.removeEventListener('PATHSCRIBE_SCAN', handler);
  }, [armedDispatchScanTarget]);

  const handleDispatchWorklist = async () => {
    if (!existingBatch) return;
    setDispatching(true);
    setDispatchResult(null);
    try {
      const result = await dispatchMolecularWorklist(existingBatch, scannedPlateBarcode, scannedDeckLocationLabel, getSessionUser(), stationId);
      // PS-236 (Batch 450): the outcome is decided in services/molecular/molecularDispatchPanel.ts.
      const feedback = molecularDispatchFeedback(result);
      if (!('verificationFailures' in feedback) && !('reason' in feedback)) {
        setDispatchResult({ message: t('molecularPlateBuilderPage.dispatchSuccess'), success: true });
        const refreshed = await molecularBatchService.getById(existingBatch.id);
        if (refreshed.ok) setExistingBatch(refreshed.data);
        setDispatchPanelOpen(false);
      } else {
        // Batch 356: scan-check failures are shown in the user's language.
        setDispatchResult({
          message: 'verificationFailures' in feedback
            ? t('molecularPlateBuilderPage.scanVerificationFailed', { list: formatList(feedback.verificationFailures.map(f => t(`molecularPlateBuilderPage.scanFailure.${f}`)), i18n.language) })
            : feedback.reason,
          success: false,
        });
      }
    } finally {
      setDispatching(false);
    }
  };

  const handleCloneAndSupersede = async () => {
    if (!existingBatch || molecularSupersedeMissing(cloneReason, requirements).length > 0) return;
    setCloning(true);
    setCloneResultMessage(null);
    try {
      const session = getSessionUser();
      const byUserId = session?.id ?? 'unknown';
      const byUserName = session ? `${session.firstName ?? ''} ${session.lastName ?? ''}`.trim() || session.id : 'Unknown User';
      const result = await molecularBatchService.cloneAndSupersede(existingBatch.id, cloneReason, byUserId, byUserName);
      if (result.ok) {
        // Real, per this action's own real purpose — this batch is
        // now a real, terminal, superseded record; the real, live
        // work continues on its own real, new clone.
        navigate(`/molecular-batch/${result.data.id}`);
      } else {
        setCloneResultMessage('error' in result && result.error === MOLECULAR_BATCH_NOT_PERMITTED
          ? t('molecularPlateBuilderPage.supersedeNotPermitted')
          : 'error' in result ? result.error : t('molecularPlateBuilderPage.genericCloneError'));
      }
    } finally {
      setCloning(false);
    }
  };

  const handleLayoutChange = (layout: MolecularPlateLayout) => {
    setPlateLayout(layout);
    setWells(emptyPlateWells(layout));
    setSelectedWellPos(null);
  };

  const addReagentLot = () => {
    setReagentLots(prev => [...prev, { componentType: 'MASTER_MIX', lotNumber: '', expirationDate: '', qcStatus: 'pending' }]);
  };
  const updateReagentLot = (index: number, changes: Partial<MolecularReagentLot>) => {
    setReagentLots(prev => prev.map((lot, i) => (i === index ? { ...lot, ...changes } : lot)));
  };
  const removeReagentLot = (index: number) => setReagentLots(prev => prev.filter((_, i) => i !== index));

  const updateWell = (position: string, changes: Partial<MolecularWell>) => {
    setWells(prev => prev.map(w => (w.wellPosition === position ? { ...w, ...changes } : w)));
  };

  // PS-229 (Batch 451): decided in services/molecular/plateBuilderWells.ts.
  const handleAutoPopulate = (order: 'row_major' | 'column_major') => {
    setWells(prev => autoPopulatePlateWells(prev, plateLayout, order));
  };

  const gating = resolveMolecularReagentLotGating(reagentLots, wells);
  const controlCheck = resolveMolecularControlRequirementValidation(assayCode.trim(), wells, controlRules);
  const selectedWell = wells.find(w => w.wellPosition === selectedWellPos);
  const dims = MOLECULAR_PLATE_LAYOUTS[plateLayout];

  const assignedWells = wells.filter(w => w.sampleType !== undefined);
  const createMissing = molecularCreateMissing({ assayCode, assayName, targetInstrumentId, deckSlot, reagentLots, wells: assignedWells }, requirements);
  const wellsWithoutSpecimen = molecularWellsMissingSpecimen(assignedWells);
  const canCreate = createMissing.length === 0 && gating.allowed && controlCheck.satisfied;

  const handleCreate = async () => {
    const session = getSessionUser();
    setSaveError(null);
    if (!canCreate) return;
    setSaving(true);
    try {
      const newBatch: NewMolecularBatch = {
        assayCode: assayCode.trim(), assayName: assayName.trim(), targetInstrumentId: targetInstrumentId.trim(),
        deckSlot: deckSlot.trim() || undefined, plateLayout, reagentLots,
        wells: wells.filter(w => w.sampleType !== undefined),
        createdByUserId: molecularActor(session).byUserId, createdByUserName: molecularActor(session).byUserName,
      };
      const res = await molecularBatchService.create(newBatch);
      if ('error' in res) {
        setSaveError(res.error === MOLECULAR_BATCH_INSTRUMENT_UNAVAILABLE ? t('molecularPlateBuilderPage.instrumentUnavailableError')
          : res.error === MOLECULAR_BATCH_WELL_SPECIMEN_MISSING ? t('molecularPlateBuilderPage.wellsMissingSpecimen', { wells: formatList(wellsWithoutSpecimen, i18n.language) })
          : res.error === MOLECULAR_BATCH_DECK_SLOT_INVALID ? t('molecularPlateBuilderPage.deckSlotInvalid', { slot: deckSlot.trim(), instrument: targetInstrumentId })
          : res.error);
        return;
      }
      navigate(`/molecular-batch/${res.data.id}`);
    } finally {
      setSaving(false);
    }
  };

  const createRef = React.useRef(handleCreate);
  createRef.current = handleCreate;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'MOLECULAR_CREATE_PLATE' && isNew) void createRef.current();
  }), [isNew]);

  if (loading) return <LoadingState label={t('molecularPlateBuilderPage.loading')} />;

  // Batch 451: drawn by grid position (plateGridWells), not list order.
  const displayWells = existingBatch ? plateGridWells(existingBatch.wells, existingBatch.plateLayout) : plateGridWells(wells, plateLayout);
  const displayDims = existingBatch ? MOLECULAR_PLATE_LAYOUTS[existingBatch.plateLayout] : dims;
  const readOnly = !isNew;

  return (
    <div className="ps-app-root ps-page-container ps-page-container--wide">
      <button className="ps-btn-small ps-back-btn" onClick={() => navigate(`/molecular${existingBatch ? `?tab=${workcenterTabForStatus(existingBatch.status)}` : ''}`)}>{t('molecularPlateBuilderPage.backToBatches')}</button>
      <div className="mb-header-row">
        <h1 className="mb-title">
          {isNew ? t('molecularPlateBuilderPage.newBatchTitle') : `${existingBatch?.batchBarcode} — ${existingBatch?.assayName}`}
        </h1>
        {existingBatch && (
          <div className="ps-flex-row-gap-8">
            <button className="ps-btn-small" onClick={() => printMolecularPlateLabel(existingBatch)}>{t('molecularPlateBuilderPage.plateLabel')}</button>
            <button className="ps-btn-small" onClick={() => printMolecularDeckLocationLabel(existingBatch)}>{t('molecularPlateBuilderPage.deckLocationLabel')}</button>
            <button className="ps-btn-small" onClick={() => printMolecularSpecimenLabels(existingBatch)}>{t('molecularPlateBuilderPage.specimenLabels')}</button>
            {canStartMolecularDispatch(existingBatch) && (
              <button className="ps-btn-small" onClick={() => setDispatchPanelOpen(o => !o)}>{t('molecularPlateBuilderPage.dispatchWorklist')}</button>
            )}
            {existingBatch.status !== 'superseded' && (
              <button className="ps-btn-small" onClick={() => setClonePanelOpen(o => !o)}>{t('molecularPlateBuilderPage.cloneAndSupersede')}</button>
            )}
          </div>
        )}
      </div>

      {/* Real, per direct guidance on Clone & Supersede — a real,
          terminal batch always shows which real batch replaced it,
          rather than silently going stale with no forward pointer. */}
      {existingBatch?.supersededByBatchId && (
        <div className="mb-banner mb-banner--warning ps-mb-20">
          {t('molecularPlateBuilderPage.supersededBanner', {
            date: formatDateTime(existingBatch.supersededAt, i18n.language),
            name: existingBatch.supersededByUserName,
            reason: existingBatch.supersededReason,
          })} <span className="mb-link" {...pressable(() => navigate(`/molecular-batch/${existingBatch.supersededByBatchId}`))}>{t('molecularPlateBuilderPage.viewReplacementBatch')}</span>
        </div>
      )}
      {/* Real, per the same guidance — a clone always shows which
          batch it was cloned from, closing the 1:1 audit trail in
          both directions. Real copy cleanup found while converting:
          this banner and the one above both had the code comments'
          own "real, " rhetorical qualifier bleeding into actual
          user-facing copy ("a real clone of a superseded, earlier
          batch", "the real, replacement batch") — cleaned up to
          plain English before translating, so it isn't carried into
          every locale. */}
      {existingBatch?.clonedFromBatchId && (() => {
        const linkText = t('molecularPlateBuilderPage.supersededEarlierBatch');
        const full = t('molecularPlateBuilderPage.clonedFromBanner', { link: linkText });
        const idx = full.indexOf(linkText);
        return (
          <div className="mb-banner mb-banner--info ps-mb-20">
            🧬 {idx === -1 ? full : (
              <>
                {full.slice(0, idx)}
                <span className="mb-link" {...pressable(() => navigate(`/molecular-batch/${existingBatch.clonedFromBatchId}`))}>{linkText}</span>
                {full.slice(idx + linkText.length)}
              </>
            )}
          </div>
        );
      })()}

      {existingBatch?.worklistDispatchedAt && (
        <div className="mb-banner mb-banner--success ps-mb-20">
          {t('molecularPlateBuilderPage.worklistDispatchedAt', { date: formatDateTime(existingBatch.worklistDispatchedAt, i18n.language) })}
        </div>
      )}

      {existingBatch && clonePanelOpen && (
        <div className="mb-panel ps-mb-20">
          <h3 className="ps-panel-title">{t('molecularPlateBuilderPage.clonePanelTitle')}</h3>
          <p className="ps-helper-text ps-panel-title">
            {t('molecularPlateBuilderPage.clonePanelDescription')}
          </p>
          <label className="ps-label" htmlFor="mb-clone-reason">{t('molecularPlateBuilderPage.reasonLabel')}{star('supersedeReason')}</label>
          <textarea
            id="mb-clone-reason"
            className="ps-input-dark mb-textarea"
            value={cloneReason}
            onChange={e => setCloneReason(e.target.value)}
            placeholder={t('molecularPlateBuilderPage.reasonPlaceholder')}
          />
          {stillRequired(molecularSupersedeMissing(cloneReason, requirements))}
          {cloneResultMessage && (
            <div className="ps-error-text">{cloneResultMessage}</div>
          )}
          <CapabilityButton capability="molecular:batch:supersede" className="ps-conf-btn-secondary"
            disabled={cloning || molecularSupersedeMissing(cloneReason, requirements).length > 0} onClick={() => { void handleCloneAndSupersede(); }}>
            {cloning ? t('molecularPlateBuilderPage.cloning') : t('molecularPlateBuilderPage.confirmCloneAndSupersede')}
          </CapabilityButton>
        </div>
      )}

      {existingBatch && dispatchPanelOpen && (
        <div className="mb-panel ps-mb-20">
          <h3 className="ps-panel-title">{t('molecularPlateBuilderPage.dispatchPanelTitle')}</h3>
          <p className="ps-helper-text ps-panel-title">
            {t('molecularPlateBuilderPage.dispatchPanelDescription')}
          </p>
          <div className="mb-flex-gap-20-wrap">
            <div>
              <label className="ps-label">{t('molecularPlateBuilderPage.plateBarcodeLabel')}</label>
              <div className="ps-flex-row-gap-8">
                <span className="ps-fs-12">{scannedPlateBarcode ?? t('molecularPlateBuilderPage.notScanned')}</span>
                <button className={`ps-btn-small${armedDispatchScanTarget === 'plate' ? ' ps-btn-small--armed' : ''}`} onClick={() => setArmedDispatchScanTarget('plate')}>
                  {armedDispatchScanTarget === 'plate' ? t('molecularPlateBuilderPage.waitingScan') : t('molecularPlateBuilderPage.scan')}
                </button>
              </div>
            </div>
            <div>
              <label className="ps-label">{t('molecularPlateBuilderPage.deckLocationBarcodeLabel')}</label>
              <div className="ps-flex-row-gap-8">
                <span className="ps-fs-12">{scannedDeckLocationLabel ?? t('molecularPlateBuilderPage.notScanned')}</span>
                <button className={`ps-btn-small${armedDispatchScanTarget === 'deck' ? ' ps-btn-small--armed' : ''}`} onClick={() => setArmedDispatchScanTarget('deck')}>
                  {armedDispatchScanTarget === 'deck' ? t('molecularPlateBuilderPage.waitingScan') : t('molecularPlateBuilderPage.scan')}
                </button>
              </div>
            </div>
          </div>
          {dispatchResult && (
            <div className={`mb-result-text ${dispatchResult.success ? 'mb-result-text--success' : 'mb-result-text--error'}`}>{dispatchResult.message}</div>
          )}
          <button className="ps-conf-btn-secondary ps-mt-14" disabled={!canConfirmMolecularDispatch(scannedPlateBarcode, scannedDeckLocationLabel, dispatching)} onClick={handleDispatchWorklist}>
            {dispatching ? t('molecularPlateBuilderPage.dispatching') : t('molecularPlateBuilderPage.confirmDispatch')}
          </button>
        </div>
      )}

      {isNew && (
        <div className="mb-panel ps-mb-20">
          <h3 className="ps-panel-title">{t('molecularPlateBuilderPage.batchInfoTitle')}</h3>
          <div className="mb-flex-gap-12-wrap">
            <div className="mb-field-wide">
              <label className="ps-label" htmlFor="mb-assay-code">{t('molecularPlateBuilderPage.assayLabel')}{star('assayCode')}</label>
              <select id="mb-assay-code" className="ps-input-dark ps-w-full" value={assayCode}
                onChange={e => {
                  const selected = molecularAssayTypes.find(at => at.id === e.target.value);
                  setAssayCode(e.target.value);
                  setAssayName(selected?.name ?? '');
                }}>
                <option value="">{t('molecularPlateBuilderPage.selectAssayOption')}</option>
                {molecularAssayTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ps-label" htmlFor="mb-instrument">{t('molecularPlateBuilderPage.targetInstrumentLabel')}{star('targetInstrument')}</label>
              <select id="mb-instrument" className={`ps-input-dark ${selectedInstrumentAlert ? 'mb-instrument-select--alert' : ''}`} value={targetInstrumentId} onChange={e => { setTargetInstrumentId(e.target.value); setDeckSlot(''); }}>
                <option value="">{t('molecularPlateBuilderPage.selectInstrumentOption')}</option>
                {instrumentOptions.map(i => {
                  const state = instrumentStates.get(i.id);
                  return state && isServiceAlert(state)
                    ? <option key={i.id} value={i.code} className="mb-instrument-option--alert">{t('molecularPlateBuilderPage.instrumentOptionAlert', { name: i.name, code: i.code, state: t(`equipmentLog.state.${state}`) })}</option>
                    : <option key={i.id} value={i.code}>{t('molecularPlateBuilderPage.instrumentOption', { name: i.name, code: i.code })}</option>;
                })}
              </select>
              {instrumentOptions.length === 0 && <div className="mb-field-hint">{t('molecularPlateBuilderPage.noInstrumentsHint')}</div>}
              {selectedInstrument && selectedInstrumentAlert && (
                <div className="mb-instrument-alert" role="alert">
                  {t(selectedInstrumentAlert === 'malfunction' ? 'molecularPlateBuilderPage.instrumentAlertMalfunction' : 'molecularPlateBuilderPage.instrumentAlertOverdue', { name: selectedInstrument.name })}
                </div>
              )}
            </div>
            <div>
              <label className="ps-label" htmlFor="mb-deck-slot">{t('molecularPlateBuilderPage.deckSlotLabel')}{star('deckSlot')}</label>
              {/* Batch 406: an instrument with a deck layout offers only its extraction-plate slots. */}
              {selectedInstrument?.deckSlots?.length ? (
                <select id="mb-deck-slot" className="ps-input-dark" value={deckSlot} onChange={e => setDeckSlot(e.target.value)}>
                  <option value="">{t('molecularRackLoadingPage.placement.selectSlot')}</option>
                  {plateSlots.map(sl => (
                    <option key={sl.id} value={sl.id}>{sl.deck ? t('molecularRackLoadingPage.placement.slotOnDeck', { slot: sl.id, deck: sl.deck }) : sl.id}</option>
                  ))}
                </select>
              ) : (
                <input id="mb-deck-slot" className="ps-input-dark" value={deckSlot} onChange={e => setDeckSlot(e.target.value)} placeholder={t('molecularPlateBuilderPage.deckSlotPlaceholder')} />
              )}
            </div>
            <div>
              <label className="ps-label" htmlFor="mb-plate-layout">{t('molecularPlateBuilderPage.plateLayoutLabel')}</label>
              <select id="mb-plate-layout" className="ps-input-dark" value={plateLayout} onChange={e => handleLayoutChange(e.target.value as MolecularPlateLayout)}>
                {(Object.keys(PLATE_LAYOUT_LABEL_KEY) as MolecularPlateLayout[]).map(layoutKey => (
                  <option key={layoutKey} value={layoutKey}>{t(PLATE_LAYOUT_LABEL_KEY[layoutKey])}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {isNew && (
        <div className="mb-panel ps-mb-20">
          <h3 className="ps-panel-title">{t('molecularPlateBuilderPage.reagentLotsTitle')}{star('reagentLots')}</h3>
          {reagentLots.map((lot, i) => (
            <div key={i} className="mb-reagent-row">
              <div>
                <label className="ps-label">{t('molecularPlateBuilderPage.componentLabel')}</label>
                <select aria-label={t('molecularPlateBuilderPage.componentLabel')} className="ps-input-dark" value={lot.componentType} onChange={e => updateReagentLot(i, { componentType: e.target.value as MolecularReagentComponentType })}>
                  {MOLECULAR_REAGENT_COMPONENT_TYPES.map(rt => <option key={rt} value={rt}>{t(`molecularPlateBuilderPage.componentType.${rt}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="ps-label">{t('molecularPlateBuilderPage.lotNumberLabel')}</label>
                <input aria-label={t('molecularPlateBuilderPage.lotNumberLabel')} className="ps-input-dark" value={lot.lotNumber} onChange={e => updateReagentLot(i, { lotNumber: e.target.value })} />
              </div>
              <div>
                <label className="ps-label">{t('molecularPlateBuilderPage.expirationLabel')}</label>
                <input aria-label={t('molecularPlateBuilderPage.expirationLabel')} className="ps-input-dark" type="date" value={lot.expirationDate.slice(0, 10)} onChange={e => updateReagentLot(i, { expirationDate: new Date(e.target.value).toISOString() })} />
              </div>
              <div>
                <label className="ps-label">{t('molecularPlateBuilderPage.qcStatusLabel')}</label>
                <select aria-label={t('molecularPlateBuilderPage.qcStatusLabel')} className="ps-input-dark" value={lot.qcStatus} onChange={e => updateReagentLot(i, { qcStatus: e.target.value as MolecularReagentLot['qcStatus'] })}>
                  <option value="signed_off">{t('molecularPlateBuilderPage.qcSignedOff')}</option>
                  <option value="pending">{t('molecularPlateBuilderPage.qcPending')}</option>
                  <option value="failed">{t('molecularPlateBuilderPage.qcFailed')}</option>
                </select>
              </div>
              <button className="ps-btn-small" onClick={() => removeReagentLot(i)}>{t('molecularPlateBuilderPage.removeButton')}</button>
            </div>
          ))}
          <button className="ps-conf-btn-secondary" onClick={addReagentLot}>{t('molecularPlateBuilderPage.addReagentLot')}</button>
        </div>
      )}

      <div className="mb-flex-gap-20-wrap">
        <div className="mb-plate-panel">
          <div className="mb-flex-between-mb14">
            <h3 className="ps-panel-title">{t('molecularPlateBuilderPage.plateLayoutHeading', { rows: displayDims.rows, columns: displayDims.columns })}</h3>
            {isNew && (
              <div className="ps-flex-row-gap-8">
                <button className="ps-btn-small" onClick={() => handleAutoPopulate('row_major')}>{t('molecularPlateBuilderPage.autoFillRowMajor')}</button>
                <button className="ps-btn-small" onClick={() => handleAutoPopulate('column_major')}>{t('molecularPlateBuilderPage.autoFillColumnMajor')}</button>
              </div>
            )}
          </div>
          <div className="mb-plate-grid" style={{ '--mb-plate-cols': `repeat(${displayDims.columns}, minmax(0, 1fr))` } as React.CSSProperties}>
            {displayWells.map(w => {
              const color = w.sampleType ? SAMPLE_TYPE_COLOR[w.sampleType] : undefined;
              const isSelected = w.wellPosition === selectedWellPos;
              const title = plateWellTitle(w);
              // Batch 467b: a saved plate's wells can be selected to see what they hold (an in-house order, say).
              const viewable = readOnly && !!w.sampleType;
              return (
                <button
                  key={w.wellPosition}
                  onClick={() => (!readOnly || viewable) && setSelectedWellPos(w.wellPosition)}
                  title={t(`molecularPlateBuilderPage.wellTitle.${title.key}`, { ...title.values, type: w.sampleType ? t(SAMPLE_TYPE_LABEL_KEY[w.sampleType]) : '' })}
                  className={`mb-well-btn${color ? ' mb-well-btn--filled' : ''}${isSelected ? ' mb-well-btn--selected' : ''}${readOnly && !viewable ? ' mb-well-btn--readonly' : ''}${w.orderId ? ' mb-well-btn--order' : ''}`}
                  style={color ? { '--ps-hue': color } as React.CSSProperties : undefined}>
                  {w.wellPosition}
                </button>
              );
            })}
          </div>
          <div className="mb-legend-row">
            {MOLECULAR_SAMPLE_TYPES.map(st => (
              <div key={st} className="mb-legend-item">
                <div className="mb-legend-swatch" style={{ '--ps-hue': SAMPLE_TYPE_COLOR[st] } as React.CSSProperties} />
                <span className="mb-legend-label">{t(SAMPLE_TYPE_LABEL_KEY[st])}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Batch 467b: a saved plate's selected well, read-only — its sample, and the in-house order it holds. */}
        {!isNew && existingBatch && selectedWellPos && (() => {
          const w = existingBatch.wells.find(x => x.wellPosition === selectedWellPos);
          if (!w?.sampleType) return null;
          return (
            <div className="mb-well-panel">
              <h4 className="ps-panel-title">{t('molecularPlateBuilderPage.wellHeading', { position: w.wellPosition })}</h4>
              <dl className="mb-well-facts">
                <dt>{t('molecularPlateBuilderPage.sampleTypeLabel')}</dt><dd>{t(SAMPLE_TYPE_LABEL_KEY[w.sampleType])}</dd>
                {w.accessionNumber && <><dt>{t('molecularPlateBuilderPage.accessionNumberLabel')}</dt><dd data-phi="accession">{w.accessionNumber}</dd></>}
                {w.orderId && <><dt>{t('molecularPlateBuilderPage.orderLabel')}</dt><dd>{w.orderId}</dd></>}
                {w.controlInfo?.controlId && <><dt>{t('molecularPlateBuilderPage.controlLabel')}</dt><dd>{w.controlInfo.controlId}</dd></>}
              </dl>
              {w.orderId && <p className="ps-helper-text">{t('molecularPlateBuilderPage.orderHint')}</p>}
            </div>
          );
        })()}

        {isNew && selectedWell && (
          <div className="mb-well-panel">
            <h4 className="ps-panel-title">{t('molecularPlateBuilderPage.wellHeading', { position: selectedWell.wellPosition })}</h4>
            <label className="ps-label">{t('molecularPlateBuilderPage.sampleTypeLabel')}</label>
            <select aria-label={t('molecularPlateBuilderPage.sampleTypeLabel')} className="ps-input-dark ps-w-full ps-mb-10" value={selectedWell.sampleType ?? ''} onChange={e => updateWell(selectedWell.wellPosition, { sampleType: (e.target.value || undefined) as MolecularSampleType | undefined })}>
              <option value="">{t('molecularPlateBuilderPage.unassignedOption')}</option>
              {MOLECULAR_SAMPLE_TYPES.map(st => <option key={st} value={st}>{t(SAMPLE_TYPE_LABEL_KEY[st])}</option>)}
            </select>

            {selectedWell.sampleType && selectedWell.sampleType !== 'PATIENT_SPECIMEN' && (
              <>
                <label className="ps-label">{t('molecularPlateBuilderPage.controlLotNumberLabel')}{star('controlLotInfo')}</label>
                <input aria-label={t('molecularPlateBuilderPage.controlLotNumberLabel')} className="ps-input-dark ps-w-full ps-mb-10" value={selectedWell.controlInfo?.controlLotNumber ?? ''}
                  onChange={e => updateWell(selectedWell.wellPosition, { controlInfo: { controlId: selectedWell.controlInfo?.controlId ?? e.target.value, controlLotNumber: e.target.value, controlExpirationDate: selectedWell.controlInfo?.controlExpirationDate ?? '', expectedValue: selectedWell.controlInfo?.expectedValue ?? 'NEGATIVE' } })} />
                <label className="ps-label">{t('molecularPlateBuilderPage.controlExpirationLabel')}{star('controlLotInfo')}</label>
                <input aria-label={t('molecularPlateBuilderPage.controlExpirationLabel')} className="ps-input-dark ps-w-full ps-mb-10" type="date"
                  onChange={e => updateWell(selectedWell.wellPosition, { controlInfo: { controlId: selectedWell.controlInfo?.controlId ?? '', controlLotNumber: selectedWell.controlInfo?.controlLotNumber ?? '', controlExpirationDate: new Date(e.target.value).toISOString(), expectedValue: selectedWell.controlInfo?.expectedValue ?? 'NEGATIVE' } })} />
              </>
            )}

            {selectedWell.sampleType === 'PATIENT_SPECIMEN' && (
              <>
                <label className="ps-label">{t('molecularPlateBuilderPage.containerBarcodeLabel')}{star('patientSpecimen')}</label>
                <input aria-label={t('molecularPlateBuilderPage.containerBarcodeLabel')} className="ps-input-dark ps-w-full ps-mb-6" value={selectedWell.containerBarcode ?? ''} onChange={e => updateWell(selectedWell.wellPosition, { containerBarcode: e.target.value })} />
                <button className={`ps-btn-small ps-w-full ps-mb-10${armedForScan ? ' ps-btn-small--armed' : ''}`} onClick={() => setArmedForScan(a => !a)}>
                  {armedForScan ? t('molecularPlateBuilderPage.waitingForScan') : t('molecularPlateBuilderPage.scanToFill')}
                </button>
                {!manualWellEntryOpen ? (
                  <button className="ps-btn-small ps-w-full ps-mb-10" onClick={() => setManualWellEntryOpen(true)}>
                    {t('molecularPlateBuilderPage.manualEntryPrompt')}
                  </button>
                ) : (
                  <div className="ps-flex-row-gap-8 ps-mb-10">
                    <input
                      className="ps-input"
                      autoFocus
                      placeholder={t('molecularPlateBuilderPage.manualEntryPlaceholder')}
                      value={manualWellEntryValue}
                      onChange={e => setManualWellEntryValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleManualWellEntrySubmit(); }}
                    />
                    <button className="ps-btn-small" onClick={handleManualWellEntrySubmit} disabled={!manualWellEntryValue.trim()}>{t('molecularPlateBuilderPage.fill')}</button>
                    <button className="ps-btn-small" onClick={() => { setManualWellEntryOpen(false); setManualWellEntryValue(''); }}>{t('molecularPlateBuilderPage.cancel')}</button>
                  </div>
                )}
                <label className="ps-label">{t('molecularPlateBuilderPage.accessionNumberLabel')}{star('patientSpecimen')}</label>
                <input aria-label={t('molecularPlateBuilderPage.accessionNumberLabel')} className="ps-input-dark ps-w-full ps-mb-10" data-phi="accession" value={selectedWell.accessionNumber ?? ''} onChange={e => updateWell(selectedWell.wellPosition, { accessionNumber: e.target.value })} />
                {/* Real, direct correction, per direct follow-up + full
                    spec audit: §4.1's own worked example carries a real
                    aliquot_volume_ul for a real patient specimen well,
                    but no real UI input ever existed to capture it —
                    the field was threaded through the type and the
                    outbound payload builder, but nothing upstream ever
                    set it for a real, user-created well. */}
                <label className="ps-label">{t('molecularPlateBuilderPage.aliquotVolumeLabel')}{star('aliquotVolume')}</label>
                <input aria-label={t('molecularPlateBuilderPage.aliquotVolumeLabel')} className="ps-input-dark ps-w-full ps-mb-10" type="number" min={0} value={selectedWell.aliquotVolumeUl ?? ''} onChange={e => updateWell(selectedWell.wellPosition, { aliquotVolumeUl: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </>
            )}
          </div>
        )}
      </div>

      {isNew && (
        <div className="mb-panel ps-mt-20">
          {!gating.allowed && (
            <div className="ps-error-text">
              {gating.failures.map((f, i) => <div key={i}>{t('molecularPlateBuilderPage.gatingFailure', { componentType: t(`molecularPlateBuilderPage.componentType.${f.componentType}`, { defaultValue: f.componentType }), lotNumber: f.lotNumber || '—', reason: t(`molecularPlateBuilderPage.gatingReason.${f.reason}`) })}</div>)}
            </div>
          )}
          {!controlCheck.satisfied && (
            <div className="ps-error-text">
              {controlCheck.violations.map((v, i) => (
                <div key={i}>
                  ⚠️ {v.reason === 'missing'
                    ? t('molecularPlateBuilderPage.controlMissing', { sampleType: v.sampleType })
                    : t('molecularPlateBuilderPage.controlMismatch', { sampleType: v.sampleType, expectedPosition: v.expectedPosition, actualPosition: v.actualPosition })}
                </div>
              ))}
            </div>
          )}
          {stillRequired(createMissing)}
          {wellsWithoutSpecimen.length > 0 && (
            <div className="ps-error-text">{t('molecularPlateBuilderPage.wellsMissingSpecimen', { wells: formatList(wellsWithoutSpecimen, i18n.language) })}</div>
          )}
          {saveError && <div className="ps-error-text">{saveError}</div>}
          <button className="ps-conf-btn-secondary" disabled={saving || !canCreate} onClick={handleCreate}>{saving ? t('molecularPlateBuilderPage.creating') : t('molecularPlateBuilderPage.createBatch')}</button>
        </div>
      )}

      {existingBatch?.reviewStatus && (
        <div className="mb-panel ps-mt-20">
          <h3 className="ps-panel-title">{t('molecularPlateBuilderPage.runResultsTitle')}</h3>
          {existingBatch.reviewStatus === 'BLOCKED' && (
            <div className="mb-banner mb-banner--error ps-mb-14">
              {t('molecularPlateBuilderPage.blockedBanner')}
            </div>
          )}
          <div className="ps-conf-table-wrap">
            <div className="ps-conf-table-scroll">
              <table className="ps-conf-table">
                <thead className="ps-conf-thead-sticky">
                  <tr>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colWell')}</th>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colAccession')}</th>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colCtValue')}</th>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colInternalControlCt')}</th>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colInterpretation')}</th>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colFlag')}</th>
                    <th className="ps-conf-th">{t('molecularPlateBuilderPage.colTrace')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(existingBatch.results ?? []).map((r, i) => {
                    const isExpanded = expandedTraceWellPos === r.well_position;
                    const trace = isExpanded ? resolveMolecularHistoricalTrace([existingBatch], r.accession_number ? { accessionNumber: r.accession_number } : { wellPosition: r.well_position }) : null;
                    return (
                      <React.Fragment key={i}>
                        <tr className="ps-conf-tr">
                          <td className="ps-conf-td">{r.well_position}</td>
                          <td className="ps-conf-td"><span data-phi="accession">{r.accession_number ?? '—'}</span></td>
                          <td className="ps-conf-td">{r.raw_data.ct_value ?? '—'}</td>
                          <td className="ps-conf-td">{r.raw_data.internal_control_ct ?? '—'}</td>
                          <td className="ps-conf-td">{r.interpretation}</td>
                          <td className="ps-conf-td">{r.flag}</td>
                          <td className="ps-conf-td">
                            <button className="ps-btn-small" onClick={() => setExpandedTraceWellPos(isExpanded ? null : r.well_position)}>
                              {isExpanded ? t('molecularPlateBuilderPage.hide') : t('molecularPlateBuilderPage.trace')}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && trace && (
                          <tr>
                            <td colSpan={7} className="mb-trace-cell">
                              {trace.control && (
                                <div><strong>{t('molecularPlateBuilderPage.traceControl')}</strong> {t('molecularPlateBuilderPage.traceControlLine', { id: trace.control.controlId, lot: trace.control.controlLotNumber, expiry: trace.control.controlExpirationDate })}</div>
                              )}
                              <div><strong>{t('molecularPlateBuilderPage.tracePlateUuid')}</strong> {trace.plateUuid}</div>
                              <div><strong>{t('molecularPlateBuilderPage.tracePlateBarcode')}</strong> {trace.plateBarcode}</div>
                              <div><strong>{t('molecularPlateBuilderPage.traceDeckLocation')}</strong> {trace.targetInstrumentId}{trace.deckSlot ? ` / ${trace.deckSlot}` : t('molecularPlateBuilderPage.noDeckSlotRecorded')}</div>
                              <div><strong>{t('molecularPlateBuilderPage.traceCreatedBy')}</strong> {trace.createdByUserName} ({trace.createdByUserId})</div>
                              <div><strong>{t('molecularPlateBuilderPage.traceReagentLots')}</strong> {trace.reagentLots.map(l => `${l.componentType} (${l.lotNumber})`).join(', ') || '—'}</div>
                              <div className="ps-mt-8"><strong>{t('molecularPlateBuilderPage.traceMovementHistory')}</strong></div>
                              {trace.movementHistory.length === 0 && <div>{t('molecularPlateBuilderPage.noMovementRecorded')}</div>}
                              {trace.movementHistory.map((m, mi) => (
                                <div key={mi}>
                                  {t('molecularPlateBuilderPage.movementLine', { from: t(MOVEMENT_LEVEL_LABEL_KEY[m.fromLevel]), to: t(MOVEMENT_LEVEL_LABEL_KEY[m.toLevel]), user: m.byUserName, station: m.stationName, when: formatDateTime(m.at, i18n.language) })}
                                </div>
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {(!existingBatch.results || existingBatch.results.length === 0) && (
                    <tr><td className="ps-conf-empty-row" colSpan={7}>{t('molecularPlateBuilderPage.noResultsYet')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MolecularPlateBuilderPage;
