// src/pages/BatchManagement/NewContainerModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct, detailed specification: "Container & Batch
// Label Management" — FR-1: "Container Barcode Generation & Dual-Mode
// Printing." Renamed from CreateBatchModal.tsx (this file's own earlier
// name) to match the spec's own real button label, "[ 🖨️ New Container ]"
// — a genuinely more elaborate, real flow than the original, simpler
// "Create Batch" form: real container-type selection, real dual-mode
// identifier handling (disposable vs. semi-permanent hardware), and a
// real target-workstation override.
//
// Batch 406 (Pete): the form was taller than the screen. Each field is now its
// own block (.ps-batch-field) in a two-column grid in a wider dialog
// (.ps-batch-create-modal--wide, pathscribe.css), so it fits without scrolling.
// Labels are tied to their controls.
// Batch 404 (PS-359): what "Generate" needs comes from the organisation's
// Field Requirements (page "batchManagement", services/fieldRequirements/
// batchChecks.ts): the protocol, a reusable rack's id, a decal batch's target
// duration, a referral's destination lab and a cytology batch's stain are
// locked (as before); the referral's test and a staining run's reagent lots
// are switches. Required labels are starred and "Still required" says what is
// missing. "create container" by voice (BATCH_CREATE_CONTAINER) does what the
// button does. Container types, decal solutions and the reagent-lot list are
// translated; the station-to-node rule moved to services/batches/
// batchFormHelpers.ts, and scan stations come from @/services.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  batchService, hardwareContainerRegistryService, printSettingsService, facilityService, stainTypeService, reagentLotService,
  scanStationService, activeReferenceLabs, actionRegistryService, batchCreateMissing, batchFieldRequired,
} from '@/services';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { deriveNodeFromStation, CONTAINER_TYPE_KEYS, DECAL_SOLUTION_KEYS } from '@/services/batches/batchFormHelpers';
import { formatList } from '@/utils/formatList';
import type { ReagentLot } from '@/services/reagentLots/IReagentLotService';
import type { Facility } from '@/services/facilities/IFacilityService';
import type { StainType } from '@/services';
import { generateBarcodeSvg } from '@/utils/labels/generateBarcodeSvg';
import { dispatchContainerLabelPrint } from '@/utils/labels/dispatchContainerLabelPrint';
import { CONTAINER_TYPES, isHardwareEligible } from '@/services/hardwareContainers/IHardwareContainerRegistryService';
import type { ContainerType, HardwareContainer } from '@/services/hardwareContainers/IHardwareContainerRegistryService';
import { BATCH_PROCESSING_NODES, isBatchErrorCode } from '@/services/batches/IBatchService';
import type { Batch, BatchProcessingNode, BatchPriority } from '@/services/batches/IBatchService';
import { DECAL_SOLUTION_TYPES, DECAL_WARNING_MINUTES_BEFORE_TARGET, formatDecalDuration } from '@/services/batches/DecalBatch';
import type { DecalSolutionType } from '@/services/batches/DecalBatch';
import type { ScanStation } from '@/services/scanStations/IScanStationService';
import { DEFAULT_PRINT_SETTINGS_CONFIG } from '@/services/printSettings/IPrintSettingsService';
import type { PrintSettingsConfig } from '@/services/printSettings/IPrintSettingsService';

interface Props {
  onClose: () => void;
  onCreated: (batch: Batch) => void;
  userId: string;
  userName: string;
  stationId: string | null;
  /** Real feature, per direct, detailed specification, FR-2.2: scanning
   *  an already-registered, currently-Available rack with no active
   *  batch of its own opens this modal pre-filled to Mode B with that
   *  rack, rather than a real, honest "not found" — the tech still
   *  supplies protocol/processing node (never fabricated), but doesn't
   *  have to re-type/re-select a rack they already just scanned. */
  initialRackId?: string;
}

type IdentifierMode = 'disposable' | 'semi_permanent';

// Batch 404: deriveNodeFromStation moved to services/batches/batchFormHelpers.ts.

