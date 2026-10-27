// src/services/digitalPathology/resolveWorklistDpBadges.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own confirmed Digital Readiness spec and
// the follow-up decision to integrate DP data into the existing,
// single worklist (WorklistTable.tsx) rather than a second, separate
// page a pathologist would have to remember to also check. These are
// the real, pure badge-resolution functions that table renders —
// kept out of the row JSX since the vendor-shape reconciliation below
// (triageLevel vs. reviewRecommended vs. findings-only, per vendor)
// is genuine logic, not display formatting.
// ─────────────────────────────────────────────────────────────────────────────

import type { WsiScanSlide } from './IWsiScanBatchService';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';

// Batch 624: wording PathScribe builds itself (the readiness line, "AI-Flagged Finding(s)", "Review
// Recommended") is also returned as a translation key plus values, which the screen renders with t().
// Wording that comes from the scanner or the AI vendor ("Out-of-focus", "Malignancy Detected", biomarker
// lines) is NEVER translated, on purpose (Pete, Oct 19, 2026): it did not originate in PathScribe, and a
// mistranslated clinical finding is a risk. It is shown exactly as received, and only inserted as a value.
export interface DpLabel { key: string; params?: Record<string, string | number> }

export type DigitalReadinessLevel = 'ready' | 'partial' | 'error';

export interface DigitalReadinessBadge {
  level: DigitalReadinessLevel;
  /** Real, e.g. "4/4 Ready (QC Passed)", "3/4 Partial (1 Scanning)",
   *  "2/3 Error (Focus Fail)" — matches the real spec's own worklist
   *  summary format. */
  summaryText: string;
  /** Batch 624: the same line as a translatable label (`reason` inside it is the scanner's own wording). */
  summaryLabel: DpLabel;
}

/** Real, per direct guidance's own confirmed spec: green requires
 *  every real slide scanned AND every real, reported QC check passed
 *  — a real slide with qcPassed undefined (the real IMS hasn't
 *  reported a result yet) is NOT the same as a real, confirmed pass,
 *  so it never counts toward "ready" on its own. Red for any real
 *  scan failure or any real, reported QC failure; yellow otherwise
 *  (still scanning, or scanned but QC not yet reported). Undefined
 *  slides list (no real WsiScanBatch data for this case at all)
 *  returns undefined — never a fabricated badge for a case with no
 *  real digital slide data. */
export function resolveDigitalReadinessBadge(slides: WsiScanSlide[] | undefined): DigitalReadinessBadge | undefined {
  if (!slides || slides.length === 0) return undefined;
  const total = slides.length;
  const failed = slides.filter(s => s.scanStatus === 'failed' || s.qcPassed === false);
  const readyCount = slides.filter(s => s.scanStatus === 'completed' && s.qcPassed === true).length;

  if (failed.length > 0) {
    const reason = failed.find(s => s.failureReason)?.failureReason;
    return {
      level: 'error', summaryText: `${readyCount}/${total} Error${reason ? ` (${reason})` : ''}`,
      summaryLabel: reason ? { key: 'worklistDp.readiness.errorReason', params: { ready: readyCount, total, reason } } : { key: 'worklistDp.readiness.error', params: { ready: readyCount, total } },
    };
  }
  if (readyCount === total) {
    return { level: 'ready', summaryText: `${readyCount}/${total} Ready (QC Passed)`, summaryLabel: { key: 'worklistDp.readiness.ready', params: { ready: readyCount, total } } };
  }
  const scanning = slides.filter(s => s.scanStatus === 'scanning').length;
  return {
    level: 'partial', summaryText: `${readyCount}/${total} Partial${scanning ? ` (${scanning} Scanning)` : ''}`,
    summaryLabel: scanning ? { key: 'worklistDp.readiness.partialScanning', params: { ready: readyCount, total, scanning } } : { key: 'worklistDp.readiness.partial', params: { ready: readyCount, total } },
  };
}

export type DpTriageLevel = 'high_risk' | 'equivocal' | 'unremarkable';

export interface DpTriageBadge {
  level: DpTriageLevel;
  /** Real, e.g. "Malignancy Detected", "Atypical Crypts Flagged",
   *  "Pre-screened Unremarkable" — the one, real headline label a
   *  worklist row shows. */
  primaryText: string;
  /** Batch 624: set only when PathScribe wrote the wording; absent when it is the vendor's own (shown as received). */
  primaryLabel?: DpLabel;
  /** Real, e.g. "Ki-67: 18% | Gleason: 4+3 (Est)" — undefined for a
   *  real vendor that reports no real, quantitative biomarkers. */
  biomarkerSummary?: string;
}

/** Real, per direct guidance's own confirmed spec — reconciles the
 *  three genuinely different real shapes this app's own real vendors
 *  report (see AiSlideTriageSummary's own doc comments):
 *  triageLevel (Paige/Ibex-style, real 3-level), reviewRecommended
 *  (BD FocalPoint-style, real binary gate), or findings[] alone
 *  (Hologic Genius-style, no real slide-level summary at all). Real,
 *  deliberate choice: a real binary "review recommended" gate maps to
 *  'equivocal', never 'high_risk' — that vendor's own real product
 *  never actually claims malignancy, only that a human should look,
 *  so a worklist badge claiming more than the vendor itself reported
 *  would be dishonest. Undefined for a real case with no real
 *  completed AiScreeningResult at all. */
export function resolveDpTriageBadge(result: AiScreeningResult | undefined): DpTriageBadge | undefined {
  if (!result || result.status !== 'completed') return undefined;

  const biomarkerSummary = result.biomarkers?.length
    ? result.biomarkers.map(b => `${b.name}: ${b.value}`).join(' | ')
    : undefined;

  const triage = result.slideTriage;
  if (triage?.triageLevel) {
    const levelMap: Record<string, DpTriageLevel> = { high_risk: 'high_risk', equivocal_review: 'equivocal', unremarkable: 'unremarkable' };
    return {
      level: levelMap[triage.triageLevel],
      primaryText: triage.primaryFinding ?? result.findings[0]?.label ?? 'AI Result Available',
      primaryLabel: triage.primaryFinding ?? result.findings[0]?.label ? undefined : { key: 'worklistDp.triage.resultAvailable' },
      biomarkerSummary,
    };
  }
  if (triage && typeof triage.reviewRecommended === 'boolean') {
    return {
      level: triage.reviewRecommended ? 'equivocal' : 'unremarkable',
      primaryText: triage.reviewRecommended ? 'Review Recommended' : 'No Further Review',
      primaryLabel: { key: triage.reviewRecommended ? 'worklistDp.triage.reviewRecommended' : 'worklistDp.triage.noFurtherReview' },
      biomarkerSummary,
    };
  }
  if (result.findings.length > 0) {
    return {
      level: 'equivocal',
      primaryText: `${result.findings.length} AI-Flagged Finding${result.findings.length === 1 ? '' : 's'}`,
      primaryLabel: { key: 'worklistDp.triage.flaggedFinding', params: { count: result.findings.length } },
      biomarkerSummary,
    };
  }
  return { level: 'unremarkable', primaryText: 'Pre-screened Unremarkable', primaryLabel: { key: 'worklistDp.triage.preScreenedUnremarkable' }, biomarkerSummary };
}

/** The line to show: PathScribe's own wording translated, the vendor's wording as received. */
export const dpLabelText = (label: DpLabel | undefined, received: string, t: (key: string, params?: Record<string, string | number>) => string): string =>
  label ? t(label.key, label.params) : received;
