// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { mockActionRegistryService } from '../actionRegistry/mockActionRegistryService';
import { VOICE_CONTEXT } from '../../constants/systemActions';
import { GO_TO_ROW_EVENT, OPEN_ACCESSION_EVENT } from './rowCommands';

describe('Worklist row commands through the real registry', () => {
  beforeEach(() => { mockActionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); });
  const say = (phrase: string) => {
    const got: Array<{ type: string; transcript?: string }> = [];
    const h = (e: Event) => got.push({ type: e.type, transcript: (e as CustomEvent).detail?.transcript });
    window.addEventListener(GO_TO_ROW_EVENT, h); window.addEventListener(OPEN_ACCESSION_EVENT, h); window.addEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED', h);
    const action = mockActionRegistryService.findActionByTrigger(phrase, 'en');
    if (action) mockActionRegistryService.executeAction(action, phrase);
    window.removeEventListener(GO_TO_ROW_EVENT, h); window.removeEventListener(OPEN_ACCESSION_EVENT, h); window.removeEventListener('PATHSCRIBE_TABLE_OPEN_SELECTED', h);
    return { action: action?.id, got };
  };
  it('"go to row 7" reaches the Worklist with what was said', () => {
    expect(say('go to row 7')).toEqual({ action: 'TABLE_GO_TO_ROW', got: [{ type: GO_TO_ROW_EVENT, transcript: 'go to row 7' }] });
  });
  it('"open accession A26-4660" is not taken by Open Selected', () => {
    const r = say('open accession A26-4660');
    expect(r.action).toBe('TABLE_OPEN_ACCESSION');
    expect(r.got.map(g => g.type)).toEqual([OPEN_ACCESSION_EVENT]);
  });
  it('plain "open" still opens the highlighted case', () => {
    expect(say('open').action).toBe('TABLE_OPEN_SELECTED');
  });
});
