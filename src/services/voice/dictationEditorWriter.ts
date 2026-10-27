// src/services/voice/dictationEditorWriter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: puts dictated text into a rich-text report editor (Report Draft sections, the Microscopic entry) with
// two guarantees the plain "insert at the cursor" handlers did not have.
//
// 1. REPLACE, NEVER REPEAT. An interim (provisional) segment is inserted and remembered; the final segment for it
//    replaces exactly that range. If the person has meanwhile changed that text, the provisional text stays as it
//    is and the refined text is dropped: nothing is lost and nothing is doubled.
// 2. CORRECTIONS ARE LEARNED. The last final segment is tracked through later edits (the port maps positions). When
//    the editor loses focus and the person has changed that segment, what they wrote is stored for the words as
//    heard (dictationCorrections.ts, the same per-person table as Internal Notes), so next time it is applied
//    before the AI sees the words.
//
// The editor is reached through a small port (tiptapDictationPort.ts adapts Tiptap), so this is tested without one.
// ─────────────────────────────────────────────────────────────────────────────
import type { DictationSegmentMeta } from './dictationSegmentFlow';

export interface DictationRange { from: number; to: number }

export interface DictationEditorPort {
  /** Inserts at the cursor (replacing a selection) and returns the range the new text covers. */
  insertAtCursor(text: string): DictationRange;
  replaceRange(range: DictationRange, text: string): DictationRange;
  textBetween(range: DictationRange): string;
  /** Called after every change to the document with a function that maps an old position to its new one. */
  onDocumentChange(cb: (map: (pos: number, assoc: -1 | 1) => number) => void): void;
  onBlur(cb: () => void): void;
}

export interface DictationEditorWriterDeps {
  recordCorrection(raw: string, corrected: string): void;
}

interface Tracked extends DictationRange { text: string; raw?: string }

/** Whitespace-insensitive (an editor may re-wrap or collapse spaces) but case-sensitive: fixing a capital is a correction. */
const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

/** Longest correction kept: a whole rewritten paragraph is an edit, not a correction of one spoken phrase. */
const MAX_CORRECTION_CHARS = 600;

export interface DiscardResult { removed: number; kept: number }

export interface DictationEditorWriter {
  /** Use as DictationTarget.onText. */
  onText(text: string, isInterim?: boolean, meta?: DictationSegmentMeta): void;
  /** Batch 664 (Cancel): a new dictation session starts; nothing dictated before it can be cancelled. */
  beginSession(): void;
  /** How many dictated passages of this session are still in the editor and could be cancelled. */
  uncommitted(): number;
  /** Removes this session's dictated passages that are still exactly as dictated. A passage the person edited is kept. */
  discardSession(): DiscardResult;
}

export function createDictationEditorWriter(port: DictationEditorPort, deps: DictationEditorWriterDeps): DictationEditorWriter {
  let pending: Tracked | null = null;
  let last: Tracked | null = null;
  let session: Tracked[] = [];

  const remap = (t: Tracked | null, map: (pos: number, assoc: -1 | 1) => number) => {
    if (!t) return;
    t.from = map(t.from, 1);
    t.to = Math.max(t.from, map(t.to, -1));
  };
  port.onDocumentChange(map => { remap(pending, map); remap(last, map); session.forEach(t => remap(t, map)); });

  port.onBlur(() => {
    const seg = last;
    last = null;
    if (!seg?.raw) return;
    const now = port.textBetween(seg).trim();
    if (!now || now.length > MAX_CORRECTION_CHARS || same(now, seg.text)) return;
    deps.recordCorrection(seg.raw, now);
  });

  return {
    onText(text, isInterim, meta) {
      if (isInterim) {
        const range = pending && same(port.textBetween(pending), pending.text)
          ? port.replaceRange(pending, text)
          : port.insertAtCursor(text);
        pending = { ...range, text, raw: meta?.raw };
        return;
      }
      const finalText = `${text} `;
      let range: DictationRange | null;
      if (pending) {
        // Replace the provisional text once. If it has been edited since, keep what is there.
        range = same(port.textBetween(pending), pending.text) ? port.replaceRange(pending, finalText) : null;
      } else {
        range = port.insertAtCursor(finalText);
      }
      const raw = meta?.raw ?? pending?.raw;
      pending = null;
      last = range ? { ...range, text: text.trim(), raw } : null;
      if (range) session.push({ ...range, text: text.trim() });
    },
    beginSession() { session = []; pending = null; },
    uncommitted: () => session.length + (pending ? 1 : 0),
    discardSession() {
      const all = [...session, ...(pending ? [pending] : [])].sort((a, b) => b.from - a.from);
      let removed = 0; let kept = 0;
      for (const seg of all) {
        if (same(port.textBetween(seg), seg.text)) { port.replaceRange(seg, ''); removed++; } else kept++;
      }
      session = []; pending = null; last = null;
      return { removed, kept };
    },
  };
}
