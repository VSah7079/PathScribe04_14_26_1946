// src/services/coldChain/simulatedTelemetryFeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (queue entries #17 and #123): a labelled Simulated telemetry feed.
// No MQTT/IoT/REST endpoint or reading store exists yet (server work), so a
// person can post one temperature reading for a smart container or a storage
// unit from the screen. It goes through the same ingestion service a real sensor
// feed will use (processInboundTelemetryReadingEvent), so the excursion rule,
// the batch hold and the open CAPA deficiency all behave as they will for real.
//
//   • Needs batch:cold-chain-reading:simulate (checked here).
//   • The reading is stored with `simulated: true`; the screens label it Simulated.
//   • The audit entry says SIMULATED and names the asset and the result, never a
//     patient. Cases held back by an excursion are counted, not named.
// ─────────────────────────────────────────────────────────────────────────────

import { authorizationService } from '../authorization/defaultAuthorizationService';
import { auditService } from '../auditlog/auditServiceInstance';
import { processInboundTelemetryReadingEvent } from './processInboundTelemetryReadingEvent';
import type { MonitoredAssetType } from './ITelemetryReadingService';

export interface SimulatedReadingInput {
  assetType: MonitoredAssetType;
  assetId: string;
  /** Shown in the audit entry (the unit name or rack id). */
  assetLabel: string;
  temperatureCelsius: number;
  user: string;
}

export type SimulatedReadingResult =
  | { ok: true; readingId: string; excursion: boolean; heldBatchId?: string; deficienciesRaised: number }
  | { ok: false; error: 'notPermitted' | 'invalidTemperature' | 'notRecorded' };

export async function postSimulatedTelemetryReading(input: SimulatedReadingInput): Promise<SimulatedReadingResult> {
  if (!Number.isFinite(input.temperatureCelsius)) return { ok: false, error: 'invalidTemperature' };
  const decision = await authorizationService.enforce('batch:cold-chain-reading:simulate');
  if (!decision.allowed) return { ok: false, error: 'notPermitted' };

  const now = new Date().toISOString();
  const result = await processInboundTelemetryReadingEvent({
    messageId: `sim-${now}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: now, recordedAt: now,
    assetType: input.assetType, assetId: input.assetId,
    temperatureCelsius: input.temperatureCelsius,
    simulated: true,
  });
  if (result.outcome !== 'applied' || !result.readingId) return { ok: false, error: 'notRecorded' };

  const excursion = !!result.excursion;
  const held = result.heldBatchId ? ' The batch is held until the excursion is acknowledged.' : '';
  const capa = result.deficienciesRaised ? ` ${result.deficienciesRaised} open cold-chain deficiency record(s) raised.` : '';
  auditService.logEvent({
    type: 'system', event: 'Simulated Temperature Reading',
    detail: `SIMULATED (no sensor feed): ${input.temperatureCelsius}°C posted for ${input.assetType === 'storage_unit' ? 'storage unit' : 'container'} ${input.assetLabel}. ${excursion ? 'Excursion.' : 'Within range.'}${held}${capa}`,
    user: input.user, caseId: null, confidence: null,
  }).catch(() => {});

  return { ok: true, readingId: result.readingId, excursion, heldBatchId: result.heldBatchId, deficienciesRaised: result.deficienciesRaised ?? 0 };
}
