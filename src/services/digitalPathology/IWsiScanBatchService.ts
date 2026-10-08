// src/services/digitalPathology/IWsiScanBatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up on Cytology Assisted Instrumentation:
// "wsi also includes status updates that should be raised to
// worklist with a new Tile that would exclusively show cases were
// the scans have been completed. The interface engine would be
// involved with managing the bidirectional transactions. There are
// batch operations involved as well as the lab put slides into the
// scanner instruments and then unload it."
//
// Real, deliberate reuse of an already-proven shape: this entity
// mirrors MolecularBatch's own real lifecycle
// (services/molecular/IMolecularBatchService.ts) directly — a real,
// physical batch of slides loaded into one real instrument at once,
// dispatched, and later unloaded once every real slide has either
// scanned successfully or failed. The same real "one batch, many
// real, independent slide-level outcomes" shape that batch's own
// wells[] already established, not a new pattern invented for this.
//
// Real, bidirectional split, per direct guidance's own explicit
// requirement — mirrors this app's own already-proven "PathScribe
// publishes/ingests its own specification; the real interface engine
// owns the actual instrument protocol" split (HPV results, molecular
// batch results, dispatchMolecularWorklist.ts):
// - Outbound: buildWsiScanBatchManifestPayload.ts — PathScribe tells
//   the real interface engine which real cases/specimens are loaded,
//   once a tech has set up the batch here and physically loaded the
//   real slides.
// - Inbound: WsiScanStatusUpdateEventPayload.ts /
//   processInboundWsiScanStatusUpdateEvent.ts — the real scanner's own
//   real status updates (per real slide — loading, scanning,
//   completed, failed) come back as this app's own real, honest,
//   already-translated event shape.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

/** Batch 434: the lifecycle.
 *  - 'loaded': slides are in the scanner; the manifest hasn't been accepted yet.
 *  - 'scanning': the interface engine accepted the manifest.
 *  - 'completed' / 'failed': every slide has a scan outcome (set by the
 *    inbound status updates); 'failed' when any slide failed to scan.
 *  - 'unloaded': the tech took the slides out. Before Batch 434, unloading
 *    set 'completed' or 'failed' and never 'unloaded'. */
export type WsiScanBatchStatus = 'loaded' | 'scanning' | 'completed' | 'failed' | 'unloaded';
export type WsiSlideScanStatus = 'pending' | 'scanning' | 'completed' | 'failed';
/** Real, per direct guidance's own confirmed Surgical Pathology vs.
 *  Cytology DP technical breakdown: surgical pathology's own flat,
 *  2-to-5-micron tissue sections are scanned at a single fixed focal
 *  plane; cytology's own non-flat, 3D fluid suspensions/smears
 *  genuinely require either full Z-stack capture across multiple
 *  focal depths, or dynamic focus fusion compositing one stitched
 *  image from them. Real, per direct correction: PathScribe never
 *  talks to the scanner instrument itself — this is data the real
 *  interface engine reports in its own inbound event
 *  (WsiScanStatusUpdateEventPayload.ts), exactly as the instrument's
 *  own real acquisition actually ran, never something PathScribe
 *  infers or defaults. */
export type WsiAcquisitionMode = 'single_plane' | 'z_stack' | 'focus_fusion';

