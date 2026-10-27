import { describe, it, expect } from 'vitest';
import { CAPABILITY_CATALOG } from '../authorization/capabilityCatalog';
import { HUB_SCREENS, SCREEN_CAPABILITY, TILE_SCREENS, canOpenTile, createScreenAccessService, resolveWorklistView, visibleTiles, worklistViews, type HomeTileId } from './screenAccess';

const grant = (...keys: string[]) => (c: string) => keys.includes(c);

describe('screen access (Batch 374)', () => {
  it('every screen capability in the catalog belongs to exactly one screen', () => {
    const screens = CAPABILITY_CATALOG.filter(c => c.group === 'screens').map(c => c.key).sort();
    expect(Object.values(SCREEN_CAPABILITY).sort()).toEqual(screens);
  });
  it('Home shows only what the user may open; a hub shows when any screen inside it may be opened', () => {
    const order: HomeTileId[] = ['accession', 'worklist', 'configuration', 'pathologyWorkspace', 'qualityCompliance', 'search'];
    expect(visibleTiles(order, grant('screen:worklist:open', 'screen:microtomy:open'))).toEqual(['worklist', 'pathologyWorkspace']);
    expect(visibleTiles(order, grant())).toEqual([]);
    expect(canOpenTile('qualityCompliance', grant('screen:audit-log:open'))).toBe(true);
    expect(visibleTiles(HUB_SCREENS.pathologyWorkspace, grant('screen:microtomy:open', 'screen:embedding:open'))).toEqual(['microtomy', 'embedding']);
  });
  it('every screen is reached from exactly one Home tile (Batch 375)', () => {
    const reached = Object.values(TILE_SCREENS).flat().sort();
    expect(reached).toEqual(Object.keys(SCREEN_CAPABILITY).sort().filter(k => k !== 'addOnOrders'));
    expect(Object.keys(TILE_SCREENS)).not.toContain('batchManagement');
    expect(HUB_SCREENS.pathologyWorkspace).toContain('batchManagement');
  });
  it('the Worklist tile shows for its case list or either peer-review queue, and opens the right view (Batch 375)', () => {
    expect(canOpenTile('worklist', grant('screen:surgical-qa-worklist:open'))).toBe(true);
    expect(worklistViews(grant('screen:worklist:open', 'screen:cytology-qc-queue:open'))).toEqual(['cases', 'cytologyQc']);
    expect(resolveWorklistView('cytologyQc', ['cases', 'cytologyQc'])).toBe('cytologyQc');
    expect(resolveWorklistView('surgicalQa', ['cases', 'cytologyQc'])).toBe('cases');
    expect(resolveWorklistView(null, ['surgicalQa'])).toBe('surgicalQa');
    expect(resolveWorklistView('cases', [])).toBeNull();
  });
  it('the route check asks the authorization service for the screen\'s capability', async () => {
    const asked: string[] = [];
    const decide = async (c: string) => { asked.push(c); return { capability: c, allowed: c === 'screen:embedding:open', grantedBy: [], missingRequirements: [], context: {} }; };
    const svc = createScreenAccessService({ authorization: { enforce: decide, evaluate: decide } });
    expect(await svc.canOpen('configuration')).toBe(false);
    expect(await svc.canOpen('embedding')).toBe(true);
    expect(await svc.canOpen('pathologyWorkspace')).toBe(true);
    expect(await svc.canOpen('qualityCompliance')).toBe(false);
    expect(asked).toEqual(['screen:configuration:open', 'screen:embedding:open', 'screen:cytology-workspace:open', 'screen:microtomy:open', 'screen:embedding:open', 'screen:audit-log:open', 'screen:quality-assurance:open', 'screen:registry-exceptions:open', 'screen:autopsy-dashboards:open', 'screen:outbound-queue:open']);
    expect(await svc.canOpen('batchManagement')).toBe(false);
  });

  it('Batch 432: the Cytology QC supervisor bypass opens the QC queue (and the Worklist tile) for the override', async () => {
    const has = (...caps: string[]) => (c: string) => caps.includes(c);
    expect(worklistViews(has('cytology:qc-review:bypass'))).toEqual(['cytologyQc']);
    expect(canOpenTile('worklist', has('cytology:qc-review:bypass'))).toBe(true);
    expect(worklistViews(has())).toEqual([]);
    const enforced: string[] = []; const evaluated: string[] = [];
    const svc = createScreenAccessService({ authorization: {
      enforce: async (c: string) => { enforced.push(c); return { capability: c, allowed: false, grantedBy: [], missingRequirements: [], context: {} }; },
      evaluate: async (c: string) => { evaluated.push(c); return { capability: c, allowed: c === 'cytology:qc-review:bypass', grantedBy: [], missingRequirements: [], context: {} }; },
    } });
    expect(await svc.canOpen('cytologyQcQueue')).toBe(true);
    expect(enforced).toEqual(['screen:cytology-qc-queue:open']);
    expect(evaluated).toEqual(['cytology:qc-review:bypass']);
  });

  it('Batch 669 (ctl): Control Rules opens for view or manage, without the Molecular screen', async () => {
    const has = (...caps: string[]) => (c: string) => caps.includes(c);
    expect(canOpenTile('molecularControlRules', has('config:molecular-control-rules:view'))).toBe(true);
    expect(canOpenTile('molecularControlRules', has('config:molecular-control-rules:manage'))).toBe(true);
    expect(canOpenTile('molecularControlRules', has('screen:molecular:open'))).toBe(false);
    expect(canOpenTile('molecularControlRules', has())).toBe(false);
    // It is a sub-screen: not a Home tile, in no hub.
    expect(Object.values(TILE_SCREENS).flat()).not.toContain('molecularControlRules');
    const decider = (...held: string[]) => async (c: string) => ({ capability: c, allowed: held.includes(c), grantedBy: [], missingRequirements: [], context: {} });
    const make = (...held: string[]) => createScreenAccessService({ authorization: { enforce: decider(...held), evaluate: decider(...held) } });
    expect(await make('config:molecular-control-rules:view').canOpen('molecularControlRules')).toBe(true);
    expect(await make('config:molecular-control-rules:manage').canOpen('molecularControlRules')).toBe(true);
    expect(await make('screen:molecular:open').canOpen('molecularControlRules')).toBe(false);
  });
});
