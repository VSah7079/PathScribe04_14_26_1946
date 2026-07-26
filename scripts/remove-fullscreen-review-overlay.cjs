#!/usr/bin/env node
// scripts/remove-fullscreen-review-overlay.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: removes the "Fullscreen review overlay" (panelMode ===
// 'expanded') feature entirely from SynopticReportPage.tsx.
//
// Why: this feature duplicated LeftReportPanel and RightSynopticPanel as a
// second, entirely separate JSX tree/component-instance set rather than
// reusing the normal view's instances repositioned via CSS. Since
// RightSynopticPanel owns its own local `answers` state (not a controlled
// component), the two instances never shared in-progress (unsaved) edits --
// confirmed by Pete: data entered in one view did not reliably appear in
// the other, and was lost/inconsistent when toggling between them. A
// correct fix requires a real architectural merge (single shared instance,
// CSS-only repositioning) -- deferred to a future, dedicated session
// (see PRIORITY_FIXES.md). For now, removing the broken feature entirely
// is safer than leaving a half-working, data-inconsistent one in place.
//
// Removes two ranges (both 1-indexed, inclusive, confirmed against the
// real file via Select-String immediately before writing this script):
//   1. Lines 3487-3494: the "⤢ Full-screen review mode" expand button
//      (no longer has anywhere to send the user, since its destination
//      is being removed)
//   2. Lines 3520-3816: the entire overlay block itself
//
// Usage: node scripts/remove-fullscreen-review-overlay.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const TARGET_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'SynopticReportPage.tsx');

// [startLine, endLine, description, expectedFirstLineSubstring, expectedLastLineSubstring] -- all 1-indexed, inclusive
const RANGES_TO_REMOVE = [
  [3487, 3494, 'expand button', 'Expand button', '</div>'],
  [3520, 3816, 'overlay block',  'Fullscreen review overlay', '})()}'],
];

function main() {
  const original = fs.readFileSync(TARGET_FILE, 'utf8');
  const lines = original.split('\n');

  // Validate every range BEFORE making any changes -- abort entirely if
  // anything doesn't match what was confirmed against the real file.
  for (const [start, end, desc, expectFirst, expectLast] of RANGES_TO_REMOVE) {
    const firstLine = lines[start - 1] ?? '';
    const lastLine  = lines[end - 1] ?? '';
    if (!firstLine.includes(expectFirst)) {
      console.error(`ABORTING: line ${start} (${desc}) does not contain expected text "${expectFirst}".`);
      console.error(`Actual content: ${firstLine}`);
      process.exit(1);
    }
    if (!lastLine.includes(expectLast)) {
      console.error(`ABORTING: line ${end} (${desc}) does not contain expected text "${expectLast}".`);
      console.error(`Actual content: ${lastLine}`);
      process.exit(1);
    }
  }
  console.log('All range validations passed. Proceeding with removal.');

  // Remove ranges in descending order so earlier line numbers stay valid
  // as we go (removing the later range first doesn't shift earlier lines).
  const sortedDescending = [...RANGES_TO_REMOVE].sort((a, b) => b[0] - a[0]);
  for (const [start, end, desc] of sortedDescending) {
    const removedCount = end - start + 1;
    lines.splice(start - 1, removedCount);
    console.log(`Removed ${removedCount} lines (${desc}), lines ${start}-${end}.`);
  }

  fs.writeFileSync(TARGET_FILE, lines.join('\n'), 'utf8');
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify.');
  console.log('Note: this will likely surface unused-variable warnings/errors for panelMode/setPanelMode and possibly others (e.g. activeSpecimenId if it was only used in the removed block) -- expected, and worth checking one at a time rather than assuming they are all safe to remove blindly.');
}

main();
