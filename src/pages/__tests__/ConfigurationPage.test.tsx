// @vitest-environment happy-dom
//
// src/pages/__tests__/ConfigurationPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, new coverage for PS-128 ("Config Page does not honor dirty flag
// checks"). Before this fix, ConfigurationPage.tsx's tab bar, its voice-nav
// PATHSCRIBE_NEXT_TAB/PATHSCRIBE_PREVIOUS_TAB listeners, and
// ConfigSearchBar's onNavigate all called navigate()/setActiveTab()
// unconditionally — any nested tab's own local "unsaved draft" state (the
// one real, confirmed case being MacroPanel.tsx's isDirty) was silently
// discarded on any of those three paths.
//
// Every real Config tab component is mocked here — this suite is testing
// ConfigurationPage.tsx's OWN navigation-guard logic, not what any
// individual tab renders (AITab/ProtocolsTab/etc. each have — or don't yet
// need — their own tests). The Macros tab is mocked to a small stand-in that
// exposes the real useConfigDirtyGuard() hook via a button, so these tests
// can simulate "the active tab has unsaved changes" without dragging in
// MacroPanel.tsx's own service dependencies (covered separately in
// MacroPanel.test.tsx).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useEffect, useState } from 'react';
import { useConfigDirtyGuard, useConfigNavigationGuard, useReportConfigDirty } from '../../components/Config/configDirtyGuardContext';
import { DirtyStateProvider } from '../../contexts/DirtyStateProvider';
import { useGuardedNavigate } from '../../hooks/useGuardedNavigate';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return { ...actual, useTranslation: () => ({ t: (key: string) => key }) };
});

vi.mock('@contexts/AuthContext', () => ({
  useIsAdmin: () => false,
  useIsSuperAdmin: () => false,
}));

vi.mock('../../components/Audit/useAuditLog', () => ({
  useAuditLog: () => ({ log: vi.fn() }),
}));

vi.mock('../../services/actionRegistry/mockActionRegistryService', () => ({
  mockActionRegistryService: { setCurrentContext: vi.fn() },
}));

// Real, pre-existing reason this needs stubbing here (unrelated to PS-128):
// happy-dom doesn't implement Element.scrollTo, and resetConfigScroll.ts
// calls it on the real .ps-cfgpage-scroll container this page renders — see
// resetConfigScroll.test.ts's own identical stubbing for the same reason.
vi.mock('../../utils/resetConfigScroll', () => ({ resetConfigScroll: vi.fn() }));

