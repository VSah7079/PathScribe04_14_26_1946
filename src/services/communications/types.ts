/**
 * services/communications/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared types used across all communication services.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Batch 493: a generic file attachment on an outgoing email — introduced
 *  for the Tumor Board meeting calendar invite (a base64 .ics file), but
 *  deliberately generic (filename/contentType/contentBase64) rather than
 *  named for that one caller, so a future attachment need doesn't require
 *  another EmailPayload shape change. */
export interface EmailAttachment {
  filename: string;
  contentType: string;
  contentBase64: string;
}

export interface EmailPayload {
  to:       string[];
  cc?: string[];
  subject:  string;
  bodyHtml: string;
  bodyText: string;
  attachments?: EmailAttachment[];
  metadata?: Record<string, string>;  // passed through to backend for logging
}

export interface Recipient {
  email: string;
  name?: string;
  role:  string;
}
