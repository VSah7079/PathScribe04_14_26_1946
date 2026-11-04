// @vitest-environment happy-dom
//
// src/pages/ExternalConsultViewPage/ExternalConsultViewPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, closing a noted gap from the PS-290 build: only the service layer
// underneath this page (mockConsultTokenService.test.ts) had test coverage
// — the outside-consultant-facing page itself, the entire reason this
// domain exists, had none.
//
// i18n/cleanup sweep, batch 164: the page gained useTranslation()/Trans
// calls, so this file now follows the established codebase pattern
// (first used in GrossingScreenPage.test.tsx) of mocking react-i18next's
// useTranslation to return the raw key (with interpolation values
// appended as `key:{"opt":"val"}`) rather than loading the real i18n
// config, and mocking Trans to render its own i18nKey — assertions below
// check for key presence, not translated text.
//
// react-router's useParams is mocked directly rather than wrapping in
// a MemoryRouter — this page only ever reads `token` off the URL, it
// never navigates, so a full router isn't needed to exercise its logic.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { ConsultCaseView } from '@/services/consultAccess/consultLinkRules';

// Batch 522: links carry the token after `#`; the path form still works.
const params = vi.hoisted(() => ({ token: undefined as string | undefined }));
vi.mock('react-router', () => ({
  useParams: () => params,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  Trans: ({ i18nKey }: { i18nKey: string }) => i18nKey,
}));

const { openConsult, submitOpinion } = vi.hoisted(() => ({ openConsult: vi.fn(), submitOpinion: vi.fn() }));
// Batch 522: the page asks the token service for the consult view; it reads no case itself.
vi.mock('@/services', () => ({
  consultTokenService: { openConsult, submitOpinion },
}));

function makeView(overrides: Partial<ConsultCaseView> = {}): ConsultCaseView {
  return {
    linkId: 'ctok-1', accessionNumber: 'S26-1234',
    patient: { identity: 'masked', maskedName: 'J*** R**', birthYearMasked: '**-***-1980' },
    specimens: [{ id: 'sp-1', label: 'A', description: 'Left breast, lumpectomy' }],
    slides: [{ id: 'stain-1', label: 'A-1 · H&E' }, { id: 'stain-2', label: 'A-1 · ER' }],
    scopedSlideCount: 0, expiresAt: '2099-01-01T00:00:00.000Z', opinionSigned: false, lifetime: null,
    ...overrides,
  };
}

afterEach(() => { cleanup(); vi.clearAllMocks(); params.token = undefined; window.history.replaceState(null, '', '/'); document.head.querySelectorAll('meta[name="referrer"]').forEach(m => m.remove()); });

async function renderPage(address = '/consult#ct_abc123') {
  window.history.replaceState(null, '', address);
  const { default: ExternalConsultViewPage } = await import('./ExternalConsultViewPage');
  const utils = render(<ExternalConsultViewPage />);
  await act(async () => {});
  return utils;
}

