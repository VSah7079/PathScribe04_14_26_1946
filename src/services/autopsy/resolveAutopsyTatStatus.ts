// src/services/autopsy/resolveAutopsyTatStatus.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#60, #88): the autopsy turnaround verdict. Until now the worklist
// and the report page showed the jurisdiction's target as plain text; nothing
// compared it with the clock. This is that comparison.
//
//   Clock start  body arrival (earliest specimen receivedAt, else the order's
//                received date, else the case's creation time)
//   Target       an active AUTOPSY_PAD / AUTOPSY_FAD entry from TAT
//                configuration if one applies (calendar hours), otherwise the
//                jurisdiction figure from resolveAutopsyTatSlaMatrix.ts. A
//                range counts to its upper bound ("within 14-21 working days"
//                is breached on day 22, not day 15)
//   Working days weekends only. Public holidays are not known to this module,
//                so a working-day target can only be later than shown, never
//                earlier (disclosed in KNOWN_GAPS)
//   Ancillary    time the case was on hold (AncillaryHoldState) is added to
//   hold         the deadline, because the clock does not run while waiting
//                for toxicology, neuropathology or similar
//   Verdict      met / met late once the report is signed; otherwise on track,
//                due soon (the last 20% of the window) or overdue
//
// Pure: no service calls, no clock of its own (pass `now`).
// ─────────────────────────────────────────────────────────────────────────────

import type { AutopsyCaseDetails, AutopsyReportTier } from '@/types/autopsy/AutopsyCaseDetails';
import type { TatEntryForResolution } from '@/services/tatConfig/tatTargetResolution';
import { resolveTatTargetHours } from '@/services/tatConfig/tatTargetResolution';
import { resolveAutopsyTatSlaMatrix, type AutopsyTatSlaConfig } from './resolveAutopsyTatSlaMatrix';

export type AutopsyTatState = 'on_track' | 'due_soon' | 'overdue' | 'met' | 'met_late';
export type AutopsyTatTargetSource = 'jurisdiction' | 'override';

/** The last fraction of the window in which an unsigned report shows "Due soon". */
export const AUTOPSY_DUE_SOON_FRACTION = 0.2;

const HOUR_MS = 3_600_000;

export interface AutopsyTatResult {
  tier: AutopsyReportTier;
  state: AutopsyTatState;
  source: AutopsyTatTargetSource;
  /** Whole hours from body arrival to the signature (or to now), hold time removed. */
  elapsedHours: number;
  /** The whole window in hours, hold time removed (calendar hours; a working-day target spans the weekend). */
  targetHours: number;
  /** ISO time the report is due, hold time included. */
  deadline: string;
  /** Hours the case spent on ancillary hold and were not counted. */
  holdHours: number;
  /** Hours until the deadline when unsigned and not overdue, otherwise 0. */
  remainingHours: number;
}

export interface AutopsyClockSource {
  specimens?: ReadonlyArray<{ receivedAt?: string }>;
  order?: { receivedDate?: string; facilityId?: string };
  createdAt?: string;
}

/** Body arrival: the earliest specimen receipt, else the order's received date, else case creation. */
export function resolveAutopsyClockStart(source: AutopsyClockSource): string | null {
  const received = (source.specimens ?? [])
    .map(s => s.receivedAt)
    .filter((v): v is string => !!v && !Number.isNaN(Date.parse(v)))
    .sort();
  if (received.length > 0) return received[0];
  if (source.order?.receivedDate && !Number.isNaN(Date.parse(source.order.receivedDate))) return source.order.receivedDate;
  if (source.createdAt && !Number.isNaN(Date.parse(source.createdAt))) return source.createdAt;
  return null;
}

/** Adds working days (Monday to Friday) to a moment, keeping its time of day. */
export function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start.getTime());
  let left = Math.max(0, Math.round(days));
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  return d;
}

/** Milliseconds the case spent on ancillary hold, up to `now`. */
export function ancillaryHoldMs(hold: AutopsyCaseDetails['ancillaryHold'] | undefined, now: Date): number {
  if (!hold?.startedAt) return 0;
  const start = Date.parse(hold.startedAt);
  if (Number.isNaN(start)) return 0;
  const endRaw = hold.endedAt ? Date.parse(hold.endedAt) : hold.active ? now.getTime() : start;
  const end = Number.isNaN(endRaw) ? start : Math.min(endRaw, now.getTime());
  return Math.max(0, end - start);
}

