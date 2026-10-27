// src/services/voice/tiptapDictationPort.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: adapts a Tiptap editor to the DictationEditorPort (dictationEditorWriter.ts). One writer per editor
// (WeakMap), so the focus and change listeners are added once however often a dictation target is registered.
// Structural types only: nothing here imports Tiptap.
// ─────────────────────────────────────────────────────────────────────────────
import { createDictationEditorWriter, type DiscardResult, type DictationEditorPort, type DictationEditorWriter, type DictationRange } from './dictationEditorWriter';
import { recordDictationCorrection } from './dictationCorrections';

interface TiptapChain { focus(): TiptapChain; insertContent(c: string): TiptapChain; insertContentAt(r: DictationRange, c: string): TiptapChain; run(): boolean }
/** The part of Tiptap's event argument this port reads. */
interface TiptapEventArg { transaction?: { docChanged?: boolean; mapping: { map(pos: number, assoc?: number): number } } }
export interface TiptapLike {
  chain(): TiptapChain;
  state: { selection: { from: number; to: number }; doc: { textBetween(from: number, to: number, block?: string): string } };
  on(event: 'transaction' | 'blur', cb: (arg: TiptapEventArg) => void): unknown;
}

export function tiptapDictationPort(editor: TiptapLike): DictationEditorPort {
  return {
    insertAtCursor(text) {
      const from = editor.state.selection.from;
      editor.chain().focus().insertContent(text).run();
      return { from, to: Math.max(from, editor.state.selection.to) };
    },
    replaceRange(range, text) {
      editor.chain().focus().insertContentAt(range, text).run();
      return { from: range.from, to: Math.max(range.from, editor.state.selection.to) };
    },
    textBetween: range => editor.state.doc.textBetween(range.from, range.to, ' '),
    onDocumentChange: cb => { editor.on('transaction', ({ transaction }) => { if (transaction?.docChanged) cb((pos, assoc) => transaction.mapping.map(pos, assoc)); }); },
    onBlur: cb => { editor.on('blur', () => cb()); },
  };
}

const writers = new WeakMap<object, DictationEditorWriter>();

/** The dictation writer for this editor (created on first use). */
export function dictationWriterFor(editor: TiptapLike): DictationEditorWriter {
  let w = writers.get(editor);
  if (!w) {
    w = createDictationEditorWriter(tiptapDictationPort(editor), { recordCorrection: recordDictationCorrection });
    writers.set(editor, w);
  }
  return w;
}

/**
 * Batch 664 (Cancel): starts a new dictation session in this editor and returns what a DictationTarget needs so that
 * Cancel can count and remove the passages dictated in it. Spread into the target: `...dictationSessionFor(editor)`.
 */
export function dictationSessionFor(editor: TiptapLike): { uncommitted: () => number; discard: () => DiscardResult } {
  const w = dictationWriterFor(editor);
  w.beginSession();
  return { uncommitted: () => w.uncommitted(), discard: () => w.discardSession() };
}
