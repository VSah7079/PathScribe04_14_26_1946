// @vitest-environment happy-dom
// src/services/demoReset/demoResetKeys.guard.test.ts
// Batch 508: now part of the automated suite (it was a manual
// `.auditTest.ts` that had drifted: it compared mock-storage keys without
// their `pathscribe_mock_` prefix and so reported 20 keys the reset does
// clear). Batch 506 had moved it here from
// components/Config/System/DemoResetTab.auditTest.ts.
// Real, per direct follow-up: "review the whole system, you may
// likely find other gaps" — this is the automated version of the
// manual, one-off audit that followed that request. Walks every real
// .ts/.tsx file under src/, extracts every real localStorage key this
// app actually reads/writes (both via mockStorage.ts's storageGet/
// storageSet and raw localStorage.getItem/setItem/removeItem calls),
// and asserts each one is accounted for by DemoResetTab.tsx itself —
// either explicitly listed in one of its five real reset arrays,
// matched by one of its three prefix/exact-key sweeps, or explicitly
// named in its own exported DELIBERATELY_NOT_RESET record with a real
// reason. A key that's none of these is exactly the class of bug this
// file's own history shows recurring — this test exists so the next
// one is caught here, not discovered live in front of a customer.
//
// A failure means "go look at this key": add it to one of the reset's
// lists, or name it in DELIBERATELY_NOT_RESET with the reason. That is a
// judgment call (see DELIBERATELY_NOT_RESET's doc comment), so the test
// never guesses.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  VERSIONED_KEYS, SETTINGS_KEYS, CASE_KEYS, FLAG_KEYS, STATE_KEYS,
  MOCK_PREFIX, ACTIVE_SESSION_KEY_PREFIX, SESSION_KEY, DELIBERATELY_NOT_RESET, RUNTIME_KEY_PREFIXES, keptThroughReset,
} from '@/services/demoReset/demoReset';
import { UI_PREFERENCE_PREFIX } from '@/utils/uiPreferences';

// Batch 510: the project's src/, from the working directory vitest runs in
// (as the other guard tests do). This used to walk up from this file until
// a path ended in '/src', which never matches a Windows path ('\\src'), so on
// Windows the loop never ended and the whole run stalled.
const SRC_ROOT = join(process.cwd(), 'src');

// Batch 508: read from the reset itself (this was a copy that could drift), plus the display-preference prefix.
const RUNTIME_PREFIX_PATTERNS = [...RUNTIME_KEY_PREFIXES, UI_PREFERENCE_PREFIX];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkTsFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) && !/\.auditTest\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

function stripLineComments(source: string): string {
  return source.split('\n').map(line => {
    const idx = line.indexOf('//');
    return idx === -1 ? line : line.slice(0, idx);
  }).join('\n');
}

/** Real, per-file resolution: finds every `const NAME = 'literal'`
 *  declaration, then finds every storageGet/storageSet/localStorage.* (and,
 *  since Batch 525, dataStorage.*, which services use in its place)
 *  call and resolves its first argument — either an identifier (via
 *  the const map) or an inline literal — to a real key string. */
function extractRealKeysFromFile(source: string): string[] {
  const cleaned = stripLineComments(source);
  const constMap = new Map<string, string>();
  for (const m of cleaned.matchAll(/const\s+([A-Za-z0-9_]+)\s*=\s*'([^']+)'/g)) {
    constMap.set(m[1], m[2]);
  }
  const keys: string[] = [];
  // Batch 508: keys passed to the mock-storage helpers (storageGet/storageSet,
  // or a service's injected `store`) are stored under MOCK_PREFIX. The audit
  // used to compare the bare key, so it reported 20 keys the reset's
  // MOCK_PREFIX sweep does clear.
  const mockPattern = /(?:storageGet|storageSet|store\.(?:get|set))(?:<[^(]*>)?\(\s*(?:'([^']+)'|([A-Za-z0-9_]+))/g;
  for (const m of cleaned.matchAll(mockPattern)) {
    const bare = m[1] ?? (m[2] ? constMap.get(m[2]) : undefined);
    if (bare) keys.push(`${MOCK_PREFIX}${bare}`);
  }
  const callPattern = /(?:getWorkstationSetting|setWorkstationSetting|getWorkstationJson|setWorkstationJson|(?:localStorage|dataStorage)\.(?:getItem|setItem|removeItem))\(\s*(?:'([^']+)'|([A-Za-z0-9_]+))/g;
  for (const m of cleaned.matchAll(callPattern)) {
    if (m[1]) keys.push(m[1]);
    else if (m[2] && constMap.has(m[2])) keys.push(constMap.get(m[2])!);
  }
  return keys;
}

describe('DemoResetTab — real, systematic storage-key coverage audit', () => {
  it('every real localStorage key used anywhere in src/ is accounted for by DemoResetTab', () => {
    const files = walkTsFiles(SRC_ROOT);
    const allRealKeys = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      for (const key of extractRealKeysFromFile(source)) allRealKeys.add(key);
    }

    const covered = new Set<string>([...VERSIONED_KEYS, ...SETTINGS_KEYS, ...CASE_KEYS, ...FLAG_KEYS, ...STATE_KEYS]);
    const exactHandledElsewhere = new Set<string>([SESSION_KEY]);

    const isCovered = (key: string): boolean => {
      if (covered.has(key)) return true;
      if (exactHandledElsewhere.has(key)) return true;
      if (keptThroughReset(key)) return true;
      if (key.startsWith(MOCK_PREFIX)) return true;
      if (key.startsWith(ACTIVE_SESSION_KEY_PREFIX)) return true;
      return RUNTIME_PREFIX_PATTERNS.some(p => key.startsWith(p));
    };

    const uncovered = [...allRealKeys].filter(k => !isCovered(k)).sort();

    if (uncovered.length > 0) {
      console.error(
        `\nReal, uncovered localStorage keys found — each one needs either:\n` +
        `  1. Adding to one of DemoResetTab's five reset arrays, or\n` +
        `  2. A real, documented entry in DELIBERATELY_NOT_RESET with the actual reason.\n\n` +
        uncovered.map(k => `  - ${k}`).join('\n') + '\n'
      );
    }
    expect(uncovered).toEqual([]);
  });

  it('every DELIBERATELY_NOT_RESET entry still refers to a real key genuinely used somewhere in src/ — never a stale, orphaned exclusion', () => {
    const files = walkTsFiles(SRC_ROOT);
    const allRealKeys = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      for (const key of extractRealKeysFromFile(source)) allRealKeys.add(key);
    }
    const stale = Object.keys(DELIBERATELY_NOT_RESET).filter(k => !allRealKeys.has(k) && !allRealKeys.has(`${MOCK_PREFIX}${k}`));
    expect(stale).toEqual([]);
  });
});
