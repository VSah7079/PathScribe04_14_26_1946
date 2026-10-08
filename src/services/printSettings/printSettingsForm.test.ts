// PS-233 (Batch 451): the Print Settings screen's decisions, and the new
// printer-profile and requisition-size fields saved through the real mock
// services and merged global → facility override.
import { describe, it, expect, beforeEach, vi } from 'vitest';
// These tests are about saving and merging, not who may do it (the
// configuration-write check is tested in authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import {
  containerLabelSizePresets, requisitionLabelSizePresets, isPrintSettingsReadOnly, savePrintSettingsChanges,
} from './printSettingsForm';
import { mockPrintSettingsService } from './mockPrintSettingsService';
import { mockFacilityPrintSettingsService } from './mockFacilityPrintSettingsService';
import { resolveEffectivePrintSettings } from './IFacilityPrintSettingsService';
import { LABEL_SIZE_PRESETS } from '@/types/labels/LabelSizePreset';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

const deps = { printSettingsService: mockPrintSettingsService, facilityPrintSettingsService: mockFacilityPrintSettingsService };

describe('Print Settings label-size options (PS-233)', () => {
  it('the requisition selector offers every preset, including both full-page sizes', () => {
    const ids = requisitionLabelSizePresets().map(p => p.id);
    expect(ids).toEqual(LABEL_SIZE_PRESETS.map(p => p.id));
    expect(ids).toEqual(expect.arrayContaining(['requisition_sticker_small', 'requisition_pouch', 'requisition_full_page_letter', 'requisition_full_page_a4']));
  });

  it('the container selector offers every preset except the full-page requisition sizes', () => {
    const ids = containerLabelSizePresets().map(p => p.id);
    expect(ids).not.toContain('requisition_full_page_letter');
    expect(ids).not.toContain('requisition_full_page_a4');
    expect(ids.length).toBe(LABEL_SIZE_PRESETS.length - 2);
  });
});

describe('Print Settings save target (PS-233)', () => {
  it('a selected facility without an override is read-only; with one, or with no facility selected, it is editable', () => {
    expect(isPrintSettingsReadOnly('fac-1', null)).toBe(true);
    expect(isPrintSettingsReadOnly('fac-1', { id: 'o', facilityId: 'fac-1', overrides: {}, createdAt: '', updatedAt: '' })).toBe(false);
    expect(isPrintSettingsReadOnly(undefined, null)).toBe(false);
  });

  it('with no facility selected, the printer profiles and requisition size are saved globally', async () => {
    const changes = { containerLabelPrinterProfileId: 'pp-container', molecularLabelPrinterProfileId: 'pp-mol', requisitionLabelPresetId: 'requisition_full_page_a4' };
    const res = await savePrintSettingsChanges(changes, undefined, deps);
    expect(res.saved).toBe('global');
    const stored = await mockPrintSettingsService.get();
    expect(stored.ok && stored.data).toMatchObject(changes);
  });

  it('with a facility selected, the change goes to that facility\'s override, and the effective settings merge it over the global ones', async () => {
    await savePrintSettingsChanges({ containerLabelPrinterProfileId: 'pp-global', molecularLabelPrinterProfileId: 'pp-mol-global', requisitionLabelPresetId: 'requisition_pouch' }, undefined, deps);
    const global = await mockPrintSettingsService.get();
    if (!global.ok) throw new Error('global settings');
    await mockFacilityPrintSettingsService.create('fac-1', { ...global.data });

    const res = await savePrintSettingsChanges({ molecularLabelPrinterProfileId: 'pp-mol-fac1', requisitionLabelPresetId: 'requisition_full_page_letter' }, 'fac-1', deps);
    expect(res.saved).toBe('facility');

    const override = await mockFacilityPrintSettingsService.getForFacility('fac-1');
    if (!override.ok) throw new Error('override');
    const effective = resolveEffectivePrintSettings(global.data, override.data);
    expect(effective.molecularLabelPrinterProfileId).toBe('pp-mol-fac1');
    expect(effective.requisitionLabelPresetId).toBe('requisition_full_page_letter');
    expect(effective.containerLabelPrinterProfileId).toBe('pp-global');

    // The global settings are untouched, and another facility (no override) gets them.
    const globalAfter = await mockPrintSettingsService.get();
    if (!globalAfter.ok) throw new Error('global settings');
    expect(globalAfter.data.molecularLabelPrinterProfileId).toBe('pp-mol-global');
    expect(resolveEffectivePrintSettings(globalAfter.data, null).requisitionLabelPresetId).toBe('requisition_pouch');
  });

  it('clearing a printer profile (browser dialog) saves it as unset', async () => {
    await savePrintSettingsChanges({ containerLabelPrinterProfileId: 'pp-container' }, undefined, deps);
    await savePrintSettingsChanges({ containerLabelPrinterProfileId: undefined }, undefined, deps);
    const stored = await mockPrintSettingsService.get();
    expect(stored.ok && stored.data.containerLabelPrinterProfileId).toBeUndefined();
  });

  it('a failed save reports nothing saved', async () => {
    const failing = {
      printSettingsService: { update: vi.fn(async () => ({ ok: false as const, error: 'x' })) },
      facilityPrintSettingsService: { update: vi.fn(async () => ({ ok: false as const, error: 'x' })) },
    };
    expect(await savePrintSettingsChanges({ requisitionLabelPresetId: 'requisition_pouch' }, undefined, failing as never)).toEqual({ saved: false });
    expect(await savePrintSettingsChanges({ requisitionLabelPresetId: 'requisition_pouch' }, 'fac-1', failing as never)).toEqual({ saved: false });
  });
});
