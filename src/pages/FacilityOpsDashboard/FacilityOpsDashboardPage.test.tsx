// @vitest-environment happy-dom
//
// src/pages/FacilityOpsDashboard/FacilityOpsDashboardPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Real, closing the noted gap in PS-288's own device registry: a
// DisplayProfile's own deviceToken (admin-recorded, see
// components/Config/System/DisplayProfilesSection.tsx) was captured but
// never once consulted anywhere in this page's own binding flow — any
// browser could bind to any profile purely by picking its friendly name
// from a dropdown. No render test existed for this page's binding step
// at all before this file. This still is NOT real physical hardware
// verification (see this page's own header comment) — it closes the
// specific, concrete gap that the recorded token was never checked
// against anything.
//
// Same real mocking conventions as OrSuiteDashboardPage.test.tsx: mocks
// react-i18next to return the raw key (+ interpolation values), mocks
// every service/hook the page imports. The binding hook itself is
// re-implemented with real React state in the mock (rather than a bare
// vi.fn stub) since this page's own switch between ProfileSetup and the
// bound dashboard genuinely depends on that state changing and causing
// a re-render — a stub returning a fixed value could never exercise that.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
}));

vi.mock('@/hooks/useCurrentDisplayProfile', async () => {
  const React = await import('react');
  return {
    useCurrentDisplayProfile: () => {
      const [profileId, setProfileId] = React.useState<string | null>(null);
      return { profileId, setProfileId };
    },
  };
});

const { getActive, getById, verify } = vi.hoisted(() => ({ getActive: vi.fn(), getById: vi.fn(), verify: vi.fn() }));

const { facilityGetAll } = vi.hoisted(() => ({ facilityGetAll: vi.fn() }));
// Batch 506: the page takes displayProfileService from the services index.
vi.mock('@/services', () => ({
  facilityService: { getAll: facilityGetAll },
  displayProfileService: { getActive, getById },
  displayAccessService: { verify },
}));

vi.mock('./viewRegistry', () => ({
  DASHBOARD_VIEW_REGISTRY: {
    grossing_intake: {
      id: 'grossing_intake',
      titleKey: 'facilityOpsDashboard.views.grossingIntake',
      compute: vi.fn().mockResolvedValue({ asOf: '2026-09-18T00:00:00.000Z', facilityId: 'fac-1', stats: [], queue: [], alerts: [] }),
    },
  },
}));

const TOKEN_PROFILE = {
  id: 'dispprof-1', name: 'Histology Bench 3 — Wall Display', facilityId: 'fac-1',
  assignedViews: ['grossing_intake'], deviceToken: 'AA:BB:CC', status: 'Active', createdAt: '2026-01-01T00:00:00.000Z',
};
const NO_TOKEN_PROFILE = {
  id: 'dispprof-2', name: 'Grossing Bay — Wall Display', facilityId: 'fac-1',
  assignedViews: ['grossing_intake'], status: 'Active', createdAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  facilityGetAll.mockResolvedValue({ ok: true, data: [{ id: 'fac-1', name: 'Fenwick General' }] });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderPage() {
  const { default: FacilityOpsDashboardPage } = await import('./FacilityOpsDashboardPage');
  return render(<FacilityOpsDashboardPage />);
}

describe('FacilityOpsDashboardPage — Display Token device binding (Batch 603)', () => {
  const choose = async (id: string) => {
    const option = await screen.findByText('facilityOpsDashboard.selectProfile');
    fireEvent.change(option.closest('select')!, { target: { value: id } });
    await act(async () => {});
  };
  const enter = async (value: string) => {
    fireEvent.change(screen.getByLabelText('displayAccess.tokenLabel'), { target: { value } });
    fireEvent.click(screen.getByText('common.confirm'));
    await act(async () => {});
  };

  it('choosing a profile never binds by itself: the Display Token is asked for first', async () => {
    getActive.mockResolvedValue({ ok: true, data: [NO_TOKEN_PROFILE] });
    getById.mockResolvedValue({ ok: true, data: NO_TOKEN_PROFILE });
    await renderPage();
    await act(async () => {});
    await choose('dispprof-2');

    expect(screen.getByText('displayAccess.promptTitle')).not.toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  it('a token the registry refuses keeps the display unbound and says why', async () => {
    getActive.mockResolvedValue({ ok: true, data: [TOKEN_PROFILE] });
    getById.mockResolvedValue({ ok: true, data: TOKEN_PROFILE });
    verify.mockResolvedValue('revoked');
    await renderPage();
    await act(async () => {});
    await choose('dispprof-1');
    await enter('psd_old');

    expect(screen.getByText('displayAccess.status.revoked')).not.toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });

  it('a valid token binds the display and loads the profile', async () => {
    getActive.mockResolvedValue({ ok: true, data: [TOKEN_PROFILE] });
    getById.mockResolvedValue({ ok: true, data: TOKEN_PROFILE });
    verify.mockResolvedValue('valid');
    await renderPage();
    await act(async () => {});
    await choose('dispprof-1');
    await enter('psd_good');

    expect(verify).toHaveBeenCalledWith('facility-ops', 'dispprof-1', 'psd_good');
    expect(getById).toHaveBeenCalledWith('dispprof-1');
  });

  it('"Back" from the token step returns to the dropdown without binding', async () => {
    getActive.mockResolvedValue({ ok: true, data: [TOKEN_PROFILE] });
    getById.mockResolvedValue({ ok: true, data: TOKEN_PROFILE });
    await renderPage();
    await act(async () => {});

    const option = await screen.findByText('facilityOpsDashboard.selectProfile');
    fireEvent.change(option.closest('select')!, { target: { value: 'dispprof-1' } });
    await act(async () => {});

    fireEvent.click(screen.getByText('common.back'));
    await act(async () => {});

    expect(screen.queryByText('displayAccess.promptTitle')).toBeNull();
    expect(screen.getByText('facilityOpsDashboard.bindDisplayTitle')).not.toBeNull();
    expect(getById).not.toHaveBeenCalled();
  });
});
