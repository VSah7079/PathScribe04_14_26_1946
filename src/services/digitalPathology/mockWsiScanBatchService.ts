// src/services/digitalPathology/mockWsiScanBatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up on Cytology Assisted Instrumentation —
// see IWsiScanBatchService.ts's own header for the full architectural
// account.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { localLiveUpdateService } from '../liveUpdates/localLiveUpdateService';
import type { WsiScanBatchChange } from '../liveUpdates/liveUpdateContract';
import { withMissingSeedRecords } from '../mockSeedMerge';
import { wallScanDemoBatches } from '../batches/wallDisplayDemoBatches';
import { allSlidesScanned, type IWsiScanBatchService, type WsiScanBatch } from './IWsiScanBatchService';

// ─── Seed data ──────────────────────────────────────────────────────────────
// Real, per direct follow-up ("Can you put some seed data in so that
// I can demonstrate the DP... columns and check the resulting page?
// Right now they are all blank") — real, plausible batches against
// real, already-seeded surgical pathology cases (mockCaseService.ts),
// not fabricated case ids. S26-4404's own real 6 specimens (Gleason
// 7/Grade Group 2 prostate biopsy) map to 6 real slides here.
// Batch 434: scanners are Equipment register codes (mockEquipmentService.ts
// seeds APERIO_GT450_01/02 and GENIUS_01); batches with an unload time are
// 'unloaded' (the old unload bug left them 'completed').
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const SEED_WSI_BATCHES: WsiScanBatch[] = [
  {
    id: 'wsi-batch-seed-4404', batchBarcode: 'WSI-20260913-0001', scannerInstrumentId: 'APERIO_GT450_02',
    status: 'unloaded', loadedAt: '2026-09-13T08:00:00.000Z', dispatchedAt: '2026-09-13T08:05:00.000Z', unloadedAt: '2026-09-13T09:10:00.000Z',
    slides: [
      { slidePosition: '1', caseId: 'S26-4404', specimenId: 'S26-4404-SP-1', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T08:15:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '2', caseId: 'S26-4404', specimenId: 'S26-4404-SP-2', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T08:20:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '3', caseId: 'S26-4404', specimenId: 'S26-4404-SP-3', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T08:25:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '4', caseId: 'S26-4404', specimenId: 'S26-4404-SP-4', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T08:30:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '5', caseId: 'S26-4404', specimenId: 'S26-4404-SP-5', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T08:35:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '6', caseId: 'S26-4404', specimenId: 'S26-4404-SP-6', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T08:40:00.000Z', acquisitionMode: 'single_plane' },
    ],
  },
  // Real, deliberate partial/error mix — per direct guidance's own
  // original spec examples ("3/4 Partial (1 Scanning)", "2/3 Error
  // (Focus Fail)") — so the Digital Readiness badge's own three real
  // color states all have something real to show, not just green.
  {
    id: 'wsi-batch-seed-4408', batchBarcode: 'WSI-20260913-0002', scannerInstrumentId: 'APERIO_GT450_01',
    // Batch 747 (S8): still scanning, so its times are relative to the reset (it showed as weeks old on the wall).
    status: 'scanning', loadedAt: minutesAgo(140), dispatchedAt: minutesAgo(135),
    slides: [
      { slidePosition: '1', caseId: 'S26-4408', specimenId: 'S26-4408-SP-1', scanStatus: 'completed', qcPassed: false, scanCompletedAt: minutesAgo(120), failureReason: 'Out-of-focus', acquisitionMode: 'single_plane' },
      { slidePosition: '2', caseId: 'S26-4408', specimenId: 'S26-4408-SP-2', scanStatus: 'scanning', acquisitionMode: 'single_plane' },
    ],
  },
  // Real, a genuine Z-stack acquisition example (Cytology) — see
  // IWsiScanBatchService.ts's own WsiAcquisitionMode doc comment.
  {
    id: 'wsi-batch-seed-5002cyt', batchBarcode: 'WSI-20260913-0003', scannerInstrumentId: 'GENIUS_01',
    status: 'unloaded', loadedAt: '2026-09-13T07:00:00.000Z', dispatchedAt: '2026-09-13T07:05:00.000Z', unloadedAt: '2026-09-13T07:20:00.000Z',
    slides: [
      { slidePosition: '1', caseId: 'S26-5002-CYT-001', specimenId: 'S26-5002-SP-1', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-13T07:12:00.000Z', acquisitionMode: 'z_stack', focalPlaneCount: 9 },
    ],
  },
  // Real fix (PS-319 — "Outreach worklist has no seeded WSI/AI data
  // at all, so the Digital Readiness/AI Triage columns are blank for
  // every Outreach (orchestrator-mode) case"): the batches above only
  // ever covered mockCaseService.ts's own S26-* surgical-pathology
  // cases — mockOrchestratorCaseService.ts's own real O26-* Outreach
  // cases had no matching WSI batch anywhere, so those columns had
  // nothing to render. These three batches are real, plausible scans
  // against O26-0001/0002/0003's own already-seeded specimens, none
  // contradicting what those cases' own real gross descriptions say.
  // O26-0001 (colon resection, 3 specimens A/B/C) — a clean, fully
  // "ready" batch: every specimen scanned, passed QC.
  {
    id: 'wsi-batch-seed-o26-0001', batchBarcode: 'WSI-20260918-0004', scannerInstrumentId: 'APERIO_GT450_02',
    status: 'unloaded', loadedAt: '2026-09-18T08:00:00.000Z', dispatchedAt: '2026-09-18T08:05:00.000Z', unloadedAt: '2026-09-18T09:00:00.000Z',
    slides: [
      { slidePosition: '1', caseId: 'O26-0001', specimenId: 'O26-0001-SP-A', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-18T08:20:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '2', caseId: 'O26-0001', specimenId: 'O26-0001-SP-B', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-18T08:30:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '3', caseId: 'O26-0001', specimenId: 'O26-0001-SP-C', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-18T08:40:00.000Z', acquisitionMode: 'single_plane' },
    ],
  },
  // O26-0002 (lung lobectomy, STAT priority, molecular workup still
  // pending per that case's own real clinical indication) — a
  // deliberate partial/in-progress batch: SP-A done, SP-B still
  // scanning, so the Digital Readiness badge has a real "Partial"
  // state to show for an Outreach case too, not just S26-4408.
  {
    id: 'wsi-batch-seed-o26-0002', batchBarcode: 'WSI-20260918-0005', scannerInstrumentId: 'APERIO_GT450_01',
    status: 'scanning', loadedAt: minutesAgo(70), dispatchedAt: minutesAgo(65),
    slides: [
      { slidePosition: '1', caseId: 'O26-0002', specimenId: 'O26-0002-SP-A', scanStatus: 'completed', qcPassed: true, scanCompletedAt: minutesAgo(55), acquisitionMode: 'single_plane' },
      { slidePosition: '2', caseId: 'O26-0002', specimenId: 'O26-0002-SP-B', scanStatus: 'scanning', acquisitionMode: 'single_plane' },
    ],
  },
  // O26-0003 (radical prostatectomy, close posterolateral margin per
  // that case's own real gross description) — SP-A/B scan and pass
  // QC cleanly; SP-C (left pelvic nodes) mechanically completes but
  // fails automated QC, giving the Outreach worklist a real "Error"
  // state example as well.
  {
    id: 'wsi-batch-seed-o26-0003', batchBarcode: 'WSI-20260918-0006', scannerInstrumentId: 'APERIO_GT450_02',
    status: 'unloaded', loadedAt: '2026-09-18T10:00:00.000Z', dispatchedAt: '2026-09-18T10:05:00.000Z', unloadedAt: '2026-09-18T11:00:00.000Z',
    slides: [
      { slidePosition: '1', caseId: 'O26-0003', specimenId: 'O26-0003-SP-A', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-18T10:20:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '2', caseId: 'O26-0003', specimenId: 'O26-0003-SP-B', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-09-18T10:30:00.000Z', acquisitionMode: 'single_plane' },
      { slidePosition: '3', caseId: 'O26-0003', specimenId: 'O26-0003-SP-C', scanStatus: 'completed', qcPassed: false, scanCompletedAt: '2026-09-18T10:40:00.000Z', failureReason: 'Tissue-clipping detected', acquisitionMode: 'single_plane' },
    ],
  },
];

const STORE_KEY = 'wsi_scan_batches';
const ok = <T>(data: T) => ({ ok: true as const, data });
const err = (message: string) => ({ ok: false as const, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

// Batch 747 (S8): the wall display's scanner runs (batches/wallDisplayDemoBatches.ts) are added to a browser's stored
// runs when missing, never replacing one.
const load = (): WsiScanBatch[] => {
  const { records, added } = withMissingSeedRecords(storageGet<WsiScanBatch[] | null>(STORE_KEY, null), [...SEED_WSI_BATCHES, ...wallScanDemoBatches()]);
  if (added > 0) storageSet(STORE_KEY, records);
  return records;
};
const persist = (data: WsiScanBatch[]) => storageSet(STORE_KEY, data);
// Batch 434: what the API server does after it commits a batch write — tell
// the Slide scanning screens to re-read (ids only; liveUpdates/).
const announce = (batch: WsiScanBatch, change: WsiScanBatchChange) => {
  try { localLiveUpdateService.publishWsiScanBatchChange({ batchId: batch.id, change, facilityId: batch.facilityId }); } catch { /* live updates are best-effort */ }
};

export const mockWsiScanBatchService: IWsiScanBatchService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async getById(id) {
    await delay();
    const found = load().find(b => b.id === id);
    if (!found) return err(`No WSI scan batch found with id "${id}".`);
    return ok(found);
  },

  async create(batch) {
    await delay();
    const all = load();
    const created: WsiScanBatch = {
      ...batch,
      id: 'wsi-batch-' + Date.now(),
      // Real, per this file's own header — this app's own established
      // barcode style (a real date + real sequence), matching
      // generateMolecularBatchBarcode.ts's own real convention.
      batchBarcode: `WSI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(all.length + 1).padStart(4, '0')}`,
      status: 'loaded',
      loadedAt: new Date().toISOString(),
    };
    persist([...all, created]);
    announce(created, 'loaded');
    return ok(created);
  },

  async markDispatched(id, sentBy) {
    await delay();
    const all = load();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return err(`No WSI scan batch found with id "${id}".`);
    if (all[idx].status !== 'loaded') {
      return err(`Batch ${all[idx].batchBarcode} is not "loaded" (currently "${all[idx].status}") — a batch can only be dispatched once, from a real, freshly-loaded state.`);
    }
    const updated: WsiScanBatch = { ...all[idx], status: 'scanning', dispatchedAt: new Date().toISOString(), sentBy, sendError: undefined };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    announce(updated, 'sent');
    return ok(updated);
  },

  async recordSendFailure(id, error) {
    await delay();
    const all = load();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return err(`No WSI scan batch found with id "${id}".`);
    const updated: WsiScanBatch = { ...all[idx], sendError: { ...error, at: new Date().toISOString() } };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    announce(updated, 'sendFailed');
    return ok(updated);
  },

  async markUnloaded(id, unloadedBy) {
    await delay();
    const all = load();
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) return err(`No WSI scan batch found with id "${id}".`);
    const batch = all[idx];
    if (batch.status === 'unloaded') return err(`Batch ${batch.batchBarcode} is already unloaded.`);
    // A batch whose manifest was never accepted can be unloaded as it is
    // (nothing is scanning); otherwise every slide needs its outcome first.
    if (batch.status !== 'loaded' && !allSlidesScanned(batch)) {
      const stillPending = batch.slides.filter(s => s.scanStatus === 'pending' || s.scanStatus === 'scanning');
      return err(`${stillPending.length} of ${batch.slides.length} real slides in batch ${batch.batchBarcode} have not reached a real, terminal scan outcome yet — the instrument can't honestly be unloaded while a real slide is still pending/scanning.`);
    }
    // Batch 434: really 'unloaded' (before, this set 'completed' or 'failed').
    const updated: WsiScanBatch = { ...batch, status: 'unloaded', unloadedAt: new Date().toISOString(), unloadedBy };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    announce(updated, 'unloaded');
    return ok(updated);
  },

  async updateSlideStatus(batchId, slidePosition, update) {
    await delay();
    const all = load();
    const idx = all.findIndex(b => b.id === batchId);
    if (idx === -1) return err(`No WSI scan batch found with id "${batchId}".`);
    const batch = all[idx];
    const slideIdx = batch.slides.findIndex(s => s.slidePosition === slidePosition);
    if (slideIdx === -1) return err(`Batch ${batch.batchBarcode} has no real slide at position "${slidePosition}".`);
    const updatedSlides = [...batch.slides];
    updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], ...update };
    // Batch 434: once every slide has an outcome, a scanning batch is
    // 'completed', or 'failed' when any slide failed to scan.
    const done = batch.status === 'scanning' && allSlidesScanned({ slides: updatedSlides });
    const status = done ? (updatedSlides.some(s => s.scanStatus === 'failed') ? 'failed' : 'completed') : batch.status;
    const updated: WsiScanBatch = { ...batch, slides: updatedSlides, status };
    const next = [...all];
    next[idx] = updated;
    persist(next);
    announce(updated, 'slideStatus');
    return ok(updated);
  },
};
