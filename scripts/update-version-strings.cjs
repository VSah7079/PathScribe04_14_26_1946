/**
 * update-version-strings.cjs
 *
 * Replaces hardcoded PathScribe version strings with the __APP_VERSION__
 * build-time define.
 *
 * Three call sites still hardcode v0.9.0, and they need different syntax
 * depending on context, which is why this uses an explicit rule table rather
 * than a blind find/replace:
 *
 *   - inside a template literal  ->  v${__APP_VERSION__}
 *   - inside JSX text            ->  v{__APP_VERSION__}
 *
 * A global replace would produce broken syntax in one context or the other.
 *
 * Runs in preview mode by default. Nothing is written without --apply.
 *
 *   node scripts/update-version-strings.cjs             # preview
 *   node scripts/update-version-strings.cjs --apply     # write changes
 *   node scripts/update-version-strings.cjs --apply --no-backup
 *
 * .cjs rather than .js because package.json declares "type": "module".
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const NO_BACKUP = process.argv.includes('--no-backup');

/* ---------- tiny console helpers ---------- */
const C = {
  reset: '\x1b[0m', dim: '\x1b[90m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', white: '\x1b[37m',
};
const say = (msg = '', colour = '') => console.log(colour ? colour + msg + C.reset : msg);

/* ---------- rule table ----------
   Match strings are kept short on purpose: they stop short of em dashes and
   other non-ASCII characters, which are a common reason a string that is
   plainly visible on screen refuses to match.                              */
const RULES = [
  {
    file: 'src/components/ValidationStudies/ValidationStudiesSection.tsx',
    find: '<td>v0.9.0</td>',
    replace: '<td>v${__APP_VERSION__}</td>',
    note: 'Validation report — "PathScribe Version" row (template literal)',
  },
  {
    file: 'src/components/NavBar/NavBar.tsx',
    find: 'PathScribe AI v0.9.0',
    replace: 'PathScribe AI v${__APP_VERSION__}',
    note: 'Support report title (template literal)',
  },
  {
    file: 'src/components/NavBar/NavBar.tsx',
    find: '<span className="fm-active-badge">v0.9.0</span>',
    replace: '<span className="fm-active-badge">v{__APP_VERSION__}</span>',
    note: 'Nav version badge (JSX text — braces, no dollar sign)',
  },
];

/* ---------- preflight ---------- */
const pkgPath = path.join(ROOT, 'package.json');
if (!fs.existsSync(pkgPath)) {
  say('package.json not found. Run this from the project root.', C.red);
  process.exit(1);
}
const pkgVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;

say('');
say('PathScribe — version string migration', C.cyan);
say(`package.json version: ${pkgVersion}`);
say(`Mode: ${APPLY ? 'APPLY' : 'PREVIEW (pass --apply to write)'}`,
    APPLY ? C.yellow : C.green);
say('');

/* ---------- apply rules ---------- */
const countOccurrences = (haystack, needle) => haystack.split(needle).length - 1;

let applied = 0;
let skipped = 0;
const backedUp = new Set();

for (const rule of RULES) {
  say(rule.note, C.white);
  say(`  · ${rule.file}`, C.dim);

  const full = path.join(ROOT, rule.file);
  if (!fs.existsSync(full)) {
    say('  x File not found — skipped', C.red);
    skipped++;
    say('');
    continue;
  }

  // Read as a whole so existing line endings survive untouched.
  const content = fs.readFileSync(full, 'utf8');
  const hits = countOccurrences(content, rule.find);

  if (hits === 0) {
    say(content.includes(rule.replace)
      ? '  = Already migrated — nothing to do'
      : '  x Search string not found — left untouched',
      content.includes(rule.replace) ? C.dim : C.red);
    skipped++;
    say('');
    continue;
  }

  if (hits > 1) {
    say(`  ! Found ${hits} matches, expected 1 — left untouched for manual review`, C.red);
    skipped++;
    say('');
    continue;
  }

  say(`  - was: ${rule.find}`, C.dim);
  say(`  + now: ${rule.replace}`, C.green);

  if (APPLY) {
    if (!NO_BACKUP && !backedUp.has(full)) {
      fs.copyFileSync(full, `${full}.bak`);
      say(`  · backup: ${path.basename(full)}.bak`, C.dim);
      backedUp.add(full);
    }
    // Plain string replace: no regex, so metacharacters in the match are safe.
    fs.writeFileSync(full, content.replace(rule.find, rule.replace), 'utf8');
  }

  applied++;
  say('');
}

/* ---------- report ---------- */
say('-'.repeat(60));
say(`Replacements ${APPLY ? 'applied' : 'pending'}: ${applied}   Skipped: ${skipped}`);

/* ---------- scan for anything still hardcoded ---------- */
const walk = (dir, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) walk(p, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
};

const remaining = [];
for (const file of walk(path.join(ROOT, 'src'))) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
    if (/v\d+\.\d+\.\d+/.test(line) && !line.includes('__APP_VERSION__')) {
      remaining.push({ file: path.relative(ROOT, file), line: i + 1, text: line.trim() });
    }
  });
}

say('');
if (remaining.length) {
  say('Remaining hardcoded version strings in src/:', C.yellow);
  for (const r of remaining) {
    say(`  ${r.file}:${r.line}`);
    say(`      ${r.text.slice(0, 120)}`, C.dim);
  }
  say('');
  say('  Review by hand — comments and test fixtures are fine as they are.', C.dim);
} else {
  say('No remaining hardcoded version strings in src/.', C.green);
}

if (APPLY) {
  say('');
  say('Done. These are source files, so HMR will reload — no restart needed.', C.cyan);
  if (!NO_BACKUP) say('Backups written as *.bak next to each modified file.', C.dim);
}
say('');
