import { describe, it, expect } from 'vitest';
import { createDictationEditorWriter, type DictationEditorPort, type DictationRange } from './dictationEditorWriter';

/** A string document with a cursor at the end; reports changes to the writer like an editor would. */
function fakeEditor(initial = '') {
  let doc = initial;
  let onChange: ((map: (pos: number, assoc: -1 | 1) => number) => void) | null = null;
  const edit = (from: number, to: number, text: string) => {
    doc = doc.slice(0, from) + text + doc.slice(to);
    const delta = text.length - (to - from);
    onChange?.(pos => (pos >= to ? pos + delta : pos > from ? from + Math.min(pos - from, text.length) : pos));
  };
  const port: DictationEditorPort = {
    insertAtCursor: text => { const from = doc.length; edit(from, from, text); return { from, to: doc.length }; },
    replaceRange: (r: DictationRange, text) => { edit(r.from, r.to, text); return { from: r.from, to: r.from + text.length }; },
    textBetween: r => doc.slice(r.from, r.to),
    onDocumentChange: cb => { onChange = cb; },
    onBlur: () => undefined,
  };
  return { port, get doc() { return doc; }, typeAt: (pos: number, text: string) => edit(pos, pos, text) };
}

const make = (initial = '') => { const ed = fakeEditor(initial); return { ed, w: createDictationEditorWriter(ed.port, { recordCorrection: () => undefined }) }; };

describe('cancelling a dictation session', () => {
  it('removes what was dictated this session and nothing else', () => {
    const { ed, w } = make('Existing text. ');
    w.beginSession();
    w.onText('first passage'); w.onText('second passage');
    expect(w.uncommitted()).toBe(2);
    expect(ed.doc).toBe('Existing text. first passage second passage ');
    expect(w.discardSession()).toEqual({ removed: 2, kept: 0 });
    expect(ed.doc.trim()).toBe('Existing text.');
    expect(w.uncommitted()).toBe(0);
  });
  it('keeps a passage the person edited', () => {
    const { ed, w } = make('');
    w.beginSession();
    w.onText('keep me'); w.onText('drop me');
    ed.typeAt(3, 'X');                                      // the person changed the first passage
    const r = w.discardSession();
    expect(r).toEqual({ removed: 1, kept: 1 });
    expect(ed.doc).toContain('keeXp me');
    expect(ed.doc).not.toContain('drop me');
  });
  it('counts a provisional passage and removes it too', () => {
    const { ed, w } = make('');
    w.beginSession();
    w.onText('draft words', true);
    expect(w.uncommitted()).toBe(1);
    expect(w.discardSession()).toEqual({ removed: 1, kept: 0 });
    expect(ed.doc).toBe('');
  });
  it('a new session cannot cancel the earlier one', () => {
    const { ed, w } = make('');
    w.beginSession(); w.onText('old');
    w.beginSession();
    expect(w.uncommitted()).toBe(0);
    expect(w.discardSession()).toEqual({ removed: 0, kept: 0 });
    expect(ed.doc).toContain('old');
  });
});
