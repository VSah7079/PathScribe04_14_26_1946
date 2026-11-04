// src/components/Editor/editorCommands.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 614: the text editor's commands by voice or hotkey (Bold, Italic, lists, indent, find and replace, table,
// signature line, ruler, formatting marks, next/previous section, select all).
//
// The registry actions are EDITOR_* in services/actionRegistry/mockActionRegistryService.ts (each has a roles-list
// entry editor.*, so a role can grant or withhold it). PathScribeEditor subscribes to the registry and calls
// runEditorCommand for the editor that last had the cursor (editorFocus.ts). Nothing here touches the DOM.
//
// "Section" means a heading (Heading 1-3) in the text: Next/Previous Section moves the cursor to the next/previous one.
// Commands that change the text do nothing in a read-only editor; the ones that only look or move still work.
// ─────────────────────────────────────────────────────────────────────────────
import type { Editor } from '@tiptap/react';

export const EDITOR_COMMAND_IDS = [
  'EDITOR_NEXT_SECTION', 'EDITOR_PREVIOUS_SECTION', 'EDITOR_INSERT_TABLE', 'EDITOR_INSERT_SIGNATURE',
  'EDITOR_BOLD', 'EDITOR_ITALIC', 'EDITOR_UNDERLINE', 'EDITOR_BULLETS', 'EDITOR_NUMBERING',
  'EDITOR_INCREASE_INDENT', 'EDITOR_DECREASE_INDENT', 'EDITOR_FIND', 'EDITOR_REPLACE', 'EDITOR_SELECT_ALL',
  'EDITOR_SHOW_RULER', 'EDITOR_TOGGLE_FORMATTING',
] as const;
export type EditorCommandId = (typeof EDITOR_COMMAND_IDS)[number];

export const isEditorCommand = (id: string): id is EditorCommandId => (EDITOR_COMMAND_IDS as readonly string[]).includes(id);

/** The parts of the editor's own screen state a command can change. */
export interface EditorCommandUi {
  toggleFormatMarks: () => void;
  toggleRuler: () => void;
  openFind: (mode: 'find' | 'replace') => void;
  openTablePicker: () => void;
  insertSignatureLine: () => void;
}

/** Where each heading starts, in document order. */
export function headingStarts(editor: Pick<Editor, 'state'>): number[] {
  const out: number[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') out.push(pos);
    return true;
  });
  return out;
}

/** The heading to move to from the cursor, or null when there is none in that direction. */
export function sectionTarget(starts: readonly number[], cursor: number, headingSizes: ReadonlyMap<number, number>, direction: 'next' | 'previous'): number | null {
  if (direction === 'next') return starts.find(p => p >= cursor) ?? null;
  const before = starts.filter(p => p + (headingSizes.get(p) ?? 0) <= cursor);
  return before.length ? before[before.length - 1] : null;
}

function moveToSection(editor: Editor, direction: 'next' | 'previous'): boolean {
  const sizes = new Map<number, number>();
  editor.state.doc.descendants((node, pos) => { if (node.type.name === 'heading') sizes.set(pos, node.nodeSize); return true; });
  const target = sectionTarget([...sizes.keys()], editor.state.selection.from, sizes, direction);
  if (target === null) return false;
  return editor.chain().focus().setTextSelection(target + 1).scrollIntoView().run();
}

/** Runs one editor command. Returns true when it did something. */
export function runEditorCommand(id: EditorCommandId, editor: Editor, ui: EditorCommandUi): boolean {
  const editable = editor.isEditable;
  switch (id) {
    case 'EDITOR_NEXT_SECTION':       return moveToSection(editor, 'next');
    case 'EDITOR_PREVIOUS_SECTION':   return moveToSection(editor, 'previous');
    case 'EDITOR_SELECT_ALL':         return editor.chain().focus().selectAll().run();
    case 'EDITOR_SHOW_RULER':         ui.toggleRuler(); return true;
    case 'EDITOR_TOGGLE_FORMATTING':  ui.toggleFormatMarks(); return true;
    case 'EDITOR_FIND':               ui.openFind('find'); return true;
    case 'EDITOR_REPLACE':            if (!editable) return false; ui.openFind('replace'); return true;
    case 'EDITOR_INSERT_TABLE':       if (!editable) return false; ui.openTablePicker(); return true;
    case 'EDITOR_INSERT_SIGNATURE':   if (!editable) return false; ui.insertSignatureLine(); return true;
    case 'EDITOR_BOLD':               return editable && editor.chain().focus().toggleBold().run();
    case 'EDITOR_ITALIC':             return editable && editor.chain().focus().toggleItalic().run();
    case 'EDITOR_UNDERLINE':          return editable && editor.chain().focus().toggleUnderline().run();
    case 'EDITOR_BULLETS':            return editable && editor.chain().focus().toggleBulletList().run();
    case 'EDITOR_NUMBERING':          return editable && editor.chain().focus().toggleOrderedList().run();
    case 'EDITOR_INCREASE_INDENT':    return editable && editor.can().sinkListItem('listItem') && editor.chain().focus().sinkListItem('listItem').run();
    case 'EDITOR_DECREASE_INDENT':    return editable && editor.can().liftListItem('listItem') && editor.chain().focus().liftListItem('listItem').run();
  }
}
