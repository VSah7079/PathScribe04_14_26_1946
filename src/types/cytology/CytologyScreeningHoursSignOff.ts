// src/types/cytology/CytologyScreeningHoursSignOff.ts
// Batch 572 (Pete, Oct 14, 2026; readiness review F7, option C): a person's end-of-day confirmation of their
// own screening hours for one day. Append-only: a change is a new record, and the latest for a person and day
// is the one that counts. The server keeps its own recorded figure beside it (CYTOLOGY_QC_API.md §5).

/** Quick-pick reasons for a corrected figure (the note is optional except for 'other'). */
export const SCREENING_HOURS_REASONS = ['microscopeOffScreen', 'slideLeftOpen', 'other'] as const;
export type ScreeningHoursReason = typeof SCREENING_HOURS_REASONS[number];

export interface CytologyScreeningHoursSignOff {
  id: string;
  userId: string;
  /** The working day, YYYY-MM-DD, in the lab's time zone (the facility time zone setting), starting at the lab's start-of-day hour. */
  date: string;
  /** What was recorded for the day when it was signed off. */
  recordedHours: number;
  /** What the person confirmed. */
  signedHours: number;
  /** Set when signedHours differs from recordedHours (a correction). */
  reasonId?: ScreeningHoursReason;
  note?: string;
  /** The correction differs from the recorded figure by more than the tolerance: shown to the supervisor. */
  flagged: boolean;
  signedAt: string;
  /** Batch 574: the lab's start-of-day hour in force when signed off (absent before Batch 574: midnight). */
  dayStartHour?: number;
}

/** Batch 574: a correction's note is short and never holds patient details (it shows on the supervisor's report). */
export const SCREENING_HOURS_NOTE_MAX = 200;
