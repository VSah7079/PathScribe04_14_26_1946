// src/utils/labels/getAllSlideLabelRequests.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per the same Manage Reprints modal this was built for.
// Mirrors getAllCassetteLabelRequests.ts's own pattern exactly, one
// level down: a real Case in, the full, real list of
// SlideLabelDispatchRequests out — one per real, ordered stain across
// every block, across every specimen — no I/O. The actual dispatch
// stays a separate, honest stub (dispatchSlideLabel.ts); this
// function's only job is gathering what would be printed.
// ─────────────────────────────────────────────────────────────────────────────

import { slideLevelOf } from '@/services/material/slideLevels';
import type { Case } from '@/types/case/Case';
import { slideIdentifier } from '@/types/labels/LabelData';
import type { SlideLabelDispatchRequest } from './dispatchSlideLabel';

export function getAllSlideLabelRequests(caseData: Case): SlideLabelDispatchRequest[] {
  const fullAccession = caseData.accession.fullAccession;
  const requests: SlideLabelDispatchRequest[] = [];
  for (const specimen of caseData.specimens ?? []) {
    for (const block of specimen.blocks ?? []) {
      (block.stains ?? []).forEach((stain, idx) => {
        // Batch 460: the level fixed in the slide's displayId (its position
        // only for older slides without one), so a label reprinted after
        // the slides were reordered still matches its barcode.
        const level = slideLevelOf(stain, idx);
        requests.push({
          fullAccession,
          specimenLabel: specimen.label,
          blockLabel: block.label,
          level,
          stainName: stain.stainName,
          slideId: slideIdentifier(fullAccession, specimen.label, block.label, level),
        });
      });
    }
  }
  return requests;
}
