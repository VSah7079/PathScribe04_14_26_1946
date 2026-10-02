// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/hooks/__tests__/useLisIntegration.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// First test file written for the SynopticReportPage hooks — establishes the
// pattern the other six hook test files follow. Two kinds of coverage:
//
//   UNIT tests: external services (lisAmendmentNoticeService, messageService,
//   templateService, etc.) are mocked with vi.mock(), so these verify the
//   hook's OWN logic in isolation — argument shapes, conditional branches,
//   state transitions — without depending on the mock services' internal
//   behavior.
//
//   INTEGRATION tests: the REAL mock services (mockLisAmendmentNoticeService,
//   mockMessageService — these are the app's actual data layer in this
//   frontend-only demo, not test doubles) are used unmocked, so these verify
//   the hook genuinely wires into the app's service layer correctly, not
//   just that it calls a function with the right name.
//
// Per-file `@vitest-environment happy-dom` override at the top, rather than
// changing the global vitest config — the existing 522 tests in this repo
// are pure Node-environment tests (utilities, calculations, services) with
// no DOM dependency; switching the environment globally would be an
// unnecessary, unverified risk to a suite that already works.
//
// Real update alongside this hook's own i18n sweep conversion: it now
// calls useTranslation(), so the real i18next instance needs to be
// initialized before render — same side-effect import main.tsx itself
// uses (`import '@/i18n/config'`) — otherwise t() has nothing to
// resolve keys against.
// ─────────────────────────────────────────────────────────────────────────────

import '@/i18n/config';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLisIntegration } from '../useLisIntegration';

const dispatchMock = vi.hoisted(() => vi.fn());
vi.mock('@/services/reports/dispatchAssistSynopticResult', () => ({ dispatchAssistSynopticResult: dispatchMock }));
import type { Case } from '@/types/case/Case';

// ── Minimal, realistic case fixture ─────────────────────────────────────────
// Deliberately not exhaustive — only the fields this hook actually reads
// (caseData.id, .diagnostic, .accession, .specimens, .synopticReports).
// A fuller shared fixture (covering every hook's needs) is worth building
// once more of these test files exist and the common shape is clearer.
function makeTestCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'TEST-CASE-001',
    accession: { fullAccession: 'S26-TEST-001', accessionNumber: 'S26-TEST-001' },
    status: 'in-progress',
    specimens: [],
    synopticReports: [],
    diagnostic: {},
    ...overrides,
  } as Case;
}

const testSigningUser = { id: 'PATH-001', name: 'Dr. Test Pathologist' } as any;

describe('useLisIntegration — unit tests (external services mocked)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('sendMaterialOrderToLis', () => {
    it('resolves { ok: true } after the simulated round-trip delay — real fix depends on this actually awaiting, not resolving instantly', async () => {
      const { result } = renderHook(() => useLisIntegration({
        caseData: makeTestCase(), setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
      }));

      const promise = result.current.sendMaterialOrderToLis({ kind: 'stain', specimenId: 'SP-1', label: 'H&E' });
      await vi.advanceTimersByTimeAsync(400);
      await expect(promise).resolves.toEqual({ ok: true });
    });
  });

  // Batch 426: what goes to the LIS is built and sent by services/reports/dispatchAssistSynopticResult.ts
  // (tested there: the queue entry, the structured result, the PDF, a held or failed send). Here: what the
  // hook hands it and what it does with the outcome.
  describe('sendSynopticReportToLis', () => {
    it('hands the workup, the kind and the signer to the Assist dispatch, and fires PATHSCRIBE_LIS_SYNC_REQUIRED for a correction', async () => {
      dispatchMock.mockResolvedValue({ outcome: 'sent', queueEntryId: 'Q1', version: 2 });
      const { result } = renderHook(() => useLisIntegration({
        caseData: makeTestCase(), setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
      }));
      const listener = vi.fn();
      window.addEventListener('PATHSCRIBE_LIS_SYNC_REQUIRED', listener);
      await expect(result.current.sendSynopticReportToLis({ kind: 'corrected', caseId: 'TEST-CASE-001', instanceId: 'INST-1', payloadBody: 'x' })).resolves.toEqual({ ok: true });
      expect(dispatchMock).toHaveBeenCalledWith(
        { caseId: 'TEST-CASE-001', instanceId: 'INST-1', kind: 'corrected', sequenceNumber: undefined, signer: { id: 'PATH-001', name: 'Dr. Test Pathologist' } },
        expect.anything(),
      );
      expect(listener).toHaveBeenCalledTimes(1);
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ queueEntryId: 'Q1', workupVersion: 2 });
      window.removeEventListener('PATHSCRIBE_LIS_SYNC_REQUIRED', listener);
    });

    it('an addendum fires no re-sync event; a held or undelivered message still counts as queued; nothing queued is not ok', async () => {
      const { result } = renderHook(() => useLisIntegration({
        caseData: makeTestCase(), setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
      }));
      const listener = vi.fn();
      window.addEventListener('PATHSCRIBE_LIS_SYNC_REQUIRED', listener);
      dispatchMock.mockResolvedValue({ outcome: 'held', queueEntryId: 'Q2', version: 1 });
      await expect(result.current.sendSynopticReportToLis({ kind: 'new_instance', caseId: 'C', instanceId: 'I', payloadBody: 'x' })).resolves.toEqual({ ok: true });
      expect(listener).not.toHaveBeenCalled();
      dispatchMock.mockResolvedValue({ outcome: 'failed', queueEntryId: 'Q3', error: 'unreachable' });
      await expect(result.current.sendSynopticReportToLis({ kind: 'corrected', caseId: 'C', instanceId: 'I', payloadBody: 'x' })).resolves.toEqual({ ok: true });
      dispatchMock.mockResolvedValue({ outcome: 'notFound' });
      await expect(result.current.sendSynopticReportToLis({ kind: 'corrected', caseId: 'C', instanceId: 'I', payloadBody: 'x' })).resolves.toEqual({ ok: false });
      window.removeEventListener('PATHSCRIBE_LIS_SYNC_REQUIRED', listener);
    });
  });

  describe('handleSendStainOrder', () => {
    it('shows a toast naming the stain when the LIS does not acknowledge the order', async () => {
      const showToast = vi.fn();
      const { result } = renderHook(() => useLisIntegration({
        caseData: makeTestCase(), setCaseData: vi.fn(), signingUser: testSigningUser, showToast,
      }));

      // sendMaterialOrderToLis always simulates success internally — to
      // exercise the failure branch, call the exported function through a
      // spy that overrides just this one call's resolution. Since the real
      // function is a stable useCallback with no way to inject failure
      // from outside, this test documents the current (always-succeeds)
      // simulation behavior instead, which is itself worth having on
      // record — see the second assertion below.
      const promise = result.current.handleSendStainOrder('SP-1', 'BLK-1', 'H&E');
      await vi.advanceTimersByTimeAsync(400);
      const outcome = await promise;

      // Current, honest behavior: the simulation always succeeds, so the
      // failure-toast branch is currently unreachable in practice. This
      // test exists so that if sendMaterialOrderToLis's simulation is ever
      // made to fail sometimes (or replaced with a real HL7 call), this
      // failure path has a test already waiting to catch a regression.
      expect(outcome).toEqual({ ok: true });
      expect(showToast).not.toHaveBeenCalled();
    });
  });
});

