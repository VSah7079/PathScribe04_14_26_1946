// src/services/actionRegistry/transientActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: commands a screen registers while it is open and removes when it closes (the Report Draft's spoken
// section commands). They are NOT part of the stored, administrator-editable list (getActions / updateAction), so
// they are never saved and never appear in the Actions tab; they take part in voice matching and in
// getEligibleActions like any other command, under the category given (the screen's own context).
//
// The page used to call a registry method named `registerAction` that did not exist (`registry.registerAction?.()`,
// a silent no-op), so none of its phrases ever registered. This is the method it should have been calling.
// Dispatching: executing a transient command fires its `dispatch.event` on window (detail: `dispatch.detail`).
// ─────────────────────────────────────────────────────────────────────────────
import type { SystemAction } from './IActionRegistryService';

export interface TransientActionDefinition {
  id: string;
  label: string;
  /** Eligible while the screen's context equals this (use a VOICE_CONTEXT value). */
  category: string;
  /** English phrases. */
  phrases: readonly string[];
  /** Phrases in the other voice languages (fr, de, nl, ko, es). */
  byLanguage?: SystemAction['voiceTriggersByLanguage'];
  dispatch: { event: string; detail?: unknown };
}

export interface TransientActionStore {
  register(defs: readonly TransientActionDefinition[]): () => void;
  list(): SystemAction[];
  /** The definition's dispatch for a registered id (undefined when not transient). */
  dispatchFor(id: string): TransientActionDefinition['dispatch'] | undefined;
}

export function createTransientActionStore(): TransientActionStore {
  const defs = new Map<string, TransientActionDefinition>();
  const asAction = (d: TransientActionDefinition): SystemAction => ({
    id: d.id, label: d.label, category: d.category,
    shortcut: '', internalKey: `TRANSIENT+${d.id}`,
    voiceTriggers: [...d.phrases], voiceTriggersByLanguage: d.byLanguage,
    learnedTriggers: [], requiredRole: 'All Staff', isActive: true,
  });
  return {
    register(list) {
      const mine = list.map(d => d.id);
      list.forEach(d => defs.set(d.id, d));
      // Unregister only what this call added, and only if a later registration did not replace it.
      return () => mine.forEach((id, i) => { if (defs.get(id) === list[i]) defs.delete(id); });
    },
    list: () => [...defs.values()].map(asAction),
    dispatchFor: id => defs.get(id)?.dispatch,
  };
}
