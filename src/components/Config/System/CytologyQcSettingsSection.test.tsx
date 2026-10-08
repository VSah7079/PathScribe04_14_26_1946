// @vitest-environment happy-dom
//
// Batch 451 (PS-155): the Cytology QC Settings section of Configuration. An
// admin manages both random-selection rates (negative and non-negative GYN
// results) at the enterprise level and in both override tiers (performing
// facility, staff member), and the section is reachable from the
// Configuration search. Services are replaced with stubs; the cascade that
// resolves the effective rate is tested in services/cytology.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));

const h = vi.hoisted(() => {
  const state = {
    enterprise: { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 15 },
    facilityOverrides: {} as Record<string, unknown>,
    staffOverrides: {} as Record<string, unknown>,
  };
  return {
    state,
    cytologyQcSettingsService: {
      get: vi.fn(async () => ({ ok: true, data: { ...state.enterprise } })),
      update: vi.fn(async (u: typeof state.enterprise) => { state.enterprise = { ...state.enterprise, ...u }; return { ok: true, data: state.enterprise }; }),
    },
    facilityCytologyQcOverrideService: {
      getForFacility: vi.fn(async (id: string) => ({ ok: true, data: state.facilityOverrides[id] ?? null })),
      create: vi.fn(async (facilityId: string, overrides: unknown) => {
        state.facilityOverrides[facilityId] = { id: `fo-${facilityId}`, facilityId, overrides, createdAt: '', updatedAt: '' };
        return { ok: true, data: state.facilityOverrides[facilityId] };
      }),
      remove: vi.fn(async (facilityId: string) => { delete state.facilityOverrides[facilityId]; return { ok: true, data: undefined }; }),
    },
    staffCytologyQcOverrideService: {
      getForStaff: vi.fn(async (id: string) => ({ ok: true, data: state.staffOverrides[id] ?? null })),
      create: vi.fn(async (staffUserId: string, overrides: unknown) => {
        state.staffOverrides[staffUserId] = { id: `so-${staffUserId}`, staffUserId, overrides, createdAt: '', updatedAt: '' };
        return { ok: true, data: state.staffOverrides[staffUserId] };
      }),
      remove: vi.fn(async (staffUserId: string) => { delete state.staffOverrides[staffUserId]; return { ok: true, data: undefined }; }),
    },
    facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-1', name: 'North Lab' }, { id: 'fac-2', name: 'South Lab' }] })) },
    userService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'u-1', firstName: 'Ada', lastName: 'Screener' }, { id: 'u-2', firstName: 'Bo', lastName: 'Checker' }] })) },
  };
});

vi.mock('@/services', () => ({
  cytologyQcSettingsService: h.cytologyQcSettingsService,
  facilityCytologyQcOverrideService: h.facilityCytologyQcOverrideService,
  staffCytologyQcOverrideService: h.staffCytologyQcOverrideService,
  facilityService: h.facilityService,
  userService: h.userService,
}));

import CytologyQcSettingsSection from './CytologyQcSettingsSection';
import { CONFIG_SEARCH_INDEX } from '@/constants/configSearchIndex';

