// src/services/delivery/deliveryRetryPolicy.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 521 (PS-281 §3.2.1): automatic retries for the automatic delivery
// channels (print, e-fax, file drop). After a failure the delivery is tried
// again after each delay in turn; once the last retry fails it is dead-lettered
// (PS-281 §3.2.2). Pete's accepted default (Oct 10): 3 retries, at 1, 5 and 15
// minutes. The lab can change the delays (Delivery Rules → Retries).
//
// The waiting is never done inside a call: each retry is a separate attempt a
// scheduled sweep makes when it falls due (deliveryRetrySweep.ts). That's what
// a serverless server needs too (docs/architecture/REPORT_DELIVERY_API.md).
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_RETRY_DELAYS_MINUTES: readonly number[] = [1, 5, 15];
export const MAX_RETRIES = 10;
export const MAX_DELAY_MINUTES = 24 * 60;

export interface DeliveryRetrySettings {
  /** The wait before each retry, in minutes; the number of entries is the number of retries. */
  delaysMinutes: number[];
}

export type RetrySettingsProblem = 'tooMany' | 'notWholeMinutes' | 'outOfRange';

/** What's wrong with retry delays before they can be saved. No retries at all is allowed (straight to the exception queue). */
export function retrySettingsProblem(delays: readonly number[]): RetrySettingsProblem | null {
  if (delays.length > MAX_RETRIES) return 'tooMany';
  if (delays.some(d => !Number.isInteger(d))) return 'notWholeMinutes';
  if (delays.some(d => d < 1 || d > MAX_DELAY_MINUTES)) return 'outOfRange';
  return null;
}

/** Delays typed as "1, 5, 15" (commas or spaces); NaN where an entry isn't a number. */
export const parseRetryDelays = (text: string): number[] =>
  text.split(/[\s,;]+/).filter(Boolean).map(Number);

/** When to try again after `failures` failed attempts (1 = the first attempt failed); null when no retry is left. */
export function nextAttemptAt(failures: number, delaysMinutes: readonly number[], now: Date): string | null {
  const delay = delaysMinutes[failures - 1];
  if (delay === undefined) return null;
  return new Date(now.getTime() + delay * 60_000).toISOString();
}

/** Whether a scheduled retry is due. */
export const retryDue = (nextAt: string | undefined, now: Date): boolean => !!nextAt && Date.parse(nextAt) <= now.getTime();
