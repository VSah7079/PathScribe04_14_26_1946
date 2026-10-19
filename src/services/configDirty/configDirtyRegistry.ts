// src/services/configDirty/configDirtyRegistry.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-128 (Batch 437): what Configuration knows about unsaved changes (pure).
//
// Two kinds of source make the page "dirty":
//   • An editor that knows its own state reports it (`report(id, dirty)`):
//     Macros, Assist LIS polling, and every inline settings form that keeps a
//     draft beside the saved value (Cancer Registry, Country Signing Rules,
//     Governing Bodies, Retention, the Cytology settings, …). These are exact:
//     typing a value back to what was saved makes the form clean again.
//   • An editor dialog (a pop-up: Cassette Colours, a dictionary entry, a
//     rule, a staff record, …) is dirty from the first edit in it until it
//     closes, whether by Save or Cancel (`dialogEdited`, `pruneClosedDialogs`).
//     Nearly a hundred dialogs work this way, so the page watches for edits
//     instead of each dialog reporting (useConfigEditTracking).
//
// A configuration save (any guarded configuration service write, see
// authorization/guardConfigWrites.ts `onConfigWritten`) clears the dialog
// edits, for the few dialogs that save and stay open.
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfigDirtyRegistry {
  /** An editor that knows its own state says whether it has unsaved changes. */
  report(sourceId: string, dirty: boolean): void;
  /** A field in an open dialog was edited. */
  dialogEdited(dialog: object): void;
  /** Forget dialogs that have closed. */
  pruneClosedDialogs(isOpen: (dialog: object) => boolean): void;
  /** A configuration save went through. */
  configSaved(): void;
  /** The person chose to discard one dialog's edits (closing it from outside). */
  forgetDialog(dialog: object): void;
  /** Whether this dialog has unsaved edits. */
  dialogDirty(dialog: object): boolean;
  /** The dialogs with unsaved edits, oldest edit first. */
  dirtyDialogs(): object[];
  /** The person chose to discard. */
  clearAll(): void;
  isDirty(): boolean;
}

export function createConfigDirtyRegistry(onChange?: (dirty: boolean) => void): ConfigDirtyRegistry {
  const reporters = new Set<string>();
  const dialogs = new Set<object>();
  let last = false;
  const changed = () => {
    const now = reporters.size > 0 || dialogs.size > 0;
    if (now !== last) { last = now; onChange?.(now); }
  };
  return {
    report(sourceId, dirty) {
      if (dirty) reporters.add(sourceId); else reporters.delete(sourceId);
      changed();
    },
    dialogEdited(dialog) { dialogs.add(dialog); changed(); },
    pruneClosedDialogs(isOpen) {
      for (const d of [...dialogs]) if (!isOpen(d)) dialogs.delete(d);
      changed();
    },
    configSaved() { dialogs.clear(); changed(); },
    forgetDialog(dialog) { dialogs.delete(dialog); changed(); },
    dialogDirty: (dialog) => dialogs.has(dialog),
    dirtyDialogs: () => [...dialogs],
    clearAll() { reporters.clear(); dialogs.clear(); changed(); },
    isDirty: () => reporters.size > 0 || dialogs.size > 0,
  };
}

/** What an edit event's target looks like, for deciding whether it counts. */
export interface EditTargetFacts {
  /** The element is a form field (input, select, textarea, or contenteditable). */
  isField: boolean;
  /** `type` of an <input> ('search', 'checkbox', …), when it is one. */
  inputType?: string;
  /** Inside an element marked `data-dirty-ignore` (a filter, a search box). */
  ignored: boolean;
  /** Inside an open dialog on the Configuration page. */
  inDialog: boolean;
}

/** Whether an edit counts as an unsaved change (pure). Only dialog fields are
 *  watched: inline forms report their own exact state, and inline filters and
 *  search boxes are not changes. */
export function isTrackedEdit(f: EditTargetFacts): boolean {
  if (!f.isField || f.ignored || !f.inDialog) return false;
  return f.inputType !== 'search' && f.inputType !== 'button' && f.inputType !== 'submit' && f.inputType !== 'file';
}

/**
 * Batch 438: closing an editor dialog from outside it — a click on its
 * backdrop, or Escape — asks first when the dialog has unsaved edits. A click
 * inside the dialog's own box (its Cancel button included) is the person's
 * explicit choice and isn't intercepted (pure).
 */
