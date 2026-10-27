// src/pages/LockboxDropOffPage/hooks/useLockboxActionEvents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 645: the screen's voice and shortcut actions. The action registry dispatches PATHSCRIBE_<action id> on window
// (CUSTOM_EVENT_ACTIONS); this hook turns each into the matching screen call. See constants/lockboxActionGroup.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';

export interface LockboxActionHandlers { focusScan: () => void; toggleUrgent: () => void; showDropOff: () => void; showFolder: () => void }

export function useLockboxActionEvents(handlers: LockboxActionHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const map: Record<string, () => void> = {
      PATHSCRIBE_LOCKBOX_FOCUS_SCAN: () => ref.current.focusScan(),
      PATHSCRIBE_LOCKBOX_MARK_URGENT: () => ref.current.toggleUrgent(),
      PATHSCRIBE_LOCKBOX_SHOW_DROP_OFF: () => ref.current.showDropOff(),
      PATHSCRIBE_LOCKBOX_SHOW_FOLDER: () => ref.current.showFolder(),
    };
    Object.entries(map).forEach(([name, fn]) => window.addEventListener(name, fn));
    return () => Object.entries(map).forEach(([name, fn]) => window.removeEventListener(name, fn));
  }, []);
}