const NewContainerModal: React.FC<Props> = ({ onClose, onCreated, userId, userName, stationId, initialRackId }) => {
  const { t, i18n } = useTranslation();
  const requirements = useFieldRequirements('batchManagement');
  const [containerType, setContainerType] = useState<ContainerType>(CONTAINER_TYPES[0]);
  const [processingNode, setProcessingNode] = useState<BatchProcessingNode>(BATCH_PROCESSING_NODES[0]);
  const [nodeAutoDerived, setNodeAutoDerived] = useState(false);
  const [protocol, setProtocol] = useState('');
  const [priority, setPriority] = useState<BatchPriority>('Routine');
  const [identifierMode, setIdentifierMode] = useState<IdentifierMode>(initialRackId ? 'semi_permanent' : 'disposable');
  const [rackId, setRackId] = useState(initialRackId ?? '');
  // Real feature, per direct, detailed specification: "Decal /
  // Special Processing Batch Attributes." Only meaningful (and only
  // shown below) when processingNode === 'Decal / Special Processing'
  // — see DecalBatch.ts's own header. Hours/minutes as two real,
  // human-friendly inputs (matching the spec's own "4 hours" wording)
  // rather than asking a tech to type raw minutes; combined into one
  // real targetDurationMinutes value on create.
  const [solutionType, setSolutionType] = useState<DecalSolutionType>(DECAL_SOLUTION_TYPES[0]);
  // Real, per direct follow-up on the RFP-APLIS-2026-GLOBAL Inter-
  // Laboratory Specimen Referral gap — the real, existing Facility
  // dictionary's own reference_lab-role entries, fetched fresh so a
  // newly added reference lab is immediately selectable here too.
  const [referenceLabs, setReferenceLabs] = useState<Facility[]>([]);
  const [referralDestinationFacilityId, setReferralDestinationFacilityId] = useState('');
  const [referralTestRequested, setReferralTestRequested] = useState('');
  useEffect(() => {
    facilityService.getAll().then(res => {
      if (res.ok) setReferenceLabs(activeReferenceLabs(res.data));
    });
  }, []);
  // Real, additive — per 'Cytology Staining' (Batch.cytologyStainTypeId's
  // own doc comment). Same real "node-specific required field, fetched
  // from the real dictionary" pattern as referenceLabs above.
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [cytologyStainTypeId, setCytologyStainTypeId] = useState('');
  useEffect(() => {
    stainTypeService.getAll().then(res => { if (res.ok) setStainTypes(res.data); });
  }, []);
  // Real, additive — per 'Staining' (Batch.stainingReagentLotIds's own
  // doc comment). Same real "node-specific field, fetched from the
  // real dictionary" pattern as cytologyStainTypeId above — a real,
  // multi-select array here, not a single id, since a real stainer
  // run genuinely draws on several real reagent lots at once. Filtered
  // to real, currently Active lots only — an Inactive (used up,
  // superseded) lot has no business being newly assigned to a run.
  const [reagentLots, setReagentLots] = useState<ReagentLot[]>([]);
  const [stainingReagentLotIds, setStainingReagentLotIds] = useState<string[]>([]);
  useEffect(() => {
    reagentLotService.getAll().then(res => { if (res.ok) setReagentLots(res.data.filter(l => l.status === 'Active')); });
  }, []);
  const [targetHours, setTargetHours] = useState(4);
  const [targetMinutesExtra, setTargetMinutesExtra] = useState(0);

  // Real feature, per the spec's own FR-1.2 "Target Workstation Node:
  // Auto-populates active workstation ID with manual override
  // options." Auto-populated from the real, current, sticky scan
  // station (useCurrentScanStation, same real source
  // MaterialTreePanel.tsx's own station indicator already uses); the
  // dropdown itself lists every real, active ScanStation for a manual
  // override, not the spec's own hardcoded worked examples ("Processor
  // 01, Stainer 02") — this app's own real station registry already
  // has real names, no need to invent a second, parallel list.
  const [targetStationId, setTargetStationId] = useState<string | null>(stationId);
  const [stations, setStations] = useState<ScanStation[]>([]);
  const [availableRacks, setAvailableRacks] = useState<HardwareContainer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBatch, setCreatedBatch] = useState<Batch | null>(null);
  // Real feature, per direct follow-up: "Admin Config screen for
  // Container Label Management." Real, admin-configured symbology and
  // rack-prefix convention — was a hardcoded 'code128' literal and a
  // hardcoded "RACK-" string directly in this file before
  // PrintSettingsConfig grew these fields (Config > System > Print
  // Settings).
  const [printSettings, setPrintSettings] = useState<PrintSettingsConfig>(DEFAULT_PRINT_SETTINGS_CONFIG);

  useEffect(() => {
    printSettingsService.get().then(res => { if (res.ok) setPrintSettings(res.data); });
  }, []);

  useEffect(() => {
    scanStationService.getAll().then(res => { if (res.ok) setStations(res.data.filter(s => s.status === 'Active')); });
  }, []);

  // Real, initial derivation — once real station data has loaded,
  // check whether the already-sticky current station (targetStationId,
  // from useCurrentScanStation via the stationId prop) carries a real
  // workflowStage this modal can trust, and default Processing Node
  // to it — rather than always defaulting to BATCH_PROCESSING_NODES[0]
  // regardless of what bench the tech is actually standing at.
  useEffect(() => {
    if (!targetStationId || stations.length === 0) return;
    const derived = deriveNodeFromStation(stations.find(s => s.id === targetStationId));
    if (derived) { setProcessingNode(derived); setNodeAutoDerived(true); }
  }, [stations, targetStationId]);

  const handleStationChange = (newStationId: string | null) => {
    setTargetStationId(newStationId);
    const derived = deriveNodeFromStation(stations.find(s => s.id === newStationId));
    if (derived) { setProcessingNode(derived); setNodeAutoDerived(true); }
    else { setNodeAutoDerived(false); }
  };

  useEffect(() => {
    if (!initialRackId) return;
    hardwareContainerRegistryService.getByRackId(initialRackId).then(res => {
      if ('ok' in res && res.ok) setContainerType(res.data.containerType);
    });
  }, [initialRackId]);

  useEffect(() => {
    if (!isHardwareEligible(containerType)) { setIdentifierMode('disposable'); return; }
    hardwareContainerRegistryService.getAll().then(res => {
      if (res.ok) setAvailableRacks(res.data.filter(c => c.containerType === containerType && c.status === 'Available'));
    });
  }, [containerType]);

  const isDecalNode = processingNode === 'Decal / Special Processing';
  // Real, per direct follow-up on the RFP-APLIS-2026-GLOBAL Inter-
  // Laboratory Specimen Referral gap — same real "node-specific
  // required fields" pattern as isDecalNode above.
  const isReferralNode = processingNode === 'External Referral';
  // Real, additive — same real "node-specific required field" pattern
  // as isDecalNode/isReferralNode above.
  const isCytologyStainingNode = processingNode === 'Cytology Staining';
  // Real, additive — same real "node-specific field" pattern as
  // isCytologyStainingNode above. Deliberately NOT added to canCreate
  // below — unlike cytologyStainTypeId (which IS what a Cytology
  // Staining batch fundamentally is), a stainer run's own reagent
  // lots are real, per direct requirements, scanned in at the bench
  // ("scanning reagent or kit barcodes... to automatically log the
  // active lot"), which can genuinely happen after the batch itself
  // is created, not necessarily known at creation time. Requiring it
  // up front would misrepresent that real, intended workflow.
  const isStainingNode = processingNode === 'Staining';
  const targetDurationMinutes = targetHours * 60 + targetMinutesExtra;
  const missing = batchCreateMissing({
    processingNode, protocol, identifierMode, rackId, targetDurationMinutes,
    referralDestinationFacilityId, referralTestRequested, cytologyStainTypeId, stainingReagentLotIds,
  }, requirements);
  const canCreate = missing.length === 0;
  const star = (fieldId: string) => batchFieldRequired(requirements, fieldId) && <span className="ps-conf-required"> *</span>;

  // Real, derived (not stateful) mismatch check — recomputed on every
  // render from whatever's currently selected, so it stays correct
  // even after a manual override of either field individually, not
  // just right after an auto-fill. Only a real, positive mismatch
  // (the station has a real, mapped stage AND it differs) triggers
  // this — a station with no workflowStage, or one that maps to
  // nothing (Accessioning/Slide Archival/Other), is correctly silent
  // here rather than a false-positive warning.
  const selectedStation = stations.find(s => s.id === targetStationId);
  const stationDerivedNode = deriveNodeFromStation(selectedStation);
  const stationNodeMismatch = stationDerivedNode !== null && stationDerivedNode !== processingNode;

  const handleCreate = async () => {
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    const res = await batchService.create({
      processingNode, protocol: protocol.trim(), priority,
      stationId: targetStationId ?? undefined,
      createdByUserId: userId, createdByUserName: userName,
      containerType, identifierMode,
      rackId: identifierMode === 'semi_permanent' ? rackId.trim() : undefined,
      solutionType: isDecalNode ? solutionType : undefined,
      targetDurationMinutes: isDecalNode ? targetDurationMinutes : undefined,
      referralDestinationFacilityId: isReferralNode ? referralDestinationFacilityId : undefined,
      referralTestRequested: isReferralNode ? (referralTestRequested.trim() || undefined) : undefined,
      cytologyStainTypeId: isCytologyStainingNode ? cytologyStainTypeId : undefined,
      stainingReagentLotIds: isStainingNode && stainingReagentLotIds.length > 0 ? stainingReagentLotIds : undefined,
    });
    setBusy(false);
    // Batch 407: the service's refusal codes (a missing or checked-out rack), in the user's language.
    if ('error' in res) { setError(isBatchErrorCode(res.error) ? t(`batchDetail.errors.${res.error}`, { rackId: rackId.trim() }) : t('batchDetail.actionFailed')); return; }
    setCreatedBatch(res.data);
    // Real, honest record alongside the real, working window.print()
    // call below (fired when the tech actually clicks Print) — only
    // for a real, new disposable label; Mode B checks a rack out but
    // never prints a new one.
    if (identifierMode === 'disposable') {
      dispatchContainerLabelPrint({
        masterBarcode: res.data.masterBarcode,
        printerIp: selectedStation?.printerIp,
        symbology: printSettings.containerBarcodeSymbology,
        labelSizePresetId: printSettings.containerLabelPresetId,
      }).catch(() => {});
    }
  };

  const createRef = useRef(handleCreate);
  createRef.current = handleCreate;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    if (actionId === 'BATCH_CREATE_CONTAINER' && !createdBatch) void createRef.current();
  }), [createdBatch]);

  const barcodeSvg = createdBatch ? generateBarcodeSvg(createdBatch.masterBarcode, printSettings.containerBarcodeSymbology, { includeText: true }) : null;

  return (
    <div className="ps-overlay ps-batch-overlay" onClick={onClose}>
      <div className={`ps-modal-dark ps-batch-create-modal${createdBatch ? '' : ' ps-batch-create-modal--wide'}`} onClick={e => e.stopPropagation()}>
        {!createdBatch ? (
          <>
            <div className="ps-batch-modal-header">
              <div className="ps-batch-modal-title">🖨️ {t('newContainerModal.title')}</div>
              <button className="ps-mth-close" onClick={onClose}>✕</button>
            </div>
            <div className="ps-batch-modal-body ps-batch-create-grid">
              <div className="ps-batch-field">
                <label className="ps-batch-field-label" htmlFor="batch-container-type">{t('newContainerModal.containerType')}</label>
                <select id="batch-container-type" className="ps-batch-select" value={containerType} onChange={e => setContainerType(e.target.value as ContainerType)}>
                  {CONTAINER_TYPES.map(ct => <option key={ct} value={ct}>{t(`newContainerModal.containerTypes.${CONTAINER_TYPE_KEYS[ct]}`)}</option>)}
                </select>
              </div>

              <div className="ps-batch-field">
                <label className="ps-batch-field-label" htmlFor="batch-station">{t('newContainerModal.targetWorkstation')}</label>
                <select id="batch-station" className="ps-batch-select" value={targetStationId ?? ''} onChange={e => handleStationChange(e.target.value || null)}>
                  <option value="">{t('newContainerModal.noStation')}</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.workflowStage ? t('newContainerModal.stationWithStage', { station: s.name, stage: s.workflowStage }) : s.name}</option>)}
                </select>
              </div>

              <div className="ps-batch-field">
                <label className="ps-batch-field-label" htmlFor="batch-node">{t('newContainerModal.processingNode')}</label>
                <select
                  id="batch-node"
                  className="ps-batch-select"
                  value={processingNode}
                  onChange={e => { setProcessingNode(e.target.value as BatchProcessingNode); setNodeAutoDerived(false); }}
                >
                  {BATCH_PROCESSING_NODES.map(node => <option key={node} value={node}>{t(`batchManagement.nodes.${node}`)}</option>)}
                </select>
                {/* Real feature, per direct follow-up: "we should be
                    consistent with respect to the scan stations. I see a
                    scan station belonging to a workload stage." A
                    station already, genuinely carries its own real
                    workflowStage — surfacing that connection here
                    (confirmation when it drove the field, a real warning
                    when the tech has since picked something else) rather
                    than asking for the same real fact twice with no
                    cross-check. */}
                {nodeAutoDerived && !stationNodeMismatch && (
                  <div className="ps-batch-node-hint">{t('newContainerModal.autoSetFromStation', { station: selectedStation?.name })}</div>
                )}
                {stationNodeMismatch && (
                  <div className="ps-batch-node-hint ps-batch-node-hint--warn">
                    {t('newContainerModal.stationMismatchWarning', { station: selectedStation?.name, node: stationDerivedNode ? t(`batchManagement.nodes.${stationDerivedNode}`) : stationDerivedNode })}
                  </div>
                )}
              </div>

              <div className="ps-batch-field">
                <label className="ps-batch-field-label" htmlFor="batch-protocol">{t('newContainerModal.protocolLabel')}{star('protocol')}</label>
                <input id="batch-protocol"
                  className="ps-batch-text-input"
                  type="text"
                  placeholder={t('newContainerModal.protocolPlaceholder')}
                  value={protocol}
                  onChange={e => setProtocol(e.target.value)}
                />
              </div>

              <div className="ps-batch-field">
                <p className="ps-batch-field-label">{t('newContainerModal.priority')}</p>
                <div className="ps-batch-priority-toggle">
                  <button
                    className={`ps-batch-priority-btn${priority === 'Routine' ? ' ps-batch-priority-btn--active' : ''}`}
                    onClick={() => setPriority('Routine')}
                  >
                    {t('newContainerModal.routine')}
                  </button>
                  <button
                    className={`ps-batch-priority-btn ps-batch-priority-btn--stat${priority === 'STAT' ? ' ps-batch-priority-btn--active' : ''}`}
                    onClick={() => setPriority('STAT')}
                  >
                    {t('newContainerModal.stat')}
                  </button>
                </div>
              </div>

              {/* Real feature, per direct, detailed specification:
                  "Decal / Special Processing Batch Attributes." Only
                  shown for this one real processing node — Solution
                  Type is a real, closed set (downstream alert timing
                  depends on knowing which real solution is in use);
                  Start Timestamp isn't a field here at all, since
                  Batch.createdAt (set the moment "Generate & Print" is
                  pressed) already IS the real start of the decal
                  clock — see DecalBatch.ts's own getDecalTimerState. */}
              {isDecalNode && (
                <>
                  <div className="ps-batch-field">
                    <label className="ps-batch-field-label" htmlFor="batch-decal-solution">{t('newContainerModal.solutionType')}</label>
                    <select id="batch-decal-solution" className="ps-batch-select" value={solutionType} onChange={e => setSolutionType(e.target.value as DecalSolutionType)}>
                      {DECAL_SOLUTION_TYPES.map(s => <option key={s} value={s}>{t(`newContainerModal.solutions.${DECAL_SOLUTION_KEYS[s]}`)}</option>)}
                    </select>
                  </div>

                  <div className="ps-batch-field">
                    <p className="ps-batch-field-label">{t('newContainerModal.targetDuration')}{star('decalDuration')}</p>
                    <div className="ps-batch-duration-row">
                      <div className="ps-batch-duration-field">
                        <input
                          className="ps-batch-text-input ps-batch-duration-input"
                          type="number" min={0} max={99}
                          aria-label={t('newContainerModal.hours')}
                          value={targetHours}
                          onChange={e => setTargetHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        />
                        <span className="ps-batch-duration-unit">{t('newContainerModal.hours')}</span>
                      </div>
                      <div className="ps-batch-duration-field">
                        <input
                          className="ps-batch-text-input ps-batch-duration-input"
                          type="number" min={0} max={59}
                          aria-label={t('newContainerModal.minutes')}
                          value={targetMinutesExtra}
                          onChange={e => setTargetMinutesExtra(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                        />
                        <span className="ps-batch-duration-unit">{t('newContainerModal.minutes')}</span>
                      </div>
                    </div>
                    <div className="ps-batch-duration-hint">
                      {t('newContainerModal.warningAlertAt', { duration: formatDecalDuration(Math.max(0, targetDurationMinutes - DECAL_WARNING_MINUTES_BEFORE_TARGET)), minutesBefore: DECAL_WARNING_MINUTES_BEFORE_TARGET })}
                    </div>
                  </div>
                </>
              )}

              {/* Real, per direct follow-up on the RFP-APLIS-2026-GLOBAL
                  Inter-Laboratory Specimen Referral gap — only shown for
                  this one real processing node. Destination is a real
                  Facility carrying the reference_lab role, never a
                  free-text destination name. */}
              {isReferralNode && (
                <>
                  <div className="ps-batch-field">
                    <label className="ps-batch-field-label" htmlFor="batch-referral-lab">{t('newContainerModal.referenceLabDestination')}{star('referralDestination')}</label>
                    <select id="batch-referral-lab" className="ps-batch-select" value={referralDestinationFacilityId} onChange={e => setReferralDestinationFacilityId(e.target.value)}>
                      <option value="">{t('newContainerModal.selectReferenceLab')}</option>
                      {referenceLabs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    {referenceLabs.length === 0 && (
                      <div className="ps-batch-duration-hint">
                        {t('newContainerModal.noReferenceLabConfigured')}
                      </div>
                    )}
                  </div>

                  <div className="ps-batch-field">
                    <label className="ps-batch-field-label" htmlFor="batch-referral-test">{t('newContainerModal.testPanelRequested')}{star('referralTestRequested')}</label>
                    <input id="batch-referral-test"
                      className="ps-batch-text-input"
                      value={referralTestRequested}
                      onChange={e => setReferralTestRequested(e.target.value)}
                      placeholder={t('newContainerModal.testPanelPlaceholder')}
                    />
                  </div>
                </>
              )}

              {/* Real, additive — per 'Cytology Staining' (Batch.
                  cytologyStainTypeId's own doc comment). Only shown for
                  this one real processing node. Real FK into the Stain
                  Dictionary (the "Diagnostic Catalog"), never a
                  free-text stain name. */}
              {isCytologyStainingNode && (
                <div className="ps-batch-field">
                  <label className="ps-batch-field-label" htmlFor="batch-cyto-stain">{t('newContainerModal.stainProtocol')}{star('cytologyStainType')}</label>
                  <select id="batch-cyto-stain" className="ps-batch-select" value={cytologyStainTypeId} onChange={e => setCytologyStainTypeId(e.target.value)}>
                    <option value="">{t('newContainerModal.selectStainProtocol')}</option>
                    {stainTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Real, additive — per 'Staining' (Batch.
                  stainingReagentLotIds's own doc comment). Only shown
                  for this one real processing node. Real FKs into the
                  Reagent & Solution Lot Registry, never free text —
                  same real posture as cytologyStainTypeId above.
                  Checkboxes, not a native <select multiple>, since a
                  real stainer run genuinely draws on several lots at
                  once and this reads far more clearly than a native
                  multi-select control. Optional at creation — see
                  isStainingNode's own doc comment for why. Batch 406:
                  spans both columns. */}
              {isStainingNode && (
                <div className="ps-batch-field ps-batch-field--wide">
                  <p className="ps-batch-field-label">{t('newContainerModal.reagentLots')}{star('stainingReagentLots')}</p>
                  <div className="ps-batch-reagent-lot-list">
                    {reagentLots.length === 0 && <div className="ps-batch-reagent-lot-empty">{t('newContainerModal.noReagentLots')}</div>}
                    {reagentLots.map(l => {
                      const label = l.stainTypeId
                        ? (stainTypes.find(s => s.id === l.stainTypeId)?.name ?? l.stainTypeId)
                        : (l.routineComponentType ?? '\u2014');
                      const checked = stainingReagentLotIds.includes(l.id);
                      return (
                        <label key={l.id} className="ps-batch-reagent-lot-row">
                          <input type="checkbox" checked={checked}
                            onChange={e => setStainingReagentLotIds(prev => e.target.checked ? [...prev, l.id] : prev.filter(id => id !== l.id))} />
                          <span>{t('newContainerModal.reagentLotLine', { reagent: label, lot: l.lotNumber })}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real feature, per the spec's own FR-1.2 "Container
                  Identifier Mode." Ad-Hoc Batch is never hardware-
                  eligible (isHardwareEligible), so this toggle only
                  shows for the three real, physical container types. */}
              {isHardwareEligible(containerType) && (
                <>
                  <div className="ps-batch-field">
                    <p className="ps-batch-field-label">{t('newContainerModal.containerIdentifierMode')}</p>
                    <div className="ps-batch-priority-toggle">
                      <button
                        className={`ps-batch-priority-btn${identifierMode === 'disposable' ? ' ps-batch-priority-btn--active' : ''}`}
                        onClick={() => setIdentifierMode('disposable')}
                        title={t('newContainerModal.disposableLabelTitle')}
                      >
                        {t('newContainerModal.disposableLabel')}
                      </button>
                      <button
                        className={`ps-batch-priority-btn${identifierMode === 'semi_permanent' ? ' ps-batch-priority-btn--active' : ''}`}
                        onClick={() => setIdentifierMode('semi_permanent')}
                        title={t('newContainerModal.reusableRackTitle')}
                      >
                        {t('newContainerModal.reusableRack')}
                      </button>
                    </div>
                  </div>

                  {identifierMode === 'semi_permanent' && (
                    <div className="ps-batch-field">
                      <label className="ps-batch-field-label" htmlFor="batch-rack-id">{t('newContainerModal.rackId')}{star('rackId')}</label>
                      <input id="batch-rack-id"
                        className="ps-batch-text-input"
                        type="text"
                        placeholder={t('newContainerModal.rackIdPlaceholder', { example: `${printSettings.rackBarcodePrefix}-${printSettings.containerTypeCodes[containerType]}-04` })}
                        value={rackId}
                        onChange={e => setRackId(e.target.value)}
                      />
                      {availableRacks.length > 0 && (
                        <div className="ps-batch-rack-picker">
                          {availableRacks.map(r => (
                            <button key={r.id} className="ps-batch-rack-chip" onClick={() => setRackId(r.rackId)}>
                              {r.rackId}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {missing.length > 0 && (
                <p className="ps-field-still-required ps-batch-field--wide" role="status">
                  {t('fieldRequirements.stillRequired', { fields: formatList(missing.map(id => t(`fieldRequirements.fields.batchManagement.${id}`)), i18n.language) })}
                </p>
              )}
              {error && <div className="ps-batch-modal-error ps-batch-field--wide">{error}</div>}
            </div>
            <div className="ps-batch-modal-footer">
              <button className="ps-btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
              <button className="ps-btn-primary" disabled={!canCreate || busy} onClick={handleCreate}>
                {busy ? t('newContainerModal.generating') : identifierMode === 'disposable' ? t('newContainerModal.generateAndPrint') : t('newContainerModal.startSession')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ps-batch-modal-header">
              <div className="ps-batch-modal-title">
                {createdBatch.identifierMode === 'semi_permanent' ? t('newContainerModal.sessionStarted') : t('newContainerModal.containerCreated')}
              </div>
              <button className="ps-mth-close" onClick={() => onCreated(createdBatch)}>✕</button>
            </div>
            <div className="ps-batch-modal-body ps-batch-barcode-body">
              {createdBatch.identifierMode === 'semi_permanent' ? (
                <div className="ps-batch-barcode-label">
                  {t('newContainerModal.rackCheckedOutNoPrint', { barcode: createdBatch.masterBarcode })}
                </div>
              ) : (
                <>
                  <div className="ps-batch-barcode-label">{t('newContainerModal.printInstructions')}</div>
                  {barcodeSvg && (
                    <div className="ps-batch-barcode-svg-wrap" dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
                  )}
                </>
              )}
              <div className="ps-batch-barcode-value">{createdBatch.masterBarcode}</div>
              <div className="ps-batch-barcode-meta">{createdBatch.containerType} · {t(`batchManagement.nodes.${createdBatch.processingNode}`)} · {createdBatch.protocol} · {createdBatch.priority}</div>
            </div>
            <div className="ps-batch-modal-footer">
              {createdBatch.identifierMode !== 'semi_permanent' && (
                <button className="ps-btn-secondary" onClick={() => window.print()}>🖨️ {t('newContainerModal.print')}</button>
              )}
              <button className="ps-btn-primary" onClick={() => onCreated(createdBatch)}>{t('newContainerModal.continueScanItems')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NewContainerModal;
