// src/services/reports/resolveReportWatermark.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 516 (PS-283, Pete, Oct 10, 2026): which watermark a rendered report
// carries.
//
//   • A report printed before sign-out says "PRELIMINARY — SUBJECT TO CHANGE"
//     (Pete's wording, in the report's language), so an unsigned print can't
//     be mistaken for the signed report.
//   • A report signed out but still in the release buffer ('pending-release')
//     keeps the organisation's release-buffer watermark (Batch 498).
//   • The final snapshot made at sign-out never carries the preliminary mark:
//     it is generated while the case is still being signed, and it is the
//     signed report.
//   • Batch 540 (Pete, Oct 12): nor the release-buffer mark. A released PDF is
//     what goes out when the delay ends, so it must never say "pending" or
//     "do not distribute"; only a print during the delay carries that mark.
//
// Pure; the caller supplies the release-buffer text and the translation.
// ─────────────────────────────────────────────────────────────────────────────
import { caseSignedOut } from '../quality/peerReviewRules';

/** Why the report is being rendered. */
export type ReportRenderPurpose = 'print' | 'final-snapshot';

export type ReportWatermarkKind = 'preliminary' | 'release-buffer';

export function reportWatermarkKind(status: string | undefined, purpose: ReportRenderPurpose): ReportWatermarkKind | null {
  if (purpose === 'final-snapshot') return null;
  if (status === 'pending-release') return 'release-buffer';
  return caseSignedOut(status) ? null : 'preliminary';
}

/** The key for the preliminary watermark's text. */
export const PRELIMINARY_WATERMARK_KEY = 'reportWatermark.preliminary';

/**
 * The watermark text, or undefined for none. `releaseBufferText` is the
 * organisation's configured text (fetched only when needed); `t` translates
 * in the report's language.
 */
export async function resolveReportWatermarkText(
  input: { status: string | undefined; purpose: ReportRenderPurpose },
  deps: { releaseBufferText: () => Promise<string | undefined>; t: (key: string) => string },
): Promise<string | undefined> {
  const kind = reportWatermarkKind(input.status, input.purpose);
  if (kind === 'release-buffer') return (await deps.releaseBufferText())?.trim() || undefined;
  if (kind === 'preliminary') return deps.t(PRELIMINARY_WATERMARK_KEY);
  return undefined;
}
