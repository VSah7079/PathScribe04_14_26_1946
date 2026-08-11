// src/pages/SynopticReportPage/hooks/useReleaseBufferCountdown.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real feature, per direct specification: Post-Sign-Out Release Buffer.
// Extracted from ReleaseBufferBanner.tsx (Phase 1) so HeaderBar.tsx's own
// real "Status Header... MM:SS remaining" badge (Phase 3, spec §13b) can
// share the exact same live countdown logic rather than a second,
// separately-maintained copy.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';

export function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Real, live countdown to a real, known expiry timestamp — ticks every
 *  second only while genuinely relevant (a real expiresAt is provided),
 *  not a background interval running unconditionally. Returns the raw
 *  remaining milliseconds (can go negative once expired — callers
 *  needing a real "has it expired" check should compare against 0
 *  directly, same as ReleaseBufferBanner.tsx's own real auto-release
 *  trigger does) and the formatted MM:SS string. */
export function useReleaseBufferCountdown(expiresAt: string | undefined): { remainingMs: number; formatted: string } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const remainingMs = expiresAt ? new Date(expiresAt).getTime() - now : 0;
  return { remainingMs, formatted: formatRemaining(remainingMs) };
}
