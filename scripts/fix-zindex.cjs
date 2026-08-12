#!/usr/bin/env node
/**
 * fix-zindex.cjs
 * ─────────────────────────────────────────────────────────────────────────
 * Applies a reviewed, evidence-based z-index remapping plan across
 * pathscribe.css and inline zIndex usage in src/**.tsx / .ts.
 *
 * SAFETY: defaults to DRY RUN — prints exactly what it would change,
 * touches nothing, unless you pass --execute.
 *
 * For each planned change, this VERIFIES the old value is still actually
 * present at (or near) the recorded line before touching anything — if
 * the file has changed since this plan was built, that entry is flagged
 * for manual review instead of blindly guessing.
 *
 * Usage:
 *   node fix-zindex.cjs            (dry run — shows the plan only)
 *   node fix-zindex.cjs --execute  (applies the changes)
 *
 * Run from the project root (same folder as tsconfig.json).
 * After --execute: run `npx tsc --noEmit -p .`, then VISUALLY verify key
 * screens in the running app — z-index bugs are invisible to the
 * TypeScript compiler, only your eyes can confirm this actually fixed
 * the stacking problem.
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = process.cwd();
const EXECUTE = process.argv.includes('--execute');

// file paths below are relative to PROJECT_ROOT (i.e. include 'src/')
const PLAN = [
  // ── Drawers ──────────────────────────────────────────────────────────
  ['src/pathscribe.css', 527, 2000, 1200, 'ps-drawer -> drawer tier'],
  ['src/pathscribe.css', 542, 1999, 1199, 'ps-drawer-backdrop -> just below drawer'],
  ['src/pathscribe.css', 1802, 30000, 1200, 'ps-notes-drawer -> drawer tier'],
  ['src/pathscribe.css', 1812, 29999, 1199, 'ps-notes-backdrop -> just below drawer'],
  ['src/pathscribe.css', 1169, 20000, 1200, 'ps-msg-drawer CSS default -> drawer tier'],
  ['src/components/AppShell/AppShell.tsx', 1232, 30000, 1200, 'AppShell msg drawer inline override -> matches CSS now'],
  ['src/components/AppShell/AppShell.tsx', 1229, 29998, 1199, 'AppShell drawer close-backdrop -> just below drawer'],
  ['src/components/InternalNotes/InternalNotesDrawer.tsx', 209, 3000, 1200, 'InternalNotesDrawer -> drawer tier'],
  ['src/components/InternalNotes/InternalNotesDrawer.tsx', 200, 2999, 1199, 'InternalNotesDrawer backdrop -> just below drawer'],

  // ── Standard modals ──────────────────────────────────────────────────
  ['src/pathscribe.css', 6208, 8000, 9000, 'ps-conf-backdrop -> standard modal tier'],
  ['src/pathscribe.css', 10581, 8000, 9000, 'ps-cmnt-overlay -> standard modal tier'],
  ['src/pathscribe.css', 6302, 9500, 9000, 'ps-rp-overlay -> standard modal tier'],
  ['src/pathscribe.css', 9346, 9999, 9000, 'ps-ms-overlay (1st) -> standard modal tier'],
  ['src/pathscribe.css', 9863, 9999, 9000, 'ps-ms-overlay (2nd, dup rule) -> standard modal tier'],
  ['src/pathscribe.css', 2212, 10000, 9000, 'fm-overlay CSS -> standard modal tier'],
  ['src/pathscribe.css', 7668, 10000, 9000, 'ps-modal-overlay -> standard modal tier'],
  ['src/components/Flags/FlagManagerModal.tsx', 120, 11000, 9000, 'fm-overlay inline override -> matches CSS now'],
  ['src/components/Flags/FlagManagerModal.tsx', 703, 32000, 9000, "FlagManagerModal's own ps-overlay override -> standard tier"],
  ['src/pathscribe.css', 4556, 31000, 9000, 'ps-user-search-overlay -> standard modal tier'],
  ['src/components/AppShell/AppShell.tsx', 650, 31000, 9000, 'AppShell user-search backdrop -> standard modal tier'],
  ['src/pathscribe.css', 10299, 35000, 9000, 'ps-casebar-modal-overlay -> standard modal tier'],
  ['src/pathscribe.css', 10511, 32000, 9000, 'ps-cannot-fin-overlay -> standard modal tier'],
  ['src/pathscribe.css', 10622, 25000, 9000, 'ps-specedit-overlay -> standard modal tier'],
  ['src/pathscribe.css', 10359, 20000, 9000, 'ps-seq-overlay -> standard modal tier'],
  ['src/pathscribe.css', 17968, 22000, 9000, 'ps-overlay--amendment -> standard modal tier'],
  ['src/pathscribe.css', 18205, 21000, 9000, 'ps-overlay--copilot-report -> standard modal tier'],
  ['src/pages/SynopticReportPage/modals/FinalizeSynopticModal.tsx', 23, 22000, 9000, '-> standard modal tier'],
  ['src/pages/SynopticReportPage/modals/CaseSignOutModal.tsx', 24, 22000, 9000, '-> standard modal tier'],
  ['src/components/PatientHistory/PatientHistoryModal.tsx', 47, 20000, 9000, '-> standard modal tier'],
  ['src/components/ClientDictionary/ClientEditorModal.tsx', 240, 10000, 9000, '-> standard modal tier'],
  ['src/components/Common/LookupModal.tsx', 55, 10000, 9000, '-> standard modal tier'],
  ['src/components/Common/ConfirmModal.tsx', 31, 30000, 9000, '-> standard modal tier'],
  ['src/components/TemplateRequest/TemplateRequestModal.tsx', 197, 30000, 9000, '-> standard modal tier'],
  ['src/pages/SynopticReportPage/modals/CaseTeamModal.tsx', 199, 30000, 9000, '-> standard modal tier'],
  ['src/components/Editor/PathScribeEditor.tsx', 508, 10000, 9000, '-> standard modal tier'],
  ['src/components/Voice/VoiceCommandOverlay.tsx', 59, 10000, 9000, '-> standard modal tier'],
  ['src/components/Voice/VoiceCommandOverlay.tsx', 140, 10000, 9000, '-> standard modal tier'],
  ['src/pages/Home.tsx', 219, 10000, 9000, '-> standard modal tier'],
  ['src/pages/Home.tsx', 439, 10000, 9000, '-> standard modal tier'],
  ['src/pages/Home.tsx', 710, 10000, 9000, '-> standard modal tier'],
  ['src/pages/Home.tsx', 796, 10000, 9000, '-> standard modal tier'],
  ['src/pages/AuditLogPage.tsx', 442, 10000, 9000, '-> standard modal tier'],
  ['src/pages/ConfigurationPage.tsx', 216, 10000, 9000, '-> standard modal tier'],
  ['src/pages/WorklistPage/ResourcesModal.tsx', 17, 10000, 9000, '-> standard modal tier'],
  ['src/pages/WorklistPage/LogoutWarningModal.tsx', 13, 10000, 9000, '-> standard modal tier'],
  ['src/components/Config/Templates/TemplateRenderer.tsx', 227, 50000, 9000, '-> standard modal tier'],
  ['src/components/Config/Protocols/protocolShared.tsx', 398, 50000, 9000, '-> standard modal tier'],
  ['src/components/Config/Protocols/protocolShared.tsx', 495, 50000, 9000, '-> standard modal tier'],
  ['src/components/Config/Protocols/SynopticEditor.tsx', 445, 50000, 9000, "SynopticEditor's OWN main overlay -> standard tier (was same as its nested confirm -- real same-file bug)"],
  ['src/pages/Synoptic/Codes/AddCodeModal.tsx', 551, 39000, 9000, 'context menu invisible backdrop -> standard tier'],
  ['src/pages/Synoptic/Codes/AddCodeModal.tsx', 565, 100000, 9001, 'context menu visible box -> just above its own backdrop'],

  // ── Nested / must-beat-own-parent ────────────────────────────────────
  ['src/pages/SynopticReportPage/modals/UnsavedWarningModal.tsx', 36, 40000, 9500, 'genuinely warns about closing another open modal'],
  ['src/pages/SynopticReportPage/modals/ProtocolChangeModal.tsx', 121, 10500, 9500, 'appears above the base synoptic editing view'],
  ['src/pages/SynopticReportPage/modals/AiReviewModal.tsx', 88, 10001, 9500, 'appears above the base synoptic editing view'],
  ['src/components/Config/Protocols/SynopticEditor.tsx', 787, 50000, 9500, "nested submit-confirm, must beat its OWN parent overlay"],
  ['src/components/Config/Protocols/SynopticEditor.tsx', 800, 50000, 9500, 'same nested-confirm family as above'],
  ['src/pathscribe.css', 18158, 60000, 9500, "ps-tabswitch-overlay -- real 'unsaved changes on tab switch' warning"],
  ['src/components/EnhancementRequest/EnhancementRequestModal.tsx', 283, 60000, 9000, "EnhancementRequestModal's OWN base overlay -> standard tier"],
  ['src/components/EnhancementRequest/EnhancementRequestModal.tsx', 147, 200000, 9500, 'screenshot lightbox nested inside its own modal'],

  // ── Toasts ────────────────────────────────────────────────────────────
  ['src/pathscribe.css', 18048, 70000, 10000, 'ps-autogen-toast -> toast tier'],
  ['src/pages/Synoptic/UI/SaveToast.tsx', 6, 9999, 10000, '-> toast tier'],
  ['src/pathscribe.css', 4012, 2000, 10000, 'ps-msg-toast -- CSS/semantic mismatch fixed'],
  ['src/components/Voice/VoiceMissPrompt.tsx', 63, 10001, 10000, 'confirmed NOT a modal -- transient hint bubble -> toast tier'],
  ['src/components/AppShell/AppShell.tsx', 1449, 5000, 10000, 'snackbar-style transient element -> toast tier'],
  ['src/App.tsx', 85, 9999, 10000, '-> toast tier'],
  ['src/components/Voice/VoiceToggleButton.tsx', 66, 9999, 10000, '-> toast tier'],
  ['src/components/Voice/VoiceToggleButton.tsx', 138, 9999, 10000, '-> toast tier'],

  // ── Not actually overlays -- shrunk to sane local values ─────────────
  ['src/components/EnhancementRequest/EnhancementRequestButton.tsx', 65, 99999, 2, 'position:relative button, not fixed/overlay -- huge z-index was doing nothing'],
  ['src/pathscribe.css', 1551, 50000, 100, 'ps-search-wrap -- normal page layout element, not an overlay'],
];

function main() {
  console.log(EXECUTE ? '=== EXECUTING Z-INDEX FIXES ===\n' : '=== DRY RUN (no files will be changed — pass --execute to apply) ===\n');

  const byFile = new Map();
  for (const [file, line, oldVal, newVal, reason] of PLAN) {
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push({ line, oldVal, newVal, reason });
  }

  let totalOk = 0, totalMismatch = 0, totalMissingFile = 0;
  const results = [];

  for (const [file, changes] of byFile) {
    const fullPath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(fullPath)) {
      console.log(`FILE NOT FOUND, skipping all ${changes.length} change(s): ${file}`);
      totalMissingFile += changes.length;
      continue;
    }
    let lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    const isCSS = file.endsWith('.css');
    let fileChanged = false;

    console.log(`\n${file}:`);
    for (const { line, oldVal, newVal, reason } of changes) {
      const idx = line - 1;
      if (idx < 0 || idx >= lines.length) {
        console.log(`  Line ${line}: OUT OF RANGE (file may have changed) — SKIPPED. (${reason})`);
        totalMismatch++;
        continue;
      }
      const lineText = lines[idx];
      const pattern = isCSS
        ? new RegExp(`(z-index:\\s*)${oldVal}\\b`)
        : new RegExp(`(zIndex:\\s*'?"?)${oldVal}\\b`);

      if (!pattern.test(lineText)) {
        console.log(`  Line ${line}: expected ${oldVal}, NOT FOUND as expected — SKIPPED, needs manual check. (${reason})`);
        console.log(`    Actual line: ${lineText.trim()}`);
        totalMismatch++;
        continue;
      }

      const newLineText = lineText.replace(pattern, `$1${newVal}`);
      console.log(`  Line ${line}: ${oldVal} -> ${newVal}  (${reason})`);
      if (EXECUTE) {
        lines[idx] = newLineText;
        fileChanged = true;
      }
      totalOk++;
    }

    if (EXECUTE && fileChanged) {
      fs.writeFileSync(fullPath, lines.join('\r\n'), 'utf8');
    }
  }

  console.log(`\n\nSummary: ${totalOk} change(s) ${EXECUTE ? 'applied' : 'ready to apply'}, ${totalMismatch} needing manual review (line moved or value changed since this plan was built), ${totalMissingFile} in missing files.`);
  if (!EXECUTE) {
    console.log('\nDry run complete. Review above, then re-run with --execute to apply.');
  } else {
    console.log('\nDone. Now run: npx tsc --noEmit -p .   then VISUALLY verify key screens (modals, drawers, toasts) in the running app.');
  }
}

main();
