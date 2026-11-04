// src/services/connectivity/latencyStates.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 548 (PS-539 phase 2d, readiness review §8 and §9 item 2): what a
// screen shows while it waits, and when the connection to the server is lost.
// Pure; the timers are in hooks/useLoadingPhase.ts and
// hooks/useConnectionBanner.ts.
//
//   Waiting for data:
//     - under 300 ms: nothing (a quick answer never flashes a placeholder);
//     - from 300 ms: a placeholder (skeleton) with the screen's own text;
//     - from 3 s: also "still working", so nobody wonders whether it hung.
//
//   The connection (the live-updates hub, and the browser's own network):
//     - a problem shows only once it has lasted 2 s (a blip shows nothing);
//     - "offline" when the browser has no network, or the hub has given up
//       for now; "reconnecting" while the hub is trying again;
//     - once it's back after a problem was shown, "reconnected" for 4 s, then
//       nothing. No click is ever needed (CLAUDE.md rule 8).
// ─────────────────────────────────────────────────────────────────────────────
import type { LiveConnectionState } from '../liveUpdates/liveUpdatePolicy';

export const LATENCY_LIMITS = {
  /** A wait shorter than this shows nothing. */
  skeletonAfterMs: 300,
  /** A wait longer than this also says "still working". */
  slowAfterMs: 3_000,
  /** A connection problem shorter than this shows nothing. */
  bannerGraceMs: 2_000,
  /** How long "reconnected" stays before the banner goes. */
  reconnectedForMs: 4_000,
} as const;

export type LoadingPhase = 'hidden' | 'skeleton' | 'slow';

export function loadingPhase(elapsedMs: number): LoadingPhase {
  if (elapsedMs < LATENCY_LIMITS.skeletonAfterMs) return 'hidden';
  return elapsedMs < LATENCY_LIMITS.slowAfterMs ? 'skeleton' : 'slow';
}

/** The connection problem right now, before the grace period: none, the hub retrying, or no connection. */
export type ConnectionProblem = 'none' | 'reconnecting' | 'offline';

/**
 * What's wrong with the connection now. The browser's own network comes
 * first. The hub counts only when it's in use (a SignalR transport that has
 * connected or is trying to): 'idle' and 'local' are never a problem.
 */
export function connectionProblem(input: { browserOnline: boolean; transport: 'signalr' | 'local'; hub: LiveConnectionState }): ConnectionProblem {
  if (!input.browserOnline) return 'offline';
  if (input.transport !== 'signalr') return 'none';
  if (input.hub === 'reconnecting') return 'reconnecting';
  if (input.hub === 'offline') return 'offline';
  return 'none';
}

export type ConnectionBanner = 'none' | 'reconnecting' | 'offline' | 'reconnected';

/**
 * What the banner shows, given the current problem, since when it has lasted
 * (ms timestamp, or null), whether a problem banner has been shown, and when
 * the connection came back (ms timestamp, or null).
 */
export function connectionBanner(input: {
  problem: ConnectionProblem;
  problemSince: number | null;
  problemShown: boolean;
  recoveredAt: number | null;
  now: number;
}): ConnectionBanner {
  if (input.problem !== 'none') {
    if (input.problemShown) return input.problem;
    return input.problemSince !== null && input.now - input.problemSince >= LATENCY_LIMITS.bannerGraceMs ? input.problem : 'none';
  }
  if (input.recoveredAt !== null && input.now - input.recoveredAt < LATENCY_LIMITS.reconnectedForMs) return 'reconnected';
  return 'none';
}