export function outsideCloseNeedsConfirm(f: { onBackdrop: boolean; isEscape: boolean; dialogDirty: boolean }): boolean {
  return f.dialogDirty && (f.onBackdrop || f.isEscape);
}

// ── PS-128 review (Oct 15, 2026): "Discard changes" closes the dialog ────────
//
// Batch 438 replayed the held click or key and stopped there. Many editor
// dialogs (Cassette Colours and most System dictionaries) close only from
// their own Cancel, not on a backdrop click or Escape, so after Discard the
// edits were forgotten but the dialog stayed open. Discard now closes it:
// replay first (so a dialog that closes itself does so exactly as it would
// have), and when it is still open after that, press its own Cancel (or its
// close control). One path for every Configuration dialog.

/** What a button inside a dialog looks like, for choosing the one that closes
 *  it without saving. */
export interface DismissControlFacts {
  /** Visible text, trimmed. */
  text: string;
  ariaLabel?: string;
  title?: string;
  /** Marked `data-dialog-dismiss` by the dialog itself (wins over any guess). */
  marked: boolean;
  disabled: boolean;
  /** Styled as a close control (✕): a `…close-btn` / `…modal-close` / `…-close` class. */
  closeStyled: boolean;
}

/**
 * Which control closes a dialog without saving (pure): a marked one first,
 * then a button labelled Cancel in the person's language, then a close
 * control (labelled Close, or styled as one). -1 when there is none.
 */
export function pickDismissControl(controls: DismissControlFacts[], labels: { cancel: string; close: string }): number {
  const usable = controls.map((c, i) => ({ c, i })).filter(x => !x.c.disabled);
  const norm = (s?: string) => (s ?? '').trim().toLocaleLowerCase();
  const cancel = norm(labels.cancel);
  const close = norm(labels.close);
  const named = (c: DismissControlFacts, label: string) =>
    !!label && (norm(c.text) === label || norm(c.ariaLabel) === label || norm(c.title) === label);
  const pick = usable.find(x => x.c.marked)
    ?? usable.find(x => named(x.c, cancel))
    ?? usable.find(x => named(x.c, close))
    ?? usable.find(x => x.c.closeStyled);
  return pick ? pick.i : -1;
}

/** How "Discard changes" on an outside close ended. */
export type DiscardOutcome = 'closedByReplay' | 'closedByDismiss' | 'stillOpen';

/**
 * "Discard changes" after a backdrop click or Escape (Batch 438 + PS-128
 * review): forget the dialog's edits, replay the held event, and when the
 * dialog is still open once the page has rendered, close it with its own
 * Cancel. A dialog that can't be closed either way keeps counting as unsaved,
 * so leaving the page still asks. `afterRender` runs its callback once the
 * page has re-rendered (a timeout in the browser).
 */
export function discardDialogEdits(
  dialog: object,
  deps: {
    registry: Pick<ConfigDirtyRegistry, 'forgetDialog' | 'dialogEdited'>;
    replay: () => void;
    isOpen: (dialog: object) => boolean;
    dismiss: (dialog: object) => boolean;
    afterRender: (fn: () => void) => void;
    onDone?: (outcome: DiscardOutcome) => void;
  },
): void {
  const { registry, replay, isOpen, dismiss, afterRender, onDone } = deps;
  registry.forgetDialog(dialog);
  replay();
  afterRender(() => {
    if (!isOpen(dialog)) { onDone?.('closedByReplay'); return; }
    if (!dismiss(dialog)) { registry.dialogEdited(dialog); onDone?.('stillOpen'); return; }
    afterRender(() => {
      if (!isOpen(dialog)) { onDone?.('closedByDismiss'); return; }
      registry.dialogEdited(dialog);
      onDone?.('stillOpen');
    });
  });
}

// ── Drafts ───────────────────────────────────────────────────────────────────

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = canonical(v);
    }
    return out;
  }
  return value;
}

/** Whether a draft differs from what was saved (key order and undefined
 *  fields don't count). */
export function draftDiffers(saved: unknown, draft: unknown): boolean {
  return JSON.stringify(canonical(saved)) !== JSON.stringify(canonical(draft));
}
