#!/usr/bin/env node
// scripts/add-header-compact-sticky.cjs
// One-time script: makes isHeaderCompactManual persist via localStorage.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'SynopticReportPage.tsx');

const FIND = `  // User-manual toggle for HeaderBar's compact mode -- see the render's
  // own comment for why this shares the existing compact render path
  // rather than building a new shrink mechanism from scratch.
  const [isHeaderCompactManual, setIsHeaderCompactManual] = useState(false);`;

const REPLACE = `  // User-manual toggle for HeaderBar's compact mode -- see the render's
  // own comment for why this shares the existing compact render path
  // rather than building a new shrink mechanism from scratch. Sticky
  // (persists across cases/sessions via localStorage) since this is a
  // display preference, not clinical data -- matches the pathscribe_*
  // naming convention so it's correctly caught by the existing Demo
  // Reset prefix catch-all.
  const [isHeaderCompactManual, setIsHeaderCompactManual] = useState<boolean>(() => {
    try { return localStorage.getItem('pathscribe_header_compact_manual') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('pathscribe_header_compact_manual', isHeaderCompactManual ? '1' : '0'); } catch {}
  }, [isHeaderCompactManual]);`;

function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const content = raw.replace(/\r\n/g, '\n');
  const findLf = FIND.replace(/\r\n/g, '\n');
  const replaceLf = REPLACE.replace(/\r\n/g, '\n');

  if (!content.includes(findLf)) {
    console.error('ABORTING: expected content not found.');
    console.error('Expected to find:');
    console.error(findLf);
    process.exit(1);
  }
  const occurrences = content.split(findLf).length - 1;
  if (occurrences > 1) {
    console.error(`ABORTING: expected content appears ${occurrences} times -- not unique.`);
    process.exit(1);
  }

  const result = content.replace(findLf, replaceLf).replace(/\n/g, '\r\n');
  fs.writeFileSync(FILE, result, 'utf8');
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify.');
}

main();
