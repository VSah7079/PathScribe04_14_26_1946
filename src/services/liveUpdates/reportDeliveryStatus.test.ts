// src/services/liveUpdates/reportDeliveryStatus.test.ts
// Batch 521 (PS-281 §3.2.3): fax transmission reports arrive on the live-update connection.
import { describe, it, expect, vi } from 'vitest';
import { LIVE_UPDATES_CONTRACT_VERSION, parseReportDeliveryStatusEvent } from './liveUpdateContract';
import { createLocalLiveUpdateService } from './localLiveUpdateService';

describe('ReportDeliveryStatus', () => {
  const ok = { v: LIVE_UPDATES_CONTRACT_VERSION, eventId: 'e1', queueEntryId: 'rd-1', status: 'TRANSMITTED', occurredAt: '2026-10-10T20:03:00Z' };
  it('only a well-formed event is accepted', () => {
    expect(parseReportDeliveryStatusEvent(ok)).toEqual(ok);
    expect(parseReportDeliveryStatusEvent({ ...ok, detail: 'Busy', status: 'TRANSMISSION_FAILED' })).toMatchObject({ detail: 'Busy' });
    for (const bad of [{ ...ok, status: 'DELIVERED' }, { ...ok, queueEntryId: '' }, { ...ok, v: 99 }, { ...ok, detail: 3 }, null, 'x']) {
      expect(parseReportDeliveryStatusEvent(bad)).toBeNull();
    }
  });
  it('subscribers hear it once; unsubscribing stops it', () => {
    const live = createLocalLiveUpdateService({ channelFactory: () => null });
    const heard = vi.fn();
    const sub = live.subscribeReportDeliveries(heard);
    const event = live.publishReportDeliveryStatus({ queueEntryId: 'rd-1', status: 'TRANSMITTED', eventId: 'e1' });
    live.publishReportDeliveryStatus({ queueEntryId: 'rd-1', status: 'TRANSMITTED', eventId: 'e1' });
    expect(heard).toHaveBeenCalledTimes(1);
    expect(heard).toHaveBeenCalledWith(event);
    sub.unsubscribe();
    live.publishReportDeliveryStatus({ queueEntryId: 'rd-2', status: 'TRANSMISSION_FAILED' });
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
