// @vitest-environment happy-dom
// Batch 452 (PS-323, PS-133): the critical-finding highlight in a real TipTap
// editor is presentation only: it is drawn, follows edits, disappears when
// its words go, and never changes the HTML that gets saved.
import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { createFindingHighlightExtension, findingHighlightKey, requestFindingHighlightRefresh } from '../findingHighlightExtension';
import type { FindingHighlightTarget } from '@/services/clinical/findingHighlight';

let editor: Editor | null = null;
afterEach(() => { editor?.destroy(); editor = null; });

function make(html: string, findings: FindingHighlightTarget[]) {
  const box = { current: findings };
  const el = document.createElement('div');
  document.body.appendChild(el);
  editor = new Editor({
    element: el,
    content: html,
    extensions: [StarterKit, createFindingHighlightExtension({ getFindings: () => box.current, describe: f => `flag:${f.term}` })],
  });
  return { editor, box, el };
}
const highlighted = (el: HTMLElement) => [...el.querySelectorAll('.ps-finding-hl')].map(n => n.textContent);

const CARCINOMA: FindingHighlightTarget = { term: 'invasive carcinoma', sourceQuote: 'Invasive carcinoma is present', severity: 'Malignant' };

describe('findingHighlightExtension', () => {
  it('draws the highlight with its severity class and hover text, and getHTML() is unchanged', () => {
    const html = '<p>Sections show benign stroma. Invasive carcinoma is present.</p>';
    const { editor, el } = make(html, [CARCINOMA]);
    const before = editor.getHTML();
    expect(highlighted(el)).toEqual(['Invasive carcinoma']);
    const mark = el.querySelector('.ps-finding-hl')!;
    expect(mark.classList.contains('ps-finding-hl--malignant')).toBe(true);
    expect(mark.getAttribute('title')).toBe('flag:invasive carcinoma');
    expect(editor.getHTML()).toBe(before);
    expect(editor.getHTML()).not.toContain('ps-finding-hl');
  });

  it('follows the text when the pathologist types before it', () => {
    const { editor, el } = make('<p>Invasive carcinoma is present.</p>', [CARCINOMA]);
    editor.commands.insertContentAt(1, 'Final: ');
    expect(highlighted(el)).toEqual(['Invasive carcinoma']);
    expect(editor.getHTML()).toBe('<p>Final: Invasive carcinoma is present.</p>');
  });

  it('disappears without error once the words are deleted, and comes back if retyped', () => {
    const { editor, el } = make('<p>Invasive carcinoma is present.</p>', [CARCINOMA]);
    editor.commands.setContent('<p>Benign tissue only.</p>');
    expect(highlighted(el)).toEqual([]);
    editor.commands.setContent('<p>On review, invasive carcinoma.</p>');
    expect(highlighted(el)).toEqual(['invasive carcinoma']);
  });

  it('a negated mention is not highlighted', () => {
    const { el } = make('<p>No evidence of invasive carcinoma.</p>', [{ ...CARCINOMA, sourceQuote: 'something else' }]);
    expect(highlighted(el)).toEqual([]);
  });

  it('redraws when the findings change, without touching the document or the undo history', () => {
    const { editor, box, el } = make('<p>Invasive carcinoma. Acute rejection.</p>', []);
    expect(highlighted(el)).toEqual([]);
    box.current = [CARCINOMA, { term: 'acute rejection', sourceQuote: '', severity: 'Critical' }];
    const doc = editor.state.doc;
    requestFindingHighlightRefresh(editor.view);
    expect(editor.state.doc).toBe(doc);
    expect(highlighted(el)).toEqual(['Invasive carcinoma', 'Acute rejection']);
    expect(el.querySelector('.ps-finding-hl--critical')?.textContent).toBe('Acute rejection');
    expect(editor.can().undo()).toBe(false);
    expect(findingHighlightKey.getState(editor.state)?.find().length).toBe(2);
  });
});
