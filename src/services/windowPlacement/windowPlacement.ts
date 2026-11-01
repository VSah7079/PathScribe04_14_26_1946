// src/services/windowPlacement/windowPlacement.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete, Oct 31, 2026, S10 item 5): where a remembered window (the slide image window, the guides, the EMR
// window) reopens. Pure, so the decisions are tested here; hooks/useCompanionWindow.ts does the browser calls.
//   • In Chrome and Edge, once the person has allowed window placement (the Window Management permission), the screens
//     are known: a saved position on a screen that is still there is used as saved; one on a screen that has gone (a
//     monitor unplugged, a different desk) moves to the primary screen, centred.
//   • Elsewhere, or before the permission is given, the saved coordinates are used as they are, and the browser keeps
//     the window on a screen it has.
//   • The "Save position" page (pages/WindowPositionPage) records a window's position on purpose, for the windows listed
//     in WINDOW_POSITION_TARGETS.
// ─────────────────────────────────────────────────────────────────────────────

export interface WindowGeometry { left: number; top: number; width: number; height: number }

/** A screen's usable area, as the Window Management API reports it (availLeft, availTop, availWidth, availHeight). */
export interface ScreenArea { left: number; top: number; width: number; height: number; isPrimary: boolean }

/** A plausible saved geometry (numbers, a usable size). */
export function geometryUsable(g: unknown): g is WindowGeometry {
  if (!g || typeof g !== 'object') return false;
  const v = g as Record<string, unknown>;
  return ['left', 'top', 'width', 'height'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k] as number))
    && (v.width as number) >= 200 && (v.height as number) >= 150;
}

const contains = (s: ScreenArea, x: number, y: number) => x >= s.left && x < s.left + s.width && y >= s.top && y < s.top + s.height;

/** The screen a window is on: the one holding the middle of its title bar, else its top-left corner. */
export function screenOf(g: WindowGeometry, screens: readonly ScreenArea[]): ScreenArea | undefined {
  return screens.find(s => contains(s, g.left + g.width / 2, g.top + 10)) ?? screens.find(s => contains(s, g.left + 10, g.top + 10));
}

/** Where a saved window reopens, given the screens there are now (an empty list means "not known": keep it as saved). */
export function placeOnScreens(g: WindowGeometry, screens: readonly ScreenArea[]): WindowGeometry {
  if (screens.length === 0) return g;
  const on = screenOf(g, screens);
  if (on) return { ...g, width: Math.min(g.width, on.width), height: Math.min(g.height, on.height) };
  const primary = screens.find(s => s.isPrimary) ?? screens[0];
  const width = Math.min(g.width, primary.width);
  const height = Math.min(g.height, primary.height);
  return { width, height, left: Math.round(primary.left + (primary.width - width) / 2), top: Math.round(primary.top + (primary.height - height) / 2) };
}

/** The windows whose position can be saved from Settings, with the locale key for each name. */
export const WINDOW_POSITION_TARGETS = {
  PathScribeSlideImage: 'slideImage',
} as const;

export type WindowPositionTarget = keyof typeof WINDOW_POSITION_TARGETS;

export function isWindowPositionTarget(name: string | null | undefined): name is WindowPositionTarget {
  return !!name && Object.prototype.hasOwnProperty.call(WINDOW_POSITION_TARGETS, name);
}
