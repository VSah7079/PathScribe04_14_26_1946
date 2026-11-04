// @vitest-environment happy-dom
// Batch 383 (PS-359): the body release form takes what Release needs from the
// organisation's Field Requirements, needs autopsy:body:release, and Release
// can be said.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));
const { listeners, held, release } = vi.hoisted(() => ({
  listeners: [] as Array<(id: string) => void>, held: { current: true }, release: vi.fn(),
}));
vi.mock('@/services/autopsy/releaseAutopsyBody', () => ({ releaseAutopsyBody: release }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/reportPageChecks')>('@/services/fieldRequirements/reportPageChecks');
  return {
    ...rules, ...checks,
    fieldRequirementService: { forSession: vi.fn(async () => rules.resolveFieldRequirements('report')) },
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
    capabilityDefinition: () => undefined,
    capabilityLabelKey: () => 'x',
  };
});
vi.mock('@/hooks/useCapabilities', () => ({
  useCapabilities: () => ({
    loading: false,
    has: () => held.current,
    decide: () => ({ allowed: held.current, reason: held.current ? 'granted' : 'notGranted', missingRequirements: [] }),
  }),
}));

import AutopsyBodyReleaseForm from './AutopsyBodyReleaseForm';

afterEach(() => { cleanup(); listeners.length = 0; held.current = true; release.mockReset(); });

const details = { jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false },
  padSnapshot: { tier: 'PAD', frozenPayload: {}, signedBy: { name: 'Dr. E. Reed', isPathologist: true }, signedAt: '2026-09-05T14:00:00Z' } } as any;

async function open() {
  const onReleased = vi.fn();
  render(<AutopsyBodyReleaseForm caseId="C1" specimenId="sp-1" autopsyDetails={details} onReleased={onReleased} />);
  await waitFor(() => expect(listeners.length).toBe(1));
  return onReleased;
}
const button = () => screen.getByText('autopsyBodyRelease.submitBtn') as HTMLButtonElement;
const fill = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });

describe('AutopsyBodyReleaseForm, Field Requirements and the release permission (Batch 383)', () => {
  it('Release waits for who received the body and who released it', async () => {
    release.mockResolvedValue({ ok: true });
    const onReleased = await open();
    expect(button().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('fieldRequirements.fields.report.autopsyReleasedTo');
    fill('autopsy-release-to', ' Smith Funeral Home ');
    fill('autopsy-release-by', 'Tech: M. Davis');
    expect(button().disabled).toBe(false);
    fireEvent.click(button());
    await waitFor(() => expect(onReleased).toHaveBeenCalledTimes(1));
    expect(release).toHaveBeenCalledWith('C1', 'sp-1', { releasedTo: 'Smith Funeral Home', releasedByName: 'Tech: M. Davis' });
  });

  it('without autopsy:body:release neither the button nor the voice command releases the body', async () => {
    held.current = false;
    await open();
    fill('autopsy-release-to', 'Smith Funeral Home');
    fill('autopsy-release-by', 'Tech: M. Davis');
    fireEvent.click(button());
    act(() => listeners[0]('AUTOPSY_RELEASE_SUBMIT'));
    expect(release).not.toHaveBeenCalled();
  });

  it('says so when the service refuses for the same reason', async () => {
    release.mockResolvedValue({ ok: false, notPermitted: true, error: 'Releasing an autopsy body needs the autopsy:body:release permission' });
    await open();
    fill('autopsy-release-to', 'Smith Funeral Home');
    fill('autopsy-release-by', 'Tech: M. Davis');
    fireEvent.click(button());
    await waitFor(() => expect(screen.getByText('autopsyBodyRelease.notPermitted')).toBeTruthy());
  });

  it('"release body" releases only when nothing is missing', async () => {
    release.mockResolvedValue({ ok: true });
    const onReleased = await open();
    act(() => listeners[0]('AUTOPSY_RELEASE_SUBMIT'));
    expect(release).not.toHaveBeenCalled();
    fill('autopsy-release-to', 'Smith Funeral Home');
    fill('autopsy-release-by', 'Tech: M. Davis');
    act(() => listeners[0]('AUTOPSY_RELEASE_SUBMIT'));
    await waitFor(() => expect(onReleased).toHaveBeenCalledTimes(1));
  });
});
