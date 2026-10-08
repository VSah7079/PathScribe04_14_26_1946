// src/services/mockInterfaceEngine/simulateWsiScanner.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 434: DEVELOPER TOOL ONLY (see mockInterfaceEngineSettings.ts's header
// for the double gate). When the mock interface engine accepts a
// WSI_SCAN_MANIFEST, this plays the slide scanner's part: for each slide in
// order, a "scanning" update and then "completed" with image QC passed, sent
// through the same inbound processor the real engine's messages use
// (hl7/processInboundWsiScanStatusUpdateEvent.ts). Nothing here runs in a
// production build.
// ─────────────────────────────────────────────────────────────────────────────

import type { WsiScanStatusUpdateEventPayload } from '@/types/events/WsiScanStatusUpdateEventPayload';

export interface ManifestLike {
  batchId: string;
  slides: { slidePosition: string }[];
}

/** The replies, with when to send each (ms after acceptance). Pure. */
export function plannedScannerReplies(manifest: ManifestLike, stepMs = 1500, now = () => new Date().toISOString()): { atMs: number; payload: () => WsiScanStatusUpdateEventPayload }[] {
  return manifest.slides.flatMap((slide, i) => (['scanning', 'completed'] as const).map((scanStatus, k) => ({
    atMs: stepMs * (i + 1) + (k * stepMs) / 2,
    payload: (): WsiScanStatusUpdateEventPayload => ({
      messageId: `sim-${manifest.batchId}-${slide.slidePosition}-${scanStatus}`,
      timestamp: now(),
      organisationId: 'simulated',
      batchId: manifest.batchId,
      slidePosition: slide.slidePosition,
      scanStatus,
      ...(scanStatus === 'completed' ? { qcPassed: true, acquisitionMode: 'single_plane' as const } : {}),
    }),
  })));
}

/** Schedules the replies. */
export function simulateWsiScanner(manifest: ManifestLike, stepMs = 1500): void {
  for (const reply of plannedScannerReplies(manifest, stepMs)) {
    setTimeout(() => {
      void import('../hl7/processInboundWsiScanStatusUpdateEvent').then(m => m.processInboundWsiScanStatusUpdateEvent(reply.payload()));
    }, reply.atMs);
  }
}
