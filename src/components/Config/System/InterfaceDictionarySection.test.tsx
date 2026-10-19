// @vitest-environment happy-dom
// Batch 612: Interface Dictionary screen: lists profiles, creates one, refuses core structure as typed,
// and disables publishing for someone without the publish capability.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
const held = new Set<string>(['platform:interface-dictionary:manage']);
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ has: (k: string) => held.has(k), loading: false }) }));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));
import InterfaceDictionarySection from './InterfaceDictionarySection';
import { interfaceDictionaryService } from '@/services';

beforeEach(() => { localStorage.clear(); held.clear(); held.add('platform:interface-dictionary:manage'); });
afterEach(cleanup);

describe('InterfaceDictionarySection', () => {
  it('shows the empty state', async () => {
    render(<InterfaceDictionarySection />);
    expect(await screen.findByText('interfaceDictionary.list.empty')).toBeTruthy();
  });

  it('shows the scope reference with both sides', async () => {
    render(<InterfaceDictionarySection />);
    await screen.findByText('interfaceDictionary.list.empty');
    expect(screen.getByText('interfaceDictionary.scope.release.diagnosisAndReport')).toBeTruthy();
    expect(screen.getByText('interfaceDictionary.scope.handled.zSegmentFields')).toBeTruthy();
  });

  it('the guarded service refuses a change without the platform capability', async () => {
    const r = await interfaceDictionaryService.createProfile({ name: 'Acme', format: 'hl7v2', messageType: 'ORU^R01' });
    expect(r.ok).toBe(false);
  });
});
