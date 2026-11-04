// PS-128 (Batch 437): what Configuration knows about unsaved changes.
import { describe, it, expect, vi } from 'vitest';
import { createConfigDirtyRegistry, discardDialogEdits, draftDiffers, isTrackedEdit, outsideCloseNeedsConfirm, pickDismissControl, type DismissControlFacts } from './configDirtyRegistry';
import { guardConfigWrites, onConfigWritten, writeSucceeded } from '../authorization/guardConfigWrites';

describe('createConfigDirtyRegistry', () => {
  it('reporters and dialogs; onChange only on a change', () => {
    const onChange = vi.fn();
    const r = createConfigDirtyRegistry(onChange);
    r.report('a', true); r.report('b', true); r.report('a', false);
    expect(r.isDirty()).toBe(true);
    r.report('b', false);
    expect(r.isDirty()).toBe(false);
    expect(onChange.mock.calls.map(c => c[0])).toEqual([true, false]);
  });
  it('a dialog stays unsaved until it closes, or a save goes through', () => {
    const r = createConfigDirtyRegistry();
    const dialog = {}; const other = {};
    r.dialogEdited(dialog); r.dialogEdited(other);
    r.pruneClosedDialogs(d => d === dialog);
    expect(r.isDirty()).toBe(true);
    r.configSaved();
    expect(r.isDirty()).toBe(false);
    r.report('x', true); r.dialogEdited(dialog); r.clearAll();
    expect(r.isDirty()).toBe(false);
  });
  it('a save clears dialog edits, not an inline form that is still different', () => {
    const r = createConfigDirtyRegistry();
    r.report('form', true); r.dialogEdited({}); r.configSaved();
    expect(r.isDirty()).toBe(true);
  });
});

describe('isTrackedEdit', () => {
  const base = { isField: true, ignored: false, inDialog: true };
  it('fields in dialogs only, not filters, search boxes or buttons', () => {
    expect(isTrackedEdit(base)).toBe(true);
    expect(isTrackedEdit({ ...base, inDialog: false })).toBe(false);
    expect(isTrackedEdit({ ...base, ignored: true })).toBe(false);
    expect(isTrackedEdit({ ...base, inputType: 'search' })).toBe(false);
    expect(isTrackedEdit({ ...base, isField: false })).toBe(false);
    expect(isTrackedEdit({ ...base, inputType: 'checkbox' })).toBe(true);
  });
});

describe('draftDiffers', () => {
  it('ignores key order and undefined fields', () => {
    expect(draftDiffers({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1, d: undefined })).toBe(false);
    expect(draftDiffers({ a: 1 }, { a: 2 })).toBe(true);
    expect(draftDiffers('x', 'x')).toBe(false);
  });
});

describe('guardConfigWrites tells the page a save went through', () => {
  it('only for writes that succeeded', async () => {
    const heard = vi.fn();
    const stop = onConfigWritten(heard);
    const svc = guardConfigWrites({
      async save(ok: boolean) { return ok ? { ok: true, data: 1 } : { ok: false, error: 'X' }; },
      async read() { return 1; },
    }, [['config:x:manage', ['save']]], { enforce: async () => ({ allowed: true }) });
    await svc.save(false);
    expect(heard).not.toHaveBeenCalled();
    await svc.save(true);
    await svc.read();
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    expect(writeSucceeded(undefined)).toBe(true);
    expect(writeSucceeded({ ok: false })).toBe(false);
  });
});

// Batch 438 (Pete, Oct 2): closing a dialog from outside (its backdrop, or Escape).
describe('closing a dialog from outside', () => {
  it('forgetDialog discards one dialog and leaves the rest of the page unsaved', () => {
    const onChange = vi.fn();
    const r = createConfigDirtyRegistry(onChange);
    const dialog = {}; const other = {};
    r.dialogEdited(dialog);
    expect(r.dialogDirty(dialog)).toBe(true);
    expect(r.dialogDirty(other)).toBe(false);
    r.dialogEdited(other);
    expect(r.dirtyDialogs()).toEqual([dialog, other]);
    r.forgetDialog(other);
    r.report('section', true);
    r.forgetDialog(dialog);
    expect(r.dialogDirty(dialog)).toBe(false);
    expect(r.isDirty()).toBe(true);
    r.report('section', false);
    expect(r.isDirty()).toBe(false);
    expect(onChange.mock.calls.map(c => c[0])).toEqual([true, false]);
  });
  it('forgetting the only unsaved dialog makes the page clean', () => {
    const r = createConfigDirtyRegistry();
    const dialog = {};
    r.dialogEdited(dialog);
    r.forgetDialog(dialog);
    expect(r.isDirty()).toBe(false);
  });
  it('asks only when the dialog has edits and the close came from its backdrop or Escape', () => {
    expect(outsideCloseNeedsConfirm({ onBackdrop: true, isEscape: false, dialogDirty: true })).toBe(true);
    expect(outsideCloseNeedsConfirm({ onBackdrop: false, isEscape: true, dialogDirty: true })).toBe(true);
    expect(outsideCloseNeedsConfirm({ onBackdrop: false, isEscape: false, dialogDirty: true })).toBe(false);
    expect(outsideCloseNeedsConfirm({ onBackdrop: true, isEscape: true, dialogDirty: false })).toBe(false);
  });
});

