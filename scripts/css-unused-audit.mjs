#!/usr/bin/env node
// scripts/css-unused-audit.mjs: PS-520. Lists the classes in src/pathscribe.css that nothing in the
// app refers to, grouped by family (the first two parts of the name), so a dead family can be
// removed on its own, one batch at a time.
//
// A class counts as REFERENCED when its exact name appears as a token anywhere in src/**/*.{ts,tsx}
// (tests excluded), index.html, or e2e/ and public/ text files. A class counts as DYNAMIC when
// some source builds names from a literal prefix (`ps-foo-${x}`, 'ps-foo-' + x): every class that
// starts with that prefix is kept for hand checking, never listed as dead.
//
// Usage: node scripts/css-unused-audit.mjs [--json]
//        node scripts/css-unused-audit.mjs --remove=ps-team-,ps-osn-   (Batch 596)
//        node scripts/css-unused-audit.mjs --remove-all                 (Batch 597: every dead class)
// --remove deletes the dead classes whose names start with one of the prefixes: any selector that
// contains a dead class (it can never match), then a rule left with no selector, then empty
// @media / @supports blocks, then comments that headed only removed rules. It never touches a class that is referenced or built from a prefix.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSS = join(ROOT, 'src', 'pathscribe.css');

function walk(dir, ok, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ok, out);
    else if (ok(e.name)) out.push(p);
  }
  return out;
}
const isSource = n => /\.(tsx?|jsx?|html|mdx)$/.test(n) && !/\.test\.(tsx?|jsx?)$/.test(n);

const css = readFileSync(CSS, 'utf8');
const root = postcss.parse(css);
/** class -> first line it appears on */
const defined = new Map();
root.walkRules(rule => {
  for (const m of rule.selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    if (!defined.has(m[1])) defined.set(m[1], rule.source?.start?.line ?? 0);
  }
});

