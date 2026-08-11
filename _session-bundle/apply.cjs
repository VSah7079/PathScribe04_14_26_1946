/**
 * apply.cjs — PathScribe session bundle installer
 *
 * Applies everything from this bundle to the project: copies new files,
 * appends CSS blocks, and patches the shared files that other work also
 * touches.
 *
 * Runs in preview mode by default. Nothing is written without --apply.
 *
 *   node _session-bundle/apply.cjs               # preview
 *   node _session-bundle/apply.cjs --apply       # write, with .bak backups
 *   node _session-bundle/apply.cjs --apply --no-backup
 *
 * Design rules, because hand-application is where things went wrong before:
 *
 * - Every operation is IDEMPOTENT. Re-running reports "already applied" and
 *   writes nothing. Safe to run twice, or after a partial manual attempt.
 *
 * - Every patch VERIFIES before writing. The search string must match exactly
 *   once. Zero matches with the replacement already present means done; zero
 *   matches without it means the file has diverged and the patch is SKIPPED
 *   and reported, never guessed at.
 *
 * - Nothing is silently overwritten. Existing files are backed up to .bak
 *   before the first change.
 *
 * - Exit code is non-zero if anything was skipped, so a partial apply cannot
 *   be mistaken for a clean one.
 *
 * .cjs rather than .js because package.json declares "type": "module", and
 * Node rather than PowerShell because the execution policy blocks .ps1 here.
 *
 * Copyright (c) 2026 ForMedrixAI LLC. All rights reserved.
 */

const fs = require('node:fs');
const path = require('node:path');

const BUNDLE = __dirname;
const ROOT = process.cwd();
const APPLY = process.argv.includes('--apply');
const NO_BACKUP = process.argv.includes('--no-backup');

const C = {
  r: '\x1b[0m', dim: '\x1b[90m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', bold: '\x1b[1m',
};
const say = (m = '', c = '') => console.log(c ? c + m + C.r : m);

let applied = 0, already = 0, skipped = 0;
const backedUp = new Set();

/* ------------------------------------------------------------- helpers */

function backup(abs) {
  if (NO_BACKUP || backedUp.has(abs) || !fs.existsSync(abs)) return;
  fs.copyFileSync(abs, `${abs}.bak`);
  backedUp.add(abs);
  say(`      backup: ${path.basename(abs)}.bak`, C.dim);
}

function readIfExists(abs) {
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

/* -------------------------------------------------- 1. new-file copies */

// Files nothing else in the codebase writes. Safe to place wholesale.
const COPIES = [
  ['01-new-files/src/services/research/IResearchFeedService.ts',        'src/services/research/IResearchFeedService.ts'],
  ['01-new-files/src/services/research/pubmedResearchFeedService.ts',   'src/services/research/pubmedResearchFeedService.ts'],
  ['01-new-files/src/services/research/mockResearchFeedService.ts',     'src/services/research/mockResearchFeedService.ts'],
  ['01-new-files/src/services/research/IResearchFeedConfigService.ts',  'src/services/research/IResearchFeedConfigService.ts'],
  ['01-new-files/src/services/research/mockResearchFeedConfigService.ts','src/services/research/mockResearchFeedConfigService.ts'],
  ['01-new-files/src/services/research/README.md',                      'src/services/research/README.md'],
  ['01-new-files/src/components/Common/PubMedTicker.tsx',               'src/components/Common/PubMedTicker.tsx'],
  ['01-new-files/src/components/Config/System/ResearchFeedSection.tsx', 'src/components/Config/System/ResearchFeedSection.tsx'],
  ['01-new-files/src/hooks/useLatestResearch.ts',                       'src/hooks/useLatestResearch.ts'],
  ['01-new-files/public/formedrix-logo-capM-dark.png',                  'public/formedrix-logo-capM-dark.png'],
  ['01-new-files/public/favicon.svg',                                   'public/favicon.svg'],
  ['01-new-files/public/favicon.ico',                                   'public/favicon.ico'],
  ['01-new-files/public/pathscribe-icon-180.png',                       'public/pathscribe-icon-180.png'],
  ['01-new-files/scripts/update-version-strings.cjs',                   'scripts/update-version-strings.cjs'],
];

function runCopies() {
  say('\n1. NEW FILES', C.bold);
  for (const [from, to] of COPIES) {
    const src = path.join(BUNDLE, from);
    const dst = path.join(ROOT, to);

    if (!fs.existsSync(src)) {
      say(`  x ${to} — missing from bundle`, C.red); skipped++; continue;
    }

    const incoming = fs.readFileSync(src);
    const current = fs.existsSync(dst) ? fs.readFileSync(dst) : null;

    if (current && current.equals(incoming)) {
      say(`  = ${to}`, C.dim); already++; continue;
    }

    say(`  ${current ? '~' : '+'} ${to}${current ? '  (overwrites existing)' : ''}`,
        current ? C.yellow : C.green);

    if (APPLY) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      backup(dst);
      fs.copyFileSync(src, dst);
    }
    applied++;
  }
}

