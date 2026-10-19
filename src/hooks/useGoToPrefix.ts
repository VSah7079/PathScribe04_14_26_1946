// src/hooks/useGoToPrefix.ts
// Batch 602 (Pete): the "Go to" prefix. Alt+J opens a short list of the always-on commands; the next key runs one.
// Esc, a key that is not on the list, a click away or 3 seconds of waiting close it without running anything.
// The rules (which key, which command) are in services/actionRegistry/shortcutResolution.ts; this only wires the
// keyboard to them. The listener is in the capture phase so the key never also reaches the screen's own hotkeys.
import { useCallback, useEffect, useRef, useState } from 'react';
import { actionRegistryService } from '@/services';
import { LEADER_TIMEOUT_MS, isLeaderPress, leaderEntries, resolveLeaderPress, type LeaderEntry } from '@/services/actionRegistry/shortcutResolution';

export interface GoToPrefix {
  open: boolean;
  entries: LeaderEntry[];
  close: () => void;
}

export function useGoToPrefix(): GoToPrefix {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const openRef = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    openRef.current = false;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const eligible = actionRegistryService.getEligibleActions();
      if (!openRef.current) {
        if (!isLeaderPress(e)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        openRef.current = true;
        setEntries(leaderEntries(eligible));
        setOpen(true);
        timer.current = setTimeout(close, LEADER_TIMEOUT_MS);
        return;
      }
      const result = resolveLeaderPress(eligible, e);
      if (result.kind === 'ignore') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
      if (result.kind === 'run') {
        const action = actionRegistryService.getActionById(result.command.id);
        if (action) actionRegistryService.executeAction(action);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => { window.removeEventListener('keydown', onKeyDown, true); if (timer.current) clearTimeout(timer.current); };
  }, [close]);

  return { open, entries, close };
}
