// src/hooks/useGuideWindow.ts
// ─────────────────────────────────────────────────────────
// Batch 668: opens a guide (User or Administrator) in its own window that remembers where the person put it (the same
// launcher the Clinical Links and EMR windows use, useCompanionWindow), and falls back to an ordinary new tab when the
// browser or the hospital's policy refuses a window. Reference material, so the window stays open when the person
// moves to another screen.
// ─────────────────────────────────────────────────────────
import { useCallback, useState } from 'react';
import type React from 'react';
import { useCompanionWindow } from './useCompanionWindow';
import { isPlainLeftClick } from '@/services/help/helpTargets';

export type GuideKind = 'user' | 'admin';
const WINDOW_NAME: Record<GuideKind, string> = { user: 'PathScribeUserGuide', admin: 'PathScribeAdminGuide' };

export function useGuideWindow(kind: GuideKind) {
  const { openCompanion } = useCompanionWindow({ windowName: WINDOW_NAME[kind], preferredWidth: 1000, preferredHeight: 800, closeOnUnmount: false });
  // After one refusal, stop intercepting clicks and let the link behave as a normal new-tab link.
  const [blocked, setBlocked] = useState(false);

  /** Opens `url` in the remembered window; if refused, in a new tab. Call straight from a click or key press. */
  const open = useCallback((url: string) => {
    void openCompanion(url).then(result => {
      if (result !== 'blocked') return;
      setBlocked(true);
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  }, [openCompanion]);

  /** onClick for a link: opens the window on a plain click, otherwise leaves the browser's own behaviour. */
  const onLinkClick = useCallback((url: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (blocked || !isPlainLeftClick(event)) return;
    event.preventDefault(); // synchronous: the click's permission to open a window is spent once the promise settles
    open(url);
  }, [blocked, open]);

  return { open, onLinkClick };
}
