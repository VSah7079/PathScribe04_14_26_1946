// @vitest-environment happy-dom
//
// Batch 721: the Accession screen's two-column layout on a wide window. Same setup as the other
// AccessionPage e2e tests (real seeded mock services on an in-memory localStorage).
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
// Batch 716: this file moves dictionary entries between departments (below), a Configuration change.
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: () => true, decide: () => ({ allowed: true }) }) }));
vi.mock('@/services/accessioning/createAccessionedCase', async () => {
  const { caseRouter } = await import('@/services/cases/CaseRouter');
  return { createAccessionedCase: (c: never) => caseRouter.createCase(c) };
});



// Batch 721 (Pete, Oct 29, 2026): on a wide window the Accession screen shows Case & Patient and
// Specimens side by side; a narrow window keeps the tabs. Layout rule: resolveAccessionPanels.test.ts.
async function renderPage(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide && query.includes('min-width'), media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
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
}

describe('AccessionPage two-column layout (Batch 721)', () => {
  it('wide window: the patient fields and the specimens are on screen together, with no Next or Back button', async () => {
    await renderPage(true);
    expect(document.querySelector('.ps-accession-content--two-col')).not.toBeNull();
    expect(document.querySelectorAll('.ps-accession-columns').length).toBeGreaterThanOrEqual(2); // the headings and the panels
    expect(screen.getByPlaceholderText('accessionPage.demographics.givenNamesPlaceholder')).toBeTruthy();
    expect(screen.getByText('accessionPage.specimens.addSpecimen')).toBeTruthy();
    expect(screen.getByText('accessionPage.actions.submitAccession')).toBeTruthy();
    expect(screen.queryByText(/accessionPage\.actions\.nextSpecimens/)).toBeNull();
    expect(screen.queryByText(/accessionPage\.actions\.back/)).toBeNull();
  });

  it('narrow window: still one tab at a time, with the Next button', async () => {
    await renderPage(false);
    expect(document.querySelector('.ps-accession-content--two-col')).toBeNull();
    expect(screen.getByPlaceholderText('accessionPage.demographics.givenNamesPlaceholder')).toBeTruthy();
    expect(screen.queryByText('accessionPage.specimens.addSpecimen')).toBeNull();
    expect(screen.getByText(/accessionPage\.actions\.nextSpecimens/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'accessionPage.tabs.specimens' }));
    expect(screen.getByText('accessionPage.specimens.addSpecimen')).toBeTruthy();
    expect(screen.queryByPlaceholderText('accessionPage.demographics.givenNamesPlaceholder')).toBeNull();
  });
});
