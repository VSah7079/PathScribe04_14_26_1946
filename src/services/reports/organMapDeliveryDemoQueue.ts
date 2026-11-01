// src/services/reports/organMapDeliveryDemoQueue.ts
// Batch 751 (Pete's seed row S15, Video 9 step 10): the outbound LIS queue the demo starts with. S26-5405's result and
// its organ map file went to the laboratory system an hour before the reset (the map panel's "Map file sent" line);
// S26-5406's map file failed (the destination did not answer), so the outbound queue shows a failed organ map delivery
// with retry. Demonstration data: no file was really sent. Times relative to the reset; no patient names.
import type { OutboundLisSyncQueueEntry } from '@/types/case/OutboundLisSyncQueueEntry';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const DESTINATION = 'sftp://demo-interface.example/organ-maps';
const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d+/, '');

export function organMapDeliveryDemoQueue(): OutboundLisSyncQueueEntry[] {
  const sent = hoursAgo(1);
  const failed = hoursAgo(3);
  const signer = (at: string) => ({ id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson', signedAt: at });
  const base = { organisationId: 'ENT-DEFAULT', retryCount: 0, maxRetriesExceeded: false };
  return [
    { ...base, id: 'lsq-demo-5405-final', caseId: 'S26-5405', instanceId: 'S26-5405-SP-1_colon_resection_demo', kind: 'final', status: 'SENT', queuedAt: sent, lastAttemptAt: sent, workupVersion: 1, signer: signer(sent) },
    { ...base, id: 'lsq-demo-5405-map', caseId: 'S26-5405', instanceId: 'S26-5405-SP-1_colon_resection_demo', kind: 'organ_map', status: 'SENT', queuedAt: sent, lastAttemptAt: sent, signer: signer(sent),
      organMapFile: { fileName: `S26-5405_rectalResection_${stamp(sent)}.png`, fingerprint: '', mapType: 'rectalResection', destination: DESTINATION } },
    { ...base, id: 'lsq-demo-5406-final', caseId: 'S26-5406', instanceId: 'S26-5406-SP-1_colon_resection_demo', kind: 'final', status: 'SENT', queuedAt: failed, lastAttemptAt: failed, workupVersion: 1, signer: signer(failed) },
    { ...base, id: 'lsq-demo-5406-map', caseId: 'S26-5406', instanceId: 'S26-5406-SP-1_colon_resection_demo', kind: 'organ_map', status: 'FAILED', queuedAt: failed, lastAttemptAt: failed, signer: signer(failed),
      errorCode: 'DISPATCH_UNREACHABLE', errorMessage: 'The destination folder did not answer (demonstration).',
      organMapFile: { fileName: `S26-5406_rectalResection_${stamp(failed)}.png`, fingerprint: '', mapType: 'rectalResection', destination: DESTINATION } },
  ];
}

export const ORGAN_MAP_DEMO_DESTINATION = DESTINATION;
