// @vitest-environment jsdom
// Batch 614: a voice or hotkey command from the action registry reaches the editor that has the cursor.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import PathScribeEditor from '../PathScribeEditor';
import { actionRegistryService } from '@/services';
import { resetEditorFocus } from '../editorFocus';

const run = (id: string) => {
  const action = actionRegistryService.getActionById(id);
  expect(action).toBeTruthy();
  act(() => { actionRegistryService.executeAction(action!); });
};
afterEach(() => { cleanup(); resetEditorFocus(); });

describe('PathScribeEditor voice and hotkey commands', () => {
  it('Show / Hide Ruler toggles the ruler', async () => {
    render(<PathScribeEditor content="<p>text</p>" />);
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy());
    expect(screen.queryByTestId('pse-ruler')).toBeNull();
    run('EDITOR_SHOW_RULER');
    expect(screen.getByTestId('pse-ruler')).toBeTruthy();
    run('EDITOR_SHOW_RULER');
    expect(screen.queryByTestId('pse-ruler')).toBeNull();
  });

  it('Find opens the find panel and Replace opens it on the Replace tab', async () => {
    render(<PathScribeEditor content="<p>text</p>" />);
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy());
    run('EDITOR_FIND');
    expect(document.querySelector('.pse-findreplace-panel')).toBeTruthy();
    expect(document.querySelectorAll('.pse-findreplace-tab--active')).toHaveLength(1);
    expect(document.querySelector('.pse-findreplace-matchcount')).toBeNull();
    run('EDITOR_REPLACE');
    await waitFor(() => expect(document.querySelectorAll('.pse-dropdown-input').length).toBe(2));
  });

  it('Bold applies to the selection in the editor', async () => {
    const changes: string[] = [];
    render(<PathScribeEditor content="<p>hello</p>" onChange={html => changes.push(html)} />);
    await waitFor(() => expect(document.querySelector('.ProseMirror')).toBeTruthy());
    const pm = document.querySelector('.ProseMirror') as HTMLElement;
    act(() => { pm.focus(); });
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(pm.querySelector('p')!);
    selection.removeAllRanges();
    selection.addRange(range);
    run('EDITOR_SELECT_ALL');
    run('EDITOR_BOLD');
    await waitFor(() => expect(changes.some(h => h.includes('<strong>'))).toBe(true));
  });

  it('only the editor that last had the cursor acts when a screen has two', async () => {
    render(<><div data-testid="one"><PathScribeEditor content="<p>one</p>" /></div><div data-testid="two"><PathScribeEditor content="<p>two</p>" /></div></>);
    await waitFor(() => expect(document.querySelectorAll('.ProseMirror').length).toBe(2));
    const second = document.querySelectorAll('.ProseMirror')[1] as HTMLElement;
    act(() => { second.focus(); });
    run('EDITOR_SHOW_RULER');
    expect(screen.getByTestId('two').querySelector('[data-testid="pse-ruler"]')).toBeTruthy();
    expect(screen.getByTestId('one').querySelector('[data-testid="pse-ruler"]')).toBeNull();
  });
});
