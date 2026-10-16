// src/hooks/useFocusAfterRemoval.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 570 (WCAG 2.4.3 Focus Order): when an item's own Delete (or Restore …),
// pressed from the keyboard, removes it from a list, focus goes to the next
// item (the one before when it was last; `fallback` or the container when none
// is left) instead of dropping to the page. Shared by the inbox (Batch 569) and
// the saved-search chips.
//
//   const listRef = useRef<HTMLDivElement>(null);
//   const remember = useFocusAfterRemoval(items.map(i => i.id), listRef, 'data-item-open', [filter]);
//   <button data-item-open={i.id} …>{i.name}</button>
//   <button onClick={e => { remember(e, i.id); remove(i.id); }}>×</button>
//
// Rules: keyboard and screen readers only (`isNonPointerClick`), so a mouse
// user's focus stays put, and every click replaces what is waiting; nothing
// happens until the item is actually gone, and a removal that never happens is
// forgotten when `resetKeys` change or the next click comes; focus is moved
// only from the page or the button that was pressed, never from where the user
// has moved on to. The next item is the nearest one still in the list. The
// container is focused last, so give it tabIndex={-1} or pass a `fallback`.
// Where focus goes: utils/a11y/focusAfterRemoval.ts.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import { focusTargetAfterRemoval, isNonPointerClick } from '@/utils/a11y/focusAfterRemoval';

export function useFocusAfterRemoval(
  ids: readonly string[],
  containerRef: React.RefObject<HTMLElement | null>,
  attr: string,
  resetKeys: readonly unknown[] = [],
  fallback?: () => HTMLElement | null | undefined,
): (e: React.MouseEvent, id: string) => void {
  // What was removed, the list then, and the button pressed (focus is moved only if it is still there or gone).
  const [pending, setPending] = useState<{ removedId: string; idsThen: readonly string[]; from: Element | null } | null>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const key = ids.join('\u0000');

  // Every click replaces what is waiting: a mouse click clears it, so a later mouse delete never moves focus.
  const remember = useCallback((e: React.MouseEvent, id: string) => {
    setPending(isNonPointerClick(e) ? { removedId: id, idsThen: idsRef.current, from: e.currentTarget as Element } : null);
  }, []);

  useEffect(() => {
    if (!pending || ids.includes(pending.removedId)) return;
    setPending(null);
    // Never pull focus from where the user has moved on to: only from the page, or the button that was pressed.
    const active = document.activeElement;
    if (active && active !== document.body && active !== pending.from && active.isConnected) return;
    const container = containerRef.current;
    const target = focusTargetAfterRemoval(pending.idsThen, pending.removedId, ids);
    const next = target
      ? Array.from(container?.querySelectorAll<HTMLElement>(`[${attr}]`) ?? []).find(el => el.getAttribute(attr) === target)
      : undefined;
    (next ?? fallback?.() ?? container)?.focus();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the ids' contents; the ref, attribute and fallback are fixed per list
  }, [key, pending]);

  // A removal that didn't happen (cancelled, refused) leaves nothing waiting once the view changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller's view keys (filter, search text) are the dependencies
  useEffect(() => { setPending(null); }, resetKeys);

  return remember;
}
