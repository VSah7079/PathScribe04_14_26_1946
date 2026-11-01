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
// Batch 750 (Pete, S10 item 5): in Chrome and Edge, once window placement has been allowed, a remembered position on
// a screen that is no longer there moves to the primary screen (services/windowPlacement/windowPlacement.ts); without
// that permission the remembered coordinates are used as they are. The Save position page (pages/WindowPositionPage)
// records a position on purpose with saveCompanionGeometry.
//
// IMPORTANT: openCompanion() must be called directly from a user gesture
// (a click handler), not after an await/setTimeout/etc -- both
// getScreenDetails()'s permission prompt and window.open() itself
// require this in most browsers, or they'll be silently rejected/blocked.
// ─────────────────────────────────────────────────────────────────────────────

import { getWorkstationJson, setWorkstationJson } from '@/utils/workstationSettings';
import { geometryUsable, placeOnScreens, type ScreenArea, type WindowGeometry } from '@/services/windowPlacement/windowPlacement';
import { useRef, useState, useCallback, useEffect } from 'react';

export type CompanionLaunchResult = 'window' | 'blocked';

export interface UseCompanionWindowOptions {
  /** Unique name for window.open()'s target -- reused so a second click
   *  re-focuses the existing window instead of opening a duplicate.
   *  Also used to derive this window's saved-geometry key, so
   *  different companion windows (EMR vs. a future DP viewer) remember
   *  their positions independently. */
  windowName: string;
  preferredWidth?: number;
  preferredHeight?: number;
  /** Whether to close the companion window when the calling component
   *  unmounts. Defaults to true, which is right for the EMR Sidecar: a
   *  patient chart must not outlive the case view that opened it.
   *  Set false for reference material with no patient context (e.g. the
   *  PubMed literature window) -- closing a paper out from under someone
   *  because they navigated to another page would be hostile. */
  closeOnUnmount?: boolean;
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

function storageKeyFor(windowName: string) {
  return `ps-companion-window-geometry-${windowName}`;
}

function loadGeometry(windowName: string): WindowGeometry | null {
  const parsed = getWorkstationJson<unknown>(storageKeyFor(windowName), null);
  return geometryUsable(parsed) ? parsed : null;
}

function saveGeometry(windowName: string, g: WindowGeometry) {
  setWorkstationJson(storageKeyFor(windowName), g);
}

/** Batch 750: records where a companion window should open on this workstation (the Save position page). */
export function saveCompanionGeometry(windowName: string, g: WindowGeometry): boolean {
  if (!geometryUsable(g)) return false;
  saveGeometry(windowName, g);
  return true;
}

/** Batch 750: asks Chrome or Edge for window placement (a prompt the first time), from a click, so later openings can
 *  check the saved screen is still there. Does nothing in browsers without it. */
export function requestScreenPlacement(): void {
  if (!('getScreenDetails' in window)) return;
  void (window as unknown as { getScreenDetails(): Promise<unknown> }).getScreenDetails().catch(() => { /* refused: saved coordinates are used as they are */ });
}

/** The screens, only when the person has already allowed window placement (no prompt is raised here). */
async function screensIfAllowed(): Promise<ScreenArea[]> {
  if (!('getScreenDetails' in window) || !navigator.permissions?.query) return [];
  try {
    const status = await navigator.permissions.query({ name: 'window-management' as PermissionName });
    if (status.state !== 'granted') return [];
    const details = await (window as unknown as { getScreenDetails(): Promise<{ screens: { availLeft: number; availTop: number; availWidth: number; availHeight: number; isPrimary: boolean }[] }> }).getScreenDetails();
    return details.screens.map(s => ({ left: s.availLeft, top: s.availTop, width: s.availWidth, height: s.availHeight, isPrimary: s.isPrimary }));
  } catch {
    return []; // an older browser that names the permission differently, or refuses: keep the saved coordinates
  }
}

export function useCompanionWindow(options: UseCompanionWindowOptions): UseCompanionWindowResult {
  const windowRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGeomRef = useRef<WindowGeometry | null>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  // Held in a ref so the unmount cleanup below can read the current value
  // without taking options into its dependency array (which would make it
  // re-run, and close the window, on every options-object identity change).
  const closeOnUnmountRef = useRef(options.closeOnUnmount ?? true);
  closeOnUnmountRef.current = options.closeOnUnmount ?? true;

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
      const placed = placeOnScreens(remembered, await screensIfAllowed());
      left = placed.left;
      top = placed.top;
      width = placed.width;
      height = placed.height;
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

      if (left === undefined || top === undefined) { // always set together
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

    // Sever the child's reference back to this session for external
    // targets. Without it, a cross-origin page can call
    // window.opener.location = '...' and redirect the authenticated
    // PathScribe tab -- the reverse-tabnabbing vector. Skipped for
    // same-origin companions (the EMR Sidecar), which are trusted and
    // may legitimately want to postMessage back.
    try {
      if (new URL(url, window.location.href).origin !== window.location.origin) {
        win.opener = null;
      }
    } catch { /* malformed URL or refused assignment -- non-fatal */ }

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
      if (closeOnUnmountRef.current && windowRef.current && !windowRef.current.closed) {
        windowRef.current.close();
      }
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return { openCompanion, closeCompanion, isWindowOpen };
}
