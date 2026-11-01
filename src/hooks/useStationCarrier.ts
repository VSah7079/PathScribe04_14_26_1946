// src/hooks/useStationCarrier.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 726 (Lab Workflow & Batch spec, Decision 1, §4, §7.1, §7.3, §7.6):
// carriers at a workstation. Shared by the Embedding, Microtome and Slide
// Distribution workstations, which used not to read batches at all.
//
//   - lists the open carriers routed to this station or at its step;
//   - a carrier scan (CONT-/RACK-, the configured prefixes) loads the carrier
//     here, moves it here from the step before, sets it as the Microtome's
//     output tray, or explains plainly why not (no station, another step,
//     closed, unknown) — services/batches/stationCarrierRules.ts decides;
//   - with a carrier loaded, an item scan is checked against its manifest:
//     on it, the item is marked matched (unloading starts with the first
//     one); not on it, the screen asks before opening the item, and continuing
//     records it as unexpected, audited (§7.3);
//   - every scan is written to the station scan log with the station; with no
//     station set nothing is recorded and the panel asks for one (§7.6).
//
// The page keeps opening the item itself: `route(raw, openItem)` calls the
// page's own resolveScan for anything that is not a carrier, after the checks.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { batchService, printSettingsService, scanStationService, stationScanEventService } from '@/services';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { playScanBeep, playScanErrorTone } from '@/utils/playScanBeep';
import type { Batch, BatchProcessingNode } from '@/services/batches/IBatchService';
import { isBatchErrorCode, BATCH_NOT_PERMITTED } from '@/services/batches/IBatchService';
import type { ScanStation } from '@/services/scanStations/IScanStationService';
import {
  WORKSTATION_NODES, WORKSTATION_OUTPUT_NODES, carriersForStation, carrierMovesHere, decideItemScan, isCarrierBarcode, resolveCarrierScan,
  type CarrierPrefixes,
} from '@/services/batches/stationCarrierRules';
import { reconciliationGate } from '@/services/batches/batchListView';

export type WorkstationKind = keyof typeof WORKSTATION_NODES;

/** A message for the panel: a locale key (stationCarrier.*) and its values. */
export interface CarrierNotice { key: string; values?: Record<string, string | number>; tone: 'info' | 'success' | 'warning' | 'error' }

/** A decision the person has to make before the scan goes on (Decision 1, §7.3). */
export type CarrierPending =
  | { kind: 'mismatch'; batch: Batch }
  | { kind: 'wrongItem'; displayId: string; raw: string; carrierBarcode: string };

type OpenItem = (raw: string) => unknown;

/** A batch service refusal as a locale key the panel shows. */
const refusalKey = (error: string): string =>
  error === BATCH_NOT_PERMITTED ? 'batchDetail.notPermitted' : isBatchErrorCode(error) ? `batchDetail.errors.${error}` : 'batchDetail.actionFailed';

