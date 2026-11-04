// src/services/inkColors/IInkColorService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Structured Inking, Module 3 (PS-359 follow-up): the ink-colour admin
// palette deferred by both Batch 480 and Batch 481 ("the ink-colour admin
// palette that would let Severity 3 actually trigger" / "needed for
// Severity 3 to ever trigger").
//
// Deliberately simpler than services/cassetteColors/ICassetteColorService.ts,
// the closest precedent in this app. Cassette colours are physical hopper
// hardware — a `key` sent to a routing Engine, a fallback-substitution
// policy, and a per-performing-lab scope all exist because the hopper is
// real, site-specific equipment that can run out mid-case. A margin ink
// colour is a bottle of ink a grossing tech dips a brush in — there's no
// Engine dispatch, no hopper that can be "unavailable," and no fallback
// decision to make, so none of that is modeled here. What a margin ink
// colour genuinely needs is the one thing resolveInkingValidationSeverity.ts
// has been waiting on since Batch 480: a real `code` to check
// MarginInkApplication.colorCode against (see that file's own Severity 3
// doc comment — "an ink color code that doesn't map to anything real").
//
// Flat/lab-wide, like services/stains/IStainService.ts's own StainType —
// not scoped per facility. Ink is consumed by whichever tech is doing the
// grossing, not tied to a piece of hardware at one site.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';

export interface InkColor {
  id: ID;
  /** e.g. "Blue" — shown in the admin list and in the Grossing screen's
   *  colour picker. */
  name: string;
  /** e.g. "#0000FF" or a standardized palette code — this is the real
   *  dictionary MarginInkApplication.colorCode is validated against (see
   *  resolveInkingValidationSeverity.ts's margin_ink_color_unmapped
   *  check). Unique among active colours (checked by the admin UI, same
   *  pattern as CassetteColorsSection.tsx's own key/name uniqueness). */
  code: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IInkColorService {
  getAll(): Promise<ServiceResult<InkColor[]>>;
  getById(id: ID): Promise<ServiceResult<InkColor>>;
  create(draft: Omit<InkColor, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<InkColor>>;
  update(id: ID, changes: Partial<Omit<InkColor, 'id'>>): Promise<ServiceResult<InkColor>>;
  deactivate(id: ID): Promise<ServiceResult<InkColor>>;
  reactivate(id: ID): Promise<ServiceResult<InkColor>>;
}
