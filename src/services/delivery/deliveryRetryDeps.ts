// src/services/delivery/deliveryRetryDeps.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 521 (PS-281): the real services the delivery retries use
// (deliveryRetries.ts), and the background work that drives them in the
// browser: a sweep every 30 seconds while PathScribe is open, and the fax
// transmission reports arriving over the live-update connection.
//
// In production the API server runs the same sweep on a schedule (a timer
// trigger: serverless, no waits inside a call) and sends the transmission
// reports; see docs/architecture/REPORT_DELIVERY_API.md.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import type { DeliveryRetryDeps } from './deliveryRetries';
import { applyReportDeliveryStatus, deliveryExceptionRecipients, runDeliveryRetrySweep } from './deliveryRetries';
import { deliveryRetryService } from './deliveryRetryServiceInstance';
import { deliveryRetrySettingsService } from './deliveryRetrySettingsServiceInstance';
import { mockReportDeliveryQueueService } from './mockReportDeliveryQueueService';
import { DEFAULT_RETRY_DELAYS_MINUTES } from './deliveryRetryPolicy';
import type { ReportDeliveryStatusEvent } from '../liveUpdates/liveUpdateContract';

const printQueue = async () => (await import('../printing/printQueueServiceInstance')).printQueueService;

export const deliveryRetryDeps: DeliveryRetryDeps = {
  records: deliveryRetryService,
  async retryDelays() {
    const r = await deliveryRetrySettingsService.get();
    return r.ok ? r.data.delaysMinutes : [...DEFAULT_RETRY_DELAYS_MINUTES];
  },
  now: () => new Date(),
  async retry(kind, entryId) {
    if (kind === 'print') {
      const { retryPrintJobAutomatically } = await import('../printing/redispatchPrintJob');
      const r = await retryPrintJobAutomatically(entryId);
      if (r.outcome === 'dispatched') return { ok: true };
      const job = await (await printQueue()).getById(entryId);
      return { ok: false, error: job.ok ? job.data.errorMessage : undefined };
    }
    const [{ sendReportDelivery }, { reportDeliveryDeps }] = await Promise.all([import('./deliverReport'), import('./reportDeliveryDeps')]);
    const requeued = await mockReportDeliveryQueueService.retryDispatch(entryId);
    if (!requeued.ok) return { ok: false, error: requeued.error };
    const outcome = await sendReportDelivery(requeued.data, reportDeliveryDeps);
    if (outcome === 'sent') return { ok: true };
    const all = await mockReportDeliveryQueueService.getAll();
    return { ok: false, error: all.ok ? all.data.find(e => e.id === entryId)?.errorMessage : undefined };
  },
  async alreadyDelivered(kind, entryId) {
    if (kind === 'print') {
      const job = await (await printQueue()).getById(entryId);
      return job.ok && job.data.status === 'PRINTED';
    }
    const all = await mockReportDeliveryQueueService.getAll();
    const entry = all.ok ? all.data.find(e => e.id === entryId) : undefined;
    return entry?.status === 'SENT' && entry.transmission?.status !== 'TRANSMISSION_FAILED';
  },
  async markExhausted(kind, entryId, error) {
    if (kind === 'print') {
      const q = await printQueue();
      const job = await q.getById(entryId);
      await q.markFailed(entryId, { errorCode: job.ok ? job.data.errorCode ?? 'PRINT_REJECTED' : 'PRINT_REJECTED', errorMessage: `${error} (automatic retries exhausted)`, maxRetriesExceeded: true });
      return;
    }
    await mockReportDeliveryQueueService.markFailed(entryId, { errorCode: 'DISPATCH_REJECTED', errorMessage: `${error} (automatic retries exhausted)`, maxRetriesExceeded: true });
  },
  async notify(record) {
    const [{ mockUserService }, { mockMessageService }] = await Promise.all([import('../users/mockUserService'), import('../messages/mockMessageService')]);
    const users = await mockUserService.getAll();
    const recipients = deliveryExceptionRecipients(users.ok ? users.data as { id: string; roles?: string[]; status?: string; firstName?: string; lastName?: string }[] : []);
    const vars = {
      channel: i18n.t(`deliveryRulesSection.channelNames.${record.channel}`),
      reportType: record.release.reportType,
      count: record.failures,
      error: record.lastError ?? '',
    };
    await Promise.all(recipients.map(u => mockMessageService.send({
      senderId: 'system',
      senderName: i18n.t('deliveryExceptions.alert.sender'),
      recipientId: u.id,
      recipientName: `${(u as { firstName?: string }).firstName ?? ''} ${(u as { lastName?: string }).lastName ?? ''}`.trim(),
      subject: i18n.t('deliveryExceptions.alert.subject', vars),
      body: i18n.t(record.fallbackSentAt ? 'deliveryExceptions.alert.bodyWithFallback' : 'deliveryExceptions.alert.body', vars),
      caseNumber: record.release.caseId,
      timestamp: new Date(),
      isUrgent: true,
    }).catch(() => undefined)));
  },
  async sendFallback(release, channels) {
    const { sendReleaseFallback } = await import('../reports/publishReportReleasedEvent');
    await sendReleaseFallback(release, channels);
  },
};

/** A fax provider's transmission report, applied to its delivery. */
export function applyReportDeliveryStatusLive(event: ReportDeliveryStatusEvent) {
  return applyReportDeliveryStatus(event, {
    ...deliveryRetryDeps,
    async releaseOf(entryId) {
      const all = await mockReportDeliveryQueueService.getAll();
      const e = all.ok ? all.data.find(x => x.id === entryId) : undefined;
      if (!e) return null;
      return {
        release: { caseId: e.caseId, reportType: e.reportType, releasedAt: e.releasedAt, source: e.source, ...(e.release ?? {}) },
        channel: e.channel, role: e.role, fallbackChannels: e.fallbackChannels ?? [],
      };
    },
    async markTransmissionFailed(entryId, detail) {
      await mockReportDeliveryQueueService.setTransmission(entryId, { status: 'TRANSMISSION_FAILED', detail, at: new Date().toISOString() });
      await mockReportDeliveryQueueService.markFailed(entryId, { errorCode: 'DISPATCH_REJECTED', errorMessage: detail, maxRetriesExceeded: false });
    },
  }).then(async outcome => {
    if (outcome === 'confirmed') await mockReportDeliveryQueueService.setTransmission(event.queueEntryId, { status: 'TRANSMITTED', ...(event.detail ? { detail: event.detail } : {}), at: event.occurredAt });
    return outcome;
  });
}

export const DELIVERY_RETRY_SWEEP_MS = 30_000;

/** Starts the browser's delivery background work; returns a stop function. Safe to start more than once (one sweep runs at a time). */
export function startDeliveryBackgroundWork(): () => void {
  const tick = () => { void runDeliveryRetrySweep(deliveryRetryDeps).catch(() => undefined); };
  tick();
  const timer = setInterval(tick, DELIVERY_RETRY_SWEEP_MS);
  let unsubscribe = () => {};
  void import('../liveUpdates/liveUpdateService').then(({ liveUpdateService }) => {
    const sub = liveUpdateService.subscribeReportDeliveries(e => { void applyReportDeliveryStatusLive(e).catch(() => undefined); });
    unsubscribe = () => sub.unsubscribe();
  });
  return () => { clearInterval(timer); unsubscribe(); };
}