describe('ExternalConsultViewPage', () => {
  it('an invalid, expired or revoked link shows the one uniform denial', async () => {
    openConsult.mockResolvedValue({ ok: false, error: 'CONSULT_LINK_INVALID' });
    await renderPage();
    expect(await screen.findByText('externalConsultViewPage.invalidLink.title')).not.toBeNull();
  });

  it('reads the token from after #, removes it from the address bar, and sends no Referer (Batch 522)', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    await renderPage('/consult#ct_abc123');
    expect(openConsult).toHaveBeenCalledWith('ct_abc123');
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/consult');
    expect(document.head.querySelector('meta[name="referrer"]')?.getAttribute('content')).toBe('no-referrer');
  });

  it('still opens a link issued before Batch 522, with the token in the path', async () => {
    params.token = 'ct_oldstyle';
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    await renderPage('/consult/ct_oldstyle');
    expect(openConsult).toHaveBeenCalledWith('ct_oldstyle');
  });

  it('shows the banner, the case, the patient and exactly the slides the service returned', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    await renderPage();
    expect(await screen.findByText('S26-1234')).not.toBeNull();
    // Batch 669 (access-11): the masked identity, and nothing of the surname or the full date.
    expect(screen.getByText(/J\*\*\* R\*\*/)).not.toBeNull();
    expect(screen.getByText(/externalConsultViewPage\.dobPrefix.*\*\*-\*\*\*-1980/)).not.toBeNull();
    expect(screen.getByText('externalConsultViewPage.identityMaskedNote')).not.toBeNull();
    expect(document.body.innerHTML).not.toContain('Roe');
    expect(document.body.innerHTML).not.toContain('1980-01-01');
    expect(document.querySelector('.ps-extconsult-patient-line')?.getAttribute('data-phi')).toBe('true');
    expect(screen.getByText(/externalConsultViewPage\.fullCaseAccess/)).not.toBeNull();
    expect(screen.getByText('A-1 · H&E')).not.toBeNull();
    expect(screen.getByText('A-1 · ER')).not.toBeNull();
    expect(screen.getByText('externalConsultViewPage.disclosureBanner')).not.toBeNull();
    expect(openConsult).toHaveBeenCalledTimes(1);
  });

  it('a link issued with the identity opt-in shows the full name and date of birth (Batch 669)', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView({ patient: { identity: 'full', lastName: 'Roe', firstName: 'Jane', dateOfBirth: '1980-01-01' } }) });
    await renderPage();
    expect(await screen.findByText(/externalConsultViewPage\.patientName.*Roe/)).not.toBeNull();
    expect(screen.getByText(/externalConsultViewPage\.dobPrefix.*1980-01-01/)).not.toBeNull();
    expect(screen.queryByText('externalConsultViewPage.identityMaskedNote')).toBeNull();
  });

  it('after a signed opinion the banner shows the views and hours the service computed (Batch 669)', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView({ opinionSigned: true, lifetime: { remainingViews: 2, hoursRemaining: 46 } }) });
    await renderPage();
    const banner = await screen.findByRole('status');
    const text = (banner.textContent ?? '').replace(/\\/g, '');
    expect(text).toContain('consultLifetime.banner');
    expect(text).toContain('consultLifetime.views:{"count":2}');
    expect(text).toContain('consultLifetime.hours:{"count":46}');
    expect(banner.className).toBe('ps-extconsult-lifetime-banner');
    expect(banner.getAttribute('style')).toBeNull();
  });

  it('before a signature there is no lifetime banner', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    await renderPage();
    await screen.findByText('S26-1234');
    expect(document.querySelector('.ps-extconsult-lifetime-banner')).toBeNull();
  });

  it('an exhausted or expired link opens nothing and says so', async () => {
    openConsult.mockResolvedValue({ ok: false, error: 'CONSULT_LINK_INVALID' });
    await renderPage();
    expect(await screen.findByText('externalConsultViewPage.invalidLink.title')).not.toBeNull();
    expect(screen.queryByText('S26-1234')).toBeNull();
  });

  it('a slide-scoped link says so', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView({ scopedSlideCount: 1, slides: [{ id: 'stain-2', label: 'A-1 · ER' }] }) });
    await renderPage();
    expect(await screen.findByText(/externalConsultViewPage\.scopedAccess/)).not.toBeNull();
    expect(screen.queryByText('A-1 · H&E')).toBeNull();
  });

  it('an opinion needs text, then goes with the token only; the case and consultant come from the token', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    submitOpinion.mockResolvedValue({ ok: true, data: { id: 'op-1' } });
    await renderPage();
    await screen.findByText('S26-1234');

    fireEvent.click(screen.getByText('externalConsultViewPage.submitOpinionButton'));
    await act(async () => {});
    expect(screen.getByText('externalConsultViewPage.requiredOpinionError')).not.toBeNull();
    expect(submitOpinion).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('externalConsultViewPage.opinionPlaceholder'), { target: { value: 'Concur with invasive ductal carcinoma.' } });
    fireEvent.click(screen.getByText('externalConsultViewPage.submitOpinionButton'));
    await act(async () => {});

    expect(submitOpinion).toHaveBeenCalledWith('ct_abc123', { diagnosticCategory: undefined, signedStatus: 'Draft', opinionText: 'Concur with invasive ductal carcinoma.' });
    expect(screen.getByText('externalConsultViewPage.draftSavedConfirmation')).not.toBeNull();
  });

  it('a Draft says it was saved as a draft and not returned; the form stays so it can be signed (Batch 669)', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    submitOpinion.mockResolvedValue({ ok: true, data: { id: 'op-2' } });
    await renderPage();
    await screen.findByText('S26-1234');
    fireEvent.change(screen.getByPlaceholderText('externalConsultViewPage.opinionPlaceholder'), { target: { value: 'Working view.' } });
    fireEvent.click(screen.getByText('externalConsultViewPage.submitOpinionButton'));
    await act(async () => {});
    expect(screen.getByText('externalConsultViewPage.draftSavedConfirmation')).not.toBeNull();
    expect(screen.queryByText('externalConsultViewPage.opinionSubmittedConfirmation')).toBeNull();
    expect(screen.getByText('externalConsultViewPage.submitOpinionButton')).not.toBeNull();
  });

  it('a Signed opinion still gets the recorded-and-returned confirmation, not the draft one (Batch 669)', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    submitOpinion.mockResolvedValue({ ok: true, data: { id: 'op-3' } });
    await renderPage();
    await screen.findByText('S26-1234');
    fireEvent.click(screen.getByText('externalConsultViewPage.status.signed'));
    fireEvent.change(screen.getByPlaceholderText('externalConsultViewPage.opinionPlaceholder'), { target: { value: 'Final.' } });
    fireEvent.click(screen.getByText('externalConsultViewPage.submitOpinionButton'));
    await act(async () => {});
    expect(screen.getByText('externalConsultViewPage.opinionSubmittedConfirmation')).not.toBeNull();
    expect(screen.queryByText('externalConsultViewPage.draftSavedConfirmation')).toBeNull();
  });

  it('a link revoked meanwhile: the opinion is refused with a translated reason', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView() });
    submitOpinion.mockResolvedValue({ ok: false, error: 'CONSULT_LINK_INVALID' });
    await renderPage();
    await screen.findByText('S26-1234');
    fireEvent.change(screen.getByPlaceholderText('externalConsultViewPage.opinionPlaceholder'), { target: { value: 'Late.' } });
    fireEvent.click(screen.getByText('externalConsultViewPage.submitOpinionButton'));
    await act(async () => {});
    expect(screen.getByText('externalConsultViewPage.errors.linkNoLongerActive')).not.toBeNull();
  });

  it('once a signed opinion is in, the form is replaced by a note', async () => {
    openConsult.mockResolvedValue({ ok: true, data: makeView({ opinionSigned: true }) });
    await renderPage();
    expect(await screen.findByText('externalConsultViewPage.errors.alreadySigned')).not.toBeNull();
    expect(screen.queryByText('externalConsultViewPage.submitOpinionButton')).toBeNull();
  });
});
