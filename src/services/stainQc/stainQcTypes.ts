// src/services/stainQc/stainQcTypes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 763 (Pete, Nov 2, 2026, Video 1 feedback: "Missing QC gate: a Post-Stain / Pre-Distribution QC checkpoint with
// Option A (vendor sign-off via the interface engine) and Option B (native PathScribe QC), configurable per
// instrument"; scope: "Stainers and scanners"). A staining run must pass QC before its slides go out, and a scanned
// image before the pathologist sees it. Each stainer and slide scanner says how its QC is signed off:
//   autoAccept          nothing to sign: a completed run (or a scanned image that passed the scanner's own image
//                       check) goes straight on;
//   vendorSignOff       Option A: the instrument or its software signs off, through the interface engine;
//   pathscribeSignOff   Option B: a technologist signs off in PathScribe, at the Slide Distribution checkpoint.
// ─────────────────────────────────────────────────────────────────────────────

export const QC_MODES = ['autoAccept', 'vendorSignOff', 'pathscribeSignOff'] as const;
export type QcMode = typeof QC_MODES[number];

/** What a failed slide needs: stained again (the same slide or a new one), or a new section cut. */
export const QC_FAIL_ACTIONS = ['restain', 'recut'] as const;
export type QcFailAction = typeof QC_FAIL_ACTIONS[number];

/** Quick reasons for a failed slide (a note can be added). */
export const STAIN_QC_FAIL_REASONS = ['weakStaining', 'overStaining', 'uneven', 'controlFailed', 'coverslipBubble', 'tissueFolded', 'other'] as const;
export type StainQcFailReason = typeof STAIN_QC_FAIL_REASONS[number];
export const IMAGE_QC_FAIL_REASONS = ['outOfFocus', 'tissueMissed', 'stitching', 'debris', 'other'] as const;
export type ImageQcFailReason = typeof IMAGE_QC_FAIL_REASONS[number];

/** The QC settings: what applies to an instrument with no setting of its own, or when the instrument is not known. */
export interface StainQcSettings {
  defaultStainerMode: QcMode;
  defaultScannerMode: QcMode;
  updatedAt?: string;
  updatedBy?: string;
}

export interface SlideQcOutcome {
  slideId: string;
  caseAccession: string;
  outcome: 'pass' | 'fail';
  action?: QcFailAction;
  reason?: StainQcFailReason;
  note?: string;
}

/** The QC of one staining run (a rack on a stainer). */
export interface StainRunQc {
  batchId: string;
  masterBarcode: string;
  /** The stainer, when known (the instrument's message, or picked at sign-off). */
  stainerEquipmentId: string | null;
  mode: QcMode;
  status: 'pending' | 'passed' | 'failed';
  /** The slides on the run when QC opened. */
  slides: { slideId: string; caseAccession: string }[];
  openedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  /** How it was decided. */
  via?: 'auto' | 'vendor' | 'pathscribe';
  /** The instrument's own reference for its sign-off (Option A). */
  vendorRef?: string;
  outcomes?: SlideQcOutcome[];
}

/** A scanned image waiting for its QC (Option A or B on the scanner). */
export interface ImageQcItem {
  /** The slide (its stain order) on its case. */
  stainId: string;
  caseId: string;
  blockId: string;
  /** The slide's label as the scanner listed it (A1 H&E), and its case's accession, for the screen and the audit. */
  slideLabel: string;
  caseAccession: string;
  scanBatchId: string;
  scanBatchBarcode: string;
  scannerInstrumentId: string;
  mode: QcMode;
  status: 'pending' | 'passed' | 'failed';
  receivedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  via?: 'vendor' | 'pathscribe';
  reason?: ImageQcFailReason;
}

export interface QcCheckpoint {
  runs: StainRunQc[];
  images: ImageQcItem[];
}
