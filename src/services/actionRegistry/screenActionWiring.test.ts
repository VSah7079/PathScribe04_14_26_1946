// Batch 650: the screen listeners too small to mount in a test (they sit in large screens) are pinned at source level:
// each id is answered by the same handler the visible control calls. The behaviour of the bigger ones is tested beside
// them (bottomBarActions.test.ts, useBottomBarActionEvents.test.tsx, PoolClaimModal.voice.test.tsx, tatTileActions.test.ts).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8');

describe('screen listeners answer with the control\'s own handler', () => {
  it('History window: CLOSE_HISTORY calls its onClose (the Close button)', () => {
    expect(read('components/PatientHistory/PatientHistoryModal.tsx')).toMatch(/actionId === 'CLOSE_HISTORY'\) onClose\(\)/);
  });
  it('Finalise window: FINALISE_CANCEL calls its onCancel (the Cancel button), only while shown; nothing confirms', () => {
    const text = read('pages/SynopticReportPage/modals/PreFinalisationModal.tsx');
    expect(text).toMatch(/if \(!show\) return undefined;\s+return actionRegistryService\.onAction\(\(actionId: string\) => \{ if \(actionId === 'FINALISE_CANCEL'\) onCancel\(\); \}\)/);
    expect(text).not.toMatch(/'FINALISE_CONFIRM'/);
  });
  it('Worklist: pool and countersign tiles are chosen as clicking them does', () => {
    const text = read('pages/WorklistPage/WorklistPage.tsx');
    expect(text).toMatch(/filterPool\s+= \(\) => \{ setActiveFilter\('pool'\)/);
    expect(text).toMatch(/filterCountersign = \(\) => \{ setActiveFilter\('countersign'\)/);
    expect(text).toMatch(/addEventListener\('PATHSCRIBE_TABLE_FILTER_POOL'/);
    expect(text).toMatch(/addEventListener\('PATHSCRIBE_TABLE_FILTER_COUNTERSIGN'/);
    expect(text).toMatch(/filterCollaborating = \(\) => \{ setActiveFilter\('collaborating'\)/);
    expect(text).toMatch(/addEventListener\('PATHSCRIBE_TABLE_FILTER_PARTICIPATING'/);
  });
  it('Search: SEARCH_EXECUTE runs the search only when the Search button is enabled; SEARCH_CLEAR is Clear', () => {
    const text = read('pages/SearchPage.tsx');
    expect(text).toMatch(/\['SEARCH_CLEAR', clearSearch\]/);
    expect(text).toMatch(/\['SEARCH_EXECUTE', \(\) => \{ if \(!isSearching\) runVoiceSearch\(\); \}\]/);
  });
  it('Contribution: the tab chooses the TAT tile through tatTileForAction', () => {
    expect(read('components/Contribution/QualityTab.tsx')).toMatch(/tatTileForAction\(actionId, ENABLED_TAT_TYPES\.map\(tt => tt\.key\)\)/);
  });
  it('Report bar: every button the hook can press is drawn from the same bottomBarVisibility decision', () => {
    const text = read('pages/SynopticReportPage/components/BottomActionBar.tsx');
    for (const flag of ['vis.signOutCase', 'vis.finalize', 'vis.requestAmendment']) expect(text).toContain(flag);
  });
});
