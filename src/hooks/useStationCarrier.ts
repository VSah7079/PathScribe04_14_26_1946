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
// Batch 758 (Pete: Scan-First or Scan-Last): at the Microtome a confirmed slide with no staining rack open waits on
// this station's bench (services/batches/benchSlideBuffer.ts); scanning a rack then fills it with the bench's slides
// and seals it. While slides are on the bench, closing the tab or signing out asks first.
//
// Batch 761 (Pete: a staining rack is reused run after run): at the Microtome a registered rack whose last run is
// closed starts a new run when it is scanned (no form); a rack whose last run was sealed or put on the stainer but
// never closed is held with a warning, and a supervisor can close that run and go on (services/batches/rackRuns.ts).
//
// The page keeps opening the item itself: `route(raw, openItem)` calls the
// page's own resolveScan for anything that is not a carrier, after the checks.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveScanStation } from '@/hooks/useEffectiveScanStation';
import { batchService, hardwareContainerRegistryService, printSettingsService, scanStationService, stationScanEventService } from '@/services';
import { rackRunState, rackStartsNewRun, rackRunDraft, RACK_REUSE_CLOSE_REASON } from '@/services/batches/rackRuns';
import { resolveMaterialFromScan } from '@/utils/resolveMaterialFromScan';
import { playScanBeep, playScanErrorTone } from '@/utils/playScanBeep';
import type { Batch, BatchProcessingNode } from '@/services/batches/IBatchService';
import { isBatchErrorCode, BATCH_NOT_PERMITTED } from '@/services/batches/IBatchService';
import type { ScanStation } from '@/services/scanStations/IScanStationService';
import {
  WORKSTATION_NODES, WORKSTATION_OUTPUT_NODES, carriersForStation, carrierMovesHere, decideItemScan, isCarrierBarcode, resolveCarrierScan,
  outputScanPlan, isSlideScanLevel, type CarrierPrefixes, type ManualCheckOffReason,
} from '@/services/batches/stationCarrierRules';
import { reconciliationGate } from '@/services/batches/batchListView';
import { benchSlideBuffer, type BenchSlide } from '@/services/batches/benchSlideBuffer';
import { registerLeaveGuard } from '@/utils/leaveGuards';

export type WorkstationKind = keyof typeof WORKSTATION_NODES;

/** A message for the panel: a locale key (stationCarrier.*) and its values. */
export interface CarrierNotice { key: string; values?: Record<string, string | number>; tone: 'info' | 'success' | 'warning' | 'error' }

/** A decision the person has to make before the scan goes on (Decision 1, §7.3). */
export type CarrierPending =
  | { kind: 'mismatch'; batch: Batch }
  | { kind: 'wrongItem'; displayId: string; raw: string; carrierBarcode: string }
  /** Batch 761: a reusable rack whose last run was never closed. */
  | { kind: 'rackNotClosed'; batch: Batch };

/** The page's own handling of a scanned item. Batch 757: at the Microtome it returns `labelConfirmed` (the slide's
 *  id) when the scan was the label of a slide just printed, the second scan of the dual-scan check. */
type OpenItem = (raw: string) => unknown;
const labelConfirmedBy = (result: unknown): string | null =>
  result && typeof result === 'object' && typeof (result as { labelConfirmed?: unknown }).labelConfirmed === 'string' ? (result as { labelConfirmed: string }).labelConfirmed : null;

/** A batch service refusal as a locale key the panel shows. */
const refusalKey = (error: string): string =>
  error === BATCH_NOT_PERMITTED ? 'batchDetail.notPermitted' : isBatchErrorCode(error) ? `batchDetail.errors.${error}` : 'batchDetail.actionFailed';