beforeEach(() => {
  h.state.enterprise = { negativeRandomSelectionRatePercent: 10, nonNegativeRandomSelectionRatePercent: 15 };
  h.state.facilityOverrides = {};
  h.state.staffOverrides = {};
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const card = (titleKey: string) => screen.getByText(titleKey).closest('.ps-cytqc__card') as HTMLElement;
const rateInputs = (scope: HTMLElement) => within(scope).getAllByRole('spinbutton') as HTMLInputElement[];
const summary = (neg: number, nonNeg: number) => `cytologyQcSettingsSection.rateSummary ${JSON.stringify({ neg, nonNeg })}`;

describe('Cytology QC Settings section (PS-155)', () => {
  it('shows and saves both enterprise rates', async () => {
    render(<CytologyQcSettingsSection />);
    const enterprise = card('cytologyQcSettingsSection.enterprise.title');
    await waitFor(() => expect(rateInputs(enterprise).map(i => i.value)).toEqual(['10', '15']));

    fireEvent.change(rateInputs(enterprise)[0], { target: { value: '12' } });
    fireEvent.change(rateInputs(card('cytologyQcSettingsSection.enterprise.title'))[1], { target: { value: '20' } });
    expect(screen.getByText('cytologyQcSettingsSection.enterprise.unsavedChange')).toBeTruthy();
    fireEvent.click(within(card('cytologyQcSettingsSection.enterprise.title')).getByText('common.save'));

    await waitFor(() => expect(h.cytologyQcSettingsService.update).toHaveBeenCalledWith({
      negativeRandomSelectionRatePercent: 12, nonNegativeRandomSelectionRatePercent: 20,
    }));
    await waitFor(() => expect(screen.queryByText('cytologyQcSettingsSection.enterprise.unsavedChange')).toBeNull());
  });

  it('adds a performing-facility override with both rates, lists it, and removes it', async () => {
    render(<CytologyQcSettingsSection />);
    await screen.findByText('cytologyQcSettingsSection.facility.emptyState');
    fireEvent.click(within(card('cytologyQcSettingsSection.facility.title')).getByText('cytologyQcSettingsSection.addOverrideBtn'));

    const facilityCard = card('cytologyQcSettingsSection.facility.title');
    const select = within(facilityCard).getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.textContent)).toEqual(['North Lab', 'South Lab']);
    fireEvent.change(select, { target: { value: 'fac-2' } });
    // The new override starts from the enterprise rates.
    expect(rateInputs(card('cytologyQcSettingsSection.facility.title')).map(i => i.value)).toEqual(['10', '15']);
    fireEvent.change(rateInputs(card('cytologyQcSettingsSection.facility.title'))[0], { target: { value: '25' } });
    fireEvent.change(rateInputs(card('cytologyQcSettingsSection.facility.title'))[1], { target: { value: '30' } });
    fireEvent.click(within(card('cytologyQcSettingsSection.facility.title')).getByText('common.save'));

    await waitFor(() => expect(h.facilityCytologyQcOverrideService.create).toHaveBeenCalledWith('fac-2', {
      negativeRandomSelectionRatePercent: 25, nonNegativeRandomSelectionRatePercent: 30,
    }));
    const row = (await screen.findByText('South Lab')).closest('.ps-cytqc__row') as HTMLElement;
    expect(within(row).getByText(summary(25, 30))).toBeTruthy();

    fireEvent.click(within(row).getByText('common.remove'));
    await waitFor(() => expect(h.facilityCytologyQcOverrideService.remove).toHaveBeenCalledWith('fac-2'));
    await screen.findByText('cytologyQcSettingsSection.facility.emptyState');
  });

  it('adds a staff-member override with both rates, lists it, and removes it', async () => {
    render(<CytologyQcSettingsSection />);
    await screen.findByText('cytologyQcSettingsSection.staff.emptyState');
    fireEvent.click(within(card('cytologyQcSettingsSection.staff.title')).getByText('cytologyQcSettingsSection.addOverrideBtn'));

    const staffCard = card('cytologyQcSettingsSection.staff.title');
    const select = within(staffCard).getByRole('combobox') as HTMLSelectElement;
    expect(Array.from(select.options).map(o => o.textContent)).toEqual(['Ada Screener', 'Bo Checker']);
    fireEvent.change(select, { target: { value: 'u-1' } });
    fireEvent.change(rateInputs(card('cytologyQcSettingsSection.staff.title'))[0], { target: { value: '50' } });
    fireEvent.change(rateInputs(card('cytologyQcSettingsSection.staff.title'))[1], { target: { value: '40' } });
    fireEvent.click(within(card('cytologyQcSettingsSection.staff.title')).getByText('common.save'));

    await waitFor(() => expect(h.staffCytologyQcOverrideService.create).toHaveBeenCalledWith('u-1', {
      negativeRandomSelectionRatePercent: 50, nonNegativeRandomSelectionRatePercent: 40,
    }));
    const row = (await screen.findByText('Ada Screener')).closest('.ps-cytqc__row') as HTMLElement;
    expect(within(row).getByText(summary(50, 40))).toBeTruthy();

    fireEvent.click(within(row).getByText('common.remove'));
    await waitFor(() => expect(h.staffCytologyQcOverrideService.remove).toHaveBeenCalledWith('u-1'));
    await screen.findByText('cytologyQcSettingsSection.staff.emptyState');
  });

  it('cancelling an override being added saves nothing', async () => {
    render(<CytologyQcSettingsSection />);
    await screen.findByText('cytologyQcSettingsSection.facility.emptyState');
    fireEvent.click(within(card('cytologyQcSettingsSection.facility.title')).getByText('cytologyQcSettingsSection.addOverrideBtn'));
    fireEvent.click(within(card('cytologyQcSettingsSection.facility.title')).getByText('common.cancel'));
    expect(h.facilityCytologyQcOverrideService.create).not.toHaveBeenCalled();
    expect(screen.getByText('cytologyQcSettingsSection.facility.emptyState')).toBeTruthy();
  });
});

// The Configuration search entry leads to this section: the entry points at
// the Cytology tab's cytology_qc_settings section, and the Cytology tab opened
// with ?section=cytology_qc_settings shows it.
vi.mock('../ConfigSectionGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
for (const [path, name] of [
  ['./CytologyCategoriesSection', 'cats'], ['./SnomedCervicalHistologySeverityMappingSection', 'snomed'],
  ['../Cytology/CytologyNomenclatureSettingsSection', 'nomenclature'], ['../Cytology/CytologyRegistrySettingsSection', 'registry'],
  ['../Cytology/CytologyRoutingSettingsSection', 'routing'], ['../Cytology/CytologyScreeningStrategySection', 'strategy'],
  ['../Cytology/CytologyWorkloadCapSettingsSection', 'workload'], ['../Cytology/CytologyComplianceFeaturesSection', 'compliance'],
  ['../Cytology/CytologyInstrumentationSection', 'instrumentation'], ['../Cytology/NonGynCytologyCategoriesSection', 'nongyn'],
] as const) {
  vi.doMock(path, () => ({ default: () => <div>{`stub-${name}`}</div> }));
}

describe('Cytology QC Settings is findable through Configuration search (PS-155)', () => {
  it('the sys-cytology-qc search entry points at the Cytology tab\'s QC settings section', () => {
    const entry = CONFIG_SEARCH_INDEX.find(e => e.id === 'sys-cytology-qc');
    expect(entry).toBeDefined();
    expect(entry!.tabId).toBe('cytology');
    expect(entry!.section).toBe('cytology_qc_settings');
    expect(entry!.synonyms).toEqual(expect.arrayContaining(['rescreening', 'random selection', 'qc rate']));
  });

  it('the Cytology tab opened at that section shows the Cytology QC Settings screen', async () => {
    const { default: CytologyTab } = await import('../Cytology');
    render(<MemoryRouter initialEntries={['/configuration?tab=cytology&section=cytology_qc_settings']}><CytologyTab /></MemoryRouter>);
    expect(await screen.findByText('cytologyQcSettingsSection.title')).toBeTruthy();
    expect(screen.getByText('cytologyQcSettingsSection.enterprise.title')).toBeTruthy();
  });
});
