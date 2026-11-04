// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@/i18n/config';

const h = vi.hoisted(() => ({ update: vi.fn(), audit: vi.fn() }));
vi.mock('@/services', () => ({
  facilityService: { getAll: async () => ({ ok: true, data: [{ id: 'f1', name: 'North Lab', isEnterprise: false, status: 'Active', roles: ['performing_lab'] }, { id: 'e1', name: 'Enterprise', isEnterprise: true, status: 'Active', roles: ['performing_lab'] }, { id: 'c9', name: 'Clinic', status: 'Active', roles: ['client'] }] }) },
  auditService: { logEvent: (e: unknown) => { h.audit(e); return Promise.resolve({ ok: true }); } },
}));
vi.mock('@/services/cases/caseWrite', () => ({ updateCaseWithRetryOrThrow: h.update }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Dr. Reader' } }) }));
vi.mock('@/services/cases/CaseRouter', () => ({ caseRouter: {} }));

import TechnicalComponentFacilityField from './TechnicalComponentFacilityField';

const caseData = { id: 'c1', order: { facilityId: 'f0' } } as never;

describe('TechnicalComponentFacilityField (Batch 606, PS-37)', () => {
  beforeEach(() => h.audit.mockReset());
  beforeEach(() => h.update.mockReset().mockResolvedValue({ ok: true, version: 3, updates: {}, attempts: 1 }));
  afterEach(cleanup);

  it('lists the facilities (not the enterprise) and saves the choice on the case', async () => {
    const onUpdated = vi.fn();
    render(<TechnicalComponentFacilityField caseData={caseData} onUpdated={onUpdated} />);
    await act(async () => {});
    expect(screen.queryByText('Enterprise')).toBeNull();
    expect(screen.queryByText('Clinic')).toBeNull();
    await act(async () => { fireEvent.change(screen.getByLabelText('Technical component facility'), { target: { value: 'f1' } }); });
    expect(h.update).toHaveBeenCalledTimes(1);
    const change = h.update.mock.calls[0][1];
    expect(change({ order: { facilityId: 'f0' } }).order.technicalComponentFacilityId).toBe('f1');
    expect(onUpdated).toHaveBeenCalledWith(expect.objectContaining({ order: expect.objectContaining({ technicalComponentFacilityId: 'f1' }) }), 3);
    expect(screen.getByText('Saved.')).toBeTruthy();
    expect(h.audit).toHaveBeenCalledWith(expect.objectContaining({ event: 'Technical Component Facility Set', caseId: 'c1', user: 'Dr. Reader' }));
  });

  it('says so when the save does not go through', async () => {
    h.update.mockResolvedValue({ ok: false, reason: 'conflict', attempts: 3 });
    render(<TechnicalComponentFacilityField caseData={caseData} onUpdated={vi.fn()} />);
    await act(async () => {});
    await act(async () => { fireEvent.change(screen.getByLabelText('Technical component facility'), { target: { value: 'f1' } }); });
    expect(screen.getByText(/Could not save/)).toBeTruthy();
    expect(h.audit).not.toHaveBeenCalled();
  });
});
