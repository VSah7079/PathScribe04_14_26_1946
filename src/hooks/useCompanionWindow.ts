// src/hooks/useCompanionWindow.ts
// ─────────────────────────────────────────────────────────────────────────────
// Generic launcher for third-party/companion content that should ideally
// open in its own real window (so it can be placed on a second monitor
// and viewed side-by-side with the main app) -- built for the EMR
// Sidecar, but deliberately generic so Digital Pathology viewers and any
// future similar integration reuse the exact same launch logic rather
// than each reinventing it.
//
// Tries, in order, on a FRESH launch (no remembered position -- see below):
//   1. Window Management API (getScreenDetails()) -- if supported and
//      permitted, finds a non-primary screen and opens the real window
//      positioned there. Chromium-only (Chrome/Edge) as of this writing;
//      not supported in Firefox/Safari.
//   2. Standard window.open(), centered on the current screen, if the
//      Window Management API isn't available/permitted but a popup is
//      still allowed.
//   3. Reports 'blocked' if window.open() itself was blocked (popup
//      blocker, or a hard Enterprise IT policy disabling popups entirely
//      -- the latter cannot be worked around by any client-side API, by
//      design). Callers should fall back to an embedded UI (e.g. a
//      drawer) in this case.
//
// POSITION MEMORY: there is no native "window moved" event for a window
// you opened via window.open() -- the only way to know the user dragged
// it is to poll its own screenX/screenY/outerWidth/outerHeight
// periodically (piggybacked on the same poll already used to detect the
// window closing). Once ANY position has been recorded this way, it is
// trusted completely on every future launch -- the smart-placement
// logic above is a first-launch-only default, not something that
// fights the user's own manual placement afterward.
//
// IMPORTANT: openCompanion() must be called directly from a user gesture
// (a click handler), not after an await/setTimeout/etc -- both
// getScreenDetails()'s permission prompt and window.open() itself
// require this in most browsers, or they'll be silently rejected/blocked.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState, useCallback, useEffect } from 'react';

export type CompanionLaunchResult = 'window' | 'blocked';

export interface UseCompanionWindowOptions {
  /** Unique name for window.open()'s target -- reused so a second click
   *  re-focuses the existing window instead of opening a duplicate.
   *  Also used to derive this window's localStorage geometry key, so
   *  different companion windows (EMR vs. a future DP viewer) remember
   *  their positions independently. */
  windowName: string;
  preferredWidth?: number;
  preferredHeight?: number;
}

export interface UseCompanionWindowResult {
  /** Call this from a click handler. Resolves 'window' if a real window
   *  is now open (or was already open and got refocused), 'blocked' if
   *  window.open() itself returned null/was blocked -- callers should
   *  show an embedded fallback UI in that case. */
  openCompanion: (url: string) => Promise<CompanionLaunchResult>;
  closeCompanion: () => void;
  isWindowOpen: boolean;
}

interface WindowGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
}

function storageKeyFor(windowName: string) {
  return `ps-companion-window-geometry-${windowName}`;
}

function loadGeometry(windowName: string): WindowGeometry | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(windowName));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WindowGeometry;
    if (
      typeof parsed.left !== 'number' || typeof parsed.top !== 'number' ||
      typeof parsed.width !== 'number' || typeof parsed.height !== 'number'
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveGeometry(windowName: string, g: WindowGeometry) {
  try { localStorage.setItem(storageKeyFor(windowName), JSON.stringify(g)); } catch { /* ignore quota errors */ }
}

export function useCompanionWindow(options: UseCompanionWindowOptions): UseCompanionWindowResult {
  const windowRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGeomRef = useRef<WindowGeometry | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);

  const openCompanion = useCallback(async (url: string): Promise<CompanionLaunchResult> => {
    // Already open -- just refocus and navigate to the new URL if it changed.
    // Deliberately does NOT reposition -- the window is already wherever
    // the user has it, moving it out from under them would be worse UX
    // than leaving it alone.
    if (windowRef.current && !windowRef.current.closed) {
      try { windowRef.current.location.href = url; } catch { /* cross-origin, ignore */ }
      windowRef.current.focus();
      return 'window';
    }

    let left: number | undefined;
    let top: number | undefined;
    let width  = options.preferredWidth  ?? 1200;
    let height = options.preferredHeight ?? 800;

    // A remembered position from a previous session -- the user's own
    // manual placement, trusted completely, skipping smart-placement
    // logic entirely.
    const remembered = loadGeometry(options.windowName);

    if (remembered) {
      left = remembered.left;
      top = remembered.top;
      width = remembered.width;
      height = remembered.height;
    } else {
      // No remembered position yet -- try to find a real second screen
      // via the Window Management API for a sensible first-launch default.
      if ('getScreenDetails' in window) {
        try {
          const screenDetails = await (window as any).getScreenDetails();
          const nonPrimary = screenDetails.screens.find((s: any) => !s.isPrimary);
          if (nonPrimary) {
            width  = Math.min(width,  nonPrimary.availWidth  - 80);
            height = Math.min(height, nonPrimary.availHeight - 80);
            left = nonPrimary.availLeft + (nonPrimary.availWidth  - width)  / 2;
            top  = nonPrimary.availTop  + (nonPrimary.availHeight - height) / 2;
          }
        } catch {
          // Permission denied, unsupported at runtime despite the feature
          // check, or user dismissed the prompt -- fall through to
          // standard centered placement on the current screen below.
        }
      }

      if (left === undefined) {
        left = (window.screen.width  - width)  / 2;
        top  = (window.screen.height - height) / 2;
      }
    }

    const win = window.open(
      url,
      options.windowName,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!win || win.closed) {
      return 'blocked';
    }

    windowRef.current = win;
    setIsWindowOpen(true);
    lastGeomRef.current = { left, top, width, height };

    // Single poll covers both concerns: (1) notice when the user closes
    // the window themselves (no native close event fires for a window
    // opened this way), and (2) notice if they've manually moved/resized
    // it, so that position can be remembered for next time. Reading
    // these properties on a cross-origin-capable but same-purpose window
    // can throw in some browser configurations -- wrapped defensively.
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      if (win.closed) {
        setIsWindowOpen(false);
        windowRef.current = null;
        if (pollRef.current) clearInterval(pollRef.current);
        return;
      }
      try {
        const current: WindowGeometry = {
          left: win.screenX, top: win.screenY,
          width: win.outerWidth, height: win.outerHeight,
        };
        const last = lastGeomRef.current;
        if (!last || last.left !== current.left || last.top !== current.top ||
            last.width !== current.width || last.height !== current.height) {
          lastGeomRef.current = current;
          saveGeometry(options.windowName, current);
        }
      } catch {
        // Cross-origin or otherwise inaccessible -- can't track position
        // for this particular target, not fatal, just skip this tick.
      }
    }, 1000);

    return 'window';
  }, [options.windowName, options.preferredWidth, options.preferredHeight]);

  const closeCompanion = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) windowRef.current.close();
    windowRef.current = null;
    setIsWindowOpen(false);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // Close the companion window if the component using this hook unmounts.
  useEffect(() => {
    return () => {
      if (windowRef.current && !windowRef.current.closed) windowRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return { openCompanion, closeCompanion, isWindowOpen };
}