function jurisdictionDeadline(tier: AutopsyReportTier, cfg: AutopsyTatSlaConfig, start: Date): Date {
  if (tier === 'PAD') {
    return cfg.padUnit === 'hours'
      ? new Date(start.getTime() + cfg.padMax * HOUR_MS)
      : addWorkingDays(start, cfg.padMax);
  }
  return cfg.fadUnit === 'days'
    ? new Date(start.getTime() + cfg.fadMax * 24 * HOUR_MS)
    : addWorkingDays(start, cfg.fadMax);
}

export interface AutopsyTatInput {
  autopsy: AutopsyCaseDetails;
  /** ISO body-arrival time (see resolveAutopsyClockStart). */
  startedAt: string;
  /** Facility the case belongs to, used to pick a per-facility override. */
  facilityId?: string;
  /** All TAT entries; only active AUTOPSY_PAD / AUTOPSY_FAD ones are read. */
  tatEntries?: ReadonlyArray<TatEntryForResolution>;
  now?: Date;
}

/** The verdict for one report tier. */
export function resolveAutopsyTatForTier(tier: AutopsyReportTier, input: AutopsyTatInput): AutopsyTatResult {
  const now = input.now ?? new Date();
  const start = new Date(input.startedAt);
  const holdMs = ancillaryHoldMs(input.autopsy.ancillaryHold, now);

  const overrideHours = input.tatEntries
    ? resolveTatTargetHours([...input.tatEntries], tier === 'PAD' ? 'AUTOPSY_PAD' : 'AUTOPSY_FAD', {
        facilityId: input.facilityId,
        performingLabFacilityId: input.facilityId,
      })
    : null;
  const source: AutopsyTatTargetSource = overrideHours !== null ? 'override' : 'jurisdiction';

  const baseDeadline = overrideHours !== null
    ? new Date(start.getTime() + overrideHours * HOUR_MS)
    : jurisdictionDeadline(tier, resolveAutopsyTatSlaMatrix(input.autopsy.jurisdiction), start);
  const deadline = new Date(baseDeadline.getTime() + holdMs);
  const windowMs = baseDeadline.getTime() - start.getTime();

  const signedAt = (tier === 'PAD' ? input.autopsy.padSnapshot : input.autopsy.fadSnapshot)?.signedAt;
  const signedMs = signedAt ? Date.parse(signedAt) : NaN;
  const endMs = !Number.isNaN(signedMs) ? signedMs : now.getTime();
  const elapsedMs = Math.max(0, endMs - start.getTime() - holdMs);

  let state: AutopsyTatState;
  if (!Number.isNaN(signedMs)) state = signedMs <= deadline.getTime() ? 'met' : 'met_late';
  else if (now.getTime() > deadline.getTime()) state = 'overdue';
  else if (deadline.getTime() - now.getTime() <= windowMs * AUTOPSY_DUE_SOON_FRACTION) state = 'due_soon';
  else state = 'on_track';

  return {
    tier,
    state,
    source,
    elapsedHours: Math.floor(elapsedMs / HOUR_MS),
    targetHours: Math.round(windowMs / HOUR_MS),
    deadline: deadline.toISOString(),
    holdHours: Math.floor(holdMs / HOUR_MS),
    remainingHours: Number.isNaN(signedMs) && now.getTime() <= deadline.getTime()
      ? Math.ceil((deadline.getTime() - now.getTime()) / HOUR_MS)
      : 0,
  };
}

/** The tier the case is working towards: the PAD until it is signed, then the FAD. */
export function currentAutopsyTatTier(autopsy: AutopsyCaseDetails): AutopsyReportTier {
  return autopsy.padSnapshot ? 'FAD' : 'PAD';
}

export interface AutopsyTatSummary {
  current: AutopsyTatResult;
  pad: AutopsyTatResult;
  fad: AutopsyTatResult;
}

/** Both tiers plus the one the worklist chip should show. */
export function resolveAutopsyTatSummary(input: AutopsyTatInput): AutopsyTatSummary {
  const pad = resolveAutopsyTatForTier('PAD', input);
  const fad = resolveAutopsyTatForTier('FAD', input);
  return { current: currentAutopsyTatTier(input.autopsy) === 'PAD' ? pad : fad, pad, fad };
}

export const AUTOPSY_TAT_STATE_LABEL_KEY: Record<AutopsyTatState, string> = {
  on_track: 'autopsyTat.state.onTrack',
  due_soon: 'autopsyTat.state.dueSoon',
  overdue: 'autopsyTat.state.overdue',
  met: 'autopsyTat.state.met',
  met_late: 'autopsyTat.state.metLate',
};
