// src/components/Editor/editorFocus.ts
// Batch 614: which text editor a voice or hotkey command acts on. A screen can have several (gross, microscopic,
// diagnosis...). The one that last had the cursor wins; with none focused yet, the first one mounted answers.
// Plain module state: no DOM, no storage.
const mounted: symbol[] = [];
let lastFocused: symbol | null = null;

export function registerEditor(id: symbol): () => void {
  mounted.push(id);
  return () => {
    const i = mounted.indexOf(id);
    if (i >= 0) mounted.splice(i, 1);
    if (lastFocused === id) lastFocused = null;
  };
}

export function markEditorFocused(id: symbol): void {
  if (mounted.includes(id)) lastFocused = id;
}

/** True when this editor is the one a command should act on. */
export function isTargetEditor(id: symbol): boolean {
  if (lastFocused && mounted.includes(lastFocused)) return lastFocused === id;
  return mounted[0] === id;
}

/** Test helper. */
export function resetEditorFocus(): void { mounted.length = 0; lastFocused = null; }
