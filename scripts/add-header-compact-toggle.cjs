#!/usr/bin/env node
// scripts/add-header-compact-toggle.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: makes HeaderBar's existing "compact" single-strip mode
// user-toggleable, rather than only automatic (isOrchestrationMode &&
// leftTab === 'draft'). Reuses the existing, already-working compact
// render path (built for Report Draft) rather than building a new shrink
// mechanism from scratch -- lower risk, and any future improvement to
// compact mode benefits both automatic and manual triggers.
//
// Changes:
//   1. HeaderBar.tsx: add isManuallyCompact / onToggleManualCompact props
//   2. HeaderBar.tsx: add a small toggle button in both the compact and
//      full render paths
//   3. SynopticReportPage.tsx: add isHeaderCompactManual state, thread it
//      into the compact prop expression, wire the new HeaderBar props
//
// Every replacement is validated against expected exact content before
// any file is written -- if anything doesn't match, the whole script
// aborts with no changes made and prints what it actually found.
//
// Usage: node scripts/add-header-compact-toggle.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const HEADER_BAR_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'components', 'HeaderBar.tsx');
const SYNOPTIC_PAGE_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'SynopticReportPage.tsx');

// [find, replace, description] -- applied in order, each validated before writing
const HEADER_BAR_EDITS = [
  [
    `  /** For the CoPilot "Data as of / Check now" indicator — lets HeaderBar
   *  apply any flags a simulated LIS check returns onto the real case.
   *  Omit to leave the indicator read-only (no case mutation possible). */
  onCaseUpdate?: (updatedCase: Case) => void;
}`,
    `  /** For the CoPilot "Data as of / Check now" indicator — lets HeaderBar
   *  apply any flags a simulated LIS check returns onto the real case.
   *  Omit to leave the indicator read-only (no case mutation possible). */
  onCaseUpdate?: (updatedCase: Case) => void;
  /** User-manual compact toggle -- separate from the automatic
   *  (isOrchestrationMode && leftTab === 'draft') compact trigger. Either
   *  can independently put the header into compact mode; this prop/
   *  callback pair controls only the manual one. Omit to hide the
   *  toggle button entirely (e.g. contexts where shrinking doesn't make
   *  sense). */
  isManuallyCompact?: boolean;
  onToggleManualCompact?: () => void;
}`,
    'Add isManuallyCompact/onToggleManualCompact to HeaderBarProps',
  ],
  [
    `const HeaderBar: React.FC<HeaderBarProps> = ({ caseData, onSignOut: _onSignOut, onNavigate, aiSynthesisStatus, onAiStatusClick, compact = false, onChangePriority, priorityLevels, deficiencyCount, onOpenDeficiencyHistory, focusedBlockId, onOpenBlockEditor, onCaseUpdate }) => {`,
    `const HeaderBar: React.FC<HeaderBarProps> = ({ caseData, onSignOut: _onSignOut, onNavigate, aiSynthesisStatus, onAiStatusClick, compact = false, onChangePriority, priorityLevels, deficiencyCount, onOpenDeficiencyHistory, focusedBlockId, onOpenBlockEditor, onCaseUpdate, isManuallyCompact = false, onToggleManualCompact }) => {`,
    'Destructure the new props in the component signature',
  ],
  [
    `          <button
            className="ps-hb-compact-nav-btn"
            onClick={() => onNavigate('/worklist')}
            title="Back to worklist"
          >← Worklist</button>
        </div>
      </div>
    );
  }`,
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
    'Add "Full view" button to the compact render path',
  ],
  [
    `        {isCopilotCase && syncState && (
          <div className="ps-hb-lis-sync">
            <span className="ps-hb-lis-sync-label">{formatSyncLabel(syncState.lastCheckedAt)}</span>`,
    `        {onToggleManualCompact && (
          <button
            className="ps-hb-compact-nav-btn"
            style={{ marginLeft: 'auto' }}
            onClick={onToggleManualCompact}
            title="Shrink to a compact single-line header -- more room for the report"
          >⌃ Compact view</button>
        )}

        {isCopilotCase && syncState && (
          <div className="ps-hb-lis-sync">
            <span className="ps-hb-lis-sync-label">{formatSyncLabel(syncState.lastCheckedAt)}</span>`,
    'Add "Compact view" button to the full render path (breadcrumb row)',
  ],
];

