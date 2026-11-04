// Batches 599-601 (actions list accounting): the voice and shortcut list and the roles list agree.
//
// Two lists describe actions:
//   - constants/systemActions.ts (ACTION_GROUPS): what the Role Dictionary shows and a role can grant.
//   - actionRegistry/mockActionRegistryService.ts: the voice phrases and shortcuts people use.
// They are joined by `internalKey`. Rules, all enforced here:
//   1. Every voice or shortcut action has a roles-list entry with the same key (a role can grant or withhold it).
//   2. A roles-list entry with no voice or shortcut action is permission-only. PERMISSION_ONLY lists them, so a
//      new one is a decision, not an accident. Voice for these needs a handler wired on its screen first.
//   3. Hotkeys: the screen in focus wins (shortcutResolution.ts). Two commands on one screen, or two always-on
//      commands, must not share a key. An always-on command a screen shadows is reached by Alt+J, then its key.
//
// If this fails: you added an action, or gave one a shortcut that another active action has. Give it an
// ACTION_GROUPS entry with the same internalKey (and default grants in constants/defaultActionGrants.ts), a
// free shortcut, or add it to the list it belongs to with a reason in the PR.
import { describe, expect, it } from 'vitest';
import { ACTION_GROUPS } from '@/constants/systemActions';
import { mockActionRegistryService, migrateShortcuts, norm } from './mockActionRegistryService';
import { isGlobalCategory, leaderEntries, leaderKeyOf, screenFirst } from './shortcutResolution';
import { PERMISSION_ONLY_ACTIONS, PERMISSION_ONLY_REASON } from './permissionOnlyActions';

/** Roles-list entries with no voice or shortcut action of their own, each classified (Batch 614; was 98 "planned" in 601). */
const PERMISSION_ONLY: readonly string[] = Object.keys(PERMISSION_ONLY_ACTIONS);

const actions = mockActionRegistryService.getActions();
const mappedKeys = new Set(ACTION_GROUPS.flatMap(g => g.actions.map(a => a.internalKey)));
const registryKeys = new Set(actions.map(a => a.internalKey));

/** Two active commands that share a hotkey: [shortcut, a, b]. */
function sharedShortcuts(): { shortcut: string; a: (typeof actions)[number]; b: (typeof actions)[number] }[] {
  const byShortcut = new Map<string, typeof actions>();
  actions.filter(x => x.isActive && x.shortcut).forEach(x => byShortcut.set(x.shortcut, [...(byShortcut.get(x.shortcut) ?? []), x]));
  const out: { shortcut: string; a: (typeof actions)[number]; b: (typeof actions)[number] }[] = [];
  for (const [shortcut, list] of byShortcut) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push({ shortcut, a: list[i], b: list[j] });
  return out;
}

