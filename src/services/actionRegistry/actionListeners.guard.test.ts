// src/services/actionRegistry/actionListeners.guard.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: a registered voice / keyboard action must have a listener on its screen. The registry announces an action
// (executeAction dispatches VOICE_ACTION_TRIGGERED, and PATHSCRIBE_<ID> for the ids in CUSTOM_EVENT_ACTIONS); a screen
// that does not listen makes the command a no-op the person cannot tell from a mis-hearing. Found by hand in Batch 650:
// Sign Out Case, Sign Out and Next, History, Add Code, Accept / Pass from the Worklist, and the eight Contribution TAT
// tiles (the tab listened for an event nothing sent).
//
// Rule: every registry action id appears, as a quoted string or a PATHSCRIBE_<ID> event name, in a screen source file
// that listens (calls actionRegistryService.onAction or addEventListener), directly or in a file that listening file
// imports (the decision tables in services/ and the hooks), OR is listed in unwiredActions.ts with a reason. The list can
// only shrink: a listed action that is now wired fails here until it is removed.
//
// Not covered by the scan (so the per-action handler tests exist): what a listener does once it hears the id.
// ─────────────────────────────────────────────────────────────────────────────
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockActionRegistryService } from './mockActionRegistryService';
import { UNWIRED_ACTIONS } from './unwiredActions';
import { ENTER_COMMAND_KIND } from '../voice/dictationSectionPicker';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const isSource = (name: string) => /\.(tsx?)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name) && !/\.d\.ts$/.test(name);
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
/** Where actions are declared or phrased, not where a screen answers them. */
const DECLARING = ['services/actionRegistry/', 'constants/', 'i18n/'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full);
    return isSource(name) ? [full] : [];
  });
}

const files = walk(SRC)
  .map(f => ({ path: f, rel: relative(SRC, f).split(sep).join('/'), text: code(readFileSync(f, 'utf8')) }))
  .filter(f => !DECLARING.some(d => f.rel.startsWith(d)));
const byPath = new Map(files.map(f => [f.path, f]));
const LISTENS = /\bonAction\s*\(|\baddEventListener\s*\(/;

/** Files a listening file imports (relative or '@/'), one level, that exist in the scan. */
function importedFiles(text: string, from: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    const base = spec.startsWith('@/') ? resolve(SRC, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null;
    if (!base) continue;
    for (const cand of [`${base}.ts`, `${base}.tsx`, resolve(base, 'index.ts'), resolve(base, 'index.tsx')]) if (existsSync(cand)) out.push(cand);
  }
  return out;
}

const listeningTexts: string[] = [];
for (const f of files.filter(f => LISTENS.test(f.text))) {
  listeningTexts.push(f.text);
  for (const imp of importedFiles(f.text, f.path)) { const g = byPath.get(imp); if (g) listeningTexts.push(g.text); }
}
const heard = listeningTexts.join('\n');
/** Heard through a table the listener walks (its keys are not quoted at the listener): the Enter-... dictation commands (useReportDraftVoiceActions). */
const TABLE_HEARD = new Set(Object.keys(ENTER_COMMAND_KIND));
const isHeard = (id: string) => TABLE_HEARD.has(id) || new RegExp(`['"\`]${id}['"\`]|PATHSCRIBE_${id}\\b`).test(heard);

const ids = mockActionRegistryService.getActions().map(a => a.id);

describe('every registered action has a listener on its screen (Batch 650)', () => {
  it('the scan covers the registry', () => {
    expect(ids.length).toBeGreaterThan(200);
    expect(files.length).toBeGreaterThan(500);
  });

  it('each action is heard by a screen, or listed in unwiredActions.ts with a reason', () => {
    const silent = ids.filter(id => !isHeard(id) && !(id in UNWIRED_ACTIONS));
    expect(silent, 'Registered but nothing listens: wire it on its screen (services decide, the component listens), or list it in unwiredActions.ts and KNOWN_GAPS.md with the reason').toEqual([]);
  });

  it('a listed action that is now heard is removed from the list (it can only shrink)', () => {
    expect(Object.keys(UNWIRED_ACTIONS).filter(isHeard)).toEqual([]);
  });

  it('every listed action is a registered one, with a real reason', () => {
    const registered = new Set(ids);
    expect(Object.keys(UNWIRED_ACTIONS).filter(id => !registered.has(id))).toEqual([]);
    expect(Object.entries(UNWIRED_ACTIONS).filter(([, v]) => v.reason.trim().length < 20).map(([k]) => k)).toEqual([]);
  });

  it('the actions Batch 650 wired stay wired', () => {
    for (const id of ['SIGN_OUT', 'SIGNOUT_NEXT', 'OPEN_HISTORY', 'CLOSE_HISTORY', 'GOTO_CODES', 'VOICE_ADD_CODE', 'POOL_ACCEPT_CASE', 'POOL_PASS_CASE',
      'TABLE_FILTER_POOL', 'TABLE_FILTER_COUNTERSIGN', 'OPEN_PRE_FINALISE', 'FINALISE_CANCEL', 'ADD_AMENDMENT', 'SEARCH_EXECUTE', 'SEARCH_CLEAR',
      'TAT_SHOW_FIRST_TOUCH', 'TAT_SHOW_TOTAL_CASE', 'TAT_SHOW_FROZEN_SECTION', 'TAT_SHOW_GROSSING', 'TAT_SHOW_SIGN_OUT', 'TAT_SHOW_COLD_ISCHEMIA',
      'TAT_SHOW_CONSULT_RESPONSE', 'TAT_SHOW_CONSULT_AWAITING']) {
      expect(isHeard(id), id).toBe(true);
      expect(id in UNWIRED_ACTIONS, `${id} is listed as unwired`).toBe(false);
    }
  });
});
