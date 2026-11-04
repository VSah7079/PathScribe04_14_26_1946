// src/services/cytology/resolveAgeFromDateOfBirth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, small, reusable extraction of this app's own already-established
// age-from-DOB calculation (caseFilterUtils.ts's own real, inline
// logic for age-range case filtering) — same real math, made reusable
// for the real, new German age-stratified screening rule
// (ICytologyScreeningStrategyService.ts) rather than re-implementing
// it a second, potentially-divergent way.
// ─────────────────────────────────────────────────────────────────────────────

// Batch 504: delegates to utils/ageFromDateOfBirth.ts, which reads the birth
// date as the calendar date it is. This version parsed "1990-04-02" as UTC
// midnight and read it back in the device's time zone (1 April in the
// Americas), so a patient changed age band a day early.
import { ageFromDateOfBirth } from '@/utils/ageFromDateOfBirth';

export function resolveAgeFromDateOfBirth(dateOfBirth: string | undefined, asOf: Date = new Date()): number | undefined {
  return ageFromDateOfBirth(dateOfBirth, asOf);
}
