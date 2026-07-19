#!/usr/bin/env node
/**
 * execute-renames.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Executes a confirmed batch of file/folder renames: moves each file/folder
 * to its new location, then rewrites every import statement anywhere in
 * src/ that pointed at the old path so it points at the new one instead.
 *
 * SAFETY: defaults to DRY RUN — prints exactly what it would do, changes
 * NOTHING, unless you pass --execute. Always run without --execute first,
 * review the output, THEN run with --execute.
 *
 * This only handles pure file/folder MOVES (path changes). It does NOT
 * rename classes, functions, or exported symbols — those need individual,
 * reviewed str_replace edits, not a blanket script (too risky to automate
 * safely — could touch unrelated identifiers with the same name).
 *
 * Usage:
 *   node execute-renames.cjs           (dry run — shows the plan only)
 *   node execute-renames.cjs --execute (actually moves files + rewrites imports)
 *
 * Run from the project root (same folder as tsconfig.json).
 * ALWAYS run `npx tsc --noEmit -p .` immediately after --execute to verify.
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const EXECUTE = process.argv.includes('--execute');

// ── The confirmed rename batch — edit this list to add/remove renames ─────
// Each entry: { from: 'relative/path/from/src', to: 'relative/path/from/src' }
// Folder moves: list every file inside individually (safer than trying to
// detect folder vs file automatically).
const RENAMES = [
  {
    from: 'services/aiIntegration/GeminiAIIntegrationService.ts',
    to:   'services/aiIntegration/PathScribeAIService.ts',
    note: 'File rename only — class name GeminiAIIntegrationService and its PathScribeAIService alias both left untouched.',
  },
  {
    from: 'services/voicemacro/mockVoiceService.ts',
    to:   'services/voicemacro/mockVoiceMacroService.ts',
    note: 'File rename only — class MockVoiceMacroService already correctly named.',
  },
  {
    from: 'services/cases/caseRoutingService.ts',
    to:   'services/cases/casePoolAssignmentService.ts',
    note: 'File rename only — disambiguates from CaseRouter.ts (different concern: pool/subspecialty assignment, not LIS-vs-Orchestration data source routing).',
  },
  {
    from: 'services/cases/firestoreCaseService.ts',
    to:   'services/cases/FirestoreCaseService.ts',
    note: 'Casing fix — matches PRODUCTION_MIGRATION.md\'s documented filename. Real bug: would fail on case-sensitive (Linux) deploys as written.',
  },
  {
    from: 'services/templates/ISynopticTemplateSuggestionService.ts',
    to:   'services/templateSuggestions/ISynopticTemplateSuggestionService.ts',
    note: 'Folder split 1/4 — templates/ now holds only library management (templateService.ts).',
  },
  {
    from: 'services/templates/ITemplateSuggestionSignalService.ts',
    to:   'services/templateSuggestions/ITemplateSuggestionSignalService.ts',
    note: 'Folder split 2/4.',
  },
  {
    from: 'services/templates/mockTemplateSuggestionSignalService.ts',
    to:   'services/templateSuggestions/mockTemplateSuggestionSignalService.ts',
    note: 'Folder split 3/4.',
  },
  {
    from: 'services/templates/synopticTemplateSuggestionService.ts',
    to:   'services/templateSuggestions/synopticTemplateSuggestionService.ts',
    note: 'Folder split 4/4.',
  },
];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const RESOLVABLE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json'];

function readTsconfigPaths() {
  const tsconfigPath = path.join(PROJECT_ROOT, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) return {};
  const raw = fs.readFileSync(tsconfigPath, 'utf8').replace(/^\s*\/\/.*$/gm, '');
  try { return JSON.parse(raw).compilerOptions?.paths || {}; } catch { return {}; }
}
function buildAliasMap(tsPaths) {
  const aliases = [];
  for (const [key, targets] of Object.entries(tsPaths)) {
    if (!targets || targets.length === 0) continue;
    aliases.push({ keyPrefix: key.replace(/\*$/, ''), targetPrefix: targets[0].replace(/^\.\//, '').replace(/\*$/, '') });
  }
  aliases.sort((a, b) => b.keyPrefix.length - a.keyPrefix.length);
  return aliases;
}
function walkDir(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(fullPath, fileList);
    else fileList.push(fullPath);
  }
  return fileList;
}

function extractImportLines(content) {
  // Returns [{ fullLine, specifier, index }] for every import/export-from/
  // dynamic-import/require line found.
  const results = [];
  const patterns = [
    /((?:import|export)(?:[^'"]*?)from\s+['"])([^'"]+)(['"])/g,
    /(import\s+['"])([^'"]+)(['"])/g,
    /(import\(\s*['"])([^'"]+)(['"]\s*\))/g,
    /(require\(\s*['"])([^'"]+)(['"]\s*\))/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) {
      results.push({ prefix: m[1], specifier: m[2], suffix: m[3], fullMatch: m[0], index: m.index });
    }
  }
  return results;
}

function resolveSpecifier(specifier, fromFile, aliases) {
  let candidatePath = null;
  if (specifier.startsWith('.')) {
    candidatePath = path.resolve(path.dirname(fromFile), specifier);
  } else {
    for (const { keyPrefix, targetPrefix } of aliases) {
      if (specifier.startsWith(keyPrefix)) {
        candidatePath = path.join(PROJECT_ROOT, targetPrefix, specifier.slice(keyPrefix.length));
        break;
      }
    }
  }
  if (!candidatePath) return null;
  const attempts = [candidatePath, ...RESOLVABLE_EXTENSIONS.map(ext => candidatePath + ext)];
  for (const attempt of attempts) {
    if (fs.existsSync(attempt) && fs.statSync(attempt).isFile()) return path.normalize(attempt);
  }
  return null;
}

function stripExt(p) {
  return p.replace(/\.(ts|tsx|js|jsx)$/, '');
}

function main() {
  console.log(EXECUTE ? '=== EXECUTING RENAMES ===\n' : '=== DRY RUN (no files will be changed — pass --execute to apply) ===\n');

  const aliases = buildAliasMap(readTsconfigPaths());
  const allSrcFiles = walkDir(SRC_DIR).filter(f => CODE_EXTENSIONS.includes(path.extname(f)));

  // Build the rename map with absolute paths
  const renameMap = RENAMES.map(r => ({
    fromAbs: path.normalize(path.join(SRC_DIR, r.from)),
    toAbs: path.normalize(path.join(SRC_DIR, r.to)),
    from: r.from,
    to: r.to,
    note: r.note,
  }));

  // Verify every source file exists before doing anything
  let missing = false;
  for (const r of renameMap) {
    if (!fs.existsSync(r.fromAbs)) {
      console.log(`ERROR: source file not found, skipping this rename: ${r.from}`);
      missing = true;
    }
  }
  if (missing) console.log('');

  const validRenames = renameMap.filter(r => fs.existsSync(r.fromAbs));

  console.log(`Planned renames (${validRenames.length}):\n`);
  for (const r of validRenames) {
    console.log(`  ${r.from}`);
    console.log(`    -> ${r.to}`);
    console.log(`    (${r.note})`);
  }
  console.log('');

  // Find every importer of every renamed file, across ALL src files
  const importUpdates = []; // { file, oldContent, newContent, changes: [{old, new}] }

  for (const file of allSrcFiles) {
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const importLines = extractImportLines(content);
    let newContent = content;
    let fileChanges = [];

    // Process matches in reverse order so string indices stay valid as we edit
    for (const imp of importLines.slice().reverse()) {
      const resolved = resolveSpecifier(imp.specifier, file, aliases);
      if (!resolved) continue;
      const match = validRenames.find(r => stripExt(r.fromAbs) === stripExt(resolved));
      if (!match) continue;

      // Compute new specifier: preserve the style (relative vs alias) of the original
      let newSpecifier;
      if (imp.specifier.startsWith('.')) {
        const relDir = path.dirname(file);
        let rel = path.relative(relDir, stripExt(match.toAbs)).split(path.sep).join('/');
        if (!rel.startsWith('.')) rel = './' + rel;
        newSpecifier = rel;
      } else {
        // alias-based import — find which alias matched and rebuild
        const aliasHit = aliases.find(a => imp.specifier.startsWith(a.keyPrefix));
        if (aliasHit) {
          const toRelToTarget = path.relative(
            path.join(PROJECT_ROOT, aliasHit.targetPrefix),
            stripExt(match.toAbs)
          ).split(path.sep).join('/');
          newSpecifier = aliasHit.keyPrefix + toRelToTarget;
        } else {
          newSpecifier = imp.specifier; // fallback: leave unchanged (shouldn't happen)
        }
      }

      if (newSpecifier !== imp.specifier) {
        const before = newContent;
        const newFullMatch = imp.prefix + newSpecifier + imp.suffix;
        newContent = newContent.slice(0, imp.index) + newFullMatch + newContent.slice(imp.index + imp.fullMatch.length);
        fileChanges.push({ old: imp.specifier, new: newSpecifier });
      }
    }

    if (fileChanges.length > 0) {
      importUpdates.push({ file, oldContent: content, newContent, changes: fileChanges });
    }
  }

  console.log(`Import statements to update (${importUpdates.length} files affected):\n`);
  for (const u of importUpdates) {
    console.log(`  ${path.relative(PROJECT_ROOT, u.file)}`);
    for (const c of u.changes) {
      console.log(`    '${c.old}' -> '${c.new}'`);
    }
  }
  console.log('');

  if (!EXECUTE) {
    console.log('Dry run complete. Review the plan above. Re-run with --execute to apply.');
    return;
  }

  // ── Execute: move files first, then rewrite importers ──────────────────
  for (const r of validRenames) {
    fs.mkdirSync(path.dirname(r.toAbs), { recursive: true });
    fs.renameSync(r.fromAbs, r.toAbs);
    console.log(`Moved: ${r.from} -> ${r.to}`);
  }

  for (const u of importUpdates) {
    fs.writeFileSync(u.file, u.newContent, 'utf8');
    console.log(`Updated imports in: ${path.relative(PROJECT_ROOT, u.file)}`);
  }

  console.log('\nDone. Now run: npx tsc --noEmit -p .   to verify nothing broke.');
}

main();
