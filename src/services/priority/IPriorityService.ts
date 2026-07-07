// src/services/priority/IPriorityService.ts
// ─────────────────────────────────────────────────────────────
// Metadata for CasePriority values (display label, color, urgency
// ordering) — NOT a replacement for the CasePriority type itself, which
// stays a small, fixed union ('Routine' | 'Rush' | 'STAT') rather than an
// open-ended string. Full migration to database-driven priority levels
// (adding new tiers without a code change) would mean touching ~21
// consumers across the app that currently do direct string comparisons
// against those literals — real, scoped work, not attempted in this
// pass. This service gives the three current tiers a real backing for
// display/color/ordering purposes, and gives admins visibility into
// them, without that larger refactor.
// ─────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';
import type { CasePriority } from '../cases/ICaseService';

export interface PriorityLevel {
  id: CasePriority;
  label: string;
  /** Lower = less urgent. Used for sort order and for deciding which
   *  tier's visual treatment "wins" if a UI can only show one badge. */
  urgencyRank: number;
  /** CSS color token — kept as a plain string (not a class name) so
   *  consumers can use it for either a dot, a badge background, or text
   *  color as their own layout needs, rather than this service
   *  dictating a specific visual component. */
  colorHint: string;
  isActive: boolean;
}

export interface IPriorityService {
  getAll(): Promise<ServiceResult<PriorityLevel[]>>;
}
