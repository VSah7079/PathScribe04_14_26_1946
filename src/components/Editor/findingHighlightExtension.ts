// src/components/Editor/findingHighlightExtension.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 452 (PS-323, the follow-up to PS-133): highlights detected critical
// findings inside a narrative editor, the same way the spell check draws its
// squiggles (components/SpellCheck/spellCheckExtension.ts): ProseMirror
// decorations, which are drawn over the text and are never part of the
// document, so getHTML() and the saved narrative are unchanged.
//
// Where each finding sits is decided by services/clinical/findingHighlight.ts
// (quote, then loose quote, then the un-negated term, else nothing). The
// spans are recomputed whenever the document changes, so a highlight follows
// its words while the pathologist edits and goes away once they're deleted.
// The editor reads the current findings through a getter (TipTap fixes
// extensions at mount); requestFindingHighlightRefresh() redraws after the
// findings themselves change.
// ─────────────────────────────────────────────────────────────────────────────

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import { offsetToPos } from '@/services/spellcheck/editorTextBlocks';
import { findFindingSpans, type FindingHighlightTarget } from '@/services/clinical/findingHighlight';
import { collectTextBlocks } from '../SpellCheck/spellCheckExtension';

export const findingHighlightKey = new PluginKey<DecorationSet>('pathscribeFindingHighlight');

export interface FindingHighlightOptions {
  getFindings: () => readonly FindingHighlightTarget[];
  /** Hover text for a highlight (already translated by the caller). */
  describe: (finding: FindingHighlightTarget) => string;
}

/** The decorations for a document and a set of findings. Exported for tests. */
export function findingDecorations(doc: PMNode, findings: readonly FindingHighlightTarget[], describe: FindingHighlightOptions['describe']): DecorationSet {
  if (!findings.length) return DecorationSet.empty;
  const decos: Decoration[] = [];
  for (const block of collectTextBlocks(doc)) {
    for (const span of findFindingSpans(block.text, findings)) {
      const from = offsetToPos(block, span.from);
      const to = offsetToPos(block, span.to);
      // Same rule as the spell check: a span crossing an inline node (a
      // line break) isn't drawn across the gap.
      if (to - from !== span.to - span.from) continue;
      decos.push(Decoration.inline(from, to, {
        class: `ps-finding-hl ps-finding-hl--${span.finding.severity.toLowerCase()}`,
        'data-finding-term': span.finding.term,
        title: describe(span.finding),
      }));
    }
  }
  return DecorationSet.create(doc, decos);
}

export function createFindingHighlightExtension({ getFindings, describe }: FindingHighlightOptions) {
  return Extension.create({
    name: 'pathscribeFindingHighlight',
    addProseMirrorPlugins() {
      return [
        new Plugin<DecorationSet>({
          key: findingHighlightKey,
          state: {
            init: (_config, state) => findingDecorations(state.doc, getFindings(), describe),
            apply(tr, prev, _old, state) {
              if (tr.docChanged || tr.getMeta(findingHighlightKey)) return findingDecorations(state.doc, getFindings(), describe);
              return prev;
            },
          },
          props: { decorations: state => findingHighlightKey.getState(state) },
        }),
      ];
    },
  });
}

/** Redraw after the findings change (no document change involved). */
export function requestFindingHighlightRefresh(view: EditorView | undefined | null): void {
  if (!view || view.isDestroyed) return;
  view.dispatch(view.state.tr.setMeta(findingHighlightKey, true).setMeta('addToHistory', false));
}
