import { describe, it, expect } from 'vitest';
import { findExactTriggerMatch } from './findExactTriggerMatch';
import { mockActionRegistryService, norm } from './mockActionRegistryService';

type A = { id: string; phrases: string[] };
const find = (said: string, actions: A[]) => findExactTriggerMatch(said, actions, a => a.phrases, norm)?.id;

describe('findExactTriggerMatch (Batch 628)', () => {
  const open: A = { id: 'open', phrases: ['open'] };
  const messages: A = { id: 'messages', phrases: ['open messages', 'messages'] };

  it('a phrase that is everything said beats a shorter phrase found inside it, whatever the order', () => {
    expect(find('open messages', [open, messages])).toBe('messages');
    expect(find('open messages', [messages, open])).toBe('messages');
  });

  it('when only part is matched, the longer phrase wins', () => {
    expect(find('please open messages now', [open, messages])).toBe('messages');
  });

  it('the bare word still finds its own command', () => {
    expect(find('open', [open, messages])).toBe('open');
  });

  it('a tie goes to the earlier command (screen commands are listed first)', () => {
    expect(find('search', [{ id: 'screen', phrases: ['search'] }, { id: 'global', phrases: ['search'] }])).toBe('screen');
  });

  it('finds nothing for an empty or unmatched phrase', () => {
    expect(find('', [open])).toBeUndefined();
    expect(find('close', [open, messages])).toBeUndefined();
  });
});

describe('on the worklist, the longer commands are no longer swallowed by "open"', () => {
  const find2 = (said: string, language: 'en' | 'fr' | 'de' | 'es' = 'en') => mockActionRegistryService.findActionByTrigger(said, language)?.id;
  it('English, French, German and Spanish', () => {
    mockActionRegistryService.setCurrentContext('WORKLIST');
    expect(find2('open messages')).toBe('OPEN_MESSAGES');
    expect(find2('open configuration')).toBe('OPEN_CONFIGURATION');
    expect(find2('open search')).toBe('OPEN_SEARCH');
    expect(find2('ouvrir les messages', 'fr')).toBe('OPEN_MESSAGES');
    expect(find2('nachrichten öffnen', 'de')).toBe('OPEN_MESSAGES');
    expect(find2('abrir mensajes', 'es')).toBe('OPEN_MESSAGES');
    expect(find2('abrir lista de trabajo', 'es')).toBe('OPEN_WORKLIST');
  });
  it('the worklist\'s own "open" and "open case" still open the selected case', () => {
    mockActionRegistryService.setCurrentContext('WORKLIST');
    expect(find2('open')).toBe('TABLE_OPEN_SELECTED');
    expect(find2('open case')).toBe('TABLE_OPEN_SELECTED');
  });
});