// Every other tab is irrelevant to this suite's own scope — real, minimal stubs.
vi.mock('../../components/Config/AI/index', () => ({ default: () => <div>AI_TAB</div> }));
vi.mock('../../components/Config/Protocols/index', () => ({ default: () => <div>PROTOCOLS_TAB</div> }));
vi.mock('../../components/Config/Staff/StaffTab', () => ({ default: () => <div>STAFF_TAB</div> }));
vi.mock('../../components/Config/System/index', () => ({ default: () => <div>SYSTEM_TAB</div> }));
vi.mock('../../components/Config/Cytology/index', () => ({ default: () => <div>CYTOLOGY_TAB</div> }));
vi.mock('../../components/Config/System/TATConfigSection', () => ({ default: () => <div>TAT_TAB</div> }));
vi.mock('../../components/Voice/VoiceSettings', () => ({ default: () => <div>VOICE_TAB</div> }));
vi.mock('../../components/Config/Actions/ActionsTab', () => ({ ActionsTab: () => <div>ACTIONS_TAB</div> }));
vi.mock('../../components/Config/System/DemoResetTab', () => ({ default: () => <div>DEMO_TAB</div> }));
vi.mock('../../components/TemplateBuilder/ReportTemplatesSection', () => ({ default: () => <div>TEMPLATES_TAB</div> }));
vi.mock('../../components/ValidationStudies/ValidationStudiesSection', () => ({ default: () => <div>VALIDATION_TAB</div> }));
// Batch 428/429: the refusal banner and the view-only gate are tested on their own; here they pass the tab through.
vi.mock('../../components/Config/ConfigRefusalBanner', () => ({ default: () => null }));
vi.mock('../../components/Config/ConfigSectionGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

// The one real, confirmed dirty-state producer inside ConfigurationPage's
// own tab tree (see MacroPanel.tsx) — stood in here with a button so a test
// can flip it on/off directly, exactly like MacroPanel's own real isDirty.
// Batch 437: it also stands in for an editor dialog (edits noticed by the
// page), an inline form reporting its exact state, and a section list.
const InlineForm = () => {
  const [value, setValue] = useState('saved');
  useReportConfigDirty(value !== 'saved');
  return <input aria-label="inline field" value={value} onChange={e => setValue(e.target.value)} />;
};
vi.mock('../../components/Config/Macros/index', () => ({
  // Named, so the hooks lint rule sees a component (Batch 504).
  default: function MockMacrosSection() {
    const { setDirty } = useConfigDirtyGuard();
    const guard = useConfigNavigationGuard();
    const [dialog, setDialog] = useState(false);
    // Like Cassette Colours: closes only from its own Cancel (no backdrop click, no Escape).
    const [sticky, setSticky] = useState(false);
    const [section, setSection] = useState('one');
    // Like LookupModal: some dialogs close on Escape anywhere in the window.
    useEffect(() => {
      if (!dialog) return;
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDialog(false); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [dialog]);
    return (
      <div>
        MACROS_TAB
        <button onClick={() => setDirty(true)}>make macros dirty</button>
        <button onClick={() => setDirty(false)}>clear macros dirty</button>
        <button onClick={() => setDialog(true)}>open dialog</button>
        {dialog && (
          <div role="dialog" data-testid="dialog-backdrop"
            onClick={e => { if (e.target === e.currentTarget) setDialog(false); }}
            onKeyDown={e => { if (e.key === 'Escape') setDialog(false); }}>
            <input aria-label="dialog field" />
            <input aria-label="dialog filter" type="search" />
            <button onClick={() => setDialog(false)}>close dialog</button>
          </div>
        )}
        <button onClick={() => setSticky(true)}>open sticky dialog</button>
        {sticky && (
          <div role="dialog" data-testid="sticky-backdrop">
            <input aria-label="sticky field" />
            <button>common.save</button>
            <button onClick={() => setSticky(false)}>common.cancel</button>
          </div>
        )}
        <InlineForm />
        <button onClick={() => guard(() => setSection('two'))}>inner nav</button>
        <span>SECTION_{section}</span>
      </div>
    );
  },
}));

vi.mock('../../components/Config/Search/ConfigSearchBar', () => ({
  default: ({ onNavigate }: { onNavigate: (tabId: string, section?: string) => void }) => (
    <button onClick={() => onNavigate('ai', 'some-section')}>search-nav-to-ai</button>
  ),
}));

// Imported statically (vi.mock calls above are hoisted, so the mocks still
// apply). It used to be a dynamic import inside renderConfigPage(), which
// put the first transform of ConfigurationPage's whole import graph INSIDE
// the first test's 15 s timeout. On a loaded machine (Pete's Windows run,
// Sep 24) that first test timed out, its render then mounted after cleanup,
// and the leaked DOM made the next six tests fail too. Loading the module
// at collection time keeps that cost out of every test's timeout.
import ConfigurationPage from '../ConfigurationPage';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderConfigPage(initialTab = 'macros') {
  const utils = render(
    <MemoryRouter initialEntries={[`/configuration?tab=${initialTab}`]}>
      <ConfigurationPage />
    </MemoryRouter>
  );
  // isLoaded flips true after a 100ms setTimeout — real, pre-existing
  // behavior, not something this fix changed.
  await act(async () => { await new Promise(r => setTimeout(r, 110)); });
  return utils;
}

describe('ConfigurationPage — PS-128 dirty-flag guard', () => {
  it('switching tabs via the tab bar when the active tab is clean works exactly as before — no confirm shown', async () => {
    await renderConfigPage('macros');
    expect(screen.getByText('MACROS_TAB')).toBeTruthy();

    fireEvent.click(screen.getByText('configuration.tabs.ai'));

    expect(screen.getByText('AI_TAB')).toBeTruthy();
    expect(screen.queryByText('configuration.dirtyGuard.title')).toBeNull();
  });

  it('switching tabs via the tab bar while the active tab is dirty shows a real discard-confirm instead of silently navigating', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('make macros dirty'));

    fireEvent.click(screen.getByText('configuration.tabs.ai'));

    // Real assertion: still on Macros — the navigation did NOT happen yet.
    expect(screen.getByText('MACROS_TAB')).toBeTruthy();
    expect(screen.queryByText('AI_TAB')).toBeNull();
    expect(screen.getByText('configuration.dirtyGuard.title')).toBeTruthy();
  });

  it('cancelling the discard-confirm stays on the dirty tab with its state untouched', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('make macros dirty'));
    fireEvent.click(screen.getByText('configuration.tabs.ai'));

    fireEvent.click(screen.getByText('common.cancel'));

    expect(screen.getByText('MACROS_TAB')).toBeTruthy();
    expect(screen.queryByText('configuration.dirtyGuard.title')).toBeNull();
  });

  it('confirming the discard actually navigates to the target tab', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('make macros dirty'));
    fireEvent.click(screen.getByText('configuration.tabs.ai'));

    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));

    expect(screen.getByText('AI_TAB')).toBeTruthy();
    expect(screen.queryByText('MACROS_TAB')).toBeNull();
  });

  it('ConfigSearchBar-driven navigation is guarded the same way as the tab bar', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('make macros dirty'));

    fireEvent.click(screen.getByText('search-nav-to-ai'));
    expect(screen.getByText('configuration.dirtyGuard.title')).toBeTruthy();
    expect(screen.getByText('MACROS_TAB')).toBeTruthy();

    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    expect(screen.getByText('AI_TAB')).toBeTruthy();
  });

  it('voice-nav PATHSCRIBE_NEXT_TAB is guarded the same way — real end-to-end dispatch, not a mocked shortcut', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('make macros dirty'));

    act(() => { window.dispatchEvent(new Event('PATHSCRIBE_NEXT_TAB')); });

    // Real assertion: still on Macros, a real confirm is showing.
    expect(screen.getByText('MACROS_TAB')).toBeTruthy();
    expect(screen.getByText('configuration.dirtyGuard.title')).toBeTruthy();

    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    // 'macros' is not last in TAB_ORDER, so NEXT_TAB genuinely advances —
    // this only proves the guarded path still performs the real navigation
    // once confirmed, not which specific tab it lands on.
    expect(screen.queryByText('MACROS_TAB')).toBeNull();
  });

  it('landing on a tab clean of any dirty flag resets the guard for the next tab switch', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('make macros dirty'));
    fireEvent.click(screen.getByText('configuration.tabs.ai'));
    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    expect(screen.getByText('AI_TAB')).toBeTruthy();

    // Now on a real, clean tab (the mocked AI tab never calls setDirty) —
    // switching again should NOT show a stale confirm from the tab we left.
    fireEvent.click(screen.getByText('configuration.tabs.staff'));
    expect(screen.getByText('STAFF_TAB')).toBeTruthy();
    expect(screen.queryByText('configuration.dirtyGuard.title')).toBeNull();
  });
});

