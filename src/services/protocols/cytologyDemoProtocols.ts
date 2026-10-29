// src/services/protocols/cytologyDemoProtocols.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 716 (Pete, Oct 28 2026: "set demo data for Cytology Part 2"): the demo's cytology processing protocols,
// so the Accession video can show default material and the HPV order firing. Illustrative "preference card"
// seed data, not asserted laboratory practice: editable in Configuration > Processing Protocols like any other.
//
// What these protocols make visible, all through seed data only:
//   • a cell block track (materialKind 'decant') with a default decant count (defaultCount): generateDefaultMaterial
//     creates that many decants at Accession, each with its H&E stain order;
//   • an outbound HPV order (a task with sendOutboundOrder): AccessionPage enqueues an 'order.molecular' entry
//     for it, which is what the Molecular Order Queue shows. The HPV aliquot is held as a decant.
// What they do not do:
//   • Smears and slides are not decants, so no protocol makes them: only cell blocks and the HPV aliquot are generated.
//   • generateDefaultMaterial records every protocol-generated decant as decantType 'cell_block' (it is hard-coded),
//     so the HPV aliquot is typed "cell block" too.
//   • Nothing here reads a result back or decides a reflex. HPV genotyping on a positive screen is still applied by
//     hand (see the st-hpv-reflex stain description).
// ─────────────────────────────────────────────────────────────────────────────

import type { Protocol } from './IProtocolService';

const seeded = { active: true, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString() } as const;

export const CYTOLOGY_DEMO_PROTOCOL_IDS = {
  gynThinPrepHpv: 'proto-gyn-pap-thinprep-hpv-cotest',
  hpvOnly: 'proto-hpv-only-swab',
  fluidCellBlock: 'proto-nongyn-fluid-cellblock',
  fnaCellBlock: 'proto-fna-cellblock',
} as const;

export const CYTOLOGY_DEMO_PROTOCOLS: Protocol[] = [
  {
    id: CYTOLOGY_DEMO_PROTOCOL_IDS.gynThinPrepHpv,
    name: 'GYN Cytology — Pap with HPV Co-test (ThinPrep)',
    description: 'Liquid-based Pap test with an HPV co-test: an HPV high-risk screen with reflex genotyping is ordered automatically from the same PreservCyt vial when the case is accessioned (the Pap slide itself is not a decant, so none is generated).',
    requiresTriage: false,
    pathways: [
      {
        id: 'path-gyn-hpv-aliquot', pathwayName: 'HPV Co-test Aliquot', materialKind: 'decant',
        fixativeType: 'PreservCyt', requiresDecal: false, processingFormat: 'Molecular Aliquot',
        defaultCount: 1,
        // sendOutboundOrder: the HPV order is enqueued when the case is accessioned (Molecular Order Queue).
        tasks: [{ id: 't2', stepOrder: 1, action: 'Send HPV co-test', stainTypeIds: ['st-hpv-reflex'], sendOutboundOrder: true }],
      },
    ],
    ...seeded,
  },
  {
    id: CYTOLOGY_DEMO_PROTOCOL_IDS.hpvOnly,
    name: 'GYN Cytology — HPV-Only Swab',
    description: 'Swab submitted for primary HPV testing only (including self-collected swabs): no slide is made; an HPV high-risk screen is ordered automatically when the case is accessioned.',
    requiresTriage: false,
    pathways: [
      {
        id: 'path-hpv-only-eluate', pathwayName: 'HPV Swab Eluate', materialKind: 'decant',
        fixativeType: 'HPV Transport Medium', requiresDecal: false, processingFormat: 'Molecular Aliquot',
        defaultCount: 1,
        tasks: [{ id: 't1', stepOrder: 1, action: 'Send HPV screen', stainTypeIds: ['st-hpv-highrisk-screen'], sendOutboundOrder: true }],
      },
    ],
    ...seeded,
  },
  {
    id: CYTOLOGY_DEMO_PROTOCOL_IDS.fluidCellBlock,
    name: 'Non-GYN Cytology — Fluid with Cell Block',
    description: 'Body fluids, washings and urine: a cell block track. Two cell block decants are made by default (one for H&E, one held for immunostains). Cytospin and smear preparations are not decants and are not generated.',
    requiresTriage: false,
    pathways: [
      {
        id: 'path-fluid-cellblock', pathwayName: 'Cell Block', materialKind: 'decant',
        fixativeType: '10% Neutral Buffered Formalin', requiresDecal: false, processingFormat: 'Cell Block',
        defaultCount: 2,
        tasks: [{ id: 't2', stepOrder: 1, action: 'Cut Level 1', stainTypeIds: ['st-he'] }],
      },
    ],
    ...seeded,
  },
  {
    id: CYTOLOGY_DEMO_PROTOCOL_IDS.fnaCellBlock,
    name: 'Non-GYN Cytology — FNA Cell Block',
    description: 'Fine needle aspirates: a cell block from the needle rinse (one decant by default, H&E). Direct smears are not decants and are not generated.',
    requiresTriage: false,
    pathways: [
      {
        id: 'path-fna-cellblock', pathwayName: 'Cell Block', materialKind: 'decant',
        fixativeType: 'CytoLyt then 10% Neutral Buffered Formalin', requiresDecal: false, processingFormat: 'Cell Block',
        defaultCount: 1,
        tasks: [{ id: 't3', stepOrder: 1, action: 'Cut Level 1', stainTypeIds: ['st-he'] }],
      },
    ],
    ...seeded,
  },
];
