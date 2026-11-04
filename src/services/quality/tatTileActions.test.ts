// Batch 650: the Contribution dashboard's eight TAT tile commands choose their tile.
import { describe, it, expect } from 'vitest';
import { TAT_TILE_FOR_ACTION, tatTileForAction } from './tatTileActions';
import { mockActionRegistryService } from '../actionRegistry/mockActionRegistryService';

const ENABLED = ['firstTouch', 'totalCase', 'frozenSection', 'grossing', 'signOut', 'coldIschemia', 'consultResponse', 'consultAwaiting'];

describe('tatTileForAction', () => {
  it('maps every registered TAT_SHOW_* command to a tile', () => {
    const registered = mockActionRegistryService.getActions().map(a => a.id).filter(id => id.startsWith('TAT_SHOW_')).sort();
    expect(Object.keys(TAT_TILE_FOR_ACTION).sort()).toEqual(registered);
    for (const id of registered) expect(tatTileForAction(id, ENABLED)).toBe(TAT_TILE_FOR_ACTION[id]);
  });
  it('chooses only a tile the lab has switched on', () => {
    expect(tatTileForAction('TAT_SHOW_GROSSING', ENABLED.filter(k => k !== 'grossing'))).toBeNull();
    expect(tatTileForAction('TAT_SHOW_GROSSING', ['grossing'])).toBe('grossing');
  });
  it('ignores other commands', () => {
    expect(tatTileForAction('SIGN_OUT', ENABLED)).toBeNull();
  });
});
