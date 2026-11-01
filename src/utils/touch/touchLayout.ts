// src/utils/touch/touchLayout.ts
// ─────────────────────────────────────────────────────────────────────────────
// Touch spec §5 (DECIDED Oct 30, 2026, Pete Nimmo): the station screens' touch layout (44 px targets, 48 px primary
// actions, 8 px gaps, 16 px field text) switches on by itself on a touch device (one whose main pointer is coarse),
// with a per-workstation override: Auto (default), Always on, Always off. A desktop at a bench may keep the denser
// layout with Always off; a touch laptop can be forced either way. The choice belongs to the computer, so it is a
// workstation setting (utils/workstationSettings.ts). Pure apart from the setting read/write.
// ─────────────────────────────────────────────────────────────────────────────
import { getWorkstationSetting, setWorkstationSetting } from '@/utils/workstationSettings';

export type TouchLayoutMode = 'auto' | 'on' | 'off';
export const TOUCH_LAYOUT_MODES: readonly TouchLayoutMode[] = ['auto', 'on', 'off'];

/** The workstation setting that holds the override. */
export const TOUCH_LAYOUT_SETTING = 'pathscribe_touch_layout';
/** Sent on window when the override changes, so every open station screen follows at once. */
export const TOUCH_LAYOUT_CHANGED_EVENT = 'PATHSCRIBE_TOUCH_LAYOUT_CHANGED';
/** The media query for a device whose main pointer is a finger. */
export const COARSE_POINTER_QUERY = '(pointer: coarse)';

/** A stored value read back as a mode; anything unknown is Auto. */
export function parseTouchLayoutMode(raw: string | null | undefined): TouchLayoutMode {
  return raw === 'on' || raw === 'off' ? raw : 'auto';
}

/** Whether the touch layout is on: the override when set, otherwise whether the main pointer is coarse. */
export function touchLayoutActive(mode: TouchLayoutMode, coarsePointer: boolean): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return coarsePointer;
}

export function readTouchLayoutMode(): TouchLayoutMode {
  return parseTouchLayoutMode(getWorkstationSetting(TOUCH_LAYOUT_SETTING));
}

export function writeTouchLayoutMode(mode: TouchLayoutMode): void {
  // Auto is the default, so it is stored as nothing.
  setWorkstationSetting(TOUCH_LAYOUT_SETTING, mode === 'auto' ? null : mode);
}
