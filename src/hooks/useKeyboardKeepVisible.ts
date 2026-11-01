// src/hooks/useKeyboardKeepVisible.ts
// Touch spec T6 (Batch 735): while a station screen is in the touch layout, keep the field being typed in and its
// Save button visible above the on-screen keyboard. Runs when a field that raises the keyboard gets focus, and
// again when the keyboard changes the visible area (visualViewport resize). When both fit, both are scrolled into
// view; when the form is too tall for both, the field stays in view and a copy of its Save button is docked just
// above the keyboard (the dock presses the real button). Decisions: utils/touch/keyboardVisibility.ts.
import { useCallback, useEffect, useRef, useState } from 'react';
import { findSaveButton, keyboardScrollPlan, raisesKeyboard, scrollAreaOf, visibleWithin } from '@/utils/touch/keyboardVisibility';

/** Time for the keyboard to finish opening before the visible area is measured. */
const KEYBOARD_SETTLE_MS = 350;

export interface SaveDock {
  label: string;
  disabled: boolean;
  /** Distance from the bottom of the window to the top of the keyboard, px. */
  bottomPx: number;
}

export function useKeyboardKeepVisible(active: boolean): { dock: SaveDock | null; pressDock: () => void } {
  const [dock, setDock] = useState<SaveDock | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!active) { setDock(null); return; }
    let timer: number | undefined;
    const keepVisible = () => {
      const field = document.activeElement;
      if (!raisesKeyboard(field)) { buttonRef.current = null; setDock(null); return; }
      const vv = window.visualViewport;
      const screen = vv ? { top: vv.offsetTop, bottom: vv.offsetTop + vv.height } : { top: 0, bottom: window.innerHeight };
      // The page scrolls inside its own area below the header, so what can be seen is that area's part of the screen.
      const scroller = scrollAreaOf(field);
      const visible = scroller ? visibleWithin(screen, scroller.getBoundingClientRect()) : screen;
      const button = findSaveButton(field) as HTMLButtonElement | null;
      const plan = keyboardScrollPlan(field.getBoundingClientRect(), button?.getBoundingClientRect() ?? null, visible);
      if (plan === 'both' && button) button.scrollIntoView({ block: 'nearest' });
      if (plan !== 'none') field.scrollIntoView({ block: 'nearest' });
      if (plan === 'fieldOnly' && button) {
        buttonRef.current = button;
        setDock({ label: (button.textContent ?? '').trim(), disabled: button.disabled, bottomPx: Math.max(0, window.innerHeight - screen.bottom) });
      } else { buttonRef.current = null; setDock(null); }
    };
    const later = () => { window.clearTimeout(timer); timer = window.setTimeout(keepVisible, KEYBOARD_SETTLE_MS); };
    // While typing, the docked copy follows the real button (it may become enabled as the form fills in).
    const refresh = () => { const b = buttonRef.current; if (b) setDock(d => (d && d.disabled !== b.disabled ? { ...d, disabled: b.disabled } : d)); };
    document.addEventListener('focusin', later);
    document.addEventListener('focusout', later);
    document.addEventListener('input', refresh);
    window.visualViewport?.addEventListener('resize', later);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('focusin', later);
      document.removeEventListener('focusout', later);
      document.removeEventListener('input', refresh);
      window.visualViewport?.removeEventListener('resize', later);
    };
  }, [active]);

  const pressDock = useCallback(() => { buttonRef.current?.click(); setDock(null); }, []);
  return { dock, pressDock };
}
