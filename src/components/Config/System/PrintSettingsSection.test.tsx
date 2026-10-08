// @vitest-environment happy-dom
//
// Batch 451 (PS-233): Print Settings has a Container Label Printer Profile
// dropdown and a Molecular Label Printer Profile dropdown, each listing the
// configured printer profiles, and a Requisition Label Size selector offering
// every preset, full-page included. A choice is saved globally, or to the
// selected facility's override. The merge itself is tested in
// services/printSettings/printSettingsForm.test.ts.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <>{i18nKey}</>,
}));

const h = vi.hoisted(() => ({
  global: {} as Record<string, unknown>,
  override: null as null | { id: string; facilityId: string; overrides: Record<string, unknown>; createdAt: string; updatedAt: string },
  printSettingsService: { get: vi.fn(), update: vi.fn() },
  facilityPrintSettingsService: { getForFacility: vi.fn(), update: vi.fn(), create: vi.fn(), remove: vi.fn() },
  printerProfileService: { getAll: vi.fn() },
}));

vi.mock('@/services/index', () => ({
  printSettingsService: h.printSettingsService,
  facilityPrintSettingsService: h.facilityPrintSettingsService,
  printerProfileService: h.printerProfileService,
}));
vi.mock('@/utils/performingLabs', () => ({ getActivePerformingLabs: async () => [{ id: 'fac-1', name: 'North Lab' }] }));
vi.mock('./CassetteLabelLayoutEditor', () => ({ default: () => null }));

import PrintSettingsSection from './PrintSettingsSection';
import { DEFAULT_PRINT_SETTINGS_CONFIG } from '@/services/printSettings/IPrintSettingsService';
import { LABEL_SIZE_PRESETS } from '@/types/labels/LabelSizePreset';

const PROFILES = [
  { id: 'pp-1', printerId: 'ZEBRA-GROSS-1', model: 'ZT411', bridgeType: 'qz_tray' },
  { id: 'pp-2', printerId: 'BRADY-MOL-2', model: 'i7100', bridgeType: 'agent' },
];

