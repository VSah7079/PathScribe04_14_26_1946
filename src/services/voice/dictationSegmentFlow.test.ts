// Batch 650, item 3: a dictated segment reaches a report editor exactly once, whether the AI answers in time, is too
// slow (2,000 ms budget) or fails. The fake editor replaces a provisional range the way the Tiptap port does.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { insertDictationSegment, REFINEMENT_BUDGET_MS } from './dictationSegmentFlow';
import { createDictationEditorWriter, type DictationEditorPort, type DictationRange } from './dictationEditorWriter';

/** A one-line "document" with a cursor: enough to show doubled text. */
function fakeEditor(initial = '') {
  let doc = initial;
  let cursor = initial.length;
  let mapper: ((map: (pos: number, assoc: -1 | 1) => number) => void) | null = null;
  let blur: (() => void) | null = null;
  const port: DictationEditorPort = {
    insertAtCursor(text) {
      const from = cursor; doc = doc.slice(0, from) + text + doc.slice(from); cursor = from + text.length;
      mapper?.((p, a) => (p > from || (p === from && a === 1) ? p + text.length : p));
      return { from, to: cursor };
    },
    replaceRange(r: DictationRange, text) {
      doc = doc.slice(0, r.from) + text + doc.slice(r.to); cursor = r.from + text.length;
      const delta = text.length - (r.to - r.from);
      mapper?.(p => (p >= r.to ? p + delta : p));
      return { from: r.from, to: cursor };
    },
    textBetween: r => doc.slice(r.from, r.to),
    onDocumentChange: cb => { mapper = cb; },
    onBlur: cb => { blur = cb; },
  };
  return { port, text: () => doc, blur: () => blur?.(), edit: (from: number, to: number, text: string) => port.replaceRange({ from, to }, text) };
}

describe('one dictated segment, one insertion', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const setup = () => {
    const ed = fakeEditor('Findings: ');
    const recorded: Array<[string, string]> = [];
    const writer = createDictationEditorWriter(ed.port, { recordCorrection: (r, c) => recorded.push([r, c]) });
    return { ed, writer, recorded };
  };

  it('AI answers in time: the refined text replaces the local text', async () => {
    const { ed, writer } = setup();
    const p = insertDictationSegment({ raw: 'tumour is two cm', localText: 'Tumour is two cm', refine: async () => 'Tumour is 2 cm.', sink: writer.onText });
    expect(ed.text()).toBe('Findings: Tumour is two cm');          // provisional text shows while refining
    const r = await p;
    expect(ed.text()).toBe('Findings: Tumour is 2 cm. ');           // replaced, not added to
    expect(r.outcome).toBe('ai');
  });

  it('AI is too slow: the local text stands once, and the late answer is dropped', async () => {
    const { ed, writer } = setup();
    let late!: (v: string) => void;
    const p = insertDictationSegment({ raw: 'tumour is two cm', localText: 'Tumour is two cm', refine: () => new Promise<string>(r => { late = r; }), sink: writer.onText });
    await vi.advanceTimersByTimeAsync(REFINEMENT_BUDGET_MS - 1);
    expect(ed.text()).toBe('Findings: Tumour is two cm');
    await vi.advanceTimersByTimeAsync(1);
    const r = await p;
    expect(r.outcome).toBe('timeout');
    expect(ed.text()).toBe('Findings: Tumour is two cm ');
    late('Tumour is 2 cm.'); await vi.runAllTimersAsync();
    expect(ed.text()).toBe('Findings: Tumour is two cm ');
  });

  it('AI errors (rejects or returns nothing): the local text stands once', async () => {
    for (const refine of [async () => { throw new Error('503'); }, async () => null, async () => '  ']) {
      const { ed, writer } = setup();
      const r = await insertDictationSegment({ raw: 'x', localText: 'Local text', refine, sink: writer.onText });
      expect(ed.text()).toBe('Findings: Local text ');
      expect(['error', 'local']).toContain(r.outcome);
    }
  });

  it('AI returns the same text: nothing is doubled', async () => {
    const { ed, writer } = setup();
    await insertDictationSegment({ raw: 'x', localText: 'Same', refine: async () => 'Same', sink: writer.onText });
    expect(ed.text()).toBe('Findings: Same ');
  });

  it('refinement off: the text is inserted once', async () => {
    const { ed, writer } = setup();
    await insertDictationSegment({ raw: 'x', localText: 'Plain', sink: writer.onText });
    expect(ed.text()).toBe('Findings: Plain ');
  });

  it('exactly one final call per segment, and the timer is cleared when the AI wins', async () => {
    const calls: Array<[string, boolean | undefined]> = [];
    await insertDictationSegment({ raw: 'x', localText: 'a', refine: async () => 'b', sink: (t, i) => calls.push([t, i]) });
    expect(calls).toEqual([['a', true], ['b', false]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('the person typed into the provisional text meanwhile: their text is kept, the refined text is not forced over it', async () => {
    const { ed, writer } = setup();
    let answer!: (v: string) => void;
    const p = insertDictationSegment({ raw: 'x', localText: 'Local text', refine: () => new Promise<string>(r => { answer = r; }), sink: writer.onText });
    ed.edit(10, 15, 'LOCAL');
    answer('Refined text.');
    await p;
    expect(ed.text()).toBe('Findings: LOCAL text');
  });

  it('indicator: refining is announced on and then off', async () => {
    const seen: boolean[] = [];
    await insertDictationSegment({ raw: 'x', localText: 'a', refine: async () => 'b', sink: () => undefined, onRefining: v => seen.push(v) });
    expect(seen).toEqual([true, false]);
  });
});

describe('correction learning in a report editor', () => {
  it('a corrected dictated segment is recorded for the words as heard when the editor loses focus', async () => {
    const ed = fakeEditor('A: ');
    const recorded: Array<[string, string]> = [];
    const writer = createDictationEditorWriter(ed.port, { recordCorrection: (r, c) => recorded.push([r, c]) });
    await insertDictationSegment({ raw: 'hepatic steatosis mild', localText: 'Hepatic steatosis mild', sink: writer.onText });
    ed.edit(3, 25, 'Mild hepatic steatosis');
    ed.edit(0, 0, 'Pre: ');                       // text before it moves the tracked range
    ed.blur();
    expect(recorded).toEqual([['hepatic steatosis mild', 'Mild hepatic steatosis']]);
  });

  it('no edit, no record; and a blur records once', async () => {
    const ed = fakeEditor();
    const recorded: Array<[string, string]> = [];
    const writer = createDictationEditorWriter(ed.port, { recordCorrection: (r, c) => recorded.push([r, c]) });
    await insertDictationSegment({ raw: 'abc', localText: 'Abc', sink: writer.onText });
    ed.blur();
    expect(recorded).toEqual([]);
    await insertDictationSegment({ raw: 'abc', localText: 'Abc', sink: writer.onText });
    ed.edit(4, 7, 'ABC'); ed.blur(); ed.blur();
    expect(recorded.length).toBe(1);
  });

  it('a refined segment the person corrects is recorded against the words as heard', async () => {
    const ed = fakeEditor();
    const recorded: Array<[string, string]> = [];
    const writer = createDictationEditorWriter(ed.port, { recordCorrection: (r, c) => recorded.push([r, c]) });
    await insertDictationSegment({ raw: 'raw words', localText: 'Raw words', refine: async () => 'Refined words.', sink: writer.onText });
    ed.edit(0, 14, 'My words.'); ed.blur();
    expect(recorded).toEqual([['raw words', 'My words.']]);
  });
});