const files = [
  ...walk(join(ROOT, 'src'), isSource),
  ...walk(join(ROOT, 'e2e'), n => /\.(ts|tsx)$/.test(n)),
  join(ROOT, 'index.html'),
].filter(existsSync);
const tokens = new Set();
const prefixes = new Set();
const suffixes = new Set();
for (const f of files) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/[A-Za-z_][\w-]*/g)) tokens.add(m[0]);
  // a literal prefix that is followed by a template hole or a string concatenation
  for (const m of text.matchAll(/([A-Za-z_][\w-]*-)(?:\$\{|['"`]\s*\+)/g)) prefixes.add(m[1]);
  for (const m of text.matchAll(/['"`]([A-Za-z_][\w-]*-)['"`]\s*\+/g)) prefixes.add(m[1]);
  // a literal suffix after a template hole or a concatenation (`${base}--active`, base + '--active')
  for (const m of text.matchAll(/\}((?:--|__|-)[A-Za-z][\w-]*)/g)) suffixes.add(m[1]);
  for (const m of text.matchAll(/\+\s*['"`]((?:--|__|-)[A-Za-z][\w-]*)['"`]/g)) suffixes.add(m[1]);
}

/** Classes that a library puts on its own elements (react-toastify, TipTap / ProseMirror, recharts): the app never names them. */
const LIBRARY_CLASS = /^(Toastify|ProseMirror|recharts|tiptap|is-editor-empty$|is-empty$|selectedCell$|tableWrapper$|column-resize|resize-cursor)/;
const library = [];
const dead = [];
const dynamic = [];
for (const [cls, line] of defined) {
  if (tokens.has(cls)) continue;
  if (LIBRARY_CLASS.test(cls)) { library.push({ cls, line }); continue; }
  if ([...prefixes].some(p => cls.startsWith(p)) || [...suffixes].some(x => cls.endsWith(x))) { dynamic.push({ cls, line }); continue; }
  dead.push({ cls, line });
}
const family = c => c.split('-').slice(0, 2).join('-');
const group = list => {
  const g = new Map();
  for (const x of list) { const k = family(x.cls); if (!g.has(k)) g.set(k, []); g.get(k).push(x); }
  return [...g.entries()].sort((a, b) => b[1].length - a[1].length);
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ defined: defined.size, dead: dead.length, dynamic: dynamic.length, families: group(dead).map(([k, v]) => ({ family: k, count: v.length, classes: v.map(x => x.cls) })), dynamicFamilies: group(dynamic).map(([k, v]) => ({ family: k, count: v.length })) }, null, 1));
} else {
  console.log(`classes defined: ${defined.size}\nunreferenced: ${dead.length}\nunreferenced but built from a prefix or suffix (check by hand): ${dynamic.length}\napplied by a library (kept): ${library.length}\n`);
  console.log('Unreferenced, by family:');
  for (const [k, v] of group(dead)) console.log(`  ${String(v.length).padStart(4)}  ${k}  (first at line ${Math.min(...v.map(x => x.line))})`);
  console.log('\nBuilt from a prefix, by family:');
  for (const [k, v] of group(dynamic)) console.log(`  ${String(v.length).padStart(4)}  ${k}`);
}


// ── --remove=prefix,prefix ──────────────────────────────────────────────────
const removeArg = process.argv.find(a => a.startsWith('--remove=')) ?? (process.argv.includes('--remove-all') ? '--remove=' : null);
if (removeArg) {
  const prefixes2 = removeArg.slice('--remove='.length).split(',');   // '' removes every dead class
  const deadSet = new Set(dead.map(d => d.cls).filter(c => prefixes2.some(p => c.startsWith(p))));
  let rulesRemoved = 0, selectorsRemoved = 0;
  const headingCandidates = new Set();
  const tree = postcss.parse(css);
  tree.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    const keep = rule.selectors.filter(sel => ![...sel.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].some(m => deadSet.has(m[1])));
    if (keep.length === rule.selectors.length) return;
    selectorsRemoved += rule.selectors.length - keep.length;
    if (keep.length === 0) {
      // a comment on its own lines directly above the rule is its heading; a comment on the line a live rule ends on is that rule's note
      for (let p = rule.prev(); p && p.type === 'comment'; p = p.prev()) {
        const before = p.prev();
        if (before && before.type !== 'comment' && before.source?.end?.line === p.source?.start?.line) break;
        headingCandidates.add(p);
      }
      rule.remove(); rulesRemoved++;
    } else rule.selectors = keep;
  });
  tree.walkAtRules(at => { if (/^(media|supports)$/i.test(at.name) && at.nodes && at.nodes.every(n => n.type === 'comment')) at.remove(); });
  // comments that headed a removed rule and now head nothing: followed by another comment, or by the end of the block
  let commentsRemoved = 0;
  for (const c of headingCandidates) {
    if (!c.parent) continue;
    const next = c.next();
    if (!next || next.type === 'comment') { c.remove(); commentsRemoved++; }
  }
  // a run of candidates can be nested ('a' then 'b' then nothing): repeat until stable
  for (let again = true; again; ) {
    again = false;
    for (const c of headingCandidates) {
      if (!c.parent) continue;
      const next = c.next();
      if (!next || next.type === 'comment') { c.remove(); commentsRemoved++; again = true; }
    }
  }
  // @keyframes that nothing uses any more (no animation declaration and no name in src/)
  const kfDecl = [];
  tree.walkAtRules(at => { if (/keyframes$/i.test(at.name)) kfDecl.push(at); });
  const animated = new Set();
  tree.walkDecls(d => { if (/^(animation|-webkit-animation)/.test(d.prop)) for (const at of kfDecl) if (new RegExp(`(^|[\\s,])${at.params.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s,;]|$)`).test(d.value)) animated.add(at.params); });
  let keyframesRemoved = 0;
  for (const at of kfDecl) if (!animated.has(at.params) && !tokens.has(at.params)) { at.remove(); keyframesRemoved++; }
  console.log(`unused @keyframes removed: ${keyframesRemoved}`);
  writeFileSync(CSS, tree.toString());
  console.log(`removed ${deadSet.size} classes: ${rulesRemoved} rules, ${selectorsRemoved} selectors`);
  console.log(`comments that headed only removed rules: ${commentsRemoved}`);
}
