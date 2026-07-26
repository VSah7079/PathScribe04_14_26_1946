#!/usr/bin/env node
// scripts/fix-compact-header-layout.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: addresses two layout issues Pete flagged in the compact
// HeaderBar strip:
//   1. The AI status badge and the Worklist/Full-view buttons read as one
//      group (flat 12px gap on all ps-hb-compact-right children). Fixed by
//      grouping the two buttons in their own tighter-gapped sub-container
//      with a visual divider + larger gap separating it from the status
//      badge, rather than just adding more whitespace.
//   2. Case number / patient demos / status looked slightly misaligned --
//      likely from mixed baseline/center alignment across sections with
//      different internal content heights (the AI confidence badge stacks
//      a 14px bold number + 9px label via align-items: baseline, while the
//      left side is a flat row of 12px text). Fixed with a consistent
//      min-height across all three main sections.
//
// CRLF-safe (see earlier scripts tonight for why this matters in this repo).
// Usage: node scripts/fix-compact-header-layout.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const CSS_FILE = path.join(__dirname, '..', 'src', 'pathscribe.css');
const HEADER_BAR_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'components', 'HeaderBar.tsx');

const CSS_EDITS = [
  [
    `.ps-hb-compact-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}`,
    `.ps-hb-compact-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  min-height: 22px;
}`,
    'Add min-height to ps-hb-compact-left',
  ],
  [
    `.ps-hb-compact-stages {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}`,
    `.ps-hb-compact-stages {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
  min-height: 22px;
}`,
    'Add min-height to ps-hb-compact-stages',
  ],
  [
    `.ps-hb-compact-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}`,
    `.ps-hb-compact-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-height: 22px;
}

.ps-hb-compact-nav-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 12px;
  border-left: 1px solid rgba(148,163,184,0.2);
}`,
    'Reduce ps-hb-compact-right gap, add min-height, add new nav-group class with divider',
  ],
];

const HEADER_BAR_EDITS = [
  [
    `          <button
            className="ps-hb-compact-nav-btn"
            onClick={() => onNavigate('/worklist')}
            title="Back to worklist"
          >← Worklist</button>
          {onToggleManualCompact && (
            <button
              className="ps-hb-compact-nav-btn"
              onClick={onToggleManualCompact}
              title="Show full patient header"
            >⌄ Full view</button>
          )}
        </div>
      </div>
    );
  }`,
    `          <div className="ps-hb-compact-nav-group">
            <button
              className="ps-hb-compact-nav-btn"
              onClick={() => onNavigate('/worklist')}
              title="Back to worklist"
            >← Worklist</button>
            {onToggleManualCompact && (
              <button
                className="ps-hb-compact-nav-btn"
                onClick={onToggleManualCompact}
                title="Show full patient header"
              >⌄ Full view</button>
            )}
          </div>
        </div>
      </div>
    );
  }`,
    'Wrap the Worklist/Full-view buttons in the new ps-hb-compact-nav-group div',
  ],
];

function applyEdits(content, edits, fileLabel) {
  for (const [find, replace, desc] of edits) {
    const findLf = find.replace(/\r\n/g, '\n');
    const replaceLf = replace.replace(/\r\n/g, '\n');
    if (!content.includes(findLf)) {
      console.error(`ABORTING: expected content not found in ${fileLabel} for edit: "${desc}"`);
      console.error('Expected to find:');
      console.error(findLf);
      process.exit(1);
    }
    const occurrences = content.split(findLf).length - 1;
    if (occurrences > 1) {
      console.error(`ABORTING: expected content for "${desc}" appears ${occurrences} times in ${fileLabel} -- not unique.`);
      process.exit(1);
    }
    content = content.replace(findLf, replaceLf);
  }
  return content;
}

function main() {
  console.log('Validating all edits before writing anything...');

  const cssRaw = fs.readFileSync(CSS_FILE, 'utf8').replace(/\r\n/g, '\n');
  const newCssLf = applyEdits(cssRaw, CSS_EDITS, 'pathscribe.css');

  const headerBarRaw = fs.readFileSync(HEADER_BAR_FILE, 'utf8').replace(/\r\n/g, '\n');
  const newHeaderBarLf = applyEdits(headerBarRaw, HEADER_BAR_EDITS, 'HeaderBar.tsx');

  console.log('All validations passed. Writing files.');
  fs.writeFileSync(CSS_FILE, newCssLf.replace(/\n/g, '\r\n'), 'utf8');
  fs.writeFileSync(HEADER_BAR_FILE, newHeaderBarLf.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify, then do a full restart + hard refresh to check visually.');
}

main();