export interface WsiScanSlide {
  slidePosition: string;
  caseId: string;
  specimenId: string;
  /** Batch 434: the physical slide (StainOrder) and its block, when loaded
   *  from the scanning queue. Absent on batches made before. */
  blockId?: string;
  stainId?: string;
  /** Display label, e.g. "A1 H&E". Data, not translated. */
  slideLabel?: string;
  scanStatus: WsiSlideScanStatus;
  scanCompletedAt?: string;
  /** Real, per direct guidance's own confirmed Digital Readiness
   *  spec: the real, external instrument's own failure reason
   *  (scanStatus 'failed' \u2014 a genuine hardware/scan-mechanics
   *  failure), OR the real IMS's own automated post-scan image
   *  quality finding (qcPassed false, below \u2014 the scan itself
   *  mechanically succeeded, but the resulting image failed an
   *  automated quality check, e.g. "Out-of-focus", "Tissue-clipping
   *  detected"). One shared field for both, since from PathScribe's
   *  own real perspective they're the same kind of information: the
   *  real, external source system's own stated reason a slide isn't
   *  ready, exactly as it reports it \u2014 never PathScribe's own
   *  guess either way. */
  failureReason?: string;
  /** Real, per direct guidance's own confirmed Digital Readiness
   *  spec: whether the real IMS's own automated post-scan image
   *  quality check passed \u2014 genuinely distinct from scanStatus.
   *  A slide can be scanStatus 'completed' (the scan itself
   *  mechanically succeeded) with qcPassed false (the resulting
   *  image still failed an automated quality gate). Undefined until
   *  the real interface engine's own inbound event actually reports
   *  a result \u2014 QC runs after scanning completes, so this stays
   *  unset while scanStatus is still 'pending'/'scanning', and is
   *  never defaulted to true just because a slide finished scanning. */
  qcPassed?: boolean;
  /** Real, undefined for a real surgical pathology slide (single
   *  focal plane is the only real mode that modality's own hardware
   *  uses — see this type's own header comment) — only ever set when
   *  the real interface engine's own inbound event actually reports
   *  it, which in practice means a real cytology slide. */
  acquisitionMode?: WsiAcquisitionMode;
  /** Real, only meaningful when acquisitionMode is 'z_stack' — how
   *  many real focal layers the instrument actually captured (per
   *  direct guidance's own confirmed range: "5 to 15+ focal layers").
   *  Undefined for 'single_plane'/'focus_fusion' or when the real
   *  interface engine's own event doesn't report a count. */
  focalPlaneCount?: number;
}

export interface WsiScanBatch {
  id: ID;
  batchBarcode: string;
  scannerInstrumentId: string;
  status: WsiScanBatchStatus;
  slides: WsiScanSlide[];
  loadedAt: string;
  dispatchedAt?: string;
  unloadedAt?: string;
  /** Batch 434: the scanner's lab (the permissions are checked against it). */
  facilityId?: string;
  loadedBy?: string;
  sentBy?: string;
  unloadedBy?: string;
  /** Batch 434: why the last attempt to send the manifest failed; cleared when it is accepted. */
  sendError?: { code: string; message: string; at: string };
}

export type NewWsiScanBatch = Omit<WsiScanBatch, 'id' | 'batchBarcode' | 'status' | 'loadedAt'>;

/** Batch 434: whether every slide has a scan outcome (pure). */
export function allSlidesScanned(batch: Pick<WsiScanBatch, 'slides'>): boolean {
  return batch.slides.length > 0 && batch.slides.every(s => s.scanStatus === 'completed' || s.scanStatus === 'failed');
}

/** Batch 434: a slide that came out ready to read: scanned, and image QC not failed (pure). */
export function slideScannedOk(slide: Pick<WsiScanSlide, 'scanStatus' | 'qcPassed'>): boolean {
  return slide.scanStatus === 'completed' && slide.qcPassed !== false;
}

export interface IWsiScanBatchService {
  getAll(): Promise<ServiceResult<WsiScanBatch[]>>;
  getById(id: ID): Promise<ServiceResult<WsiScanBatch>>;
  create(batch: NewWsiScanBatch): Promise<ServiceResult<WsiScanBatch>>;
  /** Real, per this file's own header — marks a real, already-created
   *  batch as dispatched (the real manifest sent to the interface
   *  engine), setting `dispatchedAt` and moving status to 'scanning'.
   *  Real, honest refusal if the batch is not currently 'loaded'. */
  markDispatched(id: ID, sentBy?: string): Promise<ServiceResult<WsiScanBatch>>;
  /** The physical "unload": marks the batch 'unloaded'. Allowed when every
   *  slide has a scan outcome, or when the manifest was never accepted
   *  (status 'loaded': nothing is scanning). Refused while slides are still
   *  scanning. Batch 434: it now really sets 'unloaded' (it used to set
   *  'completed' or 'failed'). */
  markUnloaded(id: ID, unloadedBy?: string): Promise<ServiceResult<WsiScanBatch>>;
  /** Batch 434: records why sending the manifest failed (the batch stays 'loaded'). */
  recordSendFailure(id: ID, error: { code: string; message: string }): Promise<ServiceResult<WsiScanBatch>>;
  /** Real, per this file's own header — applies an already-translated
   *  inbound status update to one real slide within one real batch;
   *  never called from manual UI entry. */
  updateSlideStatus(batchId: ID, slidePosition: string, update: Pick<WsiScanSlide, 'scanStatus' | 'scanCompletedAt' | 'failureReason' | 'qcPassed' | 'acquisitionMode' | 'focalPlaneCount'>): Promise<ServiceResult<WsiScanBatch>>;
}
