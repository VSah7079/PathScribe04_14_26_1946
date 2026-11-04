// src/utils/a11y/pressable.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 524 (PS-491, WCAG 2.1.1 Keyboard, 4.1.2 Name, Role, Value): makes a
// clickable element that isn't a <button> work from the keyboard.
//
//   <div className="card" {...pressable(() => open(id))}>…</div>
//
// gives the element role="button" (or the role passed; null for none, e.g. a
// table row), a tab stop, and Enter / Space doing what the click does. Keys
// pressed inside a nested field or button are left to that element. With no
// handler (the element isn't clickable in that state) it adds nothing.
// A new clickable element should be a <button> where it can; this is for
// cards, rows and tiles that hold other markup. The guard
// (src/services/accessibility/a11y.guard.test.ts) stops new ones without it.
// ─────────────────────────────────────────────────────────────────────────────
import type React from 'react';

export interface PressableProps<E extends Element> {
  role?: string;
  tabIndex: number;
  onClick: React.MouseEventHandler<E>;
  onKeyDown: React.KeyboardEventHandler<E>;
}

export function pressable<E extends Element = HTMLElement>(
  onActivate: React.MouseEventHandler<E> | undefined,
  options: { role?: string | null } = {},
): PressableProps<E> | Record<string, never> {
  // No handler (the element isn't clickable in this state): nothing.
  if (!onActivate) return {};
  const role = options.role === null ? undefined : (options.role ?? 'button');
  return {
    ...(role ? { role } : {}),
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: e => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        // The handler gets the keyboard event in place of the click.
        onActivate(e as unknown as React.MouseEvent<E>);
      }
    },
  };
}

/**
 * Batch 524 (PS-491): an on/off control drawn as a track and thumb. A switch
 * with its state (aria-checked) and a name, operated by click, Enter or Space.
 */
export function switchable<E extends Element = HTMLElement>(
  checked: boolean | undefined,
  onToggle: React.MouseEventHandler<E>,
  label: string,
  disabled = false,
): PressableProps<E> & { 'aria-checked': boolean; 'aria-label': string; 'aria-disabled'?: boolean } {
  const props = { ...(pressable(onToggle, { role: 'switch' }) as PressableProps<E>), 'aria-checked': !!checked, 'aria-label': label };
  // Disabled: still announced (and still a tab stop), but it does nothing.
  return disabled ? { ...props, onClick: () => {}, onKeyDown: () => {}, 'aria-disabled': true } : props;
}

/**
 * Batch 566 (WCAG 4.1.2; axe nested-interactive): a row or card that holds buttons of its own can't itself be a
 * button (a button inside a button can't be reached or announced properly). Clicking anywhere on it still does
 * its main action, as a mouse shortcut, but it is not a tab stop and has no role. Use it only when the same
 * action is on a real <button> inside it (the row's title, say), which is what the keyboard and screen readers use.
 */
export function clickableContainer<E extends Element = HTMLElement>(
  onActivate: React.MouseEventHandler<E> | undefined,
): { onClick: React.MouseEventHandler<E> } | Record<string, never> {
  return onActivate ? { onClick: onActivate } : {};
}
