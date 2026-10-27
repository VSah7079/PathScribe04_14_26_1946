// src/pages/AddOnOrderPage/hooks/useAddOnOrderStation.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per PS-287 (Pathologist-Initiated Add-On Orders). Genuinely
// different shape from every prior workstation this session built
// (Microtomy/Embedding/Slide Distribution): this is CASE-scoped, not
// block/slide-scoped — a pathologist reviewing one case places one or
// more add-on orders against that case's own real blocks, same real
// "search or scan an accession to open it" convention
// AccessionPage/other case-scoped pages already use (caseRouter.getCase
// resolves a real accession the same way it does everywhere else in
// this app), just with a whole Case loaded rather than one block/decant
// work item.
//
// Real, per this ticket's own direct Jira comment: routing every order
// line resolves through the real, existing SCAN_STATION_WORKFLOW_STAGES/
// ScanStation.facilityId backbone (via resolveRoutingStations), scoped
// to the case's own real performing lab (resolveCasePerformingLab,
// services/cases/casePoolAssignmentService.ts) — never a single,
// enterprise-wide queue.
//
// Real, honest scope note on the §5 Exception/Notification Loop: the
// spec's own "tech flags at microtome" step is real and working here,
// but surfaced on THIS page rather than requiring an edit to the
// already-shipped MicrotomyWorkstationPage (PS-284) — wiring an actual
// "flag exhaustion" button into that page's own live cutting flow is
// real, separate, cross-page follow-up work, not attempted in this
// pass. The pathologist's own response (cancel/modify/approve
// destructive cut) lives in the same real Order Tracking dashboard this
// ticket already requires, which doubles as the "LIS inbox" the spec
// describes — this app has no separate, general notification-center UI
// to route into instead. A real, transport-only email is also fired
// (services/communications/notificationService.ts, same pattern every
// other real notifier in this app already uses) as the actual "instant
// alert."
//
// Batch 403 (PS-287 / PS-359): placing, flagging, answering and "block
// retrieved" go through services/addOnOrders/addOnOrderActions.ts, which checks
// the two new permissions (add-on:order:place, add-on:exception:approve-
// destructive-cut) and the organisation's Field Requirements (page
// "addOnOrder"). This hook keeps the state and the one save per action. Scan
// stations come from @/services (off the deployment baseline); messages are
// locale keys.
//
// Batch 669 (ws-8): each action runs through `act` (services/workstationSave/runCaseAction.ts via
// hooks/useWorkstationSave.ts): the action is run on the newest copy of the case and run again if someone else saved
// first (up to 3 tries). A save that still fails comes back as `notSaved` ("Not saved" on the page) and the case is
// reloaded from the store, instead of the change staying on screen as if it were saved.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { caseRouter } from '@/services/cases/CaseRouter';
import {
  userService, facilityService, stainTypeService, scanStationService, authorizationService, activeReferenceLabs, molecularOrderEngine,
} from '@/services';
import { sendEmail } from '@/services/communications/notificationService';
import { resolveCasePerformingLab } from '@/services/cases/casePoolAssignmentService';
import {
  placeAddOnOrders, respondToAddOnException, flagAddOnException, markAddOnBlockRetrieved,
  type AddOnActionResult, type AddOnExceptionResponse, type AddOnOrderActionDeps,
} from '@/services/addOnOrders/addOnOrderActions';
import { deskRecipientsFor, staffDisplayName } from '@/services/addOnOrders/blockExceptionRouting';
import { useFieldRequirements } from '@/hooks/useFieldRequirements';
import { useWorkstationSave } from '@/hooks/useWorkstationSave';
import type { SpecimenSaver } from '@/services/workstationSave/runCaseAction';
import type { Case } from '@/types/case/Case';
import type { StainOrder } from '@/types/case/Specimen';
import type { StainType } from '@/services/stains/IStainService';
import type { ScanStation } from '@/services/scanStations/IScanStationService';
import type { Facility } from '@/services/facilities/IFacilityService';
import {
  resolveAddOnRouting, resolveRoutingStations, computeAddOnTrackingStage,
  type AddOnOrderLineInput, type AddOnOrderSubmissionInput, type AddOnTrackingStage,
} from '@/utils/addOnOrderOperations';
import type { BlockExceptionReason } from '@/types/case/AddOnOrder';

