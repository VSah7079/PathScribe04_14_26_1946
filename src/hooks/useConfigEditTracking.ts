// src/hooks/useConfigEditTracking.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-128 (Batch 437): notices edits made in Configuration's editor dialogs.
//
// Configuration has close to a hundred pop-up editors (Cassette Colours, a
// dictionary entry, a rule, a staff record, …), each keeping its draft to
// itself. Rather than each one reporting, the page listens for `input` and
// `change` events and asks services/configDirty (isTrackedEdit) whether the
// field was in an open dialog. That dialog then counts as unsaved until it
// leaves the page (Save or Cancel closes it).
//
// A dialog is the nearest element around the field that is fixed on screen
// (the overlay every dialog uses), or one marked role="dialog",
// aria-modal="true" or data-config-dialog (a dialog rendered outside the
// page, like the flag manager). A field inside data-dirty-ignore (a picker's
// filter box) is not an edit.
//
// Batch 438: closing such a dialog from outside — a click on its backdrop,
// or Escape (wherever focus is) — asks first when it has unsaved edits (`onOutsideClose`). The
// click or key is held; "Discard changes" replays it, so the dialog closes
// exactly as it would have. A click inside the dialog's box, its own Cancel
// included, is never held.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, type RefObject } from 'react';
import { isTrackedEdit, outsideCloseNeedsConfirm, type ConfigDirtyRegistry } from '@/services/configDirty/configDirtyRegistry';

const DIALOG_MARKERS = '[role="dialog"], [aria-modal="true"], [data-config-dialog]';

function dialogAround(el: Element, root: Element): Element | null {
  for (let cur: Element | null = el; cur && cur !== document.body; cur = cur.parentElement) {
    if (cur === root) return null;
    if (cur.matches(DIALOG_MARKERS)) return cur;
    if (typeof window.getComputedStyle === 'function' && window.getComputedStyle(cur).position === 'fixed') return cur;
  }
  return null;
}

function isField(el: Element): boolean {
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
    || (el instanceof HTMLElement && el.isContentEditable);
}

export function useConfigEditTracking(
  rootRef: RefObject<HTMLElement | null>,
  registry: ConfigDirtyRegistry,
  onOutsideClose?: (dialog: object, replay: () => void) => void,
): void {
  useEffect(() => {
    let replaying = false;
    const inPage = (el: Element) => {
      const root = rootRef.current;
      return !!root && (root.contains(el) || !!el.closest('[data-config-dialog]'));
    };
    const hold = (ev: Event, dialog: object, replay: () => void) => {
      ev.preventDefault();
      ev.stopPropagation();
      onOutsideClose?.(dialog, () => { replaying = true; try { replay(); } finally { replaying = false; } });
    };
    const onClick = (ev: MouseEvent) => {
      const target = ev.target;
      const root = rootRef.current;
      if (replaying || !onOutsideClose || !root || !(target instanceof HTMLElement) || !inPage(target)) return;
      const dialog = dialogAround(target, root);
      if (!dialog) return;
      if (outsideCloseNeedsConfirm({ onBackdrop: dialog === target, isEscape: false, dialogDirty: registry.dialogDirty(dialog) })) {
        hold(ev, dialog, () => target.click());
      }
    };
    const onKey = (ev: KeyboardEvent) => {
      const root = rootRef.current;
      if (replaying || !onOutsideClose || ev.key !== 'Escape' || !root) return;
      // Escape goes to the dialog that has focus; with focus nowhere in a
      // dialog (after "Keep editing", say), to the newest open dialog with
      // edits, since some dialogs listen for Escape on the whole window.
      const focused = document.activeElement;
      const target: HTMLElement = focused instanceof HTMLElement ? focused : document.body;
      const focusedDialog = focused instanceof HTMLElement && inPage(focused) ? dialogAround(focused, root) : null;
      const dialog = focusedDialog ?? registry.dirtyDialogs().filter(d => (d as Element).isConnected).pop() ?? null;
      if (!dialog) return;
      if (outsideCloseNeedsConfirm({ onBackdrop: false, isEscape: true, dialogDirty: registry.dialogDirty(dialog) })) {
        hold(ev, dialog, () => target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey, true);

    const onEdit = (ev: Event) => {
      const root = rootRef.current;
      const target = ev.target;
      if (!root || !(target instanceof Element)) return;
      const inPage = root.contains(target) || !!target.closest('[data-config-dialog]');
      if (!inPage) return;
      const dialog = dialogAround(target, root);
      const tracked = isTrackedEdit({
        isField: isField(target),
        inputType: target instanceof HTMLInputElement ? target.type : undefined,
        ignored: !!target.closest('[data-dirty-ignore]'),
        inDialog: !!dialog,
      });
      if (tracked && dialog) registry.dialogEdited(dialog);
    };
    // Bubble phase, after React has handled the edit. Batch 437 listened in
    // the capture phase: the page re-rendered between listeners, before
    // React's own handler, and put the field's old value back, so the first
    // keystroke (or first pick) in an unsaved dialog or form was lost.
    document.addEventListener('input', onEdit);
    document.addEventListener('change', onEdit);

    // A dialog that has left the page (saved, cancelled) is no longer unsaved.
    const observer = typeof MutationObserver === 'undefined' ? null
      : new MutationObserver(() => registry.pruneClosedDialogs(d => (d as Element).isConnected));
    observer?.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('input', onEdit);
      document.removeEventListener('change', onEdit);
      observer?.disconnect();
    };
  }, [rootRef, registry, onOutsideClose]);
}
