// src/services/cytology/resolveCytologyWorkloadTrackingReport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct guidance's own supplied CYT-QA-05 specification
// ("Individual Cytotechnologist Workload Tracking & Exceedance
// Report" — real regulatory drivers: US CLIA '88 §493.1274(b), UK
// NHSCSP Workload Limits, France Code de la Santé Publique).
//
// Real, buildable directly on top of this module's own existing,
// real CLIA workload infrastructure (CytologyWorkloadLedgerEntry,
// resolveCytologyWorkloadCapacity.ts) rather than a second, competing
// workload model — this report is a real, per-shift-day reshaping of
// the same real ledger data already being written at every real
// sign-out, using the exact same real capacity formula the live
// soft-brake/hard-block gate already enforces.
//
// Real, honest mapping for the given spec's own Manual vs. Imager
// slide-count split: 'fov_assisted' is this module's own only real
// review mode that represents genuine imaging-assisted screening;
// every other real mode (primary_manual, liquid_nongyn,
// fov_manual_rescreen, pathologist_review) is a real, manual review
// activity, imager-assisted or not, and counted as Manual here.
// ─────────────────────────────────────────────────────────────────────────────

//
// Batch 572 (Pete, Oct 14, 2026; F7 option C): the hours that count for a
// person's day are their end-of-day sign-off where there is one, else the
// recorded figure; the row shows both, and whether a correction was flagged.
// Days are the lab's calendar day (its time zone; screeningHoursRules.screeningDay),
// the same day the sign-off names. Batch 574: the lab's day starts at its
// set hour (screeningDayStartHour), and the row carries the correction's
// reason and note for the supervisor.

import type { CytologyWorkloadLedgerEntry } from '@/types/cytology/CytologyWorkloadLedgerEntry';
import type { CytologyScreeningHoursSignOff, ScreeningHoursReason } from '@/types/cytology/CytologyScreeningHoursSignOff';
import { resolveCytologyWorkloadCapacity } from './resolveCytologyWorkloadCapacity';
import { hoursFromSeconds, hoursThatCount, isSignOffStale, latestSignOff, screeningDay, type DayStart } from './screeningHoursRules';

export interface CytologyWorkloadTrackingRow {
  ctUserId: string;
  /** YYYY-MM-DD: the lab's calendar day (its time zone) `completedAt` falls on. */
  shiftDate: string;
  /** The hours that count: the sign-off's where there is one, else the recorded hours. */
  hoursScreened: number;
  /** Batch 572: the recorded figure (the server's screening events; the demo's visible-tab time). */
  recordedHours: number;
  /** Batch 572: the person's end-of-day sign-off, or null when not signed off. */
  signedOffHours: number | null;
  /**
   * Batch 572: the sign-off needs the supervisor's eye: it corrected the recorded figure by more than the
   * tolerance, or its correction turned an exceeded day into one within the limit.
   */
  signOffFlagged: boolean;
  /** Batch 572: more was recorded after the sign-off, so it doesn't count until the person signs off again. */
  signOffStale: boolean;
  /** Batch 574: why the person corrected their hours (a correction only), and their note. */
  signOffReasonId?: ScreeningHoursReason;
  signOffNote?: string;
  manualSlidesCount: number;
  imagerSlidesCount: number;
  totalEquivSlides: number;
  maxAllowedVolume: number;
  exceedanceFlag: boolean;
}

export function resolveCytologyWorkloadTrackingReport(
  ledgerEntries: CytologyWorkloadLedgerEntry[],
  effectiveCapByUserId: Record<string, number>,
  defaultCap: number,
  signOffs: readonly CytologyScreeningHoursSignOff[] = [],
  /** The lab's time zone, which decides each entry's day (UTC when not given, as before Batch 572). */
  timezone = 'UTC',
  /** Batch 574: when the lab's screening day starts (an hour, or its history of changes; 0 = midnight). */
  dayStart: DayStart = 0,
): CytologyWorkloadTrackingRow[] {
  const byUserAndDay = new Map<string, CytologyWorkloadLedgerEntry[]>();
  for (const entry of ledgerEntries) {
    const day = screeningDay(entry.completedAt, timezone, dayStart);
    const key = `${entry.userId}|${day}`;
    const list = byUserAndDay.get(key) ?? [];
    list.push(entry);
    byUserAndDay.set(key, list);
  }

  return Array.from(byUserAndDay.entries()).map(([key, entries]) => {
    const [ctUserId, shiftDate] = key.split('|');
    // Batch 574: two decimals, the same figure the person's panel shows and signed against.
    const recordedHours = hoursFromSeconds(entries.reduce((sum, e) => sum + e.activeDurationSeconds, 0));
    const signOff = latestSignOff(signOffs, ctUserId, shiftDate);
    const hoursScreened = hoursThatCount(recordedHours, signOff);
    const manualSlidesCount = entries.filter(e => e.reviewMode !== 'fov_assisted').length;
    const imagerSlidesCount = entries.filter(e => e.reviewMode === 'fov_assisted').length;
    const totalEquivSlides = entries.reduce((sum, e) => sum + e.scuWeight, 0);
    const cap = effectiveCapByUserId[ctUserId] ?? defaultCap;
    const capacity = resolveCytologyWorkloadCapacity(totalEquivSlides, hoursScreened, cap);
    const onRecorded = resolveCytologyWorkloadCapacity(totalEquivSlides, recordedHours, cap);
    const stale = isSignOffStale(signOff, recordedHours);
    const clearedAnExceedance = onRecorded.status === 'exceeded' && capacity.status !== 'exceeded';

    return {
      ctUserId,
      shiftDate,
      hoursScreened,
      recordedHours,
      signedOffHours: signOff ? signOff.signedHours : null,
      signOffFlagged: !!signOff && !stale && (signOff.flagged || clearedAnExceedance),
      signOffStale: stale,
      ...(signOff?.reasonId ? { signOffReasonId: signOff.reasonId } : {}),
      ...(signOff?.reasonId && signOff.note ? { signOffNote: signOff.note } : {}),
      manualSlidesCount,
      imagerSlidesCount,
      totalEquivSlides,
      maxAllowedVolume: capacity.maxAllowedScu,
      exceedanceFlag: capacity.status === 'exceeded',
    };
  });
}
