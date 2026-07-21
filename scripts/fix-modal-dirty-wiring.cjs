#!/usr/bin/env node
/**
 * fix-modal-dirty-wiring.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Applies the 4 confirmed edits to SynopticReportPage.tsx needed to wire
 * FlagManagerModal/CaseTeamModal's new onDirtyChange reporting into the
 * page, and remove the now-incorrect markDirty/didChangeFlags logic that
 * belonged to the old immediate-persist architecture.
 *
 * SAFETY: dry run by default. Each edit is matched against a UNIQUE,
 * multi-line anchor of exact text pulled directly from your live file
 * (via Select-String) -- if any anchor isn't found exactly as expected,
 * that edit is skipped and reported, nothing is guessed at.
 *
 * Usage:
 *   node fix-modal-dirty-wiring.cjs            (dry run)
 *   node fix-modal-dirty-wiring.cjs --execute  (apply)
 *
 * Run from the project root.
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'src/pages/SynopticReportPage/SynopticReportPage.tsx');
const EXECUTE = process.argv.includes('--execute');

const EDITS = [
  {
    name: 'Add setSectionDirty helper after markDirty/clearDirty',
    find: `const clearDirty = React.useCallback(() => {
    setHasUnsavedData(false);
    setDirtySections(new Set());
  }, [setHasUnsavedData]);`,
    replace: `const clearDirty = React.useCallback(() => {
    setHasUnsavedData(false);
    setDirtySections(new Set());
  }, [setHasUnsavedData]);

  // Lets FlagManagerModal/CaseTeamModal (and similar action-modals)
  // report their own local draft's dirty state into the SAME
  // dirtySections mechanism content fields already use -- critical that
  // this ADDS/REMOVES just its own named entry and recomputes
  // hasUnsavedData from the total remaining set, rather than blindly
  // setting true/false, otherwise closing a clean modal could wrongly
  // clear a warning that's still legitimately active for an unrelated
  // dirty content field.
  const setSectionDirty = React.useCallback((section: string, dirty: boolean) => {
    setDirtySections(prev => {
      const next = new Set(prev);
      dirty ? next.add(section) : next.delete(section);
      setHasUnsavedData(next.size > 0);
      return next;
    });
  }, [setHasUnsavedData]);`,
  },
  {
    name: 'Add onDirtyChange to FlagManagerModal + simplify onClose condition',
    find: `onApplyFlags={async (...args: Parameters<typeof onApplyFlags>) => { await onApplyFlags(...args); }}
          onRemoveFlag={async (...args: Parameters<typeof onRemoveFlag>) => { await onRemoveFlag(...args); }}
          onClose={() => {`,
    replace: `onApplyFlags={async (...args: Parameters<typeof onApplyFlags>) => { await onApplyFlags(...args); }}
          onRemoveFlag={async (...args: Parameters<typeof onRemoveFlag>) => { await onRemoveFlag(...args); }}
          onDirtyChange={(dirty: boolean) => setSectionDirty('Flags', dirty)}
          onClose={() => {`,
  },
  {
    name: 'Remove obsolete didChangeFlags gate',
    find: `if (didChangeFlags && flagCaseData && caseData) {`,
    replace: `if (flagCaseData && caseData) {`,
  },
  {
    name: 'Remove incorrect markDirty from CaseTeamModal onUpdated + add onDirtyChange',
    find: `onClose={() => setShowTeamModal(false)}
          onUpdated={(updated) => { setCaseData(updated); markDirty('Case data'); }}
          onDelegate={() => { setShowTeamModal(false); setDelegateReturnTo('team'); setShowDelegateModal(true); }}`,
    replace: `onClose={() => setShowTeamModal(false)}
          onUpdated={(updated) => { setCaseData(updated); }}
          onDirtyChange={(dirty: boolean) => setSectionDirty('Team', dirty)}
          onDelegate={() => { setShowTeamModal(false); setDelegateReturnTo('team'); setShowDelegateModal(true); }}`,
  },
];

function main() {
  console.log(EXECUTE ? '=== EXECUTING modal-dirty wiring fixes ===\n' : '=== DRY RUN (no files changed — pass --execute to apply) ===\n');

  if (!fs.existsSync(FILE)) {
    console.log(`ERROR: file not found: ${FILE}`);
    return;
  }

  let rawContent = fs.readFileSync(FILE, 'utf8');
  const usesCRLF = rawContent.includes('\r\n');
  // Normalize to LF for matching -- the find/replace patterns above are
  // written with plain \n. This project's files are CRLF throughout
  // (confirmed by every git commit warning tonight), which silently
  // breaks any multi-line exact-match find/replace otherwise -- single-
  // line matches are unaffected, which is exactly the pattern seen in
  // the first run of this script (1 of 3 succeeded, the single-line one).
  let content = rawContent.replace(/\r\n/g, '\n');
  let applied = 0, skipped = 0;

  for (const edit of EDITS) {
    const count = content.split(edit.find).length - 1;
    if (count === 0) {
      console.log(`SKIPPED (anchor text not found — file may differ from expected): ${edit.name}`);
      skipped++;
      continue;
    }
    if (count > 1) {
      console.log(`SKIPPED (anchor text found ${count} times, not unique — needs manual review): ${edit.name}`);
      skipped++;
      continue;
    }
    console.log(`${EXECUTE ? 'APPLIED' : 'WOULD APPLY'}: ${edit.name}`);
    if (EXECUTE) content = content.split(edit.find).join(edit.replace);
    applied++;
  }

  if (EXECUTE && applied > 0) {
    const output = usesCRLF ? content.replace(/\n/g, '\r\n') : content;
    fs.writeFileSync(FILE, output, 'utf8');
  }

  console.log(`\n${applied} edit(s) ${EXECUTE ? 'applied' : 'ready'}, ${skipped} skipped.`);
  if (!EXECUTE) {
    console.log('Dry run complete. Review above, then re-run with --execute to apply.');
  } else {
    console.log('Done. Now run: npx tsc --noEmit -p .');
  }
}

main();
