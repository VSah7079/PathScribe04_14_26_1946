// @vitest-environment happy-dom
// Batch 612: the Vendor fields panel renders nothing without fields, and shows tagged, Simulated values.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
import { VendorFieldsPanel } from './VendorFieldsPanel';
import { INTERFACE_DICTIONARY_VALUES_KEY } from '@/services/interfaceDictionary/interfaceDictionaryService';
import { storageSet } from '@/services/mockStorage';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('VendorFieldsPanel', () => {
  it('renders nothing when the case has no vendor fields', async () => {
    const { container } = render(<VendorFieldsPanel caseId="c-none" />);
    await new Promise(r => setTimeout(r, 20));
    expect(container.innerHTML).toBe('');
  });

  it('shows fields with the value tagged as patient data and a Simulated badge', async () => {
    storageSet(INTERFACE_DICTIONARY_VALUES_KEY, { c1: [{
      vendorId: 'v1', vendorName: 'Acme', profileVersion: 2, target: 'ext.lotNumber', label: 'Lot number', dataType: 'text',
      value: 'LOT-77', receivedAt: '2026-01-05T10:00:00Z', simulated: true,
    }] });
    render(<VendorFieldsPanel caseId="c1" />);
    const item = await screen.findByTestId('vendor-field-ext.lotNumber');
    expect(item.textContent).toContain('LOT-77');
    expect(item.querySelector('[data-phi]')).toBeTruthy();
    expect(screen.getByText('vendorFields.simulated')).toBeTruthy();
  });
});
