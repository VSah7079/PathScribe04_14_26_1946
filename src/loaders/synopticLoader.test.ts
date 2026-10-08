// src/loaders/synopticLoader.test.ts
//
// Real, per direct investigation: this loader was previously entirely
// untested, and previously performed no authorization check beyond "does
// this case exist" — see caseAccessControl.test.ts for the thorough,
// direct unit coverage of resolvePediatricAccess/resolveOrchestrationAccess
// themselves. This file instead verifies the actual WIRING: that this
// loader — the real, live case-loading path every navigation to
// /case/:caseId/synoptic funnels through — genuinely calls those
// functions with the right data and genuinely redirects on denial, rather
// than assuming the wiring is correct just because the underlying
// functions are individually correct.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { synopticLoader } from './synopticLoader';

vi.mock('../services/cases/CaseRouter', () => ({
  caseRouter: { getCase: vi.fn() },
}));
vi.mock('../services', () => ({
  facilityService: { getById: vi.fn() },
}));
// Batch 446: the address carries a case reference. These tests pass the case
// id itself, so the reference lookup is a pass-through here; the reference
// handling has its own tests (services/caseAddresses/).
vi.mock('../services/caseAddresses/caseAddressesInstance', () => ({
  caseAddresses: { caseIdOf: vi.fn(async (p: string) => ({ caseId: p, legacy: false })), addressOf: vi.fn() },
}));

import { caseRouter } from '../services/cases/CaseRouter';
import { facilityService } from '../services';

// Real mock, not jsdom (not installed in this project) — a minimal fake
// localStorage giving direct, explicit control over the session
// getSessionUser() reads, matching the established pattern in
// deviceDetection.test.ts's mockSessionStorage.
function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
  });
  return store;
}

function setSession(overrides: Record<string, unknown> = {}) {
  mockLocalStorage({
    'pathscribe-user': JSON.stringify({ id: 'user-1', role: 'pathologist', ...overrides }),
  });
}

function dobForAge(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

const LIS_CASE = { id: 'S26-1', order: {}, patient: {}, reportingMode: 'assist' };
const ORCH_CASE = { id: 'O26-1', order: {}, patient: {}, reportingMode: 'orchestrator' };
const PED_CASE = { id: 'S26-2', order: { facilityId: 'fac-1' }, patient: { dateOfBirth: dobForAge(10) }, reportingMode: 'assist' };
const NO_FACILITY_CASE = { id: 'S26-3', order: {}, patient: { dateOfBirth: dobForAge(10) }, reportingMode: 'assist' };

describe('synopticLoader — real enforcement at the actual case-loading path', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('redirects to /worklist when caseId param is missing', async () => {
    const result: any = await synopticLoader({ params: {} } as any);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe('/worklist');
  });

  it('Batch 396: a case that is not found goes to the neutral no-access screen on /report/:caseId', async () => {
    setSession();
    vi.mocked(caseRouter.getCase).mockResolvedValue(undefined as any);
    const result: any = await synopticLoader({ params: { caseId: 'missing' } } as any);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe('/report/missing');
  });

  it('returns the real case data for an ordinary, unrestricted LIS case', async () => {
    setSession();
    vi.mocked(caseRouter.getCase).mockResolvedValue(LIS_CASE as any);
    const result: any = await synopticLoader({ params: { caseId: 'S26-1' } } as any);
    expect(result).toBe(LIS_CASE);
  });

  it('the real gap this closes: an Orchestration case without canViewOrchestration goes to the same neutral screen as a missing case (Batch 396)', async () => {
    setSession({ canViewOrchestration: false });
    vi.mocked(caseRouter.getCase).mockResolvedValue(ORCH_CASE as any);
    const result: any = await synopticLoader({ params: { caseId: 'O26-1' } } as any);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe('/report/O26-1');
  });

  it('returns the real case data for an Orchestration case when the user genuinely has canViewOrchestration', async () => {
    setSession({ canViewOrchestration: true });
    vi.mocked(caseRouter.getCase).mockResolvedValue(ORCH_CASE as any);
    const result: any = await synopticLoader({ params: { caseId: 'O26-1' } } as any);
    expect(result).toBe(ORCH_CASE);
  });

  it('the real gap this closes: a pediatric-restricted case goes to the same neutral screen as a missing case (Batch 396)', async () => {
    setSession({ canViewPediatric: false });
    vi.mocked(caseRouter.getCase).mockResolvedValue(PED_CASE as any);
    vi.mocked(facilityService.getById).mockResolvedValue({ ok: true, data: { id: 'fac-1', pediatricAgeThreshold: 18, authorizedPediatricPathologistIds: [] } } as any);
    const result: any = await synopticLoader({ params: { caseId: 'S26-2' } } as any);
    expect(result.status).toBe(302);
    expect(result.headers.get('Location')).toBe('/report/S26-2');
  });

  it('returns the real case data when the pediatric gate correctly, genuinely grants access (both conditions met)', async () => {
    setSession({ id: 'authorized-1', canViewPediatric: true });
    vi.mocked(caseRouter.getCase).mockResolvedValue(PED_CASE as any);
    vi.mocked(facilityService.getById).mockResolvedValue({ ok: true, data: { id: 'fac-1', pediatricAgeThreshold: 18, authorizedPediatricPathologistIds: ['authorized-1'] } } as any);
    const result: any = await synopticLoader({ params: { caseId: 'S26-2' } } as any);
    expect(result).toBe(PED_CASE);
  });

  it('does not fetch a facility at all when the case has no order.facilityId — matches the pre-existing "no restriction" behavior, not a new gap', async () => {
    setSession();
    vi.mocked(caseRouter.getCase).mockResolvedValue(NO_FACILITY_CASE as any);
    const result: any = await synopticLoader({ params: { caseId: 'S26-3' } } as any);
    expect(result).toBe(NO_FACILITY_CASE);
    expect(facilityService.getById).not.toHaveBeenCalled();
  });

  it('checks Orchestration before fetching a facility for the pediatric check — an Orchestration-denied case never even reaches the facility lookup', async () => {
    setSession({ canViewOrchestration: false });
    const orchAndPedCase = { id: 'O26-2', order: { facilityId: 'fac-1' }, patient: { dateOfBirth: dobForAge(10) }, reportingMode: 'orchestrator' };
    vi.mocked(caseRouter.getCase).mockResolvedValue(orchAndPedCase as any);
    const result: any = await synopticLoader({ params: { caseId: 'O26-2' } } as any);
    expect(result.headers.get('Location')).toBe('/report/O26-2');
    expect(facilityService.getById).not.toHaveBeenCalled();
  });
});
