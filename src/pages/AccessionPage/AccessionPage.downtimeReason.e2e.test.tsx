// @vitest-environment happy-dom
//
// Batch 712 (Pete, Oct 28, 2026): with the Temporary / Downtime intake, the Downtime Reason is a required field
// like any other: Submit Accession stays disabled, and the "Still required" line names it, until a reason is
// chosen. Same setup as AccessionPage.contactBleeding.e2e.test.tsx (real seeded mock services, in-memory localStorage).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SystemConfigProvider } from '@/contexts/SystemConfigContext';
import { MessagingProvider } from '@/contexts/MessagingContext';
import { SpecimenDictionaryProvider } from '@/components/Config/System/useSpecimenDictionary';
import { DirtyStateProvider } from '@/contexts/DirtyStateProvider';
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext';
import { VoiceProvider } from '@/contexts/VoiceProvider';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
  // Submitting a cytology accession sends interface messages in the
  // background; no server runs in tests, so answer them here.
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  // Real shape from react-i18next's own initReactI18next.js (type +
  // no-op init) — needed as of caseAccessControl.ts's own i18n
  // conversion, since CaseRouter.ts's import chain now reaches
  // @/i18n/config, which calls i18n.use(initReactI18next) at module
  // load time regardless of whether this test ever exercises the
  // functions that actually call t(). Without this, the mock above
  // (which replaces the whole react-i18next module) leaves that call
  // referencing undefined and crashes at import time.
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'path-1', name: 'Test Pathologist' } }),
  // Batch 430: the voice provider reads who is signed in for their accent.
  useAuthOptional: () => ({ user: { id: 'path-1', name: 'Test Pathologist' } }),
}));
// Batch 649: Submit is greyed without case:accession:create, and the save checks it (createAccessionedCase.test.ts);
// this walkthrough holds it, and the save goes straight to caseRouter.createCase as before.
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));
vi.mock('@/services/accessioning/createAccessionedCase', async () => {
  const { caseRouter } = await import('@/services/cases/CaseRouter');
  return { createAccessionedCase: (c: never) => caseRouter.createCase(c) };
});


// The form up to the Specimens tab: patient, facility and provider (same seeded data as AccessionPage.e2e.test.tsx).
async function renderAndFillCase() {
  const { caseRouter } = await import('@/services/cases/CaseRouter');
  const createCaseSpy = vi.spyOn(caseRouter, 'createCase').mockResolvedValue({ ok: true, data: { id: 'TEST-CASE-1' } } as any);
  const { default: AccessionPage } = await import('./AccessionPage');
  render(
    <MemoryRouter>
      <SystemConfigProvider>
        <MessagingProvider>
          <SpecimenDictionaryProvider>
            <DirtyStateProvider>
              <BreadcrumbProvider>
                <VoiceProvider>
                  <AccessionPage />
                </VoiceProvider>
              </BreadcrumbProvider>
            </DirtyStateProvider>
          </SpecimenDictionaryProvider>
        </MessagingProvider>
      </SystemConfigProvider>
    </MemoryRouter>
  );
  await waitFor(() => screen.getByPlaceholderText('accessionPage.demographics.givenNamesPlaceholder'));
  fireEvent.change(screen.getByPlaceholderText('accessionPage.demographics.givenNamesPlaceholder'), { target: { value: 'Jane' } });
  fireEvent.change(screen.getByPlaceholderText('accessionPage.demographics.familyNamesPlaceholder'), { target: { value: 'Doe' } });
  fireEvent.change(document.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '1980-01-01' } });
  fireEvent.change(document.getElementById('accession-sex') as HTMLSelectElement, { target: { value: 'F' } }); // Batch 661: sex is required, never defaulted
  await waitFor(() => screen.getByText('Metro General Hospital'));
  fireEvent.change(screen.getByLabelText('accessionPage.facility.submittingFacility'), { target: { value: 'c1' } });
  const providerInput = screen.getByPlaceholderText('accessionPage.provider.searchPlaceholder');
  fireEvent.focus(providerInput);
  fireEvent.change(providerInput, { target: { value: 'Williams' } });
  await waitFor(() => screen.getByText('Robert Williams'), { timeout: 2000 });
  fireEvent.mouseDown(screen.getByText('Robert Williams'));
  return createCaseSpy;
}

const tabButton = (key: RegExp) => screen.getAllByText(key).find(el => el.closest('button')?.className.includes('ps-tab-btn'))!.closest('button')!;

async function pickHistologySpecimen() {
  await waitFor(() => screen.getAllByText(/accessionPage\.specimens\.selectFromDictionary/));
  fireEvent.click(screen.getAllByText(/accessionPage\.specimens\.selectFromDictionary/)[0]);
  await waitFor(() => screen.getByText('Kidney Biopsy, Native'));
  fireEvent.click(screen.getByText('Kidney Biopsy, Native'));
  await waitFor(() => expect(screen.queryAllByText('Kidney Biopsy, Native').length).toBeGreaterThan(0));
}
const submitButton = () => screen.getByText('accessionPage.actions.submitAccession').closest('button') as HTMLButtonElement;
const reasonKey = 'fieldRequirements.fields.accession.downtimeReason';

describe('AccessionPage downtime reason blocks Submit Accession (Batch 712)', () => {
  it('Submit is disabled and lists the reason until one is chosen in downtime mode, then enabled', async () => {
    const createCaseSpy = await renderAndFillCase();
    fireEvent.click(screen.getByText(/accessionPage\.intakeSelector\.downtime$/));
    await waitFor(() => screen.getByLabelText(/accessionPage\.intakeSelector\.downtimeReasonLabel/));
    // Case tab: Next is held back and the line names the reason.
    expect((screen.getByText(/accessionPage\.actions\.nextSpecimens/).closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain(reasonKey);

    // Choose a reason: the case tab is complete, Next opens the specimens tab.
    const select = screen.getByLabelText(/accessionPage\.intakeSelector\.downtimeReasonLabel/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: select.options[1].value } });
    expect(select.value).not.toBe('');
    fireEvent.click(tabButton(/accessionPage\.tabs\.specimens/));
    await pickHistologySpecimen();
    await waitFor(() => expect(submitButton().disabled).toBe(false));

    // Clearing the reason blocks Submit again and names it.
    fireEvent.click(screen.getByRole('button', { name: 'accessionPage.tabs.casePatient' }));
    fireEvent.change(screen.getByLabelText(/accessionPage\.intakeSelector\.downtimeReasonLabel/), { target: { value: '' } });
    fireEvent.click(tabButton(/accessionPage\.tabs\.specimens/));
    await waitFor(() => expect(submitButton().disabled).toBe(true));
    expect(screen.getAllByRole('status').map(n => n.textContent).join(' ')).toContain(reasonKey);
    fireEvent.click(submitButton());
    expect(createCaseSpy).not.toHaveBeenCalled();
  });

  it('is not required, and not listed, in standard intake', async () => {
    await renderAndFillCase();
    fireEvent.click(tabButton(/accessionPage\.tabs\.specimens/));
    await pickHistologySpecimen();
    await waitFor(() => expect(submitButton().disabled).toBe(false));
    expect(document.body.textContent).not.toContain(reasonKey);
  });
});