// PS-128 review (Oct 15, 2026): Discard closes the dialog even when it doesn't close on a backdrop click or Escape.
describe('pickDismissControl', () => {
  const btn = (over: Partial<DismissControlFacts>): DismissControlFacts =>
    ({ text: '', marked: false, disabled: false, closeStyled: false, ...over });
  const labels = { cancel: 'Annuler', close: 'Fermer' };
  it("picks the dialog's Cancel in the person's language, not Save", () => {
    expect(pickDismissControl([btn({ text: 'Enregistrer' }), btn({ text: ' Annuler ' })], labels)).toBe(1);
  });
  it('a marked control wins over a guess', () => {
    expect(pickDismissControl([btn({ text: 'Annuler' }), btn({ text: 'Fermer', marked: true })], labels)).toBe(1);
  });
  it('falls back to a Close label (text, aria-label or title), then a ✕ styled as a close control', () => {
    expect(pickDismissControl([btn({ text: 'OK' }), btn({ text: '✕', ariaLabel: 'Fermer' })], labels)).toBe(1);
    expect(pickDismissControl([btn({ text: '✕', title: 'fermer' })], labels)).toBe(0);
    expect(pickDismissControl([btn({ text: 'OK' }), btn({ text: '✕', closeStyled: true })], labels)).toBe(1);
  });
  it('Cancel is preferred over ✕, a disabled control is skipped, and none found is -1', () => {
    expect(pickDismissControl([btn({ text: '✕', closeStyled: true }), btn({ text: 'Annuler' })], labels)).toBe(1);
    expect(pickDismissControl([btn({ text: 'Annuler', disabled: true }), btn({ text: '✕', closeStyled: true })], labels)).toBe(1);
    expect(pickDismissControl([btn({ text: 'Enregistrer' })], labels)).toBe(-1);
    expect(pickDismissControl([], labels)).toBe(-1);
  });
});

describe('discardDialogEdits', () => {
  const sync = (fn: () => void) => fn();
  it('a dialog the replayed click or key closes is not dismissed again', () => {
    const r = createConfigDirtyRegistry(); const d = {}; r.dialogEdited(d);
    let open = true; const dismiss = vi.fn(() => true); const onDone = vi.fn();
    discardDialogEdits(d, { registry: r, replay: () => { open = false; }, isOpen: () => open, dismiss, afterRender: sync, onDone });
    expect(dismiss).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith('closedByReplay');
    expect(r.isDirty()).toBe(false);
  });
  it('a dialog that stays open after the replay (Cassette Colours) is closed with its own Cancel', () => {
    const r = createConfigDirtyRegistry(); const d = {}; r.dialogEdited(d);
    let open = true; const replay = vi.fn(); const onDone = vi.fn();
    discardDialogEdits(d, { registry: r, replay, isOpen: () => open, dismiss: () => { open = false; return true; }, afterRender: sync, onDone });
    expect(replay).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledWith('closedByDismiss');
    expect(r.isDirty()).toBe(false);
  });
  it('a dialog with no way to close keeps counting as unsaved', () => {
    const r = createConfigDirtyRegistry(); const d = {}; r.dialogEdited(d);
    const onDone = vi.fn();
    discardDialogEdits(d, { registry: r, replay: () => {}, isOpen: () => true, dismiss: () => false, afterRender: sync, onDone });
    expect(onDone).toHaveBeenCalledWith('stillOpen');
    expect(r.dialogDirty(d)).toBe(true);
    const r2 = createConfigDirtyRegistry(); r2.dialogEdited(d);
    discardDialogEdits(d, { registry: r2, replay: () => {}, isOpen: () => true, dismiss: () => true, afterRender: sync, onDone });
    expect(r2.dialogDirty(d)).toBe(true);
  });
  it('waits for the page to render before checking (the replay is batched with the Discard click)', () => {
    const r = createConfigDirtyRegistry(); const d = {}; r.dialogEdited(d);
    const queue: (() => void)[] = [];
    const dismiss = vi.fn(() => true);
    discardDialogEdits(d, { registry: r, replay: () => {}, isOpen: () => true, dismiss, afterRender: fn => { queue.push(fn); } });
    expect(dismiss).not.toHaveBeenCalled();
    queue.shift()!();
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
