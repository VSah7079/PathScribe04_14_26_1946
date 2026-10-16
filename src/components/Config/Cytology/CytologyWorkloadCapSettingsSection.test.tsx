// @vitest-environment happy-dom
//
// Batch 578 (carried from 576): the Cytology workload cap screen says a cap that
// wasn't saved beside its own field (only that field marked invalid), and its
// add pickers offer only facilities and staff without an override. Services
// are stubs; the rules are tested in services/cytology/cytologyWorkloadCapRules.test.ts.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-admin', name: 'Admin' } }) }));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => undefined }));
vi.mock('@/services/cytology/screeningDayStartSaveDeps', () => ({ screeningDayStartSaveDeps: {} }));

const h = vi.hoisted(() => {
  const state = {
    facilityOverrides: {} as Record<string, unknown>,
    staffOverrides: {} as Record<string, unknown>,
  };
  const outOfRange = (cap: unknown) => !(typeof cap === 'number' && Number.isInteger(cap) && cap >= 1 && cap <= 100);
  return {
    state,
    cytologyWorkloadCapSettingsService: {
      get: vi.fn(async () => ({ ok: true, data: { dailySlideCap: 100, screeningDayStartHour: 0 } })),
      update: vi.fn(async (u: { dailySlideCap?: number }) => (outOfRange(u.dailySlideCap) ? { ok: false, error: 'capOutOfRange' } : { ok: true, data: u })),
    },
    facilityCytologyWorkloadCapOverrideService: {
      getForFacility: vi.fn(async (id: string) => ({ ok: true, data: state.facilityOverrides[id] ?? null })),
      create: vi.fn(async (facilityId: string, overrides: { dailySlideCap: number }) => {
        if (outOfRange(overrides.dailySlideCap)) return { ok: false, error: 'capOutOfRange' };
        state.facilityOverrides[facilityId] = { id: `fo-${facilityId}`, facilityId, overrides, createdAt: '', updatedAt: '' };
        return { ok: true, data: state.facilityOverrides[facilityId] };
      }),
      remove: vi.fn(async (facilityId: string) => { delete state.facilityOverrides[facilityId]; return { ok: true, data: undefined }; }),
    },
    staffCytologyWorkloadCapOverrideService: {
      getForStaff: vi.fn(async (id: string) => ({ ok: true, data: state.staffOverrides[id] ?? null })),
      create: vi.fn(async (staffUserId: string, overrides: { dailySlideCap: number }) => {
        if (outOfRange(overrides.dailySlideCap)) return { ok: false, error: 'capOutOfRange' };
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
  cytologyWorkloadCapSettingsService: h.cytologyWorkloadCapSettingsService,
  facilityCytologyWorkloadCapOverrideService: h.facilityCytologyWorkloadCapOverrideService,
  staffCytologyWorkloadCapOverrideService: h.staffCytologyWorkloadCapOverrideService,
  facilityService: h.facilityService,
  userService: h.userService,
}));

import CytologyWorkloadCapSettingsSection from './CytologyWorkloadCapSettingsSection';

const ADD = 'cytologyQcSettingsSection.addOverrideBtn';
const ERR = 'cytologyWorkloadCapSettingsSection.errors.capOutOfRange';
const addButtons = () => screen.getAllByText(ADD) as HTMLButtonElement[];

beforeEach(() => { h.state.facilityOverrides = {}; h.state.staffOverrides = {}; });
afterEach(cleanup);

describe('CytologyWorkloadCapSettingsSection (Batch 578)', () => {
  it('a facility cap out of range is said beside the facility field, which alone is marked invalid', async () => {
    render(<CytologyWorkloadCapSettingsSection />);
    await waitFor(() => expect(addButtons()[0].disabled).toBe(false));
    fireEvent.click(addButtons()[0]);
    const caps = screen.getAllByLabelText('a11y.fields.dailyCap') as HTMLInputElement[];
    fireEvent.change(caps[0], { target: { value: '150' } });
    fireEvent.click(screen.getAllByText('common.save')[2]);
    const msg = await screen.findByText(ERR);
    expect(msg.id).toBe('ps-cyto-cap-error-facility');
    expect(caps[0].getAttribute('aria-invalid')).toBe('true');
    expect(caps[0].getAttribute('aria-describedby')).toBe('ps-cyto-cap-error-facility');
    const enterprise = screen.getByLabelText('cytologyQcSettingsSection.enterprise.title');
    expect(enterprise.getAttribute('aria-invalid')).toBeNull();
    expect(screen.getAllByText(ERR)).toHaveLength(1);
    // Typing at another tier leaves this message; typing in this field clears it.
    fireEvent.change(enterprise, { target: { value: '90' } });
    expect(screen.getAllByText(ERR)).toHaveLength(1);
    fireEvent.change(caps[0], { target: { value: '80' } });
    expect(screen.queryByText(ERR)).toBeNull();
  });

  it('an enterprise cap out of range is said under the enterprise field only', async () => {
    render(<CytologyWorkloadCapSettingsSection />);
    const enterprise = screen.getByLabelText('cytologyQcSettingsSection.enterprise.title');
    await waitFor(() => expect((enterprise as HTMLInputElement).value).toBe('100'));
    fireEvent.change(enterprise, { target: { value: '0' } });
    fireEvent.click(screen.getAllByText('common.save')[0]);
    const msg = await screen.findByText(ERR);
    expect(msg.id).toBe('ps-cyto-cap-error-enterprise');
    expect(enterprise.getAttribute('aria-invalid')).toBe('true');
  });

  it('the facility picker leaves out facilities that already have an override', async () => {
    h.state.facilityOverrides['fac-1'] = { id: 'fo-fac-1', facilityId: 'fac-1', overrides: { dailySlideCap: 90 }, createdAt: '', updatedAt: '' };
    render(<CytologyWorkloadCapSettingsSection />);
    await screen.findByText('North Lab');
    fireEvent.click(addButtons()[0]);
    const picker = screen.getByLabelText('a11y.fields.facility') as HTMLSelectElement;
    expect([...picker.options].map(o => o.textContent)).toEqual(['South Lab']);
    expect(picker.value).toBe('fac-2');
  });

  it('with everyone overridden, + Add Override is unavailable and says why', async () => {
    h.state.staffOverrides['u-1'] = { id: 'so-u-1', staffUserId: 'u-1', overrides: { dailySlideCap: 80 }, createdAt: '', updatedAt: '' };
    h.state.staffOverrides['u-2'] = { id: 'so-u-2', staffUserId: 'u-2', overrides: { dailySlideCap: 70 }, createdAt: '', updatedAt: '' };
    render(<CytologyWorkloadCapSettingsSection />);
    const note = await screen.findByText('cytologyWorkloadCapSettingsSection.allStaffHaveOverride');
    const staffAdd = addButtons()[1];
    expect(staffAdd.disabled).toBe(true);
    expect(staffAdd.getAttribute('aria-describedby')).toBe(note.id);
    expect(addButtons()[0].disabled).toBe(false);
  });
});