/* -------------------------------------------------- 2. CSS block appends */

// Each block is independently appendable and detected by a unique marker, so
// a block already present is left alone rather than duplicated. Appending is
// correct for all three: every rule here deliberately overrides an earlier
// same-specificity rule and must win on source order.
const CSS_BLOCKS = [
  ['02-css-blocks-to-append/01-login-block.css',
   'Login — brand, hierarchy and primary action'],
  ['02-css-blocks-to-append/02-litfeed-ticker-block.css',
   'Dashboard — PubMed literature feed ticker'],
  ['02-css-blocks-to-append/03-research-feed-config-block.css',
   'Config → System → Research Feed'],
];

function runCssBlocks() {
  say('\n2. CSS BLOCKS  ->  src/pathscribe.css', C.bold);
  const dst = path.join(ROOT, 'src', 'pathscribe.css');
  let css = readIfExists(dst);

  if (css === null) {
    say('  x src/pathscribe.css not found', C.red);
    skipped += CSS_BLOCKS.length;
    return;
  }

  let changed = false;
  for (const [from, marker] of CSS_BLOCKS) {
    const src = path.join(BUNDLE, from);
    if (!fs.existsSync(src)) { say(`  x ${from} — missing from bundle`, C.red); skipped++; continue; }

    if (css.includes(marker)) {
      say(`  = ${path.basename(from)}`, C.dim); already++; continue;
    }

    const block = fs.readFileSync(src, 'utf8').trim();
    say(`  + ${path.basename(from)}  (${block.split('\n').length} lines)`, C.green);
    css = `${css.replace(/\s+$/, '')}\n\n${block}\n`;
    changed = true;
    applied++;
  }

  if (APPLY && changed) {
    backup(dst);
    fs.writeFileSync(dst, css, 'utf8');
    const ok = (css.match(/\{/g) || []).length === (css.match(/\}/g) || []).length;
    say(`      braces balanced: ${ok}`, ok ? C.dim : C.red);
    if (!ok) skipped++;
  }
}

/* ------------------------------------------------------ 3. shared patches */

