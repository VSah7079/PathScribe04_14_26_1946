#!/usr/bin/env node
// scripts/strengthen-compact-nav-btn-border.cjs
// One-time script: makes the Worklist/Full-view button borders in the
// compact HeaderBar strip more visible. The strip's background is
// #0d1829 (dark navy); the original rgba(148,163,184,0.2) gray border
// was too low-contrast against it. Switches to the app's established
// cyan accent color, matching other interactive elements (e.g. the
// Internal Notes button), at a stronger opacity for both default and
// hover states. CRLF-safe.

const fs = require('fs');
const path = require('path');

const CSS_FILE = path.join(__dirname, '..', 'src', 'pathscribe.css');

const EDITS = [
  [
    `.ps-hb-compact-nav-btn {
  padding: 3px 10px;
  background: transparent;
  border: 1px solid rgba(148,163,184,0.2);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
  white-space: nowrap;
}`,
    `.ps-hb-compact-nav-btn {
  padding: 3px 10px;
  background: transparent;
  border: 1px solid rgba(8,145,178,0.5);
  border-radius: 4px;
  color: #38bdf8;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.12s;
  white-space: nowrap;
}`,
    'Strengthen ps-hb-compact-nav-btn border and text color for visibility against the dark strip background',
  ],
  [
    `.ps-hb-compact-nav-btn:hover {
  background: rgba(148,163,184,0.08);
  color: #94a3b8;
}`,
    `.ps-hb-compact-nav-btn:hover {
  background: rgba(8,145,178,0.15);
  border-color: rgba(8,145,178,0.8);
  color: #38bdf8;
}`,
    'Strengthen hover state to match',
  ],
];

function main() {
  const raw = fs.readFileSync(CSS_FILE, 'utf8');
  let content = raw.replace(/\r\n/g, '\n');

  for (const [find, replace, desc] of EDITS) {
    const findLf = find.replace(/\r\n/g, '\n');
    const replaceLf = replace.replace(/\r\n/g, '\n');
    if (!content.includes(findLf)) {
      console.error(`ABORTING: expected content not found for edit: "${desc}"`);
      console.error('Expected to find:');
      console.error(findLf);
      process.exit(1);
    }
    const occurrences = content.split(findLf).length - 1;
    if (occurrences > 1) {
      console.error(`ABORTING: expected content for "${desc}" appears ${occurrences} times -- not unique.`);
      process.exit(1);
    }
    content = content.replace(findLf, replaceLf);
  }

  fs.writeFileSync(CSS_FILE, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Done. No tsc verification needed (CSS-only change) -- do a hard refresh to check visually.');
}

main();
