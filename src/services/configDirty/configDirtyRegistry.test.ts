// PS-128 (Batch 437): what Configuration knows about unsaved changes.
import { describe, it, expect, vi } from 'vitest';
import { createConfigDirtyRegistry, draftDiffers, isTrackedEdit, outsideCloseNeedsConfirm } from './configDirtyRegistry';
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