// Files other work also edits. Patched surgically rather than replaced, so a
// concurrent change elsewhere in the same file survives.
const PATCHES = [
  {
    file: 'index.html',
    note: 'favicon links -> PathScribe hexagon',
    marker: 'href="/favicon.svg"',
    find: '<link rel="icon" type="image/svg+xml" href="/tab_transparent_fav.svg" />',
    replace:
      '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n'
      + '    <link rel="icon" href="/favicon.ico" sizes="any" />\n'
      + '    <link rel="apple-touch-icon" href="/pathscribe-icon-180.png" />\n'
      + '    <meta name="theme-color" content="#0b1120" />',
  },
  {
    file: 'index.html',
    note: 'tab title — product first, so it survives truncation',
    marker: '<title>PathScribe</title>',
    find: '<title>ForMedrixAI - PathScribe</title>',
    replace: '<title>PathScribe</title>',
  },
  {
    file: 'src/pages/Home.tsx',
    note: 'PubMedTicker import',
    marker: "import PubMedTicker from",
    find: "import ResourcesModal from './WorklistPage/ResourcesModal';",
    replace:
      "import ResourcesModal from './WorklistPage/ResourcesModal';\n"
      + "import PubMedTicker from '@/components/Common/PubMedTicker';",
  },
  {
    file: 'src/pages/Home.tsx',
    note: 'replace static CAP copy with the live feed',
    marker: '<PubMedTicker />',
    find:
      "<p style={{ fontSize: 'clamp(14px, 2vw, 18px)', color: 'var(--text-secondary)', marginTop: '12px' }}>\n"
      + '              The AI models are updated and synchronized with the latest CAP protocols.\n'
      + '            </p>',
    replace: '<PubMedTicker />',
  },
  {
    file: 'src/components/Config/System/index.tsx',
    note: 'ResearchFeedSection import',
    marker: "import ResearchFeedSection",
    find: "import ExternalResourcesSection  from './ExternalResourcesSection';",
    replace:
      "import ExternalResourcesSection  from './ExternalResourcesSection';\n"
      + "import ResearchFeedSection      from './ResearchFeedSection';",
  },
  {
    file: 'src/components/Config/System/index.tsx',
    note: "'research_feed' in the SystemSection union",
    marker: "| 'research_feed'",
    find: "  | 'external_resources'\n",
    replace: "  | 'external_resources'\n  | 'research_feed'\n",
  },
  {
    file: 'src/components/Config/System/index.tsx',
    note: 'sidebar entry, Independent group',
    marker: "id: 'research_feed'",
    find: "  { id: 'external_resources',  emoji: '🌐', label: 'External Resources'    , group: 'Independent' },",
    replace:
      "  { id: 'external_resources',  emoji: '🌐', label: 'External Resources'    , group: 'Independent' },\n"
      + "  { id: 'research_feed',       emoji: '📰', label: 'Research Feed'         , group: 'Independent' },",
  },
  {
    file: 'src/components/Config/System/index.tsx',
    note: 'render case',
    marker: "case 'research_feed':",
    find: "      case 'external_resources':  return <ExternalResourcesSection />;",
    replace:
      "      case 'external_resources':  return <ExternalResourcesSection />;\n"
      + '      case \'research_feed\':       return <ResearchFeedSection />;',
  },
  {
    file: 'src/hooks/useCompanionWindow.ts',
    note: 'closeOnUnmount option (defaults true — EMR behaviour unchanged)',
    marker: 'closeOnUnmount?: boolean;',
    find: '  preferredWidth?: number;\n  preferredHeight?: number;\n}',
    replace:
      '  preferredWidth?: number;\n  preferredHeight?: number;\n'
      + '  /** Whether to close the companion window when the calling component\n'
      + '   *  unmounts. Defaults to true, which is right for the EMR Sidecar: a\n'
      + '   *  patient chart must not outlive the case view that opened it.\n'
      + '   *  Set false for reference material with no patient context (e.g. the\n'
      + '   *  PubMed literature window) -- closing a paper out from under someone\n'
      + '   *  because they navigated to another page would be hostile. */\n'
      + '  closeOnUnmount?: boolean;\n}',
  },
  {
    file: 'src/hooks/useCompanionWindow.ts',
    note: 'closeOnUnmount ref',
    marker: 'closeOnUnmountRef',
    find: '  const [isWindowOpen, setIsWindowOpen] = useState(false);',
    replace:
      '  const [isWindowOpen, setIsWindowOpen] = useState(false);\n'
      + '  // Held in a ref so the unmount cleanup below can read the current value\n'
      + '  // without taking options into its dependency array (which would make it\n'
      + '  // re-run, and close the window, on every options-object identity change).\n'
      + '  const closeOnUnmountRef = useRef(options.closeOnUnmount ?? true);\n'
      + '  closeOnUnmountRef.current = options.closeOnUnmount ?? true;',
  },
  {
    file: 'src/hooks/useCompanionWindow.ts',
    note: 'sever opener for cross-origin targets (reverse-tabnabbing)',
    marker: 'win.opener = null',
    find: '    windowRef.current = win;\n    setIsWindowOpen(true);',
    replace:
      "    // Sever the child's reference back to this session for external\n"
      + '    // targets. Without it, a cross-origin page can call\n'
      + "    // window.opener.location = '...' and redirect the authenticated\n"
      + '    // PathScribe tab -- the reverse-tabnabbing vector. Skipped for\n'
      + '    // same-origin companions (the EMR Sidecar), which are trusted and\n'
      + '    // may legitimately want to postMessage back.\n'
      + '    try {\n'
      + '      if (new URL(url, window.location.href).origin !== window.location.origin) {\n'
      + '        win.opener = null;\n'
      + '      }\n'
      + '    } catch { /* malformed URL or refused assignment -- non-fatal */ }\n\n'
      + '    windowRef.current = win;\n    setIsWindowOpen(true);',
  },
  {
    file: 'src/hooks/useCompanionWindow.ts',
    note: 'honour closeOnUnmount in the cleanup',
    marker: 'closeOnUnmountRef.current && windowRef.current',
    find:
      '  useEffect(() => {\n    return () => {\n'
      + '      if (windowRef.current && !windowRef.current.closed) windowRef.current.close();\n'
      + '      if (pollRef.current) clearInterval(pollRef.current);\n    };\n  }, []);',
    replace:
      '  useEffect(() => {\n    return () => {\n'
      + '      if (closeOnUnmountRef.current && windowRef.current && !windowRef.current.closed) {\n'
      + '        windowRef.current.close();\n      }\n'
      + '      if (pollRef.current) clearInterval(pollRef.current);\n    };\n  }, []);',
  },
];

