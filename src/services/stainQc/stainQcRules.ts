// src/services/stainQc/stainQcRules.ts
// Batch 763: the QC checkpoint's rules. Pure; the server and the demonstration use the same ones.
import type { QcMode, SlideQcOutcome, StainQcSettings, StainRunQc } from './stainQcTypes';

export const DEFAULT_STAIN_QC_SETTINGS: StainQcSettings = { defaultStainerMode: 'pathscribeSignOff', defaultScannerMode: 'autoAccept' };

/** The QC mode for an instrument: its own setting, else the default for its kind. */
export function qcModeFor(equipment: { kind?: string; qcMode?: QcMode } | null | undefined, settings: StainQcSettings, kind: 'stainer' | 'scanner'): QcMode {
  return equipment?.qcMode ?? (kind === 'stainer' ? settings.defaultStainerMode : settings.defaultScannerMode);
}

/** Whether a staining run may leave for distribution: QC decided (passed, or failed with every failed slide given its
 *  follow-up), never while pending. */
export function runQcAllowsDistribution(qc: Pick<StainRunQc, 'status'> | null | undefined): boolean {
  return !!qc && qc.status !== 'pending';
}

/** The run's status from its slides' outcomes: failed when any slide failed, otherwise passed. */
export const runStatusFrom = (outcomes: readonly Pick<SlideQcOutcome, 'outcome'>[]): 'passed' | 'failed' =>
  (outcomes.some(o => o.outcome === 'fail') ? 'failed' : 'passed');

/** Problems with a sign-off: every slide has an outcome, and each failed one has its follow-up. */
export function signOffProblems(slides: readonly { slideId: string }[], outcomes: readonly SlideQcOutcome[]): ('missingSlide' | 'missingAction')[] {
  const problems: ('missingSlide' | 'missingAction')[] = [];
  if (slides.some(s => !outcomes.some(o => o.slideId === s.slideId))) problems.push('missingSlide');
  if (outcomes.some(o => o.outcome === 'fail' && !o.action)) problems.push('missingAction');
  return problems;
}

/** The stain status a slide takes from QC: waiting, ready for the pathologist, or held for its follow-up. */
export function slideStatusFromQc(o: { outcome: 'pending' | 'pass' | 'fail'; action?: 'restain' | 'recut' }): 'QC Pending' | 'Ready for Review' | 'QC Failed' | 'Recut Requested' {
  if (o.outcome === 'pending') return 'QC Pending';
  if (o.outcome === 'pass') return 'Ready for Review';
  return o.action === 'recut' ? 'Recut Requested' : 'QC Failed';
}

/** Why a slide may not be handed out at Slide Distribution, or null when it may. */
export function distributionQcProblem(stainStatus: string | undefined): 'qcPending' | 'qcFailed' | 'recutRequested' | null {
  if (stainStatus === 'QC Pending') return 'qcPending';
  if (stainStatus === 'QC Failed') return 'qcFailed';
  if (stainStatus === 'Recut Requested') return 'recutRequested';
  return null;
}

/** Whether a scanned image is released to the pathologist at unload, or waits for its QC: auto-accept releases one the
 *  scanner passed (or did not check); vendor sign-off needs the scanner's own pass; PathScribe sign-off always waits. */
export function imageQcAtUnload(mode: QcMode, scannerQcPassed: boolean | undefined): 'release' | 'pending' {
  if (mode === 'autoAccept') return 'release';
  if (mode === 'vendorSignOff') return scannerQcPassed === true ? 'release' : 'pending';
  return 'pending';
}
