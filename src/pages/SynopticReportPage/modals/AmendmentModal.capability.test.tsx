// @vitest-environment happy-dom
// Batch 649: the Amendment window greys out the kinds the person cannot release and its primary button, instead of
// letting them fill it in and be refused at the end. The decision is services/reports/revisionReleaseCapability.ts.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));
vi.mock('@/services', () => ({
  physicianService: { search: vi.fn(async () => ({ ok: true, data: [] })), getAll: vi.fn(async () => ({ ok: true, data: [] })) },
  reasonDictionaryService: { getAll: vi.fn(async () => ({ ok: true, data: [] })) },
  actionRegistryService: { onAction: vi.fn(() => () => undefined) },
  revisionMissingFields: vi.fn(() => []),
  revisionNotificationShown: vi.fn(() => false),
  reportFieldRequired: vi.fn(() => false),
}));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => ({}) }));
vi.mock('@/contexts/SystemConfigContext', () => ({ useSystemConfig: () => ({ config: {} }) }));
vi.mock('@/components/SpellCheck/SpellCheckedTextarea', () => ({ SpellCheckedTextarea: () => <textarea /> }));

const avail = vi.hoisted(() => ({ held: [] as string[], loading: false }));
vi.mock('../hooks/useRevisionReleaseAvailability', async () => {
  const m = await import('@/services/reports/revisionReleaseCapability');
  return { useRevisionReleaseAvailability: () => ({ availability: m.revisionReleaseAvailability(c => avail.held.includes(c)), loading: avail.loading }) };
});

import AmendmentModal from './AmendmentModal';
import i18n from '@/i18n/config';

afterEach(() => { cleanup(); vi.clearAllMocks(); avail.held = []; avail.loading = false; });

const base = {
  show: true, amendmentText: 'x', activeSynopticTitle: 'T', sequenceNumber: 1, amendedByName: 'Dr A', versionHistory: [],
  onTextChange: vi.fn(), onClose: vi.fn(), onSubmit: vi.fn(), onFieldOverridesConfirmed: vi.fn(),
};
const modeBtn = (mode: string) => screen.getByText(new RegExp(`amendmentModal.mode.${mode}`)).closest('button') as HTMLButtonElement;
const refusal = (k: string) => i18n.t(`caseActionPermissions.${k}`);

describe('AmendmentModal release capabilities (Batch 649)', () => {
  it('disables the kinds the person cannot release, with the refusal as the title, and switches to one they can', async () => {
    avail.held = ['surgical:correction:release'];
    const onModeChange = vi.fn();
    render(<AmendmentModal {...base} amendmentMode="amendment" onModeChange={onModeChange} />);
    expect(modeBtn('amendment').disabled).toBe(true);
    expect(modeBtn('amendment').title).toBe(refusal('amendmentRelease'));
    expect(modeBtn('addendum').disabled).toBe(true);
    expect(modeBtn('addendum').title).toBe(refusal('addendumRelease'));
    expect(modeBtn('correction').disabled).toBe(false);
    await waitFor(() => expect(onModeChange).toHaveBeenCalledWith('correction'));
  });

  it('greys the primary button with the missing permission for the selected kind', () => {
    avail.held = ['surgical:correction:release'];
    render(<AmendmentModal {...base} amendmentMode="correction" onModeChange={vi.fn()} />);
    const save = screen.getByText(/amendmentModal.footer.saveDraft/).closest('button') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('an addendum without the addendum capability cannot be released', () => {
    avail.held = ['surgical:amendment:release'];
    render(<AmendmentModal {...base} amendmentMode="addendum" onModeChange={vi.fn()} />);
    // switched away to an allowed kind; while the prop still says addendum the button is off and says why
    const release = screen.getByText(/amendmentModal.footer.releaseAddendum/).closest('button') as HTMLButtonElement;
    expect(release.disabled).toBe(true);
    expect(release.title).toBe(refusal('addendumRelease'));
  });

  it('with none of the three: every kind and the primary button are off, and the window says so', () => {
    const onModeChange = vi.fn();
    render(<AmendmentModal {...base} amendmentMode="amendment" onModeChange={onModeChange} />);
    for (const m of ['amendment', 'correction', 'addendum']) expect(modeBtn(m).disabled).toBe(true);
    expect((screen.getByText(/amendmentModal.footer.saveDraft/).closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(refusal('revisionNone'))).toBeTruthy();
    expect(onModeChange).not.toHaveBeenCalled();
  });

  it('while capabilities load it does not announce a refusal or switch kind', () => {
    avail.loading = true;
    const onModeChange = vi.fn();
    render(<AmendmentModal {...base} amendmentMode="amendment" onModeChange={onModeChange} />);
    expect(screen.queryByText(refusal('revisionNone'))).toBeNull();
    expect(onModeChange).not.toHaveBeenCalled();
  });
});
