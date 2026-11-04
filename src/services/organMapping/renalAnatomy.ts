// src/services/organMapping/renalAnatomy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 618 (PS-492, Pete's decision of Oct 18, 2026): which anatomy a PARTIAL nephrectomy's drawing holds
// beyond the kidney itself. A partial nephrectomy specimen is a parenchymal resectate with its perinephric fat,
// so the drawing shows only what the specimen holds:
//   • perinephric fat   always (the compartment of the perinephric / capsular soft tissue margin);
//   • renal vein        when its margin was added as a non-standard margin, or carcinoma is in it or the vena cava;
//   • vena cava         when carcinoma is in it (below or above the diaphragm);
//   • ureter            when its margin was added as a non-standard margin;
//   • Gerota's fascia   only when the extent answer is "Beyond Gerota's fascia" (extent value `gerota`, pT4);
//   • adrenal gland     only when the extent answer is "Ipsilateral adrenal gland, by direct (contiguous)
//                       spread" (extent value `adrenal`, pT4).
// A radical nephrectomy draws all of it (never decided here). Pure: no service, no screen.
// ─────────────────────────────────────────────────────────────────────────────

import { RENAL_OPTIONAL_ANATOMY, type RenalCompartment } from './renalGeometry';

export interface PartialRenalAnatomyInput {
  /** The margin boxes drawn (letters of the variant: p, s, v, u). */
  boxes: string;
  /** The compartments the extent answers show carcinoma in. */
  involved: ReadonlySet<RenalCompartment>;
}

/** The anatomy letters (RENAL_OPTIONAL_ANATOMY, in its own order) a partial nephrectomy draws; '' for none. */
export function partialRenalAnatomy({ boxes, involved }: PartialRenalAnatomyInput): string {
  const cava = involved.has('ivcBelow') || involved.has('ivcAbove');
  const reported: Record<string, boolean> = {
    v: boxes.includes('v') || cava || involved.has('renalVein'),
    i: cava,
    u: boxes.includes('u'),
    g: involved.has('gerota'),
    a: involved.has('adrenal'),
  };
  return Object.keys(RENAL_OPTIONAL_ANATOMY).filter(k => reported[k]).join('');
}