export function useStationCarrier(workstation: WorkstationKind) {
  const { t } = useTranslation();
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
  const [benchSlides, setBenchSlides] = useState<BenchSlide[]>([]);

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
  // Batch 758: this station's bench (slides confirmed before a rack was scanned).
  useEffect(() => { setBenchSlides(stationId ? benchSlideBuffer.list(stationId) : []); }, [stationId]);
  const benchCount = benchSlides.length;
  useEffect(() => {
    if (benchCount === 0) return;
    const message = () => t('stationCarrier.bench.leaveWarning', { count: benchCount });
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = message(); return message(); };
    window.addEventListener('beforeunload', onUnload);
    const unregister = registerLeaveGuard(`bench:${stationId}`, message);
    return () => { window.removeEventListener('beforeunload', onUnload); unregister(); };
  }, [benchCount, stationId, t]);
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

  /** Batch 757: one item into the output tray (a confirmed slide into the staining rack, an embedded block into the
   *  Microtome tray), with a notice naming both. */
  const placeInOutput = useCallback(async (tray: Batch, itemId: string, noticeKey: string) => {
    const res = await batchService.addItemByScan(tray.id, itemId, actor.id, actor.name, undefined, stationId ?? undefined);
    if (res.outcome === 'added') {
      replace(res.batch); playScanBeep();
      setNotice({ key: noticeKey, values: { item: itemId, barcode: tray.masterBarcode }, tone: 'success' });
    }
  }, [actor, stationId, replace]);

  /** Batch 757: the full output tray, scanned again: sealed, and the carrier unloaded here completed with it when ready. */
  const closeOutput = useCallback(async (tray: Batch, plan: { seal: boolean; completeLoaded: boolean }) => {
    setBusy(true);
    try {
      let sealedCount = tray.items.length;
      if (plan.seal) {
        const res = await batchService.sealManifest(tray.id, actor.id, actor.name);
        if (res.ok !== true) { fail(refusalKey(res.error), { barcode: tray.masterBarcode }); return; }
        replace(res.data); sealedCount = res.data.items.length;
      }
      let trayDone: string | null = null;
      if (plan.completeLoaded && loaded) {
        const done = await batchService.completeReconciliation(loaded.id);
        if (done.ok === true) { replace(done.data); trayDone = loaded.masterBarcode; setLoadedId(null); }
      }
      setOutputId(null); playScanBeep();
      setNotice(trayDone
        ? { key: 'stationCarrier.notice.outputClosedWithLoaded', values: { barcode: tray.masterBarcode, count: sealedCount, loaded: trayDone }, tone: 'success' }
        : { key: 'stationCarrier.notice.outputClosed', values: { barcode: tray.masterBarcode, count: sealedCount }, tone: 'success' });
    } finally { setBusy(false); }
  }, [actor, loaded, fail, replace]);

  /** Batch 758 (Scan-Last): every slide on this station's bench into the rack just scanned, then the rack is sealed
   *  (and the carrier unloaded here completed when ready). A slide the rack refuses stays on the bench. */
  const fillFromBench = useCallback(async (rack: Batch) => {
    if (!stationId) return;
    setBusy(true);
    let current = rack;
    const placed: string[] = [];
    try {
      for (const slide of benchSlideBuffer.list(stationId)) {
        const res = await batchService.addItemByScan(current.id, slide.slideId, actor.id, actor.name, undefined, stationId);
        if (res.outcome === 'added') { current = res.batch; placed.push(slide.slideId); }
        else if (res.outcome === 'already-in-batch') placed.push(slide.slideId);
      }
    } finally {
      setBenchSlides(benchSlideBuffer.remove(stationId, placed));
      setBusy(false);
    }
    replace(current);
    const left = benchSlideBuffer.list(stationId).length;
    if (placed.length === 0) { fail('stationCarrier.bench.noneAdded', { barcode: rack.masterBarcode, count: left }); return; }
    const plan = outputScanPlan(current, current, loaded, 0);
    if (plan.kind === 'close') await closeOutput(current, plan);
    if (left > 0) setNotice({ key: 'stationCarrier.bench.someLeft', values: { barcode: rack.masterBarcode, count: left }, tone: 'warning' });
  }, [stationId, actor, replace, fail, loaded, closeOutput]);

  /** A carrier barcode scanned (or a carrier chosen from the list). */
  const handleCarrier = useCallback(async (barcodeOrBatch: string | Batch) => {
    setPending(null);
    let batch: Batch | null;
    if (typeof barcodeOrBatch === 'string') {
      const res = await batchService.getByMasterBarcode(barcodeOrBatch.trim());
      batch = res.ok === true ? res.data : null;
    } else batch = barcodeOrBatch;
    // Batch 761: a reusable staining rack scanned where slides are put into racks.
    let startedRun = false;
    if (outputNodes.includes('Staining') && typeof barcodeOrBatch === 'string' && stationId) {
      const last = rackRunState(batch);
      if (last === 'notClosed' && batch!.identifierMode === 'semi_permanent' && batch!.id !== output?.id) {
        playScanErrorTone(); setPending({ kind: 'rackNotClosed', batch: batch! }); return;
      }
      if (last === 'none' || last === 'closed') {
        const rackRes = await hardwareContainerRegistryService.getByRackId(barcodeOrBatch.trim());
        const rack = rackRes.ok === true ? rackRes.data : null;
        if (rack && rackStartsNewRun(rack, last)) {
          const created = await batchService.create(rackRunDraft(rack, { stationId, userId: actor.id, userName: actor.name }));
          if (created.ok !== true) { fail(refusalKey(created.error), { barcode: rack.rackId }); return; }
          batch = created.data; replace(created.data); startedRun = true;
        }
      }
    }
    const decision = resolveCarrierScan({ batch, stationNodes: nodes, hasStation: !!stationId, outputNodes });
    const barcode = batch?.masterBarcode ?? (typeof barcodeOrBatch === 'string' ? barcodeOrBatch.trim() : '');
    switch (decision.kind) {
      case 'unknown': fail('stationCarrier.notice.unknown', { barcode }); return;
      case 'closed': fail(decision.status === 'complete' ? 'stationCarrier.notice.closedComplete' : 'stationCarrier.notice.closedAborted', { barcode, at: decision.at ?? '' }); return;
      case 'noStation': fail('stationCarrier.notice.noStation', { barcode }); return;
      // Batch 734 (Pete): an ad-hoc carrier arriving from another station moves here without a question.
      case 'open': await openHere(batch!, 'ok', carrierMovesHere(batch!, stationId) ? 'stationCarrier.notice.movedHere' : decision.adHoc ? 'stationCarrier.notice.openedAdHoc' : 'stationCarrier.notice.opened'); return;
      case 'output': {
        // Batch 757: the output tray scanned again is full: it is sealed (ready for the next step), and the carrier
        // being unloaded here closes with it once every item is scanned off.
        // Batch 758: another rack scanned with slides on the bench (Scan-Last) takes them all and is sealed.
        const plan = outputScanPlan(output, batch!, loaded, benchCount);
        if (plan.kind === 'close') { await closeOutput(output!, plan); return; }
        if (plan.kind === 'fillFromBench') { await fillFromBench(batch!); return; }
        // Batch 758: a rack made after this page opened is not in the list yet, so it is added (before, it was not used).
        replace(batch!); setOutputId(batch!.id); playScanBeep();
        setNotice({ key: startedRun ? 'stationCarrier.rack.newRun' : 'stationCarrier.notice.outputSet', values: { barcode }, tone: 'success' });
        return;
      }
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
  }, [nodes, outputNodes, stationId, actor, fail, openHere, replace, output, loaded, benchCount]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Marks an item off the loaded carrier (unloading starts with the first one) and opens it. */
  const unloadItem = useCallback(async (batch: Batch, raw: string, openItem: OpenItem) => {
    // Batch 757: scans can come faster than the screen updates, so the carrier is read again before deciding.
    const fresh = await batchService.getById(batch.id);
    let current = fresh.ok === true ? fresh.data : batch;
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
    // Batch 757: a slide label at a bench that fills a staining rack is the bench's own output, not an item of the
    // carrier being unloaded: the page checks it (the dual scan), and a confirmed slide goes into the rack.
    if (resolved && isSlideScanLevel(resolved.target.level) && outputNodes.includes('Staining')) {
      const confirmed = labelConfirmedBy(await openItem(raw));
      if (confirmed && output) await placeInOutput(output, confirmed, 'stationCarrier.notice.slideIntoRack');
      // Batch 758 (Scan-Last): no rack open yet, so the slide waits on this station's bench.
      else if (confirmed && stationId) {
        const bench = benchSlideBuffer.add(stationId, { slideId: confirmed, caseAccession: resolved.fullAccession, confirmedAt: new Date().toISOString(), userId: actor.id });
        setBenchSlides(bench); playScanBeep();
        setNotice({ key: 'stationCarrier.bench.slideOnBench', values: { item: confirmed, count: bench.length }, tone: 'success' });
      }
      return;
    }
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
  }, [loaded, stationId, nodes, actor, unloadItem, outputNodes, output]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Every scan at the workstation goes through here. */
  // Batch 757: one scan at a time, in the order they came (a fast scanner sends the next before the last is saved).
  const scanQueue = useRef<Promise<unknown>>(Promise.resolve());
  const route = useCallback((raw: string, openItem: OpenItem) => {
    const run = scanQueue.current.then(async () => {
      const value = raw.trim();
      if (!value) return;
      if (isCarrierBarcode(value, prefixes)) { await handleCarrier(value); return; }
      await handleItem(value, openItem);
    }).catch(() => undefined);
    scanQueue.current = run;
    return run;
  }, [prefixes, handleCarrier, handleItem]);

  /** "Continue anyway": open the other step's carrier here, or keep the wrong item (recorded as unexpected). Audited. */
  const continuePending = useCallback(async () => {
    const p = pending;
    if (!p) return;
    setPending(null);
    setBusy(true);
    try {
      if (p.kind === 'rackNotClosed') return;
      if (p.kind === 'mismatch') { await openHere(p.batch, 'mismatch', 'stationCarrier.notice.openedMismatch'); return; }
      const openItem = pendingOpen.current ?? (() => undefined);
      pendingOpen.current = null;
      if (loaded) await unloadItem(loaded, p.raw, openItem);
      else await openItem(p.raw);
      setNotice({ key: 'stationCarrier.notice.unexpectedKept', values: { item: p.displayId, barcode: p.carrierBarcode }, tone: 'warning' });
    } finally { setBusy(false); }
  }, [pending, loaded, openHere, unloadItem]);

  /** Batch 761: a supervisor closes the rack's forgotten run (an override, recorded with the reason), then the rack
   *  is scanned again and starts a new run. */
  const closeLastRun = useCallback(async () => {
    const p = pending;
    if (!p || p.kind !== 'rackNotClosed') return;
    setPending(null);
    setBusy(true);
    try {
      let run = p.batch;
      if (run.status === 'active') {
        const started = await batchService.startReconciliation(run.id, actor.id, actor.name);
        if (started.ok !== true) { fail(refusalKey(started.error), { barcode: run.masterBarcode }); return; }
        run = started.data;
      }
      const done = await batchService.overrideAndComplete(run.id, actor.id, actor.name, RACK_REUSE_CLOSE_REASON, stationId ?? undefined);
      if (done.ok !== true) { fail(refusalKey(done.error), { barcode: run.masterBarcode }); return; }
      replace(done.data);
    } finally { setBusy(false); }
    await handleCarrier(p.batch.masterBarcode);
  }, [pending, actor, stationId, fail, replace, handleCarrier]);

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

  /** Batch 757 (Pete: the scanner may break): an item checked off the loaded carrier by hand, with the reason, which
   *  is written to the station log; the page opens the item as for a scan. */
  const checkOffByHand = useCallback(async (displayId: string, reason: ManualCheckOffReason, openItem: OpenItem) => {
    if (!loaded || decideItemScan(loaded, displayId) !== 'in-manifest') return;
    setBusy(true);
    try {
      await unloadItem(loaded, displayId, openItem);
      if (stationId) {
        void stationScanEventService.recordMany([{
          itemId: displayId, materialType: loaded.items.find(i => i.displayId === displayId)?.materialType ?? 'block', caseAccession: loaded.items.find(i => i.displayId === displayId)?.caseAccession,
          stationId, node: nodes[0], userId: actor.id, userName: actor.name, action: 'unloaded', result: 'ok', carrierId: loaded.masterBarcode, note: `Checked off by hand: ${reason}`,
        }]).catch(() => undefined);
      }
      setNotice({ key: 'stationCarrier.notice.checkedOffByHand', values: { item: displayId, barcode: loaded.masterBarcode }, tone: 'warning' });
    } finally { setBusy(false); }
  }, [loaded, unloadItem, stationId, nodes, actor]);

  /** Batch 757: the block just embedded, into the Embedding output tray (the Microtome tray). */
  const addBlockToOutput = useCallback(async (displayId: string) => {
    if (output) await placeInOutput(output, displayId, 'stationCarrier.notice.blockIntoTray');
  }, [output, placeInOutput]);

  return {
    workstation, checkOffByHand, addBlockToOutput, benchCount, benchSlides,
    station, stationId, nodes, outputNodes, carriers, loaded, output, notice, pending, busy,
    route, chooseCarrier: handleCarrier, continuePending, cancelPending, closeLastRun, finishUnloading, seal,
    closeLoaded: () => setLoadedId(null), closeOutput: () => setOutputId(null), dismissNotice: () => setNotice(null), refresh,
  };
}

export type StationCarrier = ReturnType<typeof useStationCarrier>;
