// src/hooks/useSessionSupersedeDetection.ts
// ─────────────────────────────────────────────────────────────────────────────
// Detects when the same user has logged in from another tab on this same
// browser, superseding this tab's session. Relies on the native `storage`
// event, which the browser fires in every OTHER same-origin tab when
// localStorage changes — critically, never in the tab that made the change
// itself, so a tab logging in can never falsely detect itself as
// superseded by its own write.
//
// Deliberately mirrors useIdleTimeout.ts's shape (a single boolean the
// caller reacts to) so ProtectedRoute.tsx's handling reads the same way
// for both — "if this became true, log out, preserving drafts."
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { getOwnSessionId, activeSessionKeyFor } from '@/services/session/sessionSupersedeService';

export function useSessionSupersedeDetection(enabled: boolean, userId: string | undefined): boolean {
  const [superseded, setSuperseded] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) return;

    const ownKey = activeSessionKeyFor(userId);

    const handleStorage = (e: StorageEvent) => {
      if (e.key !== ownKey) return;
      const ownSessionId = getOwnSessionId();
      // e.newValue is what the OTHER tab just wrote as the new active
      // session. If it doesn't match what this tab knows as its own
      // session id, a different tab has taken over.
      if (ownSessionId && e.newValue && e.newValue !== ownSessionId) {
        setSuperseded(true);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [enabled, userId]);

  return superseded;
}