const SYNOPTIC_PAGE_EDITS = [
  [
    `        {/* HeaderBar — compact single-strip when in Report Draft (maximises editor space) */}
        <HeaderBar
          caseData={caseData}
          onNavigate={guard}
          onSignOut={() => setShowSignOutModal(true)}
          aiSynthesisStatus={aiSynthesisStatus}
          onAiStatusClick={handleAiStatusReviewClick}
          compact={isOrchestrationMode && leftTab === 'draft'}
          onChangePriority={canEditPriority ? handleChangePriority : undefined}`,
    `        {/* HeaderBar — compact single-strip when in Report Draft (maximises
            editor space), or when the user manually toggles it via the new
            Compact/Full view buttons -- either trigger independently puts
            the header into the same, already-existing compact render path. */}
        <HeaderBar
          caseData={caseData}
          onNavigate={guard}
          onSignOut={() => setShowSignOutModal(true)}
          aiSynthesisStatus={aiSynthesisStatus}
          onAiStatusClick={handleAiStatusReviewClick}
          compact={(isOrchestrationMode && leftTab === 'draft') || isHeaderCompactManual}
          isManuallyCompact={isHeaderCompactManual}
          onToggleManualCompact={() => setIsHeaderCompactManual(v => !v)}
          onChangePriority={canEditPriority ? handleChangePriority : undefined}`,
    'Thread isHeaderCompactManual into the compact prop and wire the new toggle props',
  ],
];

// Returns LF-normalized content with edits applied -- caller is
// responsible for converting back to CRLF exactly once, at the end,
// after ALL edits (including any manual insertions like the state
// anchor) are done. This avoids mixed line endings that would result
// from converting back to CRLF partway through a multi-step process.
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
      console.error(`ABORTING: expected content for "${desc}" appears ${occurrences} times in ${fileLabel} -- not unique, refusing to guess which one.`);
      process.exit(1);
    }
    content = content.replace(findLf, replaceLf);
  }
  return content;
}

function main() {
  console.log('Validating all edits before writing anything...');

  const headerBarRaw = fs.readFileSync(HEADER_BAR_FILE, 'utf8').replace(/\r\n/g, '\n');
  const newHeaderBarLf = applyEdits(headerBarRaw, HEADER_BAR_EDITS, 'HeaderBar.tsx');

  const pageRaw = fs.readFileSync(SYNOPTIC_PAGE_FILE, 'utf8').replace(/\r\n/g, '\n');
  let newPageLf = applyEdits(pageRaw, SYNOPTIC_PAGE_EDITS, 'SynopticReportPage.tsx');

  // State anchor insertion -- also done on LF-normalized content, before
  // the single CRLF conversion at the end.
  const stateAnchor = `const [showCodesModal, setShowCodesModal] = useState(false);`;
  if (!newPageLf.includes(stateAnchor)) {
    console.error(`ABORTING: state anchor not found in SynopticReportPage.tsx.`);
    process.exit(1);
  }
  const occurrences = newPageLf.split(stateAnchor).length - 1;
  if (occurrences > 1) {
    console.error(`ABORTING: state anchor appears ${occurrences} times -- not unique, refusing to guess which one.`);
    process.exit(1);
  }
  newPageLf = newPageLf.replace(
    stateAnchor,
    `${stateAnchor}\n  // User-manual toggle for HeaderBar's compact mode -- see the render's\n  // own comment for why this shares the existing compact render path\n  // rather than building a new shrink mechanism from scratch.\n  const [isHeaderCompactManual, setIsHeaderCompactManual] = useState(false);`
  );

  console.log('All validations passed. Writing files.');
  fs.writeFileSync(HEADER_BAR_FILE, newHeaderBarLf.replace(/\n/g, '\r\n'), 'utf8');
  fs.writeFileSync(SYNOPTIC_PAGE_FILE, newPageLf.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify.');
}

main();
