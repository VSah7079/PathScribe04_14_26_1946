// src/components/Editor/tiptapBridge/aiContentMarkers.ts
// ─────────────────────────────────────────────────────────────
// AI Content Markers — manages the marking of AI-generated
// content within the PathScribeEditor (Tiptap).
//
// Responsibilities:
//   • Mark nodes as AI-generated (data-ai-generated)
//   • Detect when a user edits AI-generated content
//   • Mark edited nodes as user-edited (data-user-edited)
//   • Provide CSS class names for visual styling
//   • Support regeneration by identifying AI-owned ranges
//
// Design principle:
//   Markers are stored as node attributes, NOT as marks/decorations.
//   This keeps them stable across undo/redo and content replacement.
// ─────────────────────────────────────────────────────────────

import type { Editor } from '@tiptap/react';
import type { Transaction } from '@tiptap/pm/state';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const AI_GENERATED_ATTR   = 'data-ai-generated';
export const AI_SECTION_ATTR     = 'data-ai-section';
const USER_EDITED_ATTR    = 'data-user-edited';
export const SECTION_ID_ATTR     = 'data-section-id';

/** CSS class applied to AI-generated paragraphs */
const AI_GENERATED_CLASS  = 'ai-generated-content';
/** CSS class applied after user edits */
const USER_EDITED_CLASS   = 'user-edited-content';

// ─────────────────────────────────────────────────────────────
// markAiGeneratedRange
// Marks all nodes in a position range as AI-generated.
// Called by streamingWriter after completing a section.
// ─────────────────────────────────────────────────────────────

export function markAiGeneratedRange(
  editor: Editor,
  from: number,
  to: number,
  sectionId: string
): void {
  const { state, view } = editor;
  const tr: Transaction = state.tr;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isBlock) return;

    const newAttrs = {
      ...node.attrs,
      [AI_GENERATED_ATTR]: 'true',
      [SECTION_ID_ATTR]: sectionId,
      class: [node.attrs.class, AI_GENERATED_CLASS]
        .filter(Boolean)
        .join(' '),
    };

    tr.setNodeMarkup(pos, undefined, newAttrs);
    changed = true;
  });

  if (changed) {
    // setMeta prevents this transaction from being treated as a user edit
    tr.setMeta('addToHistory', false);
    tr.setMeta('aiGenerated', true);
    view.dispatch(tr);
  }
}

// ─────────────────────────────────────────────────────────────
// clearSectionMarkers
// Removes AI/user-edit markers from all nodes in a section.
// Called before regenerating a section so fresh content
// gets clean markers.
// ─────────────────────────────────────────────────────────────

export function clearSectionMarkers(editor: Editor, sectionId: string): void {
  const { state, view } = editor;
  const tr: Transaction = state.tr;
  let changed = false;

  state.doc.descendants((node, pos) => {
    if (!node.isBlock) return;
    if (node.attrs[SECTION_ID_ATTR] !== sectionId) return;

    const { [AI_GENERATED_ATTR]: _a, [USER_EDITED_ATTR]: _u, ...rest } = node.attrs;
    const cleanClass = (rest.class ?? '')
      .replace(AI_GENERATED_CLASS, '')
      .replace(USER_EDITED_CLASS, '')
      .trim();

    tr.setNodeMarkup(pos, undefined, { ...rest, class: cleanClass || undefined });
    changed = true;
  });

  if (changed) {
    tr.setMeta('addToHistory', false);
    view.dispatch(tr);
  }
}
