// @vitest-environment happy-dom
// Batch 650, item 2: Enter Gross / Enter Micro / Enter Diagnosis (spoken through the real registry) reach the section
// editor as a dictation request for their kind of section; other tabs are switched to the Report Draft first.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { actionRegistryService } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { useReportDraftVoiceActions } from './useReportDraftVoiceActions';
import { ORCH_EVENT } from '@/services/voice/reportDraftVoiceActions';
import { pickDictationSection } from '@/services/voice/dictationSectionPicker';

function Harness(p: { enabled?: boolean; leftTab: string; setLeftTab: (t: any) => void }) {
  useReportDraftVoiceActions({ enabled: p.enabled ?? true, leftTab: p.leftTab, setLeftTab: p.setLeftTab });
  return null;
}
const requests: unknown[] = [];
const onDictate = (e: Event) => requests.push((e as CustomEvent).detail);

beforeEach(() => { requests.length = 0; window.addEventListener(ORCH_EVENT.dictate, onDictate); actionRegistryService.setCurrentContext(VOICE_CONTEXT.SYNOPTIC); });
afterEach(() => { cleanup(); window.removeEventListener(ORCH_EVENT.dictate, onDictate); actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST); vi.useRealTimers(); });
const say = (phrase: string) => { const a = actionRegistryService.findActionByTrigger(phrase); expect(a, phrase).toBeTruthy(); actionRegistryService.executeAction(a!, phrase); };

describe('Enter-... commands move dictation into their section', () => {
  it.each([['enter gross', 'gross'], ['enter micro', 'microscopic'], ['enter diagnosis', 'diagnosis']])('"%s" asks for the %s section', (phrase, kind) => {
    render(<Harness leftTab="draft" setLeftTab={() => undefined} />);
    say(phrase);
    expect(requests).toEqual([{ kind }]);
  });
  it('the request finds the right section in a real section list', () => {
    const sections = [{ id: 'a', label: 'Gross', sourcePartId: 'std_body_gross' }, { id: 'b', label: 'Micro', sourcePartId: 'std_body_microscopic' }];
    render(<Harness leftTab="draft" setLeftTab={() => undefined} />);
    say('enter micro');
    expect(pickDictationSection(sections, requests[0] as { kind: 'microscopic' })?.id).toBe('b');
  });
  it('from another tab, shows the Report Draft first and then asks', () => {
    vi.useFakeTimers();
    const setTab = vi.fn();
    render(<Harness leftTab="report" setLeftTab={setTab} />);
    say('enter gross');
    expect(setTab).toHaveBeenCalledWith('draft');
    expect(requests).toEqual([]);
    vi.advanceTimersByTime(100);
    expect(requests).toEqual([{ kind: 'gross' }]);
  });
  it('"open full report" changes the tab, and "dictate section two" asks for the second section', () => {
    const setTab = vi.fn();
    render(<Harness leftTab="draft" setLeftTab={setTab} />);
    say('open full report');
    expect(setTab).toHaveBeenCalledWith('report');
    say('dictate section two');
    expect(requests).toEqual([{ sectionIndex: 1 }]);
  });
  it('does nothing and registers nothing when the Report Draft is not the mode', () => {
    const { unmount } = render(<Harness enabled={false} leftTab="draft" setLeftTab={() => undefined} />);
    expect(actionRegistryService.findActionByTrigger('go to section two')?.id).not.toBe('ORCH_SECTION_2');
    unmount();
  });
  it('unmounting removes the phrases', () => {
    const { unmount } = render(<Harness leftTab="draft" setLeftTab={() => undefined} />);
    expect(actionRegistryService.findActionByTrigger('go to section two')?.id).toBe('ORCH_SECTION_2');
    unmount();
    expect(actionRegistryService.findActionByTrigger('go to section two')?.id).not.toBe('ORCH_SECTION_2');
  });
});
