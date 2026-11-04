// src/services/actionRegistry/shortcutMigrations.ts
// Batch 645: moved here, unchanged, from mockActionRegistryService.ts (over 1,000 lines, which may not grow) to make room for
// the Lockbox commands. Re-exported there, so imports of migrateShortcuts from the service keep working.
import type { SystemAction } from './IActionRegistryService';

// Batch 602 (Pete): default hotkeys that clashed between two always-on commands. A site that never changed the key
// gets the new default; a site that did change it keeps its own. (Bumping ACTIONS_VERSION would wipe every
// administrator's customised shortcuts and voice phrases, so this is done one key at a time.)
const SHORTCUT_MIGRATIONS: readonly { id: string; from: string; to: string }[] = [
  { id: 'OPEN_ENHANCEMENT_REQUEST', from: 'Alt+O', to: 'Alt+Y' },
  { id: 'OPEN_TESTING_FEEDBACK', from: 'Alt+T', to: 'Alt+X' },
  { id: 'OPEN_RESOURCES', from: 'Alt+C', to: 'Alt+Q' },
  { id: 'FOCUS_CASE_SEARCH', from: 'Alt+F', to: 'Alt+Shift+B' },
  { id: 'OPEN_PARTICIPATION_TYPES', from: 'Alt+P', to: 'Alt+Shift+W' },
  { id: 'INTRAOP_TOUCH_PREP_PERFORMED', from: 'Alt+L', to: 'Alt+Shift+Y' }, { id: 'PRINT_CURRENT_CASSETTE', from: 'Alt+P', to: 'Alt+Shift+O' }, // Batch 639
];

export function migrateShortcuts(stored: SystemAction[]): SystemAction[] {
  return stored.map(a => {
    const m = SHORTCUT_MIGRATIONS.find(x => x.id === a.id && x.from === a.shortcut);
    return m ? { ...a, shortcut: m.to } : a;
  });
}
