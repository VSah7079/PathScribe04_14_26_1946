// src/components/Config/System/deliveryScheduleForm.ts
// Batch 619 (PS-800): the editor's draft of a delivery schedule and back. Pure, so it is tested without the screen.
import { DEFAULT_REGISTRY_REVIEW_HOLD_MINUTES, IMMEDIATE_SCHEDULE, type DeliverySchedule, type ScheduleKind, type TimeWindow } from '@/services/deliverySchedules/deliverySchedule';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const WEEKDAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

export const defaultWindow = (): TimeWindow => ({ days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00' });

/** The draft to start editing from: a copy of the schedule in force, with sensible starting values for the kind chosen. */
export function draftFrom(s: DeliverySchedule): DeliverySchedule {
  return { ...IMMEDIATE_SCHEDULE, ...s, batchMonthDays: [...(s.batchMonthDays ?? [])], windows: s.windows.map(w => ({ ...w, days: [...w.days] })), batchDays: [...s.batchDays], batchTimes: [...s.batchTimes], blackoutDates: [...s.blackoutDates] };
}

/** Switching the kind keeps what is common and supplies starting values the new kind needs. */
export function withKind(s: DeliverySchedule, kind: ScheduleKind): DeliverySchedule {
  const next = { ...draftFrom(s), kind };
  if (kind === 'windows' && next.windows.length === 0) next.windows = [defaultWindow()];
  if (kind === 'review_hold' && next.reviewHoldMinutes < 1) next.reviewHoldMinutes = DEFAULT_REGISTRY_REVIEW_HOLD_MINUTES;
  if (kind === 'batch') {
    if (next.batchTimes.length === 0) next.batchTimes = ['22:00'];
    if (next.batchDays.length === 0) next.batchDays = [1, 2, 3, 4, 5];
  }
  if (next.timeZone === IMMEDIATE_SCHEDULE.timeZone && (kind === 'windows' || kind === 'batch')) next.timeZone = 'America/New_York';
  return next;
}

export const toggleDay = (days: number[], day: number): number[] =>
  (days.includes(day) ? days.filter(d => d !== day) : [...days, day]).sort((a, b) => a - b);

/** "2026-12-25, 2027-01-01" → dates; anything separated by spaces, commas or semicolons. */
export const parseDates = (text: string): string[] => Array.from(new Set(text.split(/[\s,;]+/).filter(Boolean))).sort();
export const datesText = (dates: string[]): string => dates.join(', ');
export const parseTimes = (text: string): string[] => Array.from(new Set(text.split(/[\s,;]+/).filter(Boolean))).sort();
export const parseNumbers = (text: string): number[] => Array.from(new Set(text.split(/[\s,;]+/).filter(Boolean).map(Number))).sort((a, b) => a - b);