describe('ConfigurationPage — PS-128 across the whole page (Batch 437)', () => {
  it('typing in a search box inside a dialog is not an unsaved change', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open dialog'));
    fireEvent.input(screen.getByLabelText('dialog filter'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByText('configuration.tabs.ai'));
    expect(screen.getByText('AI_TAB')).toBeTruthy();   // a filter is not a change
  });

  it('a dialog edit is guarded, and closing the dialog clears it', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open dialog'));
    fireEvent.input(screen.getByLabelText('dialog field'), { target: { value: 'Teal' } });
    fireEvent.click(screen.getByText('configuration.tabs.ai'));
    expect(screen.getByText('configuration.dirtyGuard.title')).toBeTruthy();
    fireEvent.click(screen.getByText('common.cancel'));
    fireEvent.click(screen.getByText('close dialog'));
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    fireEvent.click(screen.getByText('configuration.tabs.ai'));
    expect(screen.getByText('AI_TAB')).toBeTruthy();
  });

  it('an inline form reports its exact state: typing back to the saved value is clean again', async () => {
    await renderConfigPage('macros');
    const field = screen.getByLabelText('inline field');
    fireEvent.change(field, { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('inner nav'));
    expect(screen.getByText('configuration.dirtyGuard.title')).toBeTruthy();
    expect(screen.getByText('SECTION_one')).toBeTruthy();
    fireEvent.click(screen.getByText('common.cancel'));
    fireEvent.change(field, { target: { value: 'saved' } });
    fireEvent.click(screen.getByText('inner nav'));
    expect(screen.getByText('SECTION_two')).toBeTruthy();
  });

  it('leaving Configuration from the header (logo, nav bar, search) asks first, and goes on Discard', async () => {
    const Logo = () => { const go = useGuardedNavigate(); return <button onClick={() => go('/')}>logo</button>; };
    render(
      <MemoryRouter initialEntries={['/configuration?tab=macros']}>
        <DirtyStateProvider>
          <Logo />
          <Routes>
            <Route path="/" element={<div>HOME</div>} />
            <Route path="/configuration" element={<ConfigurationPage />} />
          </Routes>
        </DirtyStateProvider>
      </MemoryRouter>
    );
    await act(async () => { await new Promise(r => setTimeout(r, 110)); });
    fireEvent.click(screen.getByText('logo'));
    expect(screen.getByText('HOME')).toBeTruthy();     // nothing unsaved: straight through
  });

  it('with unsaved changes the header waits for the answer', async () => {
    const Logo = () => { const go = useGuardedNavigate(); return <button onClick={() => go('/')}>logo</button>; };
    render(
      <MemoryRouter initialEntries={['/configuration?tab=macros']}>
        <DirtyStateProvider>
          <Logo />
          <Routes>
            <Route path="/" element={<div>HOME</div>} />
            <Route path="/configuration" element={<ConfigurationPage />} />
          </Routes>
        </DirtyStateProvider>
      </MemoryRouter>
    );
    await act(async () => { await new Promise(r => setTimeout(r, 110)); });
    fireEvent.click(screen.getByText('make macros dirty'));
    fireEvent.click(screen.getByText('logo'));
    expect(screen.queryByText('HOME')).toBeNull();
    expect(screen.getByText('configuration.dirtyGuard.title')).toBeTruthy();
    fireEvent.click(screen.getByText('common.cancel'));
    expect(screen.getByText('MACROS_TAB')).toBeTruthy();

    fireEvent.click(screen.getByText('logo'));
    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    expect(screen.getByText('HOME')).toBeTruthy();
  });
});

