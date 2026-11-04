// src/services/clinical/narrativeForDetection.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-323: the text the critical-finding check reads at sign-out. It used to read
// only the case's stored narrative (diagnostic.*), so a Microscopic Description
// typed in the per-specimen panel was never checked. This adds the text typed
// into each specimen's Microscopic Description, with no repeats, on one line
// (the check's prompt is line-based). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

export interface NarrativeForDetection {
  gross: string;
  microscopic: string;
  ancillary: string;
}

function joinUnique(parts: (string | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const text = (p ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out.join(' ');
}

export function narrativeForDetection(caseData: Pick<Case, 'diagnostic' | 'microscopicReports'>): NarrativeForDetection {
  return {
    gross: caseData.diagnostic?.grossDescription ?? '',
    microscopic: joinUnique([
      caseData.diagnostic?.microscopicDescription,
      ...(caseData.microscopicReports ?? []).map(r => r.text),
    ]),
    ancillary: caseData.diagnostic?.ancillaryStudies ?? '',
  };
}