export function useStationCarrier(workstation: WorkstationKind) {
  const { user } = useAuth();
  const { effectiveStationId } = useEffectiveScanStation();
  const actor = useMemo(() => ({ id: user?.id ?? 'unknown', name: user?.name ?? user?.id ?? 'unknown' }), [user?.id, user?.name]);
  const nodes = WORKSTATION_NODES[workstation] as readonly BatchProcessingNode[];
  const outputNodes = WORKSTATION_OUTPUT_NODES[workstation] as readonly BatchProcessingNode[];

  const [station, setStation] = useState<ScanStation | null>(null);
  const [facilityOfStation, setFacilityOfStation] = useState<Map<string, string>>(new Map());
  const [batches, setBatches] = useState<Batch[]>([]);
  const [prefixes, setPrefixes] = useState<CarrierPrefixes>({});
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [outputId, setOutputId] = useState<string | null>(null);
  const [notice, setNotice] = useState<CarrierNotice | null>(null);
  const [pending, setPending] = useState<CarrierPending | null>(null);
  const [busy, setBusy] = useState(false);
  const pendingOpen = useRef<OpenItem | null>(null);

  const refresh = useCallback(async (): Promise<Batch[]> => {
    const res = await batchService.getAll();
    if (res.ok !== true) return [];
    setBatches(res.data);
    return res.data;
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    printSettingsService.get().then(res => { if (res.ok === true) setPrefixes({ disposable: res.data.disposableBarcodePrefix, rack: res.data.rackBarcodePrefix }); });
    scanStationService.getAll().then(res => { if (res.ok === true) setFacilityOfStation(new Map(res.data.map(s => [s.id, s.facilityId]))); });
  }, []);
  useEffect(() => {
    if (!effectiveStationId) { setStation(null); return; }
    scanStationService.getById(effectiveStationId).then(res => setStation(res.ok === true ? res.data : null));
  }, [effectiveStationId]);

  const stationId = station?.id ?? null;
  const loaded = batches.find(b => b.id === loadedId) ?? null;
  const output = batches.find(b => b.id === outputId) ?? null;
  const carriers = useMemo(
    () => carriersForStation(batches, { nodes, stationId, stationFacilityId: station?.facilityId, facilityOfStation }),
    [batches, nodes, stationId, station?.facilityId, facilityOfStation],
  );

  const replace = useCallback((b: Batch) => setBatches(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [...prev, b]), []);
  const fail = useCallback((key: string, values?: CarrierNotice['values']) => { playScanErrorTone(); setNotice({ key, values, tone: 'error' }); }, []);

  /** Opens a carrier here (records the carrier scan on the station log, and this station as its Target Workstation if it had none). */
  const openHere = useCallback(async (batch: Batch, result: 'ok' | 'mismatch', noticeKey: string) => {
    if (!stationId) return;
    const res = await batchService.recordCarrierScan(batch.id, stationId, actor.id, actor.name, result);
    if (res.ok !== true) { fail(refusalKey(res.error), { barcode: batch.masterBarcode }); return; }
    replace(res.data);
    setLoadedId(res.data.id);
    playScanBeep();
    setNotice({ key: noticeKey, values: { barcode: batch.masterBarcode, count: batch.items.length }, tone: result === 'ok' ? 'success' : 'warning' });
  }, [stationId, actor, fail, replace]);

  /** A carrier barcode scanned (or a carrier chosen from the list). */
  const handleCarrier = useCallback(async (barcodeOrBatch: string | Batch) => {
    setPending(null);
    let batch: Batch | null;
    if (typeof barcodeOrBatch === 'string') {
      const res = await batchService.getByMasterBarcode(barcodeOrBatch.trim());
      batch = res.ok === true ? res.data : null;
    } else batch = barcodeOrBatch;
    const decision = resolveCarrierScan({ batch, stationNodes: nodes, hasStation: !!stationId, outputNodes });
    const barcode = batch?.masterBarcode ?? (typeof barcodeOrBatch === 'string' ? barcodeOrBatch.trim() : '');
    switch (decision.kind) {
      case 'unknown': fail('stationCarrier.notice.unknown', { barcode }); return;
      case 'closed': fail(decision.status === 'complete' ? 'stationCarrier.notice.closedComplete' : 'stationCarrier.notice.closedAborted', { barcode, at: decision.at ?? '' }); return;
      case 'noStation': fail('stationCarrier.notice.noStation', { barcode }); return;
      // Batch 734 (Pete): an ad-hoc carrier arriving from another station moves here without a question.
      case 'open': await openHere(batch!, 'ok', carrierMovesHere(batch!, stationId) ? 'stationCarrier.notice.movedHere' : decision.adHoc ? 'stationCarrier.notice.openedAdHoc' : 'stationCarrier.notice.opened'); return;
      case 'output':
        setOutputId(batch!.id); playScanBeep();
        setNotice({ key: 'stationCarrier.notice.outputSet', values: { barcode }, tone: 'success' });
        return;
      case 'handoff': {
        const res = await batchService.advanceToNode(batch!.id, decision.toNode, actor.id, actor.name, stationId ?? undefined);
        if (res.ok !== true) { fail(refusalKey(res.error), { barcode }); return; }
        replace(res.data);
        setLoadedId(res.data.id);
        playScanBeep();
        setNotice({ key: 'stationCarrier.notice.handoff', values: { barcode, from: batch!.processingNode, count: res.data.items.length }, tone: 'success' });
        return;
      }
      case 'mismatch':
        playScanErrorTone();
        setPending({ kind: 'mismatch', batch: batch! });
        return;
    }
  }, [nodes, outputNodes, stationId, actor, fail, openHere, replace]);

  /** Marks an item off the loaded carrier (unloading starts with the first one) and opens it. */
  const unloadItem = useCallback(async (batch: Batch, raw: string, openItem: OpenItem) => {
    let current = batch;
    if (current.status === 'active') {
      const started = await batchService.startReconciliation(current.id, actor.id, actor.name);
      if (started.ok !== true) { fail(refusalKey(started.error), { barcode: current.masterBarcode }); await openItem(raw); return; }
      current = started.data;
    }
    const res = await batchService.scanItemOut(current.id, raw, actor.id, actor.name, stationId ?? undefined);
    if (res.ok === true) replace(res.data);
    else fail(refusalKey(res.error), { barcode: current.masterBarcode });
    await openItem(raw);
  }, [actor, stationId, fail, replace]);

  /** Anything that is not a carrier: an item scan, checked against the loaded carrier, then opened by the page. */
  const handleItem = useCallback(async (raw: string, openItem: OpenItem) => {
    const resolved = await resolveMaterialFromScan(raw).catch(() => null);
    const displayId = resolved?.displayId ?? null;
    if (loaded && (loaded.status === 'active' || loaded.status === 'reconciling')) {
      const decision = decideItemScan(loaded, displayId);
      if (decision === 'in-manifest') { await unloadItem(loaded, raw, openItem); return; }
      if (decision === 'not-in-manifest') {
        playScanErrorTone();
        pendingOpen.current = openItem;
        setPending({ kind: 'wrongItem', displayId: displayId!, raw, carrierBarcode: loaded.masterBarcode });
        return;
      }
    }
    // No carrier loaded (or already matched, or not resolved): the scan is recorded at this station, then opened.
    if (stationId) {
      void stationScanEventService.recordMany([{
        itemId: displayId ?? raw.trim(), materialType: resolved ? resolved.target.level : 'unknown', caseAccession: resolved?.fullAccession,
        stationId, node: nodes[0], userId: actor.id, userName: actor.name, action: 'received', result: resolved ? 'ok' : 'not-found',
        carrierId: loaded && displayId && decideItemScan(loaded, displayId) === 'already-matched' ? loaded.masterBarcode : undefined,
      }]).catch(() => undefined);
    }
    await openItem(raw);
  }, [loaded, stationId, nodes, actor, unloadItem]);

  /** Every scan at the workstation goes through here. */
  const route = useCallback(async (raw: string, openItem: OpenItem) => {
    const value = raw.trim();
    if (!value) return;
    if (isCarrierBarcode(value, prefixes)) { await handleCarrier(value); return; }
    await handleItem(value, openItem);
  }, [prefixes, handleCarrier, handleItem]);

  /** "Continue anyway": open the other step's carrier here, or keep the wrong item (recorded as unexpected). Audited. */
  const continuePending = useCallback(async () => {
    const p = pending;
    if (!p) return;
    setPending(null);
    setBusy(true);
    try {
      if (p.kind === 'mismatch') { await openHere(p.batch, 'mismatch', 'stationCarrier.notice.openedMismatch'); return; }
      const openItem = pendingOpen.current ?? (() => undefined);
      pendingOpen.current = null;
      if (loaded) await unloadItem(loaded, p.raw, openItem);
      else await openItem(p.raw);
      setNotice({ key: 'stationCarrier.notice.unexpectedKept', values: { item: p.displayId, barcode: p.carrierBarcode }, tone: 'warning' });
    } finally { setBusy(false); }
  }, [pending, loaded, openHere, unloadItem]);

  const cancelPending = useCallback(() => { pendingOpen.current = null; setPending(null); }, []);

  /** Finish unloading: completes the reconciliation when every item is matched (the service checks again). */
  const finishUnloading = useCallback(async () => {
    if (!loaded) return;
    setBusy(true);
    const res = await batchService.completeReconciliation(loaded.id);
    setBusy(false);
    if (res.ok !== true) { fail(refusalKey(res.error), { barcode: loaded.masterBarcode, count: reconciliationGate(loaded).unexpectedCount, items: reconciliationGate(loaded).missingItems.map(i => i.displayId).join(', ') }); return; }
    replace(res.data);
    setLoadedId(null);
    setNotice({ key: 'stationCarrier.notice.finished', values: { barcode: loaded.masterBarcode }, tone: 'success' });
  }, [loaded, fail, replace]);

  const seal = useCallback(async (target: Batch) => {
    setBusy(true);
    const res = await batchService.sealManifest(target.id, actor.id, actor.name);
    setBusy(false);
    if (res.ok !== true) { fail(refusalKey(res.error), { barcode: target.masterBarcode }); return; }
    replace(res.data);
    setNotice({ key: 'stationCarrier.notice.sealed', values: { barcode: target.masterBarcode, count: res.data.items.length }, tone: 'success' });
  }, [actor, fail, replace]);

  /** The Microtome's regrouping (§2 row 5): the given slides go into the output tray. */
  const addToOutput = useCallback(async (displayIds: string[]) => {
    if (!output || displayIds.length === 0) return;
    setBusy(true);
    let added = 0;
    let latest: Batch | null = null;
    for (const id of displayIds) {
      const res = await batchService.addItemByScan(output.id, id, actor.id, actor.name, undefined, stationId ?? undefined);
      if (res.outcome === 'added') { added += 1; latest = res.batch; }
    }
    setBusy(false);
    if (latest) replace(latest);
    setNotice({ key: 'stationCarrier.notice.addedToOutput', values: { count: added, barcode: output.masterBarcode }, tone: added > 0 ? 'success' : 'warning' });
  }, [output, actor, stationId, replace]);

  return {
    station, stationId, nodes, outputNodes, carriers, loaded, output, notice, pending, busy,
    route, chooseCarrier: handleCarrier, continuePending, cancelPending, finishUnloading, seal, addToOutput,
    closeLoaded: () => setLoadedId(null), closeOutput: () => setOutputId(null), dismissNotice: () => setNotice(null), refresh,
  };
}

export type StationCarrier = ReturnType<typeof useStationCarrier>;
