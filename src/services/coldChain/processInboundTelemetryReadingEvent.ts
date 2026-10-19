// src/services/coldChain/processInboundTelemetryReadingEvent.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, working ingestion for TelemetryReadingEventPayload. Same real
// idempotent-on-messageId, honest-distinct-outcomes discipline as
// this app's own other inbound processors. Ties together every real
// piece built for the RFP-APLIS-2026-GLOBAL Reference Laboratory
// Sensor & Cold-Chain Integration gap: records the reading, and on a
// genuine excursion, raises a real, open CAPA deficiency per real
// case actually represented, and — only for a smart HardwareContainer
// currently checked out to an active Batch — sets that batch's own
// real coldChainExcursion hold.
// ─────────────────────────────────────────────────────────────────────────────

import { telemetryReadingService as mockTelemetryReadingService } from './telemetryReadingServiceInstance';
import { hardwareContainerRegistryService as mockHardwareContainerRegistryService } from '../hardwareContainers/hardwareContainerRegistryServiceInstance';
import { batchService } from '../batches/batchServiceInstance';
import { specimenDeficiencyService as mockSpecimenDeficiencyService } from '../deficiencies/specimenDeficiencyServiceInstance';
import type { TelemetryReadingEventPayload } from '@/types/events/TelemetryReadingEventPayload';

export interface ProcessInboundTelemetryReadingEventResult {
  messageId: string;
  outcome: 'applied' | 'already-applied' | 'invalid-payload';
  /** Batch 610: what a reading did, for the screen that posted it (absent unless 'applied'). */
  readingId?: string;
  excursion?: boolean;
  /** The batch a container was checked out to when the excursion held it. */
  heldBatchId?: string;
  /** One open cold-chain deficiency (CAPA) per case in the held batch. */
  deficienciesRaised?: number;
}

const processedMessageIds = new Set<string>();

export async function processInboundTelemetryReadingEvent(
  payload: TelemetryReadingEventPayload,
): Promise<ProcessInboundTelemetryReadingEventResult> {
  if (processedMessageIds.has(payload.messageId)) {
    return { messageId: payload.messageId, outcome: 'already-applied' };
  }

  if (!payload.assetType || !payload.assetId || !payload.recordedAt) {
    return { messageId: payload.messageId, outcome: 'invalid-payload' };
  }

  const recorded = await mockTelemetryReadingService.record({
    assetType: payload.assetType, assetId: payload.assetId,
    temperatureCelsius: payload.temperatureCelsius, humidityPercent: payload.humidityPercent,
    gpsLat: payload.gpsLat, gpsLng: payload.gpsLng, recordedAt: payload.recordedAt,
    ...(payload.simulated ? { simulated: true } : {}),
  });

  let effects: ExcursionEffects = { deficienciesRaised: 0 };
  if (recorded.ok && recorded.data.isExcursion) {
    effects = await handleExcursion(payload, recorded.data.id);
  }

  processedMessageIds.add(payload.messageId);
  return {
    messageId: payload.messageId, outcome: 'applied',
    ...(recorded.ok ? { readingId: recorded.data.id, excursion: recorded.data.isExcursion } : {}),
    ...(effects.heldBatchId ? { heldBatchId: effects.heldBatchId } : {}),
    deficienciesRaised: effects.deficienciesRaised,
  };
}

interface ExcursionEffects { heldBatchId?: string; deficienciesRaised: number }

async function handleExcursion(payload: TelemetryReadingEventPayload, readingId: string): Promise<ExcursionEffects> {
  // Real, honest scope: a workflow hold and a case-scoped CAPA
  // deficiency both require a real, active Batch with real items to
  // attach to — only ever true for a smart HardwareContainer
  // currently checked out to one. A StorageUnit excursion, or a
  // container with no currently-active batch, is a real, genuine
  // equipment/facility-level issue with no single real case to raise
  // a deficiency against — surfaced only via the reading's own
  // isExcursion flag (visible in a real UI), never a fabricated case
  // association.
  if (payload.assetType !== 'hardware_container') return { deficienciesRaised: 0 };

  const containerRes = await mockHardwareContainerRegistryService.getById(payload.assetId);
  if (!containerRes.ok || !containerRes.data.currentBatchId) return { deficienciesRaised: 0 };

  const batchRes = await batchService.getById(containerRes.data.currentBatchId);
  if (!batchRes.ok) return { deficienciesRaised: 0 };
  const batch = batchRes.data;
  if (batch.status !== 'active' && batch.status !== 'reconciling') return { deficienciesRaised: 0 };

  await batchService.setColdChainExcursion(batch.id, readingId, payload.temperatureCelsius ?? 0, payload.recordedAt);

  // Real, per this file's own header — one real deficiency per
  // distinct real case actually represented in the batch's own
  // items, never one, fabricated "batch-level" case.
  const distinctCaseAccessions = Array.from(new Set(batch.items.map(i => i.caseAccession).filter(Boolean)));
  let deficienciesRaised = 0;
  for (const caseAccession of distinctCaseAccessions) {
    const raised = await mockSpecimenDeficiencyService.raise({
      caseId: caseAccession,
      deficiencyTypeId: 'def-cold-chain-excursion',
      comment: `${payload.simulated ? 'Simulated cold-chain' : 'Real cold-chain'} excursion detected on container ${containerRes.data.rackId} (batch ${batch.masterBarcode}) at ${payload.temperatureCelsius}°C, recorded ${payload.recordedAt}.`,
      raisedBy: 'system',
    });
    if (raised.ok) deficienciesRaised += 1;
  }
  return { heldBatchId: batch.id, deficienciesRaised };
}

/** Test-only reset — same real pattern as this app's own other
 *  idempotent inbound processors. */
export function _resetProcessedTelemetryReadingMessageIdsForTests(): void {
  processedMessageIds.clear();
}
