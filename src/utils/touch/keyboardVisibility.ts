// src/utils/touch/keyboardVisibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Touch spec T6 (Batch 735): with the on-screen keyboard up, the field being typed in and its Save button must both
// be visible. The browser scrolls the field into view on its own; this decides whether the page must also bring the
// Save button into view, using the part of the screen the keyboard leaves (the visual viewport). Pure, apart from
// findSaveButton, which reads the DOM it is handed.
// ─────────────────────────────────────────────────────────────────────────────

export interface Box { top: number; bottom: number }
/** The visible part of the page above the keyboard, in the same coordinates as the boxes. */
export interface Visible { top: number; bottom: number }

/** Room kept between the field or button and the edge of what is visible. */
export const KEYBOARD_MARGIN_PX = 8;

export type KeyboardScrollPlan = 'none' | 'both' | 'fieldOnly';

const inside = (b: Box, v: Visible) => b.top >= v.top + KEYBOARD_MARGIN_PX && b.bottom <= v.bottom - KEYBOARD_MARGIN_PX;

/**
 * What to bring into view: nothing when both are visible; both when they fit together above the keyboard; otherwise
 * the field alone (typing comes first; the person scrolls to Save afterwards).
 */
export function keyboardScrollPlan(field: Box, button: Box | null, visible: Visible): KeyboardScrollPlan {
  if (!button) return inside(field, visible) ? 'none' : 'fieldOnly';
  if (inside(field, visible) && inside(button, visible)) return 'none';
  const span = Math.max(field.bottom, button.bottom) - Math.min(field.top, button.top);
  return span <= visible.bottom - visible.top - 2 * KEYBOARD_MARGIN_PX ? 'both' : 'fieldOnly';
}

/** A field that raises the on-screen keyboard (a scan field does not: inputmode none). */
export function raisesKeyboard(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  if (el.getAttribute('inputmode') === 'none') return false;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'hidden', 'image'].includes(type);
}

const PANEL = '[role="dialog"], [role="alertdialog"], form, [class*="modal"], [class*="panel"], section';
const SAVE = 'button[type="submit"], button[class*="primary"], button[class*="confirm"], button[class*="save"], button[class*="danger"]';

/** The Save (primary) button that belongs with a field: the first one after it in its panel or window. */
export function findSaveButton(field: Element): HTMLElement | null {
  const panel = field.closest(PANEL);
  if (!panel) return null;
  const buttons = [...panel.querySelectorAll<HTMLElement>(SAVE)].filter(b => !b.closest('[hidden]') && b.getAttribute('aria-hidden') !== 'true');
  return buttons.find(b => !!(field.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) ?? null;
}

/** The part of the screen that is also inside a scroll area (the screen when they don't meet). */
export function visibleWithin(screen: Visible, area: Box): Visible {
  const top = Math.max(screen.top, area.top);
  const bottom = Math.min(screen.bottom, area.bottom);
  return bottom > top ? { top, bottom } : screen;
}

/** The nearest ancestor that scrolls vertically, or null for the page itself. */
export function scrollAreaOf(el: Element): Element | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}
