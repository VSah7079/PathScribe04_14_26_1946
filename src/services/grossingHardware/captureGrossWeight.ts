// src/services/grossingHardware/captureGrossWeight.ts
// Batch 606 (PS-13): the "Capture weight" action in the specimen form. With a
// scale agent configured it reads the agent (resolveScaleWeightCapture, stable
// readings only). With none, and no API server (demo), it records a clearly
// labelled simulated scale reading so the workflow can be tried end to end.
// With an API server configured nothing is simulated: the person types the
// weight by hand. Every capture is audited with the source and grams, and no
// patient detail.

import { grossingHardwareProfileService } from './grossingHardwareProfileServiceInstance';
import { resolveScaleWeightCapture } from './resolveScaleWeightCapture';
import { mockAuditService as auditService } from '../auditlog/mockAuditService';
import { dataMayPersistInBrowser } from '../browserData/browserDataPolicy';

export type GrossWeightSource = 'scale' | 'simulated_scale' | 'manual';

export type GrossWeightResult =
  | { ok: true; grams: number; source: 'scale' | 'simulated_scale' }
  | { ok: false; reason: 'no_scale' | 'unstable_reading' | 'not_https' | 'malformed_response' | 'unreachable' };

/** A believable simulated reading: 5.0 to 85.0 g, one decimal. */
export function simulatedScaleGrams(random: () => number = Math.random): number {
  return Math.round((5 + random() * 80) * 10) / 10;
}

export function auditGrossWeight(source: GrossWeightSource, grams: number, user = 'system'): void {
  auditService.logEvent({
    type: 'system', event: 'Gross Weight Captured',
    detail: `${source === 'simulated_scale' ? 'Simulated scale' : source === 'scale' ? 'Scale' : 'Manual entry'} reading, ${grams} g.`,
    user, caseId: null, confidence: null,
  }).catch(() => {});
}

export async function captureGrossWeight(
  stationId?: string, user = 'system', random: () => number = Math.random,
): Promise<GrossWeightResult> {
  const all = await grossingHardwareProfileService.getAll();
  const scales = (all.ok ? all.data : []).filter(p => p.kind === 'scale' && p.isActive && p.bridgeType === 'pathscribe_agent');
  const profile = scales.find(p => stationId && p.stationId === stationId) ?? scales[0] ?? null;

  const simulate = (): GrossWeightResult => {
    if (!dataMayPersistInBrowser()) return { ok: false, reason: 'no_scale' };
    const grams = simulatedScaleGrams(random);
    auditGrossWeight('simulated_scale', grams, user);
    return { ok: true, grams, source: 'simulated_scale' };
  };

  if (!profile) return simulate();
  const read = await resolveScaleWeightCapture(profile);
  if (read.ok) {
    auditGrossWeight('scale', read.grams, user);
    return { ok: true, grams: read.grams, source: 'scale' };
  }
  if (read.reason === 'unreachable' || read.reason === 'not_configured') return simulate();
  return { ok: false, reason: read.reason };
}
