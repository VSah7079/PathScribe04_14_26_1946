// src/services/material/materialComments.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#10): the plain-text comments on a block, stain, decant or (now)
// matrix block. A comment is short operational text (MaterialComment), never
// rich text. This is where a new comment is made and where "which comments
// were just added" is decided, so the editor only renders and dispatches and
// the audit entry for a matrix block comment can be written from the change.
// ─────────────────────────────────────────────────────────────────────────────
import type { MaterialComment } from '@/types/case/MaterialComment';

export interface NewMaterialCommentInput {
  authorId: string;
  authorName: string;
  text: string;
}

/** The comment to add, or null when the text is empty (pure; `now` and `idSuffix` are passed in for tests). */
export function buildMaterialComment(
  input: NewMaterialCommentInput,
  now: Date = new Date(),
  idSuffix: string = Math.random().toString(36).slice(2, 8),
): MaterialComment | null {
  const text = input.text.trim();
  if (!text) return null;
  return {
    id: `cmt-${now.getTime()}-${idSuffix}`,
    authorId: input.authorId,
    authorName: input.authorName,
    text,
    createdAt: now.toISOString(),
  };
}

/** The list with the comment added at the end; comments are append-only (pure). */
export function appendMaterialComment(comments: readonly MaterialComment[] | undefined, comment: MaterialComment): MaterialComment[] {
  return [...(comments ?? []), comment];
}

/** The comments in `next` that were not in `before`, by id (pure). */
export function newMaterialComments(before: readonly MaterialComment[] | undefined, next: readonly MaterialComment[] | undefined): MaterialComment[] {
  const known = new Set((before ?? []).map(c => c.id));
  return (next ?? []).filter(c => !known.has(c.id));
}