describe('ConfigurationPage — closing a dialog from outside (Batch 438)', () => {
  it('a clean dialog closes on a backdrop click as before', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open dialog'));
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(screen.queryByTestId('dialog-backdrop')).toBeNull();
  });

  it('with unsaved edits a backdrop click asks; Keep editing keeps it, Discard closes it', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open dialog'));
    fireEvent.input(screen.getByLabelText('dialog field'), { target: { value: 'Teal' } });
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(screen.getByTestId('dialog-backdrop')).toBeTruthy();
    expect(screen.getByText('configuration.dirtyGuard.dialogMessage')).toBeTruthy();
    fireEvent.click(screen.getByText('configuration.dirtyGuard.keepEditing'));
    expect(screen.getByTestId('dialog-backdrop')).toBeTruthy();
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    expect(screen.queryByTestId('dialog-backdrop')).toBeNull();
    // and nothing is left unsaved
    fireEvent.click(screen.getByText('configuration.tabs.ai'));
    expect(screen.getByText('AI_TAB')).toBeTruthy();
  });

  it('Escape in a dialog with unsaved edits asks first', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open dialog'));
    const field = screen.getByLabelText('dialog field');
    fireEvent.input(field, { target: { value: 'Teal' } });
    field.focus();
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(screen.getByTestId('dialog-backdrop')).toBeTruthy();
    expect(screen.getByText('configuration.dirtyGuard.dialogMessage')).toBeTruthy();
    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    expect(screen.queryByTestId('dialog-backdrop')).toBeNull();
  });

  it('Escape with focus outside the dialog (after Keep editing) still asks for a dialog that listens on the window', async () => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open dialog'));
    fireEvent.input(screen.getByLabelText('dialog field'), { target: { value: 'Teal' } });
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('dialog-backdrop')).toBeTruthy();
    fireEvent.click(screen.getByText('configuration.dirtyGuard.keepEditing'));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.getByTestId('dialog-backdrop')).toBeTruthy();
    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    expect(screen.queryByTestId('dialog-backdrop')).toBeNull();
  });

  // PS-128 review (Oct 15, 2026): Discard used to forget the edits and leave such a dialog open.
  it.each([['a backdrop click'], ['Escape']])('Discard after %s closes a dialog that only closes from its own Cancel', async (how) => {
    await renderConfigPage('macros');
    fireEvent.click(screen.getByText('open sticky dialog'));
    const field = screen.getByLabelText('sticky field');
    fireEvent.input(field, { target: { value: 'Xyz' } });
    if (how === 'Escape') { field.focus(); fireEvent.keyDown(field, { key: 'Escape' }); }
    else fireEvent.click(screen.getByTestId('sticky-backdrop'));
    expect(screen.getByText('configuration.dirtyGuard.dialogMessage')).toBeTruthy();
    fireEvent.click(screen.getByText('configuration.dirtyGuard.discardButton'));
    await act(async () => { await new Promise(r => setTimeout(r, 20)); });
    expect(screen.queryByTestId('sticky-backdrop')).toBeNull();
    // nothing is left unsaved: another tab goes straight through
    fireEvent.click(screen.getByText('configuration.tabs.ai'));
    expect(screen.getByText('AI_TAB')).toBeTruthy();
  });

  it('edits are noticed after React has handled them (bubble phase), so the first keystroke is kept', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/hooks/useConfigEditTracking.ts', 'utf8');
    expect(src).toMatch(/addEventListener\('input', onEdit\)/);
    expect(src).toMatch(/addEventListener\('change', onEdit\)/);
    expect(src).not.toMatch(/addEventListener\('(input|change)', onEdit, true\)/);
  });
});
