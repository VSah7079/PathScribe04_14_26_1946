import { describe, it, expect, beforeEach } from 'vitest';
import { mockActionRegistryService } from './mockActionRegistryService';
import { SPANISH_VOICE_TRIGGERS, withSpanishVoiceTriggers } from './spanishVoiceTriggers';
import type { SystemAction } from './IActionRegistryService';

describe('Spanish voice commands (Batch 627)', () => {
  beforeEach(() => { mockActionRegistryService.setCurrentContext('CONFIGURATION'); });

  it('every command has Spanish phrases, and every Spanish entry belongs to a command', () => {
    const actions = mockActionRegistryService.getActions();
    expect(actions.filter(a => !a.voiceTriggersByLanguage?.es?.length).map(a => a.id)).toEqual([]);
    const ids = new Set(actions.map(a => a.id));
    expect(Object.keys(SPANISH_VOICE_TRIGGERS).filter(id => !ids.has(id))).toEqual([]);
  });

  it('a Spanish profile opens the screens by Spanish phrase', () => {
    const find = (p: string) => mockActionRegistryService.findActionByTrigger(p, 'es')?.id;
    expect(find('abrir lista de trabajo')).toBe('OPEN_WORKLIST');
    expect(find('ir a inicio')).toBe('OPEN_HOME');
    expect(find('abrir mensajes')).toBe('OPEN_MESSAGES');
    expect(find('caso siguiente')).toBe('NEXT_CASE');
    expect(find('cerrar sesión')).toBe('SYSTEM_LOGOUT');
  });

  it('English phrases still work on a Spanish profile (a bilingual user)', () => {
    expect(mockActionRegistryService.findActionByTrigger('open worklist', 'es')?.id).toBe('OPEN_WORKLIST');
  });

  it('Spanish phrases are not heard on an English profile', () => {
    expect(mockActionRegistryService.findActionByTrigger('abrir lista de trabajo', 'en')?.id).not.toBe('OPEN_WORKLIST');
  });

  it('adds Spanish to stored actions that lack it, and keeps phrases an administrator edited', () => {
    const base = { id: 'OPEN_WORKLIST', voiceTriggers: ['open worklist'], voiceTriggersByLanguage: { fr: ['ouvrir'] } } as unknown as SystemAction;
    const edited = { ...base, voiceTriggersByLanguage: { es: ['mi frase'] } } as SystemAction;
    const [a, b] = withSpanishVoiceTriggers([base, edited]);
    expect(a.voiceTriggersByLanguage?.es).toContain('abrir lista de trabajo');
    expect(a.voiceTriggersByLanguage?.fr).toEqual(['ouvrir']);
    expect(b.voiceTriggersByLanguage?.es).toEqual(['mi frase']);
  });
});
