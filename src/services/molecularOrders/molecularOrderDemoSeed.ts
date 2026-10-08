// src/services/molecularOrders/molecularOrderDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 457 (Pete: "Molecular Order Queue is still empty. Please add some
// seed data."): HPV orders as the accession and reflex triggers would have
// queued them, for real seeded Paps at Metro General, so the Molecular Order
// Queue page (/molecular-order-queue) has history to show.
//
//   S26-5001  high-risk HPV screen, sent (result came back Negative)
//   S26-5002  high-risk HPV screen, sent (Positive), and the reflex
//             genotyping order it triggered, sent (HPV 16 detected)
//   S26-4650  high-risk HPV screen, sent (running on Panther 2; molecularDemoSeed.ts)
//   S26-4651  high-risk HPV screen, sent (its run failed QC; molecularDemoSeed.ts)
//   S26-4652  high-risk HPV screen, FAILED: the Panther middleware didn't
//             answer, twice. That is why its rack is still waiting for
//             extraction.
//
// S26-5003 is left alone: it is the case the page's own demo panel queues
// an order and simulates a result for.
// Times are relative to when the seed is first read, so they stay recent.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularOrderOutboundQueueEntry, MolecularOrderPayload } from '@/types/case/MolecularOrderOutboundQueueEntry';

const HOUR = 3_600_000;

export const MOLECULAR_ORDER_DEMO_IDS = ['mo-demo-5001', 'mo-demo-5002', 'mo-demo-5002-reflex', 'mo-demo-4650', 'mo-demo-4651', 'mo-demo-4652'] as const;

export function molecularOrderDemoEntries(now: number = Date.now()): MolecularOrderOutboundQueueEntry[] {
  const at = (hoursAgo: number) => new Date(now - hoursAgo * HOUR).toISOString();
  const order = (id: string, caseId: string, accession: string, hoursAgo: number, extra: Partial<MolecularOrderOutboundQueueEntry> = {}, payload: Partial<MolecularOrderPayload> = {}): MolecularOrderOutboundQueueEntry => ({
    id, caseId, eventType: 'order.molecular',
    payload: { accessionNumber: accession, specimenLetter: 'A', assayCode: 'st-hpv-highrisk-screen', orderReason: 'protocol_configured', priority: 'Routine', ...payload },
    status: 'SENT', queuedAt: at(hoursAgo), lastAttemptAt: at(hoursAgo - 0.01), retryCount: 0, maxRetriesExceeded: false,
    ...extra,
  });
  return [
    order('mo-demo-5002', 'S26-5002-CYT-001', 'S26-5002-CYT-001', 72),
    order('mo-demo-5002-reflex', 'S26-5002-CYT-001', 'S26-5002-CYT-001', 50, {}, {
      assayCode: 'st-hpv-genotyping', orderReason: 'hpv_reflex_genotyping', reflexFromMessageId: 'hpv-result-demo-5002',
    }),
    order('mo-demo-4650', 'S26-4650-CYT-001', 'S26-4650-CYT-001', 46),
    order('mo-demo-4651', 'S26-4651-CYT-001', 'S26-4651-CYT-001', 46),
    order('mo-demo-5001', 'S26-5001-CYT-001', 'S26-5001-CYT-001', 24),
    order('mo-demo-4652', 'S26-4652-CYT-001', 'S26-4652-CYT-001', 26, {
      status: 'FAILED', errorCode: 'DISPATCH_UNREACHABLE', retryCount: 2, lastAttemptAt: at(0.5),
      errorMessage: 'Panther 2 middleware did not respond (connection refused).',
    }),
  ];
}
