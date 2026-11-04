// @vitest-environment happy-dom
// Batch 650, item 4: the per-person correction table the report editors write to (same service as Internal Notes).
import { describe, it, expect, beforeEach } from 'vitest';
import { applyDictationLearning, recordDictationCorrection, resetDictationCorrectionsCache, dictationCorrectionsForCurrentUser, normaliseDictation } from './dictationCorrections';
import { dictationWriterFor, type TiptapLike } from './tiptapDictationPort';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetDictationCorrectionsCache(); });

describe('dictation corrections table', () => {
  it('a recorded correction is applied to the same words before the AI sees them', () => {
    expect(applyDictationLearning('Hepatic Steatosis, mild!', 'Hepatic steatosis, mild!')).toBe('Hepatic steatosis, mild!');
    recordDictationCorrection('hepatic steatosis mild', 'Mild hepatic steatosis');
    expect(applyDictationLearning('Hepatic steatosis mild', 'Hepatic steatosis mild')).toBe('Mild hepatic steatosis');
    expect(dictationCorrectionsForCurrentUser()['hepatic steatosis mild']).toBe('Mild hepatic steatosis');
  });
  it('blank input is ignored; Korean keys survive', () => {
    recordDictationCorrection('   ', 'x'); recordDictationCorrection('abc', '  ');
    expect(Object.keys(dictationCorrectionsForCurrentUser())).toEqual([]);
    expect(normaliseDictation('종양 크기')).toBe('종양 크기');
  });
});

describe('a Tiptap editor gets one writer, wired to this table', () => {
  it('the same editor returns the same writer, and a corrected segment lands in the table on blur', () => {
    let doc = ''; let sel = 0; const handlers: Record<string, (a?: unknown) => void> = {};
    const editor: TiptapLike = {
      chain() {
        const chain: any = {
          focus: () => chain, insertContent: (c: string) => { doc = doc.slice(0, sel) + c + doc.slice(sel); sel += c.length; return chain; },
          insertContentAt: (r: { from: number; to: number }, c: string) => { doc = doc.slice(0, r.from) + c + doc.slice(r.to); sel = r.from + c.length; return chain; },
          run: () => true,
        };
        return chain;
      },
      get state() { return { selection: { from: sel, to: sel }, doc: { textBetween: (f: number, t: number) => doc.slice(f, t) } }; },
      on: (e: string, cb: (a?: unknown) => void) => { handlers[e] = cb; },
    } as unknown as TiptapLike;
    const w = dictationWriterFor(editor);
    expect(dictationWriterFor(editor)).toBe(w);
    w.onText('Right colon', false, { raw: 'right colon' });
    doc = 'Right Colon '; // the person fixes a capital
    handlers.blur();
    expect(applyDictationLearning('right colon', 'Right colon')).toBe('Right Colon');
  });
});