function runPatches() {
  say('\n3. PATCHES  (surgical — concurrent edits elsewhere in these files survive)', C.bold);

  // Group by file so each is read and written once.
  const byFile = new Map();
  for (const p of PATCHES) {
    if (!byFile.has(p.file)) byFile.set(p.file, []);
    byFile.get(p.file).push(p);
  }

  for (const [rel, patches] of byFile) {
    const abs = path.join(ROOT, rel);
    say(`  ${rel}`, C.cyan);

    let content = readIfExists(abs);
    if (content === null) {
      say('    x file not found — all its patches skipped', C.red);
      skipped += patches.length;
      continue;
    }

    // Normalise for matching; the original ending is restored on write.
    const hadCRLF = content.includes('\r\n');
    let working = content.replace(/\r\n/g, '\n');
    let changed = false;

    for (const p of patches) {
      const find = p.find.replace(/\r\n/g, '\n');
      const replace = p.replace.replace(/\r\n/g, '\n');

      // Idempotency is checked against a distinct sentinel, NOT against the
      // replacement text. Most replacements re-emit their own anchor, so the
      // anchor still matches after a successful apply — testing for it would
      // re-run the edit on every invocation and duplicate the insertion.
      if (working.includes(p.marker)) {
        say(`    = ${p.note}`, C.dim); already++;
        continue;
      }

      const count = working.split(find).length - 1;
      if (count === 0) {
        say(`    x ${p.note} — anchor not found, SKIPPED`, C.red); skipped++;
        continue;
      }
      if (count > 1) {
        say(`    ! ${p.note} — ${count} matches, expected 1, SKIPPED`, C.red);
        skipped++;
        continue;
      }

      say(`    + ${p.note}`, C.green);
      working = working.replace(find, replace);
      changed = true;
      applied++;
    }

    if (APPLY && changed) {
      backup(abs);
      fs.writeFileSync(abs, hadCRLF ? working.replace(/\n/g, '\r\n') : working, 'utf8');
    }
  }
}

/* -------------------------------------------------------------- main */

if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
  say('package.json not found. Run this from the project root.', C.red);
  process.exit(1);
}

say('');
say('PathScribe — session bundle installer', C.cyan);
say(`project: ${ROOT}`);
say(`bundle:  ${BUNDLE}`);
say(`mode:    ${APPLY ? 'APPLY' : 'PREVIEW (pass --apply to write)'}`,
    APPLY ? C.yellow : C.green);

runCopies();
runCssBlocks();
runPatches();

say('\n' + '-'.repeat(64));
say(`${APPLY ? 'Applied' : 'Pending'}: ${applied}    Already up to date: ${already}    Skipped: ${skipped}`,
    skipped ? C.yellow : C.green);

if (skipped) {
  say('\nSkipped items need a look — usually the file diverged from what this', C.yellow);
  say('bundle expected. Reference copies of every patched file are in', C.yellow);
  say('03-patch-these-yourself/ so you can diff against them.', C.yellow);
}
if (APPLY && !NO_BACKUP && backedUp.size) {
  say(`\nBackups written: ${backedUp.size} file(s), each as <name>.bak`, C.dim);
  say('Clean up with:  Get-ChildItem -Recurse -Filter *.bak | Remove-Item', C.dim);
}
if (APPLY) {
  say('\nNext: npx tsc --noEmit -p .   then restart the dev server.', C.cyan);
}
say('');

process.exit(skipped ? 1 : 0);
