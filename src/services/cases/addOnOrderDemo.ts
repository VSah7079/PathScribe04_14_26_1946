// src/services/cases/addOnOrderDemo.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 403 (Pete: "Add some seed data and some demo data to execute the
// functionality"). Add-on orders on demo case S26-4401-BX-001 (assigned to
// Pete Nimmo), one at each point of the flow, so the Add-On Orders page has
// something to show and act on:
//   A1  Ki-67 (IHC, STAT)                         Requested → "Mark block retrieved"
//   A1  HER2 FISH (send-out, Summit Molecular)    Block retrieved
//   A2  Recut, 4 µm deep level                    Cut / pending stain
//   A2  PAS                                       Exception: insufficient tissue,
//                                                 waiting for the pathologist
//                                                 (approve destructive cutting,
//                                                 modify, or cancel)
// Block A2 stays orderable, so a new order can be placed too.
//
// Pure: takes the seed cases and a clock, returns new cases.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { StainOrder } from '@/types/case/Specimen';
import { REFERENCE_LAB_IDS } from '../facilities/referenceLabSeeds';

export const ADD_ON_DEMO_CASE_ID = 'S26-4401-BX-001';

export function withAddOnOrderDemo(cases: Case[], now: number = Date.now()): Case[] {
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
  const pete = { orderedByPathologistId: 'PATH-001', orderedByPathologistName: 'Pete Nimmo' };
  const tech = { id: 'HT-001', name: 'Histology Tech' };

  const onA1: StainOrder[] = [
    {
      id: 'addon-demo-ki67', stainName: 'Ki-67', status: 'Pending Cut', userAdded: true, printStatus: 'Pending',
      ...pete, orderedAt: hoursAgo(3), addOnPriority: 'STAT/Urgent', slideMediaType: 'Standard Charged',
      routedQueueLabel: 'IHC/Special Histochemistry Queue', routedWorkflowStage: 'Staining',
    },
    {
      id: 'addon-demo-her2-fish', stainName: 'HER2 FISH', status: 'Pending Cut', userAdded: true, printStatus: 'Pending',
      ...pete, orderedAt: hoursAgo(20), addOnPriority: 'Routine Sign-Out', slideMediaType: 'Plus Glass',
      cuttingInstructions: 'Two unstained sections on plus slides for FISH.',
      routedQueueLabel: 'Reference/Send-Out Lab Queue',
      sendOutReferenceLabFacilityId: REFERENCE_LAB_IDS.summit, sendOutReferenceLabName: 'Summit Molecular Reference Laboratory',
      blockRetrievedAt: hoursAgo(18), blockRetrievedBy: tech.id,
    },
  ];
  const onA2: StainOrder[] = [
    {
      id: 'addon-demo-recut', stainName: 'H&E', status: 'Cut & Placed', userAdded: true, printStatus: 'Printed', levelDepthMicrons: 4,
      ...pete, orderedAt: hoursAgo(26), addOnPriority: 'Routine Sign-Out', slideMediaType: 'Standard Charged',
      routedQueueLabel: 'Histology Cutting Queue', routedWorkflowStage: 'Microtomy / Sectioning',
      blockRetrievedAt: hoursAgo(24), blockRetrievedBy: tech.id,
    },
    {
      id: 'addon-demo-pas', stainName: 'PAS', status: 'Pending Cut', userAdded: true, printStatus: 'Pending',
      ...pete, orderedAt: hoursAgo(8), addOnPriority: 'Routine Sign-Out', slideMediaType: 'Standard Charged',
      routedQueueLabel: 'Special Stains Bench Queue', routedWorkflowStage: 'Staining',
      blockRetrievedAt: hoursAgo(6), blockRetrievedBy: tech.id,
      exception: {
        reason: 'Insufficient tissue for panel', note: 'About two sections left after the recut.',
        flaggedBy: tech.id, flaggedByName: tech.name, flaggedAt: hoursAgo(2), status: 'pending_pathologist_review',
      },
      exceptionEvents: [{
        id: 'addon-demo-pas-ev1', action: 'flagged', timestamp: hoursAgo(2), actorId: tech.id, actorName: tech.name,
        detail: 'Insufficient tissue for panel — About two sections left after the recut.',
      }],
    },
  ];

  return cases.map(c => c.id !== ADD_ON_DEMO_CASE_ID ? c : {
    ...c,
    specimens: (c.specimens ?? []).map(sp => ({
      ...sp,
      blocks: (sp.blocks ?? []).map(b => {
        const extra = b.id === 'blk-4401-a1' ? onA1 : b.id === 'blk-4401-a2' ? onA2 : [];
        const have = new Set((b.stains ?? []).map(s => s.id));
        return extra.length ? { ...b, stains: [...(b.stains ?? []), ...extra.filter(s => !have.has(s.id))] } : b;
      }),
    })),
  });
}