describe('actions list accounting', () => {
  it('every voice or shortcut action has a roles-list entry', () => {
    expect(actions.filter(a => !mappedKeys.has(a.internalKey)).map(a => a.id)).toEqual([]);
  });
  it('every voice and shortcut action has a shortcut and voice phrases in all six languages', () => {
    const langs = ['fr', 'de', 'nl', 'ko', 'es'] as const;
    const bad = actions.filter(a => !a.shortcut || !a.voiceTriggers?.length || langs.some(l => !a.voiceTriggersByLanguage?.[l]?.length));
    expect(bad.map(a => a.id)).toEqual([]);
  });
  it('roles-list entries with no voice or shortcut action are listed as permission-only', () => {
    const found = ACTION_GROUPS.flatMap(g => g.actions).filter(a => !registryKeys.has(a.internalKey)).map(a => a.id);
    expect(found.filter(id => !PERMISSION_ONLY.includes(id))).toEqual([]);
  });
  it('a permission-only id that now has a voice or shortcut action is removed from the list', () => {
    const found = new Set<string>(ACTION_GROUPS.flatMap(g => g.actions).filter(a => !registryKeys.has(a.internalKey)).map(a => a.id));
    expect(PERMISSION_ONLY.filter(id => !found.has(id))).toEqual([]);
  });
  // Batch 614: nothing is left "planned". Each of these has a voice command (the 16 editor ones, tested below), is
  // covered by another command, or is a screen, a choice or a risky action with a stated reason.
  it('every permission-only entry is classified with a reason, and a covering command really exists', () => {
    const bad: string[] = [];
    for (const [id, entry] of Object.entries(PERMISSION_ONLY_ACTIONS)) {
      if (!PERMISSION_ONLY_REASON[entry.kind]) bad.push(`${id}: unknown kind`);
      if (entry.kind === 'covered') {
        const target = actions.find(a => a.id === entry.coveredBy);
        if (!target || !target.isActive) bad.push(`${id}: covered by ${entry.coveredBy}, which is not an active command`);
      } else if (entry.coveredBy) bad.push(`${id}: coveredBy is only for covered entries`);
    }
    expect(bad).toEqual([]);
  });
  it('the 16 text-editor commands are voice and hotkey commands, with a roles-list entry each', () => {
    const editorIds = ['editor.nextSection', 'editor.previousSection', 'editor.insertTable', 'editor.insertSignature', 'editor.bold',
      'editor.italic', 'editor.underline', 'editor.bullets', 'editor.numbering', 'editor.increaseIndent', 'editor.decreaseIndent',
      'editor.find', 'editor.replace', 'editor.selectAll', 'editor.showRuler', 'editor.toggleFormatting'];
    const missing = editorIds.filter(id => !registryKeys.has(ACTION_GROUPS.flatMap(g => g.actions).find(a => a.id === id)!.internalKey));
    expect(missing).toEqual([]);
    expect(actions.filter(a => a.id.startsWith('EDITOR_'))).toHaveLength(16);
  });
  it('no two commands on the same screen share a hotkey', () => {
    const same = sharedShortcuts().filter(c => !isGlobalCategory(c.a.category) && c.a.category === c.b.category);
    expect(same.map(c => `${c.shortcut}: ${c.a.id} / ${c.b.id}`)).toEqual([]);
  });
  it('no two always-on commands share a hotkey (context cannot tell them apart)', () => {
    const both = sharedShortcuts().filter(c => isGlobalCategory(c.a.category) && isGlobalCategory(c.b.category));
    expect(both.map(c => `${c.shortcut}: ${c.a.id} / ${c.b.id}`)).toEqual([]);
  });
  it('a screen command may share a key with an always-on one: the screen wins and the always-on one is reached by the Go to prefix', () => {
    // Every always-on command with a hotkey appears in the prefix list, each under its own key.
    const global = actions.filter(a => a.isActive && isGlobalCategory(a.category) && a.shortcut);
    const entries = leaderEntries(global);
    expect(entries).toHaveLength(global.length);
    expect(new Set(entries.map(e => e.leaderKey)).size).toBe(global.length);
  });
  // Batch 614: the clashes that remain are listed here, so a new one is a decision and not an accident.
  // A clash is a screen command that shares a key or a spoken phrase with an always-on command. The screen wins
  // (shortcutResolution.ts) and the always-on command is reached with Alt+J, then its key, so none of these is
  // broken. If one of these tests fails you added a clash (or removed one: delete its line). Give the new command
  // a free key or phrase, or add the line with a reason in the pull request. The ones that need Pete's call are in
  // docs/product/HOTKEY_DECISIONS.md. Batch 614 also moved the seven Intraoperative queue commands from the
  // always-on group to their own screen (their handlers exist only there), which removed 15 key clashes.
  const KNOWN_SCREEN_KEY_SHADOWS: readonly string[] = [
  'Alt+,: PREVIOUS_TAB / GROSSING_PREVIOUS_BLOCK',
  'Alt+.: NEXT_TAB / GROSSING_NEXT_BLOCK',
  'Alt+C: OPEN_CONFIGURATION / MSG_CLEAR_SUBJECT',
  'Alt+C: OPEN_CONFIGURATION / SEARCH_CLEAR',
  'Alt+C: OPEN_CONFIGURATION / TABLE_FILTER_COMPLETED',
  'Alt+C: OPEN_CONFIGURATION / TAT_SHOW_COLD_ISCHEMIA',
  'Alt+F: OPEN_SEARCH / FLAG_OPEN_MANAGER',
  'Alt+F: OPEN_SEARCH / TABLE_FILTER_URGENT',
  'Alt+F: OPEN_SEARCH / TAT_SHOW_FROZEN_SECTION',
  'Alt+H: OPEN_HOME / OPEN_HISTORY',
  'Alt+I: OPEN_MESSAGES / ACCESSION_IMPORT_ORDER',
  'Alt+I: OPEN_MESSAGES / VOICE_INTERNAL_NOTE',
  'Alt+L: SYSTEM_LOGOUT / INTRAOP_LOG_SURGEON_REPORT',
  'Alt+L: SYSTEM_LOGOUT / SEARCH_LOAD_SAVED',
  'Alt+N: NEXT_CASE / ADD_ORDERS_SPECIMEN',
  'Alt+N: NEXT_CASE / ADD_SPECIMEN',
  'Alt+P: PREVIOUS_CASE / TABLE_SORT_PRIORITY',
  'Alt+R: OPEN_ROUTING_RULES / MSG_RECIPIENT_ADD',
  'Alt+R: OPEN_ROUTING_RULES / SAVE_DRAFT',
  'Alt+R: OPEN_ROUTING_RULES / TABLE_REFRESH',
  'Alt+R: OPEN_ROUTING_RULES / TAT_SHOW_CONSULT_RESPONSE',
  'Alt+Shift+T: TEST_ROUTING / GROSSING_CONFIRM_TRIAGE',
  'Alt+U: OPEN_AUDIT / DISCARD_CHANGES',
  'Alt+U: OPEN_AUDIT / MSG_MARK_UNREAD',
];
  const KNOWN_SCREEN_VOICE_SHADOWS: readonly string[] = [
  'de "nachrichten anzeigen": OPEN_MESSAGES / MSG_VIEW_MESSAGES',
  'de "suchen": OPEN_SEARCH / MSG_SEARCH',
  'de "vorwärts": GO_FORWARD / NEXT_FIELD',
  'de "zurück": GO_BACK / PREVIOUS_FIELD',
  'en "back": GO_BACK / PREVIOUS_FIELD',
  'en "forward": GO_FORWARD / NEXT_FIELD',
  'en "go back": GO_BACK / PREVIOUS_FIELD',
  'en "go forward": GO_FORWARD / NEXT_FIELD',
  'en "search": OPEN_SEARCH / MSG_SEARCH',
  'es "buscar": OPEN_SEARCH / MSG_SEARCH',
  'fr "avancer": GO_FORWARD / NEXT_FIELD',
  'fr "page précédente": GO_BACK / TABLE_PAGE_UP',
  'fr "page suivante": GO_FORWARD / TABLE_PAGE_DOWN',
  'fr "rechercher": OPEN_SEARCH / MSG_SEARCH',
  'fr "reculer": GO_BACK / PREVIOUS_FIELD',
  'fr "suivant": GO_FORWARD / MSG_NEXT',
  'fr "suivant": GO_FORWARD / TABLE_NEXT',
  'ko "검색": OPEN_SEARCH / MSG_SEARCH',
  'ko "뒤로": GO_BACK / PREVIOUS_FIELD',
  'ko "메시지 보기": OPEN_MESSAGES / MSG_VIEW_MESSAGES',
  'ko "앞으로": GO_FORWARD / NEXT_FIELD',
  'nl "berichten tonen": OPEN_MESSAGES / MSG_VIEW_MESSAGES',
  'nl "terug": GO_BACK / PREVIOUS_FIELD',
  'nl "vooruit": GO_FORWARD / NEXT_FIELD',
  'nl "zoeken": OPEN_SEARCH / MSG_SEARCH',
];
  it('every key a screen command shares with an always-on command is on the known list (a new clash fails)', () => {
    const found = sharedShortcuts()
      .filter(c => isGlobalCategory(c.a.category) !== isGlobalCategory(c.b.category))
      .map(c => { const g = isGlobalCategory(c.a.category) ? c.a : c.b; const sc = isGlobalCategory(c.a.category) ? c.b : c.a; return `${c.shortcut}: ${g.id} / ${sc.id}`; })
      .sort();
    expect(found).toEqual([...KNOWN_SCREEN_KEY_SHADOWS].sort());
  });
  it('the Go to prefix key (Alt+J) is not used by any command', () => {
    expect(actions.filter(a => a.shortcut.toLowerCase() === 'alt+j').map(a => a.id)).toEqual([]);
    expect(actions.map(a => leaderKeyOf(a.shortcut))).toBeTruthy();
  });

  // Batch 602: voice follows the same rule as hotkeys. A phrase shared between a screen command and an always-on
  // one goes to the screen; the same phrase on two commands that cannot be told apart is a defect.
  const LANGS = ['en', 'fr', 'de', 'nl', 'ko', 'es'] as const;
  function sharedPhrases(): { lang: string; phrase: string; a: (typeof actions)[number]; b: (typeof actions)[number] }[] {
    const out: { lang: string; phrase: string; a: (typeof actions)[number]; b: (typeof actions)[number] }[] = [];
    for (const lang of LANGS) {
      const byPhrase = new Map<string, typeof actions>();
      for (const a of actions.filter(x => x.isActive)) {
        const list = lang === 'en' ? a.voiceTriggers : a.voiceTriggersByLanguage?.[lang];
        new Set((list ?? []).map(norm)).forEach(ph => byPhrase.set(ph, [...(byPhrase.get(ph) ?? []), a]));
      }
      for (const [phrase, list] of byPhrase) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) out.push({ lang, phrase, a: list[i], b: list[j] });
    }
    return out;
  }
  it('no two commands on the same screen share a voice phrase, in any language', () => {
    const same = sharedPhrases().filter(c => !isGlobalCategory(c.a.category) && c.a.category === c.b.category);
    expect(same.map(c => `${c.lang} "${c.phrase}": ${c.a.id} / ${c.b.id}`)).toEqual([]);
  });
  it('no two always-on commands share a voice phrase, in any language', () => {
    const both = sharedPhrases().filter(c => isGlobalCategory(c.a.category) && isGlobalCategory(c.b.category));
    expect(both.map(c => `${c.lang} "${c.phrase}": ${c.a.id} / ${c.b.id}`)).toEqual([]);
  });
  it('every phrase a screen command shares with an always-on command is on the known list (a new clash fails)', () => {
    const found = sharedPhrases()
      .filter(c => isGlobalCategory(c.a.category) !== isGlobalCategory(c.b.category))
      .map(c => { const g = isGlobalCategory(c.a.category) ? c.a : c.b; const sc = isGlobalCategory(c.a.category) ? c.b : c.a; return `${c.lang} "${c.phrase}": ${g.id} / ${sc.id}`; })
      .sort();
    expect(found).toEqual([...KNOWN_SCREEN_VOICE_SHADOWS].sort());
  });
  it('voice matching lists the screen commands before the always-on ones', () => {
    const list = screenFirst([{ category: 'NAVIGATION', n: 1 }, { category: 'REPORT', n: 2 }, { category: 'SYSTEM', n: 3 }, { category: 'REPORT', n: 4 }]);
    expect(list.map(x => x.n)).toEqual([2, 4, 1, 3]);
  });
  it('a stored hotkey that is still the old default moves to the new one; a customised one is kept', () => {
    const base = actions.find(a => a.id === 'OPEN_RESOURCES')!;
    const [moved, kept] = migrateShortcuts([{ ...base, shortcut: 'Alt+C' }, { ...base, shortcut: 'Ctrl+Shift+R' }]);
    expect(moved.shortcut).toBe('Alt+Q');
    expect(kept.shortcut).toBe('Ctrl+Shift+R');
  });
  it('Batch 639: Print Current Cassette is Alt+Shift+O (Alt+P stays Previous Case); an old default moves, a customised key stays', () => {
    const base = actions.find(a => a.id === 'PRINT_CURRENT_CASSETTE')!;
    expect(base.shortcut).toBe('Alt+Shift+O');
    expect(actions.filter(a => a.shortcut === 'Alt+Shift+O').map(a => a.id)).toEqual(['PRINT_CURRENT_CASSETTE']);
    const [moved, kept] = migrateShortcuts([{ ...base, shortcut: 'Alt+P' }, { ...base, shortcut: 'Ctrl+Shift+K' }]);
    expect(moved.shortcut).toBe('Alt+Shift+O');
    expect(kept.shortcut).toBe('Ctrl+Shift+K');
  });
});
