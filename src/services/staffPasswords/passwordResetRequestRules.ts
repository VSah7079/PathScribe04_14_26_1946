// src/services/staffPasswords/passwordResetRequestRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 711: the pure parts of "Ask my administrator to reset my password".
// Tested in passwordResetRequestService.test.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** One request per email in this window (ms). */
export const RESET_REQUEST_WINDOW_MS = 10 * 60 * 1000;

/** The most throttle entries kept (the oldest are dropped first), so a flood of made-up emails cannot fill storage. */
export const RESET_THROTTLE_MAX_ENTRIES = 200;

/** The longest email text taken or written to the audit log. */
export const RESET_EMAIL_MAX_LENGTH = 120;

/** An email as compared: trimmed, lower-case. */
export const normaliseResetEmail = (email: string): string => email.trim().toLowerCase();

/** Whether the text looks like an email address (shape only; says nothing about whether an account exists). */
export const looksLikeEmail = (email: string): boolean => {
  const e = normaliseResetEmail(email);
  return e.length > 0 && e.length <= RESET_EMAIL_MAX_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
};

/** email → ISO time of the last request. */
export type ResetThrottle = Record<string, string>;

/** Whether this email was already used for a request inside the window. */
export function isThrottled(throttle: ResetThrottle, email: string, nowMs: number): boolean {
  const last = Date.parse(throttle[normaliseResetEmail(email)] ?? '');
  return Number.isFinite(last) && nowMs - last < RESET_REQUEST_WINDOW_MS;
}

/** The throttle with this email stamped now, expired entries dropped and the size capped. */
export function recordThrottle(throttle: ResetThrottle, email: string, nowMs: number): ResetThrottle {
  const live = Object.entries(throttle).filter(([, at]) => nowMs - Date.parse(at) < RESET_REQUEST_WINDOW_MS);
  live.push([normaliseResetEmail(email), new Date(nowMs).toISOString()]);
  return Object.fromEntries(live.slice(-RESET_THROTTLE_MAX_ENTRIES));
}

/** Where the Staff screen opens that person's record. */
export const staffRecordLink = (staffId: string): string =>
  `/configuration?tab=staff&section=members&staff=${encodeURIComponent(staffId)}`;

/** The staff id named by ?staff= in an address, or null. */
export const staffIdFromAddress = (search: string): string | null => new URLSearchParams(search).get('staff') || null;