beforeEach(() => {
  h.global = { ...DEFAULT_PRINT_SETTINGS_CONFIG };
  h.override = null;
  h.printSettingsService.get.mockImplementation(async () => ({ ok: true, data: { ...h.global } }));
  h.printSettingsService.update.mockImplementation(async (changes: Record<string, unknown>) => { h.global = { ...h.global, ...changes }; return { ok: true, data: { ...h.global } }; });
  h.facilityPrintSettingsService.getForFacility.mockImplementation(async () => ({ ok: true, data: h.override }));
  h.facilityPrintSettingsService.update.mockImplementation(async (facilityId: string, changes: Record<string, unknown>) => {
    h.override = { id: 'o-1', facilityId, overrides: { ...(h.override?.overrides ?? {}), ...changes }, createdAt: '', updatedAt: '' };
    return { ok: true, data: h.override };
  });
  h.printerProfileService.getAll.mockImplementation(async () => ({ ok: true, data: PROFILES }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const selectIn = (titleKey: string) =>
  screen.getByText(titleKey).closest('.ps-conf-card')!.querySelector('select') as HTMLSelectElement;
const optionValues = (s: HTMLSelectElement) => Array.from(s.options).map(o => o.value);

describe('PrintSettingsSection printer profiles and requisition size (PS-233)', () => {
  it('the Container Label Printer Profile dropdown lists the configured printer profiles after the browser-dialog option', async () => {
    render(<PrintSettingsSection />);
    await screen.findByText('printSettingsSection.containerPrinterProfile.title');
    await waitFor(() => expect(optionValues(selectIn('printSettingsSection.containerPrinterProfile.title'))).toEqual(['', 'pp-1', 'pp-2']));
    const select = selectIn('printSettingsSection.containerPrinterProfile.title');
    expect(select.options[0].textContent).toBe('printSettingsSection.useBrowserDialogOption');
    expect(select.options[1].textContent).toContain('ZEBRA-GROSS-1');
  });

  it('the Molecular Label Printer Profile dropdown lists the same profiles, and a choice is saved globally', async () => {
    render(<PrintSettingsSection />);
    await screen.findByText('printSettingsSection.molecularPrinterProfile.title');
    await waitFor(() => expect(optionValues(selectIn('printSettingsSection.molecularPrinterProfile.title'))).toEqual(['', 'pp-1', 'pp-2']));

    fireEvent.change(selectIn('printSettingsSection.molecularPrinterProfile.title'), { target: { value: 'pp-2' } });
    await waitFor(() => expect(h.printSettingsService.update).toHaveBeenCalledWith({ molecularLabelPrinterProfileId: 'pp-2' }));
    await waitFor(() => expect(selectIn('printSettingsSection.molecularPrinterProfile.title').value).toBe('pp-2'));
  });

  it('choosing a container label printer profile saves it, and choosing the browser dialog clears it', async () => {
    render(<PrintSettingsSection />);
    await screen.findByText('printSettingsSection.containerPrinterProfile.title');
    await waitFor(() => expect(optionValues(selectIn('printSettingsSection.containerPrinterProfile.title'))).toContain('pp-1'));
    fireEvent.change(selectIn('printSettingsSection.containerPrinterProfile.title'), { target: { value: 'pp-1' } });
    await waitFor(() => expect(h.printSettingsService.update).toHaveBeenCalledWith({ containerLabelPrinterProfileId: 'pp-1' }));
    fireEvent.change(selectIn('printSettingsSection.containerPrinterProfile.title'), { target: { value: '' } });
    await waitFor(() => expect(h.printSettingsService.update).toHaveBeenLastCalledWith({ containerLabelPrinterProfileId: undefined }));
  });

  it('the Requisition Label Size selector shows every preset, full-page included, and saves the choice', async () => {
    render(<PrintSettingsSection />);
    await screen.findByText('printSettingsSection.requisitionLabelSize.title');
    const select = selectIn('printSettingsSection.requisitionLabelSize.title');
    expect(optionValues(select)).toEqual(LABEL_SIZE_PRESETS.map(p => p.id));
    expect(optionValues(select)).toEqual(expect.arrayContaining(['requisition_full_page_letter', 'requisition_full_page_a4']));
    expect(select.value).toBe(DEFAULT_PRINT_SETTINGS_CONFIG.requisitionLabelPresetId);

    fireEvent.change(select, { target: { value: 'requisition_full_page_a4' } });
    await waitFor(() => expect(h.printSettingsService.update).toHaveBeenCalledWith({ requisitionLabelPresetId: 'requisition_full_page_a4' }));
    await waitFor(() => expect(selectIn('printSettingsSection.requisitionLabelSize.title').value).toBe('requisition_full_page_a4'));
  });

  it('the Container Label Size selector leaves out the full-page requisition presets', async () => {
    render(<PrintSettingsSection />);
    await screen.findByText('printSettingsSection.containerLabelSize.title');
    const values = optionValues(selectIn('printSettingsSection.containerLabelSize.title'));
    expect(values).not.toContain('requisition_full_page_letter');
    expect(values).not.toContain('requisition_full_page_a4');
  });

  it('for a facility with an override, a choice is saved to the override and shown merged over the global settings', async () => {
    h.global = { ...h.global, containerLabelPrinterProfileId: 'pp-1' };
    h.override = { id: 'o-1', facilityId: 'fac-1', overrides: { requisitionLabelPresetId: 'requisition_sticker_small' }, createdAt: '', updatedAt: '' };
    render(<PrintSettingsSection selectedFacilityId="fac-1" />);
    await screen.findByText('printSettingsSection.molecularPrinterProfile.title');
    await waitFor(() => expect(optionValues(selectIn('printSettingsSection.molecularPrinterProfile.title'))).toContain('pp-2'));
    // Effective values: the override's requisition size, the global container profile.
    expect(selectIn('printSettingsSection.requisitionLabelSize.title').value).toBe('requisition_sticker_small');
    expect(selectIn('printSettingsSection.containerPrinterProfile.title').value).toBe('pp-1');

    fireEvent.change(selectIn('printSettingsSection.molecularPrinterProfile.title'), { target: { value: 'pp-2' } });
    await waitFor(() => expect(h.facilityPrintSettingsService.update).toHaveBeenCalledWith('fac-1', { molecularLabelPrinterProfileId: 'pp-2' }));
    expect(h.printSettingsService.update).not.toHaveBeenCalled();
    await waitFor(() => expect(selectIn('printSettingsSection.molecularPrinterProfile.title').value).toBe('pp-2'));
  });

  it('for a facility still inheriting the global settings, the dropdowns are read-only and nothing is saved', async () => {
    render(<PrintSettingsSection selectedFacilityId="fac-1" />);
    await screen.findByText('printSettingsSection.molecularPrinterProfile.title');
    const select = selectIn('printSettingsSection.molecularPrinterProfile.title');
    expect(select.disabled).toBe(true);
    expect(selectIn('printSettingsSection.requisitionLabelSize.title').disabled).toBe(true);
    fireEvent.change(select, { target: { value: 'pp-2' } });
    await new Promise(r => setTimeout(r, 0));
    expect(h.facilityPrintSettingsService.update).not.toHaveBeenCalled();
    expect(h.printSettingsService.update).not.toHaveBeenCalled();
  });
});
