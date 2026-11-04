// src/services/consultAccess/consultLinkLifetime.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 669 (access-11, reviewer's ruling Oct 24, 2026): how long an outside
// consult link works. ONE pure function, so the browser mock and the API server
// (docs/architecture/CONSULT_ACCESS_API.md, CA-28) apply the same policy.
//
//   - Before the consultant SIGNS an opinion, the link's own expiry applies.
//     A Draft does not start any clock.
//   - After a Signed opinion, the link stops working at the FIRST of
//       (a) CONSULT_POST_SIGNATURE_MAX_VIEWS opens after the signature, or
//       (b) CONSULT_POST_SIGNATURE_HOURS hours after the signature.
//     The link's own expiry still applies as well: signing never makes a link
//     live longer than the issuer allowed (decision flagged for Pete).
//   - Every open after the signature counts as a view; the Signed submit itself
//     does not. The count and the clock belong to the SERVER.
// ─────────────────────────────────────────────────────────────────────────────

/** The most opens allowed after a signature. */
export const CONSULT_POST_SIGNATURE_MAX_VIEWS = 3;
/** The most hours the link stays open after a signature. */
export const CONSULT_POST_SIGNATURE_HOURS = 48;

const HOUR_MS = 3_600_000;

/** The fields of a link the policy reads. */
export interface ConsultLinkLifetimeInput {
  expiresAt: string;
  /** When the Signed opinion was accepted; absent while there is none (a Draft does not set it). */
  signedAt?: string;
  /** Opens counted since the signature. */
  viewsAfterSignature?: number;
}

export type ConsultLinkLifetimeState = 'open' | 'expired' | 'exhausted';

export interface ConsultLinkLifetime {
  /** open: the next open is allowed. expired: the clock ran out. exhausted: no views left. */
  state: ConsultLinkLifetimeState;
  signed: boolean;
  /** Views counted since the signature. */
  viewsCounted: number;
  /** Views left after those counted; null before a signature. */
  remainingViews: number | null;
  /** Whole hours left (rounded up, at least 1 while open), up to the first of the link's expiry and the post-signature window; 0 once ended. */
  hoursRemaining: number;
  /** When the link stops working because of the clock (ISO). */
  endsAt: string;
}

export function consultLinkLifetime(link: ConsultLinkLifetimeInput, now: Date = new Date()): ConsultLinkLifetime {
  const signed = !!link.signedAt;
  const viewsCounted = signed ? Math.max(0, link.viewsAfterSignature ?? 0) : 0;
  const expiryMs = new Date(link.expiresAt).getTime();
  const windowMs = signed ? new Date(link.signedAt as string).getTime() + CONSULT_POST_SIGNATURE_HOURS * HOUR_MS : Infinity;
  const endMs = Math.min(expiryMs, windowMs);
  const msLeft = endMs - now.getTime();
  const remainingViews = signed ? Math.max(0, CONSULT_POST_SIGNATURE_MAX_VIEWS - viewsCounted) : null;
  const state: ConsultLinkLifetimeState = msLeft <= 0 ? 'expired' : remainingViews === 0 ? 'exhausted' : 'open';
  return {
    state,
    signed,
    viewsCounted,
    remainingViews,
    hoursRemaining: msLeft <= 0 ? 0 : Math.max(1, Math.ceil(msLeft / HOUR_MS)),
    endsAt: new Date(endMs).toISOString(),
  };
}

/** What the issuer-side lists say about a link that has a signed opinion: which text, and its numbers. Null before a signature. */
export function consultLifetimeLine(link: ConsultLinkLifetimeInput, now: Date = new Date()):
  | { key: 'open'; remainingViews: number; hoursRemaining: number }
  | { key: 'exhausted' | 'ended' }
  | null {
  const life = consultLinkLifetime(link, now);
  if (!life.signed) return null;
  if (life.state === 'open') return { key: 'open', remainingViews: life.remainingViews ?? 0, hoursRemaining: life.hoursRemaining };
  return { key: life.state === 'exhausted' ? 'exhausted' : 'ended' };
}