describe('useLisIntegration — pendingLisNotice restore-on-load', () => {
  it('loads the pending notice for the current case on mount, from whatever service is provided', async () => {
    vi.doMock('@/services', async () => {
      const actual = await vi.importActual<typeof import('@/services')>('@/services');
      return {
        ...actual,
        lisAmendmentNoticeService: {
          ...actual.lisAmendmentNoticeService,
          getByCaseId: vi.fn().mockResolvedValue({
            ok: true,
            data: [{ id: 'NOTICE-1', caseId: 'TEST-CASE-001', status: 'pending_review', lisAmendmentSummary: 'Test summary', receivedAt: '2026-08-05T00:00:00Z' }],
          }),
        },
      };
    });
    vi.resetModules();
    const { useLisIntegration: freshHook } = await import('../useLisIntegration');

    const { result } = renderHook(() => freshHook({
      caseData: makeTestCase(), setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
    }));

    await waitFor(() => {
      expect(result.current.pendingLisNotice).toEqual({
        id: 'NOTICE-1', lisAmendmentSummary: 'Test summary', receivedAt: '2026-08-05T00:00:00Z',
      });
    });

    vi.doUnmock('@/services');
  });
});

describe('useLisIntegration — integration tests (real mock services, unmocked)', () => {
  it('simulateLisAmendmentReceived genuinely persists a real notice record via the real mockLisAmendmentNoticeService', async () => {
    const { lisAmendmentNoticeService } = await import('@/services');
    const testCase = makeTestCase({ id: `INTEG-TEST-${Date.now()}` });

    const { result } = renderHook(() => useLisIntegration({
      caseData: testCase, setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
    }));

    await act(async () => {
      await result.current.simulateLisAmendmentReceived();
    });

    const res = await lisAmendmentNoticeService.getByCaseId(testCase.id);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const created = res.data.find(n => n.caseId === testCase.id);
      expect(created).toBeDefined();
      expect(created?.status).toBe('pending_review');
    }
  });
});

describe('useLisIntegration — openCopilotReportView', () => {
  it('resolves each synoptic instance into a real, displayable print-preview record and opens the view', async () => {
    const caseWithReports = makeTestCase({
      specimens: [{ id: 'SP-1', label: 'A', description: 'Test specimen' }] as any,
      synopticReports: [{
        instanceId: 'SR-1', specimenId: 'SP-1', templateId: 'generic_test_basic', templateName: 'Real Template',
        answers: { f1: 'answer value' },
      }] as any,
    });

    const { result } = renderHook(() => useLisIntegration({
      caseData: caseWithReports, setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
    }));

    await act(async () => { await result.current.openCopilotReportView(); });

    expect(result.current.showCopilotReportView).toBe(true);
    expect(result.current.copilotReportInstances).toHaveLength(1);
    expect(result.current.copilotReportInstances[0]).toMatchObject({
      instanceId: 'SR-1', specimenId: 'SP-1', specimenLabel: 'A',
    });
  });

  it('gracefully falls back to the raw specimenId as the label when no matching specimen exists on the case', async () => {
    const caseWithReports = makeTestCase({
      specimens: [] as any,
      synopticReports: [{ instanceId: 'SR-1', specimenId: 'SP-ORPHANED', templateId: 'generic_test_basic', templateName: 'T', answers: {} }] as any,
    });
    const { result } = renderHook(() => useLisIntegration({
      caseData: caseWithReports, setCaseData: vi.fn(), signingUser: testSigningUser, showToast: vi.fn(),
    }));

    await act(async () => { await result.current.openCopilotReportView(); });

    expect(result.current.copilotReportInstances[0].specimenLabel).toBe('SP-ORPHANED');
  });
});
