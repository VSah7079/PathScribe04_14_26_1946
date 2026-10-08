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
