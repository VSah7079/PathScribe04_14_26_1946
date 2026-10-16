// @vitest-environment happy-dom
// src/services/serverJobs/browserStandIns.behaviour.test.ts
// Batch 555: once the API server runs a job (VITE_SERVER_JOBS), the browser doesn't run it too.
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('./browserStandIns', async orig => ({ ...(await orig<typeof import('./browserStandIns')>()), browserRunsServerJob: () => false }));
const delivery = vi.hoisted(() => ({ startDeliveryBackgroundWork: vi.fn(() => () => undefined) }));
const release = vi.hoisted(() => ({ startReleaseBackgroundWork: vi.fn(() => () => undefined) }));
vi.mock('@/services/delivery/deliveryRetryDeps', () => delivery);
vi.mock('@/services/reportRelease/releaseReportDeps', () => release);

import { useDeliveryBackgroundWork } from '@/hooks/useDeliveryBackgroundWork';
import { useReleaseBackgroundWork } from '@/hooks/useReleaseBackgroundWork';
import { loadRegistryExceptions } from '../registrySubmission/registryExceptionsService';
import { sendFollowUpAlertsLive } from '../followUp/followUpLive';
import { refreshCytologyHistologyCorrelationCandidatesLive } from '../cytology/cytologyHistologyCorrelationLive';
import { onReleaseCountdownEnd } from '../reportRelease/releaseCountdown';

describe('jobs the API server runs are not run by the browser too', () => {
  it('no delivery retries or release-delay releases from the app shell', async () => {
    renderHook(() => { useDeliveryBackgroundWork(true); useReleaseBackgroundWork(true); });
    await new Promise(r => setTimeout(r, 20));
    expect(delivery.startDeliveryBackgroundWork).not.toHaveBeenCalled();
    expect(release.startReleaseBackgroundWork).not.toHaveBeenCalled();
  });

  it('the registry worklist lists without escalating', async () => {
    const now = vi.fn(() => new Date());
    const ack = { queues: {} as never, logAudit: vi.fn(), now };
    const rows = await loadRegistryExceptions({ ack, getAll: { cytology: async () => ({ ok: true, data: [] }), cancer: async () => ({ ok: true, data: [] }) } });
    expect(rows).toEqual([]);
    expect(now).not.toHaveBeenCalled(); // the escalation never ran (it starts by reading the time)
  });

  it('no follow-up alerts and no correlation sweep on load', async () => {
    expect(await sendFollowUpAlertsLive()).toBe(0);
    expect(await refreshCytologyHistologyCorrelationCandidatesLive()).toEqual([]);
  });

  it('the report page\'s countdown only reads the case again, until the server has released it', async () => {
    const releaseIfExpired = vi.fn(async () => ({ released: true }));
    expect(await onReleaseCountdownEnd('c1', { releaseIfExpired, readStatus: async () => 'pending-release' })).toBe('waiting');
    expect(await onReleaseCountdownEnd('c1', { releaseIfExpired, readStatus: async () => 'finalized' })).toBe('released');
    expect(releaseIfExpired).not.toHaveBeenCalled();
    expect(await onReleaseCountdownEnd('c1', { releaseIfExpired, readStatus: async () => 'x', runsHere: () => true })).toBe('released');
    expect(releaseIfExpired).toHaveBeenCalledWith('c1');
  });
});
