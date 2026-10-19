// Batch 614: the text editor's voice and hotkey commands, run on a real (headless) TipTap editor.
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { EDITOR_COMMAND_IDS, isEditorCommand, runEditorCommand, sectionTarget, type EditorCommandUi } from '../editorCommands';
import { isTargetEditor, markEditorFocused, registerEditor, resetEditorFocus } from '../editorFocus';

const made: Editor[] = [];
function make(content: string, editable = true): Editor {
  const e = new Editor({
    extensions: [StarterKit.configure({ underline: false }), Underline, Table, TableRow, TableHeader, TableCell],
    content, editable,
  });
  made.push(e);
  return e;
}
const ui = (): EditorCommandUi => ({ toggleFormatMarks: vi.fn(), toggleRuler: vi.fn(), openFind: vi.fn(), openTablePicker: vi.fn(), insertSignatureLine: vi.fn() });
afterEach(() => { made.splice(0).forEach(e => e.destroy()); resetEditorFocus(); });

describe('editor commands', () => {
  it('names the 16 commands and recognises them', () => {
    expect(EDITOR_COMMAND_IDS).toHaveLength(16);
    expect(isEditorCommand('EDITOR_BOLD')).toBe(true);
    expect(isEditorCommand('SAVE_DRAFT')).toBe(false);
  });

  it('bold, italic and underline toggle on the selection', () => {
    const e = make('<p>hello</p>');
    e.commands.selectAll();
    runEditorCommand('EDITOR_BOLD', e, ui());
    runEditorCommand('EDITOR_ITALIC', e, ui());
    runEditorCommand('EDITOR_UNDERLINE', e, ui());
    expect(e.getHTML()).toContain('<strong>');
    expect(e.getHTML()).toContain('<em>');
    expect(e.getHTML()).toContain('<u>');
    runEditorCommand('EDITOR_BOLD', e, ui());
    expect(e.getHTML()).not.toContain('<strong>');
  });

  it('bullets and numbering make lists; indent and outdent move a list item', () => {
    const e = make('<p>one</p><p>two</p>');
    e.commands.selectAll();
    runEditorCommand('EDITOR_BULLETS', e, ui());
    expect(e.getHTML()).toContain('<ul>');
    runEditorCommand('EDITOR_BULLETS', e, ui());
    runEditorCommand('EDITOR_NUMBERING', e, ui());
    expect(e.getHTML()).toContain('<ol>');
    let inSecond = 0;
    e.state.doc.descendants((node, pos) => { if (node.isText && node.text === 'two') inSecond = pos + 1; });
    e.commands.setTextSelection(inSecond);
    expect(runEditorCommand('EDITOR_INCREASE_INDENT', e, ui())).toBe(true);
    expect((e.getHTML().match(/<ol>/g) ?? []).length).toBe(2);
    expect(runEditorCommand('EDITOR_DECREASE_INDENT', e, ui())).toBe(true);
    expect((e.getHTML().match(/<ol>/g) ?? []).length).toBe(1);
  });

  it('indent does nothing outside a list, and says so', () => {
    const e = make('<p>plain</p>');
    expect(runEditorCommand('EDITOR_INCREASE_INDENT', e, ui())).toBe(false);
    expect(runEditorCommand('EDITOR_DECREASE_INDENT', e, ui())).toBe(false);
  });

  it('select all selects the whole text', () => {
    const e = make('<p>a</p><p>b</p>');
    runEditorCommand('EDITOR_SELECT_ALL', e, ui());
    expect(e.state.selection.from).toBe(0);
    expect(e.state.selection.to).toBe(e.state.doc.content.size);
  });

  it('next and previous section move the cursor between headings', () => {
    const e = make('<h2>Gross</h2><p>a</p><h2>Micro</h2><p>b</p><h2>Diagnosis</h2><p>c</p>');
    e.commands.setTextSelection(2); // inside "Gross"
    runEditorCommand('EDITOR_NEXT_SECTION', e, ui());
    expect(e.state.doc.resolve(e.state.selection.from).parent.textContent).toBe('Micro');
    runEditorCommand('EDITOR_NEXT_SECTION', e, ui());
    expect(e.state.doc.resolve(e.state.selection.from).parent.textContent).toBe('Diagnosis');
    expect(runEditorCommand('EDITOR_NEXT_SECTION', e, ui())).toBe(false); // none after the last
    runEditorCommand('EDITOR_PREVIOUS_SECTION', e, ui());
    expect(e.state.doc.resolve(e.state.selection.from).parent.textContent).toBe('Micro');
    runEditorCommand('EDITOR_PREVIOUS_SECTION', e, ui());
    expect(e.state.doc.resolve(e.state.selection.from).parent.textContent).toBe('Gross');
    expect(runEditorCommand('EDITOR_PREVIOUS_SECTION', e, ui())).toBe(false); // none before the first
  });

  it('section moves from plain text before any heading, and does nothing in text with no headings', () => {
    const e = make('<p>intro</p><h2>Gross</h2><p>a</p>');
    e.commands.setTextSelection(2);
    runEditorCommand('EDITOR_NEXT_SECTION', e, ui());
    expect(e.state.doc.resolve(e.state.selection.from).parent.textContent).toBe('Gross');
    const none = make('<p>just text</p>');
    expect(runEditorCommand('EDITOR_NEXT_SECTION', none, ui())).toBe(false);
  });

  it('sectionTarget is pure: next is at or after the cursor, previous ends before it', () => {
    const sizes = new Map([[0, 8], [20, 8]]);
    expect(sectionTarget([0, 20], 5, sizes, 'next')).toBe(20);
    expect(sectionTarget([0, 20], 30, sizes, 'previous')).toBe(20);
    expect(sectionTarget([0, 20], 22, sizes, 'previous')).toBe(0);
    expect(sectionTarget([], 3, sizes, 'next')).toBeNull();
  });

  it('find, replace, table, signature, ruler and formatting marks ask the editor screen to do them', () => {
    const e = make('<p>x</p>');
    const u = ui();
    runEditorCommand('EDITOR_FIND', e, u);
    runEditorCommand('EDITOR_REPLACE', e, u);
    runEditorCommand('EDITOR_INSERT_TABLE', e, u);
    runEditorCommand('EDITOR_INSERT_SIGNATURE', e, u);
    runEditorCommand('EDITOR_SHOW_RULER', e, u);
    runEditorCommand('EDITOR_TOGGLE_FORMATTING', e, u);
    expect(u.openFind).toHaveBeenNthCalledWith(1, 'find');
    expect(u.openFind).toHaveBeenNthCalledWith(2, 'replace');
    expect(u.openTablePicker).toHaveBeenCalledTimes(1);
    expect(u.insertSignatureLine).toHaveBeenCalledTimes(1);
    expect(u.toggleRuler).toHaveBeenCalledTimes(1);
    expect(u.toggleFormatMarks).toHaveBeenCalledTimes(1);
  });

  it('a read-only editor can look and move but not change the text', () => {
    const e = make('<h2>A</h2><p>text</p>', false);
    const u = ui();
    e.commands.selectAll();
    expect(runEditorCommand('EDITOR_BOLD', e, u)).toBe(false);
    expect(runEditorCommand('EDITOR_BULLETS', e, u)).toBe(false);
    expect(runEditorCommand('EDITOR_REPLACE', e, u)).toBe(false);
    expect(runEditorCommand('EDITOR_INSERT_TABLE', e, u)).toBe(false);
    expect(runEditorCommand('EDITOR_INSERT_SIGNATURE', e, u)).toBe(false);
    expect(e.getHTML()).not.toContain('<strong>');
    expect(runEditorCommand('EDITOR_FIND', e, u)).toBe(true);
    expect(runEditorCommand('EDITOR_SHOW_RULER', e, u)).toBe(true);
    expect(runEditorCommand('EDITOR_SELECT_ALL', e, u)).toBe(true);
  });
});

describe('which editor a command acts on', () => {
  it('the one that last had the cursor; with none focused, the first mounted', () => {
    const a = Symbol('a'), b = Symbol('b');
    const offA = registerEditor(a), offB = registerEditor(b);
    expect(isTargetEditor(a)).toBe(true);
    expect(isTargetEditor(b)).toBe(false);
    markEditorFocused(b);
    expect(isTargetEditor(a)).toBe(false);
    expect(isTargetEditor(b)).toBe(true);
    offB();
    expect(isTargetEditor(a)).toBe(true); // the focused one went away: back to the first
    offA();
    expect(isTargetEditor(a)).toBe(false);
  });
  it('an editor that is not mounted cannot take focus', () => {
    const ghost = Symbol('ghost'), real = Symbol('real');
    registerEditor(real);
    markEditorFocused(ghost);
    expect(isTargetEditor(real)).toBe(true);
  });
});
