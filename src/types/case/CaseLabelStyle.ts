// src/types/case/CaseLabelStyle.ts
// Batch 715: the letters-or-numbers choice for specimens, blocks and slides that
// was in force when a case was accessioned (services/labeling/). Added to Case
// from here, not in Case.ts, which is over the 1,000-line limit (CLAUDE.md rule 10).
//
// Kept on the case so a block or specimen added later is labelled like the rest
// of the case, even if the facility's setting has changed since. Absent on older
// cases: the setting is then looked up when needed (resolveCaseLabelStyle).

import type { LabelStyle } from '@/services/labeling/labelStyle';

declare module './Case' {
  interface Case {
    labelStyle?: LabelStyle;
  }
}

export type { LabelStyle as CaseLabelStyle };
