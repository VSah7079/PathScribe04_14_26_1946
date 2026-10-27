// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { mockActionRegistryService } from '../actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../../constants/systemActions';
import { ADD_COLLABORATOR_EVENT, spokenName } from './collaboratorCommand';

describe('Add Collaborator through the real registry', () => {
  beforeEach(() => { mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.SYNOPTIC); });
  it('"add collaborator Nguyen" reaches the report screen with the name said', () => {
    const got: Array<string | undefined> = [];
    const h = (e: Event) => got.push((e as CustomEvent).detail?.transcript);
    window.addEventListener(ADD_COLLABORATOR_EVENT, h);
    const action = mockActionRegistryService.findActionByTrigger('add collaborator Nguyen', 'en');
    expect(action?.id).toBe('ADD_COLLABORATOR');
    mockActionRegistryService.executeAction(action!, 'add collaborator Nguyen');
    window.removeEventListener(ADD_COLLABORATOR_EVENT, h);
    expect(got).toEqual(['add collaborator Nguyen']);
  });
  it('the name can be told from the command words in every language', () => {
    const a = mockActionRegistryService.getActionById('ADD_COLLABORATOR')!;
    const phrases = [...a.voiceTriggers, ...Object.values(a.voiceTriggersByLanguage ?? {}).flat()];
    expect(spokenName('ajouter un collaborateur Nguyen', phrases)).toBe('nguyen');
    expect(spokenName('kollaborator hinzufügen Müller', phrases)).toBe('muller');
    expect(spokenName('협업자 추가 Nguyen', phrases)).toBe('nguyen');
  });
});