export interface TrackedAddOnOrder {
  specimenId: string;
  specimenLabel: string;
  blockId: string;
  blockLabel: string;
  order: StainOrder;
  stage: AddOnTrackingStage;
}

export function useAddOnOrderStation() {
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  /** A locale key and its values. */
  const [searchError, setSearchError] = useState<{ key: string; values?: Record<string, string> } | null>(null);
  const [stainTypes, setStainTypes] = useState<StainType[]>([]);
  const [stations, setStations] = useState<ScanStation[]>([]);
  const [referenceLabs, setReferenceLabs] = useState<Facility[]>([]);
  const [performingLabFacilityId, setPerformingLabFacilityId] = useState<string | undefined>(undefined);
  const requirements = useFieldRequirements('addOnOrder');
  const { runAction } = useWorkstationSave();

  const actor = { id: user?.id ?? 'unknown', name: user?.name ?? user?.id ?? 'unknown' };

  /** Batch 669 (ws-20): the case's primary pathologist as a name (order.assignedTo is stored as a user id); the stored text if it is not a known user. */
  const [primaryPathologistName, setPrimaryPathologistName] = useState<string | undefined>(undefined);
  const assignedTo = caseData?.order?.assignedTo;
  useEffect(() => {
    let live = true;
    if (!assignedTo) { setPrimaryPathologistName(undefined); return; }
    userService.getById(assignedTo)
      .then(r => { if (live) setPrimaryPathologistName(staffDisplayName(assignedTo, r.ok && r.data ? [r.data] : [])); })
      .catch(() => { if (live) setPrimaryPathologistName(assignedTo); });
    return () => { live = false; };
  }, [assignedTo]);

  const loadDirectories = useCallback(async () => {
    const [stainsRes, stationsRes, facilitiesRes] = await Promise.all([
      stainTypeService.getAll(), scanStationService.getAll(), facilityService.getAll(),
    ]);
    if (stainsRes.ok) setStainTypes(stainsRes.data.filter(s => s.active));
    if (stationsRes.ok) setStations(stationsRes.data);
    if (facilitiesRes.ok) setReferenceLabs(activeReferenceLabs(facilitiesRes.data));
  }, []);

  /** Real, same "search or scan an accession" case lookup
   *  caseRouter.getCase already resolves everywhere else in this app —
   *  loads the WHOLE case (every specimen/block), since an add-on order
   *  can target any of them, not one pre-selected block. */
  const openCase = useCallback(async (accessionOrId: string): Promise<{ ok: boolean }> => {
    setSearchError(null);
    const trimmed = accessionOrId.trim();
    if (!trimmed) { setSearchError({ key: 'addOnOrder.errors.enterAccession' }); return { ok: false }; }
    const found = await caseRouter.getCase(trimmed);
    if (!found) { setSearchError({ key: 'addOnOrder.errors.caseNotFound', values: { query: trimmed } }); return { ok: false }; }
    setCaseData(found);
    const lab = await resolveCasePerformingLab(found);
    setPerformingLabFacilityId(lab);
    return { ok: true };
  }, []);

  const closeCase = useCallback(() => {
    setCaseData(null);
    setSearchError(null);
    setPerformingLabFacilityId(undefined);
  }, []);

  const baseDeps: AddOnOrderActionDeps = {
    enforce: (capability, context) => authorizationService.enforce(capability, context),
    // Replaced by `act` with the save of the copy of the case the action runs on.
    saveSpecimens: async () => {},
    // Batch 467: molecular lines become orders the molecular order engine routes and queues.
    ingestMolecularOrders: requests => molecularOrderEngine.ingest(requests),
  };

  /** Batch 669 (ws-8): runs an action on the newest copy of the case (run again if someone else saved first), shows
   *  what it saved, and turns a save that did not happen into `notSaved` after reloading the stored case. */
  const act = useCallback(async (
    run: (current: Case, deps: AddOnOrderActionDeps) => Promise<AddOnActionResult>,
  ): Promise<AddOnActionResult> => {
    if (!caseData) return { ok: false, failed: true };
    const outcome = await runAction(caseData.id, (current: Case, save: SpecimenSaver) =>
      run(current, { ...baseDeps, saveSpecimens: (_c, specimens) => save(specimens) }));
    if (outcome.status === 'failed') {
      if (outcome.latest) setCaseData(outcome.latest);
      return { ok: false, notSaved: outcome.reason };
    }
    if (outcome.status === 'saved') setCaseData(outcome.caseData);
    return outcome.value;
  }, [caseData, runAction]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Places the order on every chosen block (services/addOnOrders). */
  const submitOrder = useCallback(async (
    blockIds: string[], lines: AddOnOrderLineInput[], submission: AddOnOrderSubmissionInput,
  ): Promise<AddOnActionResult> => {
    if (!caseData) return { ok: false, failed: true };
    return act((current, deps) => placeAddOnOrders({ caseData: current, blockIds, lines, submission, actor, performingLabFacilityId, requirements }, deps));
  }, [caseData, performingLabFacilityId, requirements, act]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Real, per §4 — every real StainOrder anywhere on this case that
   *  this flow itself created (orderedByPathologistId set), with its
   *  live, derived tracking stage. Recomputed on every render from the
   *  loaded case's own real data — never a separately stored list. */
  const trackedOrders = useCallback((): TrackedAddOnOrder[] => {
    if (!caseData) return [];
    const rows: TrackedAddOnOrder[] = [];
    for (const specimen of caseData.specimens ?? []) {
      for (const block of specimen.blocks ?? []) {
        for (const order of block.stains) {
          // Batch 669 (ws-3): a slide with an open exception is listed too, even if it was not ordered here (an original
          // H&E, say), so the notice that went to the Supervisor / Accessioning Desk has a place to be answered.
          if (!order.orderedByPathologistId && !order.exception) continue;
          rows.push({ specimenId: specimen.id, specimenLabel: specimen.label, blockId: block.id, blockLabel: block.label, order, stage: computeAddOnTrackingStage(order) });
        }
      }
    }
    return rows.sort((a, b) => (b.order.orderedAt ?? '').localeCompare(a.order.orderedAt ?? ''));
  }, [caseData]);

  const handleMarkBlockRetrieved = useCallback(async (stainOrderId: string): Promise<AddOnActionResult> => {
    if (!caseData) return { ok: false, failed: true };
    return act((current, deps) => markAddOnBlockRetrieved({ caseData: current, stainOrderId, actor }, deps));
  }, [caseData, act]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Real, per §5 — a tech flags a block exception; the ordering pathologist is emailed. */
  const handleFlagException = useCallback(async (stainOrderId: string, reason: BlockExceptionReason, note: string): Promise<AddOnActionResult> => {
    if (!caseData) return { ok: false, failed: true };
    return act((current, deps) => flagAddOnException({ caseData: current, stainOrderId, reason, note, actor, requirements }, {
      saveSpecimens: deps.saveSpecimens,
      enforce: deps.enforce,
      getUserEmail: async id => { const r = await userService.getById(id); return r.ok ? r.data.email : undefined; },
      // Batch 669 (ws-3): no ordering pathologist to e-mail: the Supervisor / Accessioning Desk is told instead.
      getDeskRecipients: async c => { const r = await userService.getAll(); return deskRecipientsFor(c, r.ok ? r.data : []); },
      sendEmail,
    }));
  }, [caseData, requirements, act]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleResolveException = useCallback(async (
    stainOrderId: string, action: AddOnExceptionResponse, responseNote: string,
    modifyChanges?: { levelDepthMicrons?: number; cuttingInstructions?: string },
  ): Promise<AddOnActionResult> => {
    if (!caseData) return { ok: false, failed: true };
    return act((current, deps) => respondToAddOnException({ caseData: current, stainOrderId, action, responseNote, modifyChanges, actor, requirements }, deps));
  }, [caseData, requirements, act]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Real, per §3 — which real stations this order's routed workflow
   *  stage would actually reach, scoped to this case's own performing
   *  lab. Display-only (this page doesn't dispatch cutting itself, the
   *  same real division of labor PS-284's own bench already owns). */
  const stationsForRouting = useCallback((orderKind: AddOnOrderLineInput['orderKind'], category: StainType['category']): ScanStation[] => {
    const routing = resolveAddOnRouting(orderKind, category);
    return resolveRoutingStations(stations, routing.workflowStage, performingLabFacilityId);
  }, [stations, performingLabFacilityId]);

  return {
    caseData, searchError, stainTypes, stations, referenceLabs, performingLabFacilityId, actor, requirements, primaryPathologistName,
    loadDirectories, openCase, closeCase, submitOrder, trackedOrders,
    handleMarkBlockRetrieved, handleFlagException, handleResolveException, stationsForRouting,
  };
}
