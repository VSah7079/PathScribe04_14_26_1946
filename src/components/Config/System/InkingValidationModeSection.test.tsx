// @vitest-environment happy-dom
//
// Batch 484 (Structured Inking Sign-Out & Grossing Gate Logic Engine;
// PS-519 follow-up — "Organisation/Site admin UI, full build"). The one
// genuinely missing admin-UI piece this batch's research confirmed: a
// settings screen for the facility-scoped inking_validation_mode.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key) }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u-1', name: 'Dr. Admin' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) =>
    <button type="button" disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('../configDirtyGuardContext', () => ({ useReportConfigDirty: () => {} }));

const h = vi.hoisted(() => {
  const store: Record<string, 'WARN_ONLY' | 'STRICT_ENFORCE'> = {};
  return {
    store,
    facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-1', name: 'North Lab' }, { id: 'fac-2', name: 'South Lab' }] })) },
    getInkingValidationMode: vi.fn((id: string) => store[id] ?? 'WARN_ONLY'),
    setInkingValidationMode: vi.fn(async (id: string, mode: 'WARN_ONLY' | 'STRICT_ENFORCE') => { store[id] = mode; return { ok: true }; }),
  };
});
vi.mock('@/services', () => ({ facilityService: h.facilityService }));
vi.mock('@/services/grossing/inkingSiteSettings', () => ({
  getInkingValidationMode: h.getInkingValidationMode,
  setInkingValidationMode: h.setInkingValidationMode,
}));

import InkingValidationModeSection from './InkingValidationModeSection';

beforeEach(() => { Object.keys(h.store).forEach(k => delete h.store[k]); h.setInkingValidationMode.mockClear(); });
afterEach(cleanup);

describe('InkingValidationModeSection', () => {
  it('lists every facility and defaults to WARN_ONLY for the first one', async () => {
    render(<InkingValidationModeSection />);
    await screen.findByText('North Lab');
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].checked).toBe(true); // WARN_ONLY
    expect(radios[1].checked).toBe(false); // STRICT_ENFORCE
  });

  it('switching to STRICT_ENFORCE and saving calls setInkingValidationMode with the acting user\'s name', async () => {
    render(<InkingValidationModeSection />);
    await screen.findByText('North Lab');
    const strictRadio = screen.getAllByRole('radio')[1];
    fireEvent.click(strictRadio);
    const saveButton = screen.getByText('inkingValidationModeSection.save');
    fireEvent.click(saveButton);
    await waitFor(() => expect(h.setInkingValidationMode).toHaveBeenCalledWith('fac-1', 'STRICT_ENFORCE', 'Dr. Admin'));
  });

  it('switching facility shows that facility\'s own saved mode, not the previous one', async () => {
    h.store['fac-2'] = 'STRICT_ENFORCE';
    render(<InkingValidationModeSection />);
    await screen.findByText('North Lab');
    const facilitySelect = screen.getByRole('combobox');
    fireEvent.change(facilitySelect, { target: { value: 'fac-2' } });
    await waitFor(() => {
      const radios = screen.getAllByRole('radio') as HTMLInputElement[];
      expect(radios[1].checked).toBe(true); // STRICT_ENFORCE
    });
  });

  it('the save button starts disabled until the draft changes', async () => {
    render(<InkingValidationModeSection />);
    await screen.findByText('North Lab');
    const saveButton = screen.getByText('inkingValidationModeSection.save') as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);
  });
});
