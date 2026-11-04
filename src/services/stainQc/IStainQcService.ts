// src/services/stainQc/IStainQcService.ts
// Batch 763: the QC checkpoint's contract (docs/architecture/STAIN_QC_API.md). Refusals are fixed codes.
import type { ServiceResult } from '../types';
import type { ImageQcFailReason, ImageQcItem, QcCheckpoint, SlideQcOutcome, StainQcSettings, StainRunQc } from './stainQcTypes';

export const STAIN_QC_ERRORS = { notPermitted: 'NOT_PERMITTED', notFound: 'NOT_FOUND', invalid: 'INVALID', alreadyDecided: 'ALREADY_DECIDED', notVendorMode: 'NOT_VENDOR_MODE' } as const;

export interface IStainQcService {
  /** The defaults for an instrument with no QC setting of its own (stain:qc:sign-off, scan:image-qc:sign-off or
   *  config:stain-qc:manage). */
  getSettings(): Promise<ServiceResult<StainQcSettings>>;
  /** Change the defaults (config:stain-qc:manage). Audited. */
  saveSettings(settings: StainQcSettings): Promise<ServiceResult<StainQcSettings>>;
  /** The staining runs and scanned images waiting for QC (stain:qc:sign-off and/or scan:image-qc:sign-off; each list
   *  is empty without its capability). */
  getCheckpoint(): Promise<ServiceResult<QcCheckpoint>>;
  /** Sign a staining run off in PathScribe (Option B): every slide passes, or fails with its follow-up (re-stain or
   *  re-cut). stain:qc:sign-off; a run waiting for the stainer's own sign-off (Option A) also needs stain:qc:override.
   *  Audited. */
  signOffRun(batchId: string, outcomes: SlideQcOutcome[], stainerEquipmentId?: string | null): Promise<ServiceResult<StainRunQc>>;
  /** Pass a scanned image to the pathologist, or send the slide back to be scanned again (scan:image-qc:sign-off).
   *  Audited. */
  decideImage(stainId: string, outcome: 'pass' | 'fail', reason?: ImageQcFailReason): Promise<ServiceResult<ImageQcItem>>;
}
