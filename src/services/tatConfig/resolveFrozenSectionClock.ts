// src/services/tatConfig/resolveFrozenSectionClock.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#68, #91): the frozen-section clock the OR board counts against.
// Before this the board used two constants (20 minutes target, warn at 5);
// "override parameters exist, no screen sets them". Now an admin sets a
// FROZEN_SECTION target in TAT configuration (Configuration → System → TAT
// Targets), per facility and per urgency, with its own warning window, and
// this resolves which entry applies.
//
// Most specific entry wins (tatTargetResolution.ts). A facility entry beats an
// all-facility one; a STAT entry beats an any-urgency one. When no entry
// matches (every built-in default switched off, say) the RFP's own figures
// apply: 20 minutes, warning 5 minutes before.
//
// Pure: no service calls.
// ─────────────────────────────────────────────────────────────────────────────

import type { TATEntry } from '@/types/quality/TatConfigEntry';
import { resolveTatEntry } from './tatTargetResolution';

export type FrozenSectionUrgency = 'STAT' | 'ROUTINE';

export interface FrozenSectionClock {
  targetMinutes: number;
  /** Minutes before the target at which the board starts warning. */
  warningMinutes: number;
  /** 'configured' = a TAT entry applied; 'default' = the built-in figures. */
  source: 'configured' | 'default';
}

export const FROZEN_SECTION_DEFAULT_TARGET_MINUTES = 20;
export const FROZEN_SECTION_DEFAULT_WARNING_MINUTES = 5;

export function resolveFrozenSectionClock(
  entries: ReadonlyArray<TATEntry>,
  context: { facilityId?: string; urgency?: FrozenSectionUrgency },
): FrozenSectionClock {
  const match = resolveTatEntry([...entries], 'FROZEN_SECTION', {
    facilityId: context.facilityId,
    performingLabFacilityId: context.facilityId,
    urgency: context.urgency ?? 'STAT',
  });
  if (!match) {
    return { targetMinutes: FROZEN_SECTION_DEFAULT_TARGET_MINUTES, warningMinutes: FROZEN_SECTION_DEFAULT_WARNING_MINUTES, source: 'default' };
  }
  const targetMinutes = Math.max(1, Math.round(match.targetHours * 60));
  const wanted = match.warningMinutes ?? FROZEN_SECTION_DEFAULT_WARNING_MINUTES;
  // A warning window as long as the target would warn from the first second.
  const warningMinutes = Math.max(0, Math.min(wanted, targetMinutes - 1));
  return { targetMinutes, warningMinutes, source: 'configured' };
}
