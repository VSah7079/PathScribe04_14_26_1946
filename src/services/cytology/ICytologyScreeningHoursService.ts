// src/services/cytology/ICytologyScreeningHoursService.ts
// Batch 572 (F7, option C): a person's recorded screening hours for a day, and their end-of-day sign-off.
// Server contract: CYTOLOGY_QC_API.md §5. Rules: screeningHoursRules.ts.
import type { ServiceResult } from '../types';
import type { CytologyScreeningHoursSignOff, ScreeningHoursReason } from '@/types/cytology/CytologyScreeningHoursSignOff';

export interface ScreeningHoursDay {
  date: string;
  recordedHours: number;
  signOff: CytologyScreeningHoursSignOff | null;
}

export interface ScreeningHoursSignOffInput {
  date: string;
  signedHours: number;
  reasonId?: ScreeningHoursReason;
  note?: string;
}

/** Batch 574: the days a person can sign off now. `yesterday` only while it still needs signing off. */
export interface ScreeningHoursCurrentDays {
  today: ScreeningHoursDay;
  yesterday: ScreeningHoursDay | null;
  /** The lab's start of day (0–23), from the workload settings. */
  dayStartHour: number;
}

export interface ICytologyScreeningHoursService {
  /** The signed-in person's own day (`timezone`: the lab's, which decides what "the day" is). */
  forDay(userId: string, date: string, timezone: string): Promise<ServiceResult<ScreeningHoursDay>>;
  /** Batch 574: today and, when it still needs it, yesterday (the lab's days, by its start-of-day hour). */
  currentDays(userId: string, timezone: string): Promise<ServiceResult<ScreeningHoursCurrentDays>>;
  /**
   * Sign off (or change the sign-off of) the signed-in person's own hours: `cytology:screening-hours:sign-off`.
   * Batch 574: only for today or yesterday (`dateNotAllowed` otherwise).
   */
  signOff(user: { id: string; name?: string }, input: ScreeningHoursSignOffInput, timezone: string): Promise<ServiceResult<CytologyScreeningHoursSignOff>>;
  /** Every sign-off, for the supervisor's workload report. */
  getAll(): Promise<ServiceResult<CytologyScreeningHoursSignOff[]>>;
}
