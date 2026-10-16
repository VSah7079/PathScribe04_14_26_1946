// @vitest-environment happy-dom
//
// Batch 451 (PS-212): at accessioning, the "persistent contact bleeding at
// collection" checkbox records the observation on each cytology/FNA specimen
// in the batch, never on a histology specimen. Same setup as
// AccessionPage.e2e.test.tsx: the real seeded mock services on an in-memory
// localStorage; only caseRouter.createCase is spied on.
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

/** Picks a dictionary entry for the last specimen row (the one still showing "Select from dictionary"). */
async function pickForNextRow(entryName: string) {
  await waitFor(() => screen.getAllByText(/accessionPage\.specimens\.selectFromDictionary/));
  const triggers = screen.getAllByText(/accessionPage\.specimens\.selectFromDictionary/);
  fireEvent.click(triggers[triggers.length - 1]);
  await waitFor(() => screen.getByText(entryName));
  fireEvent.click(screen.getByText(entryName));
  await waitFor(() => expect(screen.queryAllByText(entryName).length).toBeGreaterThan(0));
}

async function accessionPapFnaAndKidney(choice: '' | 'yes' | 'no') {
  const createCaseSpy = await renderAndFillCase();
  fireEvent.click(tabButton(/accessionPage\.tabs\.specimens/));
  await pickForNextRow('Cervical/Vaginal Pap Smear');
  fireEvent.click(screen.getByText('accessionPage.specimens.addSpecimen'));
  await pickForNextRow('Thyroid Fine Needle Aspiration');
  fireEvent.click(screen.getByText('accessionPage.specimens.addSpecimen'));
  await pickForNextRow('Kidney Biopsy, Native');

  // The question sits in the Cytology card on the Case & Patient tab (shown
  // once a cytology specimen is chosen). Batch 452: Yes / No / Not recorded.
  fireEvent.click(screen.getByRole('button', { name: 'accessionPage.tabs.casePatient' }));
  const select = await waitFor(() => screen.getByLabelText('accessionPage.cytology.persistentBleeding') as HTMLSelectElement);
  expect(select.value).toBe('');
  if (choice) { fireEvent.change(select, { target: { value: choice } }); expect(select.value).toBe(choice); }

  fireEvent.click(tabButton(/accessionPage\.tabs\.specimens/));
  await waitFor(() => expect(screen.queryByText('accessionPage.actions.submitAccession')).not.toBeNull());
  fireEvent.click(screen.getByText('accessionPage.actions.submitAccession'));
  await waitFor(() => expect(createCaseSpy).toHaveBeenCalled(), { timeout: 4000 });
  return (createCaseSpy.mock.calls[0][0] as any).specimens as any[];
}

describe('AccessionPage persistent contact bleeding (PS-212; three-way since Batch 452)', () => {
  it('Yes records the observation on the cytology and FNA specimens in the batch and not on the histology specimen', async () => {
    const specimens = await accessionPapFnaAndKidney('yes');
    expect(specimens).toHaveLength(3);
    const byEntry = (id: string) => specimens.find(s => s.specimenDictionaryEntryId === id || s.dictionaryEntryId === id);
    expect(byEntry('sp-cyto-pap')?.cytologyScreening).toEqual({ persistentContactBleedingAtCollection: true });
    expect(byEntry('sp-fna-thyroid')?.cytologyScreening).toEqual({ persistentContactBleedingAtCollection: true });
    expect(byEntry('sp-kidney-native-biopsy')?.cytologyScreening).toBeUndefined();
  });

  it('No is recorded as an explicit "no" (false) on the cytology and FNA specimens', async () => {
    const specimens = await accessionPapFnaAndKidney('no');
    const byEntry = (id: string) => specimens.find(s => s.specimenDictionaryEntryId === id || s.dictionaryEntryId === id);
    expect(byEntry('sp-cyto-pap')?.cytologyScreening).toEqual({ persistentContactBleedingAtCollection: false });
    expect(byEntry('sp-fna-thyroid')?.cytologyScreening).toEqual({ persistentContactBleedingAtCollection: false });
    expect(byEntry('sp-kidney-native-biopsy')?.cytologyScreening).toBeUndefined();
  });

  it('left Not recorded, nothing is recorded on any specimen', async () => {
    const specimens = await accessionPapFnaAndKidney('');
    expect(specimens).toHaveLength(3);
    for (const s of specimens) expect(s.cytologyScreening).toBeUndefined();
  });
});
