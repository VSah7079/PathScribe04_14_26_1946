#!/usr/bin/env node
// scripts/fix-specimens-starter-mojibake.cjs
// One-time script: fixes mojibake em-dash corruption ('â€”' -> '—') in
// scripts/terminology-sources/specimens-starter.json's "name" fields.
// Same corruption pattern found and fixed elsewhere tonight (TypeModal.tsx,
// LeftReportPanel.tsx) -- 34 occurrences confirmed in this file. Simple
// string replacement, not JSON.parse/stringify, to avoid reformatting the
// whole file for an unrelated reason.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'scripts', 'terminology-sources', 'specimens-starter.json');

function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const occurrences = (raw.match(/â€”/g) || []).length;
  if (occurrences === 0) {
    console.log('No mojibake found -- nothing to do.');
    return;
  }
  const fixed = raw.split('â€”').join('—');
  fs.writeFileSync(FILE, fixed, 'utf8');
  console.log(`Replaced ${occurrences} mojibake occurrence(s) with clean em-dashes.`);
  console.log('Run `npx tsc --noEmit -p .` next to verify nothing broke (JSON changes won\'t error there, but confirms the rest of the project is still fine).');
}

main();
