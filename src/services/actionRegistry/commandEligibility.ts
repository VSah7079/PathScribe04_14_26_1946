// src/services/actionRegistry/commandEligibility.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the ONE rule for "may this command run right now", used by the hotkey listener (through
// getEligibleActions) and by voice matching (findActionByTrigger). Until now voice built its own, shorter copy that
// left out the station and action-group branches, so a command a bench station had switched on worked from the
// keyboard but not by voice.
//
// A command is eligible when it is active and ANY of these holds (never AND):
//   1. its category is always on (SYSTEM, NAVIGATION);
//   2. its category is the screen in focus (the app context);
//   3. its stationProfiles include the current station's functional area (PS-289);
//   4. its id is in the current station's resolved action group (PS-289).
// Pure: the caller passes the three pieces of state.
// ─────────────────────────────────────────────────────────────────────────────
import type { SystemAction } from './IActionRegistryService';
import { GLOBAL_CATEGORIES } from './shortcutResolution';

export interface EligibilityState {
  /** The screen in focus (VOICE_CONTEXT). */
  context: string;
  /** The current station's functional area, when a station is selected. */
  stationProfile?: string;
  /** Action ids of the current station's action groups. */
  actionGroupActionIds: ReadonlySet<string>;
}

export function isCommandEligible(action: SystemAction, state: EligibilityState): boolean {
  return action.isActive && (
    GLOBAL_CATEGORIES.has(action.category)
    || action.category === state.context
    || (!!state.stationProfile && !!action.stationProfiles?.includes(state.stationProfile))
    || state.actionGroupActionIds.has(action.id)
  );
}

export function eligibleCommands(actions: readonly SystemAction[], state: EligibilityState): SystemAction[] {
  return actions.filter(a => isCommandEligible(a, state));
}
