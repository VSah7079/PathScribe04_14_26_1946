// @vitest-environment happy-dom
// Batch 650, item 6: voice and the keyboard use the same eligibility rule, including the station branches that
// voice used to leave out.
import { describe, it, expect, afterEach, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockActionRegistryService as registry } from './mockActionRegistryService';
import { isCommandEligible, eligibleCommands } from './commandEligibility';
import type { SystemAction } from './IActionRegistryService';
import { VOICE_CONTEXT } from '../../constants/systemActions';

// PRINT_CURRENT_CASSETTE is a SYNOPTIC command, so it is not eligible on the worklist by context alone.
const ID = 'PRINT_CURRENT_CASSETTE';
const PHRASE = 'print current cassette';

afterEach(async () => {
  await registry.updateAction(ID, { stationProfiles: undefined });
  registry.setCurrentStationProfile(undefined);
  registry.setCurrentActionGroupActionIds(undefined);
  registry.setCurrentContext(VOICE_CONTEXT.WORKLIST);
});

const keyboardSees = () => registry.getEligibleActions().some(a => a.id === ID);
const voiceHears = () => registry.findActionByTrigger(PHRASE)?.id === ID;

describe('voice and keyboard agree on what is eligible', () => {
  it('off the screen and with no station, neither can run it', () => {
    expect(keyboardSees()).toBe(false);
    expect(voiceHears()).toBe(false);
  });
  it('a station whose functional area the command is tagged for: both can run it', async () => {
    await registry.updateAction(ID, { stationProfiles: ['Grossing'] });
    registry.setCurrentStationProfile('Grossing');
    expect(keyboardSees()).toBe(true);
    expect(voiceHears()).toBe(true);
  });
  it('a different station area: neither', async () => {
    await registry.updateAction(ID, { stationProfiles: ['Embedding'] });
    registry.setCurrentStationProfile('Grossing');
    expect(keyboardSees()).toBe(false);
    expect(voiceHears()).toBe(false);
  });
  it('a command in the station\'s action group: both can run it', () => {
    registry.setCurrentActionGroupActionIds([ID]);
    expect(keyboardSees()).toBe(true);
    expect(voiceHears()).toBe(true);
  });
  it('the screen in focus: both', () => {
    registry.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    expect(keyboardSees()).toBe(true);
    expect(voiceHears()).toBe(true);
  });
  it('for every phrase of every command, voice finds it only if the keyboard list holds it', () => {
    registry.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    registry.setCurrentStationProfile('Grossing');
    const eligible = new Set(registry.getEligibleActions().map(a => a.id));
    for (const a of registry.getActions().filter(x => x.isActive)) {
      const found = registry.findActionByTrigger(a.voiceTriggers[0]);
      if (found) expect(eligible.has(found.id), `${a.id} -> ${found.id}`).toBe(true);
    }
  });
});

describe('isCommandEligible (the one function)', () => {
  const a = (extra: Partial<SystemAction>): SystemAction => ({ id: 'X', label: 'X', category: 'GROSSING', shortcut: '', internalKey: 'X', voiceTriggers: [], learnedTriggers: [], requiredRole: 'All Staff', isActive: true, ...extra });
  const none = { context: 'WORKLIST', actionGroupActionIds: new Set<string>() };
  it('is any of: always-on category, current screen, station area, action group; and always requires active', () => {
    expect(isCommandEligible(a({ category: 'NAVIGATION' }), none)).toBe(true);
    expect(isCommandEligible(a({ category: 'WORKLIST' }), none)).toBe(true);
    expect(isCommandEligible(a({}), none)).toBe(false);
    expect(isCommandEligible(a({ stationProfiles: ['Grossing'] }), { ...none, stationProfile: 'Grossing' })).toBe(true);
    expect(isCommandEligible(a({}), { ...none, actionGroupActionIds: new Set(['X']) })).toBe(true);
    expect(isCommandEligible(a({ category: 'NAVIGATION', isActive: false }), none)).toBe(false);
    expect(eligibleCommands([a({ category: 'SYSTEM' }), a({ id: 'Y' })], none).map(x => x.id)).toEqual(['X']);
  });
});
