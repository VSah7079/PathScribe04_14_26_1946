// @vitest-environment happy-dom
// Batch 650, item 1: the Report Draft's spoken commands actually register (the page called registerAction, a method
// the registry did not have), are eligible only on the report screen, run their event, and clash with nothing.
import { describe, it, expect, afterEach, vi } from 'vitest';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { mockActionRegistryService as registry } from '../actionRegistry/mockActionRegistryService';
import { REPORT_DRAFT_VOICE_ACTIONS, ORCH_EVENT } from './reportDraftVoiceActions';
import { VOICE_CONTEXT } from '../../constants/systemActions';
import { normaliseDictation } from './dictationCorrections';

let unregister: (() => void) | undefined;
afterEach(() => { unregister?.(); unregister = undefined; registry.setCurrentContext(VOICE_CONTEXT.WORKLIST); });

describe('Report Draft voice phrases register', () => {
  it('the registry has the method the page needs, and the old name is still absent', () => {
    expect(typeof registry.registerTransientActions).toBe('function');
    expect((registry as unknown as Record<string, unknown>).registerAction).toBeUndefined();
  });

  it('"go to section two" and "dictate gross description" match only after registering, on the report screen', () => {
    registry.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    expect(registry.findActionByTrigger('go to section two')?.id).not.toBe('ORCH_SECTION_2');
    unregister = registry.registerTransientActions(REPORT_DRAFT_VOICE_ACTIONS);
    expect(registry.findActionByTrigger('go to section two')?.id).toBe('ORCH_SECTION_2');
    expect(registry.findActionByTrigger('dictate gross description')?.id).toBe('ORCH_DICTATE_GROSS');
    registry.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    expect(registry.findActionByTrigger('go to section two')?.id).not.toBe('ORCH_SECTION_2');
  });

  it('matches in the other voice languages', () => {
    registry.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    unregister = registry.registerTransientActions(REPORT_DRAFT_VOICE_ACTIONS);
    expect(registry.findActionByTrigger('aller à la section deux', 'fr')?.id).toBe('ORCH_SECTION_2');
    expect(registry.findActionByTrigger('abschnitt zwei diktieren', 'de')?.id).toBe('ORCH_DICTATE_SECTION_2');
    expect(registry.findActionByTrigger('ir a la sección tres', 'es')?.id).toBe('ORCH_SECTION_3');
    expect(registry.findActionByTrigger('섹션 4로 이동', 'ko')?.id).toBe('ORCH_SECTION_4');
  });

  it('executing a registered phrase dispatches its event with its detail', () => {
    registry.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    unregister = registry.registerTransientActions(REPORT_DRAFT_VOICE_ACTIONS);
    const seen: unknown[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(ORCH_EVENT.jump, on);
    registry.executeAction(registry.findActionByTrigger('section two')!);
    window.removeEventListener(ORCH_EVENT.jump, on);
    expect(seen).toEqual([{ index: 1 }]);
  });

  it('unregistering removes them, and they never appear in the stored, editable list', () => {
    unregister = registry.registerTransientActions(REPORT_DRAFT_VOICE_ACTIONS);
    expect(registry.getActions().some(a => a.id.startsWith('ORCH_'))).toBe(false);
    unregister(); unregister = undefined;
    registry.setCurrentContext(VOICE_CONTEXT.SYNOPTIC);
    expect(registry.getEligibleActions().some(a => a.id.startsWith('ORCH_'))).toBe(false);
  });

  it('no phrase of a Report Draft command is also a phrase of another command of the report screen (any language)', () => {
    const owner = new Map<string, string>();
    for (const a of registry.getActions().filter(x => x.isActive && x.category === 'SYNOPTIC')) {
      for (const p of [...a.voiceTriggers, ...Object.values(a.voiceTriggersByLanguage ?? {}).flat()]) owner.set(normaliseDictation(p ?? ''), a.id);
    }
    const clashes: string[] = [];
    const mine = new Map<string, string>();
    for (const d of REPORT_DRAFT_VOICE_ACTIONS) {
      for (const p of [...d.phrases, ...Object.values(d.byLanguage ?? {}).flat()]) {
        const k = normaliseDictation(p);
        if (owner.has(k)) clashes.push(`${d.id}: "${p}" is also ${owner.get(k)}`);
        if (mine.has(k) && mine.get(k) !== d.id) clashes.push(`${d.id}: "${p}" is also ${mine.get(k)}`);
        mine.set(k, d.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('the only always-on commands a Report Draft phrase shadows are Next Tab / Previous Tab (screen wins; Alt+J reaches them)', () => {
    const always = new Map<string, string>();
    for (const a of registry.getActions().filter(x => x.isActive && ['SYSTEM', 'NAVIGATION'].includes(x.category))) {
      for (const p of [...a.voiceTriggers, ...Object.values(a.voiceTriggersByLanguage ?? {}).flat()]) always.set(normaliseDictation(p ?? ''), a.id);
    }
    const shadowed = new Set<string>();
    for (const d of REPORT_DRAFT_VOICE_ACTIONS) for (const p of [...d.phrases, ...Object.values(d.byLanguage ?? {}).flat()]) { const o = always.get(normaliseDictation(p)); if (o) shadowed.add(o); }
    expect([...shadowed].sort()).toEqual(['NEXT_TAB', 'PREVIOUS_TAB']);
  });

  it('every command has phrases in all six voice languages', () => {
    for (const d of REPORT_DRAFT_VOICE_ACTIONS) {
      expect(d.phrases.length, d.id).toBeGreaterThan(0);
      for (const l of ['fr', 'de', 'nl', 'ko', 'es'] as const) expect(d.byLanguage?.[l]?.length, `${d.id} ${l}`).toBeGreaterThan(0);
    }
  });
});
