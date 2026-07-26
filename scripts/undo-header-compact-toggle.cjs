#!/usr/bin/env node
// scripts/undo-header-compact-toggle.cjs
// ─────────────────────────────────────────────────────────────────────────────
// One-time script: precisely undoes the HeaderBar compact-toggle feature
// (from add-header-compact-toggle.cjs and add-header-compact-sticky.cjs),
// leaving everything else -- especially the Markers/LeftReportPanel work
// from earlier tonight -- untouched. Built by swapping each original
// find/replace pair's direction (using the "new" text as what to find,
// and the "original" text as what to restore), applied to the same two
// shared files (HeaderBar.tsx, SynopticReportPage.tsx) those scripts
// touched.
//
// Usage: node scripts/undo-header-compact-toggle.cjs
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const HEADER_BAR_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'components', 'HeaderBar.tsx');
const SYNOPTIC_PAGE_FILE = path.join(__dirname, '..', 'src', 'pages', 'SynopticReportPage', 'SynopticReportPage.tsx');

// [find, restoreTo, description] -- "find" is what add-header-compact-toggle.cjs
// PRODUCED; "restoreTo" is what it REPLACED (i.e. the original content).
const HEADER_BAR_UNDOS = [
  [
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
    `  /** For the CoPilot "Data as of / Check now" indicator — lets HeaderBar
   *  apply any flags a simulated LIS check returns onto the real case.
   *  Omit to leave the indicator read-only (no case mutation possible). */
  onCaseUpdate?: (updatedCase: Case) => void;
}`,
    'Remove isManuallyCompact/onToggleManualCompact from HeaderBarProps',
  ],
  [
    `const HeaderBar: React.FC<HeaderBarProps> = ({ caseData, onSignOut: _onSignOut, onNavigate, aiSynthesisStatus, onAiStatusClick, compact = false, onChangePriority, priorityLevels, deficiencyCount, onOpenDeficiencyHistory, focusedBlockId, onOpenBlockEditor, onCaseUpdate, isManuallyCompact = false, onToggleManualCompact }) => {`,
    `const HeaderBar: React.FC<HeaderBarProps> = ({ caseData, onSignOut: _onSignOut, onNavigate, aiSynthesisStatus, onAiStatusClick, compact = false, onChangePriority, priorityLevels, deficiencyCount, onOpenDeficiencyHistory, focusedBlockId, onOpenBlockEditor, onCaseUpdate }) => {`,
    'Restore original component signature',
  ],
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
    `          <button
            className="ps-hb-compact-nav-btn"
            onClick={() => onNavigate('/worklist')}
            title="Back to worklist"
          >← Worklist</button>
        </div>
      </div>
    );
  }`,
    'Remove "Full view" button from the compact render path',
  ],
  [
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
    `        {isCopilotCase && syncState && (
          <div className="ps-hb-lis-sync">
            <span className="ps-hb-lis-sync-label">{formatSyncLabel(syncState.lastCheckedAt)}</span>`,
    'Remove "Compact view" button from the full render path',
  ],
];

const SYNOPTIC_PAGE_UNDOS = [
  [
    `  // User-manual toggle for HeaderBar's compact mode -- see the render's
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
  }, [isHeaderCompactManual]);
`,
    ``,
    'Remove the isHeaderCompactManual state and its sticky-persistence effect',
  ],
  [
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
    `        {/* HeaderBar — compact single-strip when in Report Draft (maximises editor space) */}
        <HeaderBar
          caseData={caseData}
          onNavigate={guard}
          onSignOut={() => setShowSignOutModal(true)}
          aiSynthesisStatus={aiSynthesisStatus}
          onAiStatusClick={handleAiStatusReviewClick}
          compact={isOrchestrationMode && leftTab === 'draft'}
          onChangePriority={canEditPriority ? handleChangePriority : undefined}`,
    'Restore original compact prop expression and remove new HeaderBar props',
  ],
];

function applyUndos(content, undos, fileLabel) {
  for (const [find, restoreTo, desc] of undos) {
    const findLf = find.replace(/\r\n/g, '\n');
    const restoreLf = restoreTo.replace(/\r\n/g, '\n');
    if (!content.includes(findLf)) {
      console.error(`ABORTING: expected content not found in ${fileLabel} for undo: "${desc}"`);
      console.error('Expected to find:');
      console.error(findLf);
      process.exit(1);
    }
    const occurrences = content.split(findLf).length - 1;
    if (occurrences > 1) {
      console.error(`ABORTING: expected content for "${desc}" appears ${occurrences} times in ${fileLabel} -- not unique, refusing to guess which one.`);
      process.exit(1);
    }
    content = content.replace(findLf, restoreLf);
  }
  return content;
}

function main() {
  console.log('Validating all undos before writing anything...');

  const headerBarRaw = fs.readFileSync(HEADER_BAR_FILE, 'utf8').replace(/\r\n/g, '\n');
  const newHeaderBarLf = applyUndos(headerBarRaw, HEADER_BAR_UNDOS, 'HeaderBar.tsx');

  const pageRaw = fs.readFileSync(SYNOPTIC_PAGE_FILE, 'utf8').replace(/\r\n/g, '\n');
  const newPageLf = applyUndos(pageRaw, SYNOPTIC_PAGE_UNDOS, 'SynopticReportPage.tsx');

  console.log('All validations passed. Writing files.');
  fs.writeFileSync(HEADER_BAR_FILE, newHeaderBarLf.replace(/\n/g, '\r\n'), 'utf8');
  fs.writeFileSync(SYNOPTIC_PAGE_FILE, newPageLf.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Done. Run `npx tsc --noEmit -p .` next to verify.');
  console.log('This did NOT touch LeftReportPanel.tsx, MarkersPanel.tsx, contextBuilder.ts, SynopticEditor.tsx, or the template JSON files -- the Markers work stays intact.');
}

main();
