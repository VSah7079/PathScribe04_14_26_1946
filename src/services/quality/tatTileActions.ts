// src/services/quality/tatTileActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the Contribution dashboard's turnaround-time tiles have eight voice and keyboard commands
// (TAT_SHOW_FIRST_TOUCH, Alt+S, and so on). The tab listened for a `PATHSCRIBE_TAT_TILE` event that nothing sent,
// while the registry sent `PATHSCRIBE_TAT_SHOW_*`, so none of the eight did anything. The tab now listens for the
// registry's own announcement and maps the id to the tile with this table; choosing the tile is what clicking it does.
// ─────────────────────────────────────────────────────────────────────────────
export type TatTileKey = 'firstTouch' | 'totalCase' | 'frozenSection' | 'grossing' | 'signOut' | 'coldIschemia' | 'consultResponse' | 'consultAwaiting';

export const TAT_TILE_FOR_ACTION: Readonly<Record<string, TatTileKey>> = {
  'TAT_SHOW_FIRST_TOUCH': 'firstTouch',
  'TAT_SHOW_TOTAL_CASE': 'totalCase',
  'TAT_SHOW_FROZEN_SECTION': 'frozenSection',
  'TAT_SHOW_GROSSING': 'grossing',
  'TAT_SHOW_SIGN_OUT': 'signOut',
  'TAT_SHOW_COLD_ISCHEMIA': 'coldIschemia',
  'TAT_SHOW_CONSULT_RESPONSE': 'consultResponse',
  'TAT_SHOW_CONSULT_AWAITING': 'consultAwaiting',
};

/** The tile a command chooses, only if that tile is one the lab has switched on; null otherwise. */
export function tatTileForAction(actionId: string, enabledTiles: readonly string[]): TatTileKey | null {
  const key = TAT_TILE_FOR_ACTION[actionId];
  return key && enabledTiles.includes(key) ? key : null;
}
