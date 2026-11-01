// src/services/protocols/surgicalDemoProtocols.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 738 (Pete, Demo Seed Data Requirements S1): grossing protocols for the common surgical specimen types, so a
// surgical case accessioned in the demo arrives at the Grossing screen with its blocks laid out and can be completed
// ("Grossing protocol attached" is required by default). Before this only the medical renal and autopsy heart
// entries had a protocol, so Complete grossing stayed greyed out on every surgical case.
//
// Illustrative "preference card" seed data, not asserted laboratory practice: block counts and levels vary by lab
// and are edited in Configuration > Processing Protocols like any other protocol. A Full Reset brings them back.
// Which dictionary entry uses which protocol is SURGICAL_DEMO_PROTOCOL_BY_ENTRY (applied in the Specimen
// Dictionary seed).
// ─────────────────────────────────────────────────────────────────────────────

import type { Protocol, ProtocolPathway, PathwayTask } from './IProtocolService';

const seeded = { active: true, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString() } as const;

export const SURGICAL_DEMO_PROTOCOL_IDS = {
  colonResectionTumor: 'proto-colon-resection-tumor',
  colonResection: 'proto-colon-resection',
  smallBiopsy: 'proto-small-biopsy-levels',
  skinBiopsy: 'proto-skin-biopsy',
  breastCore: 'proto-breast-core',
  breastExcision: 'proto-breast-excision',
  prostateCore: 'proto-prostate-core',
} as const;

/** A formalin-fixed, routinely processed block track with an H&E on each block (levels when `levels` > 1). */
function track(id: string, pathwayName: string, defaultCount: number, levels = 1, hold = false): ProtocolPathway {
  const tasks: PathwayTask[] = Array.from({ length: levels }, (_, i) => ({ id: `${id}-t${i + 1}`, stepOrder: i + 1, action: levels > 1 ? `Cut Level ${i + 1}` : 'Cut Section', stainTypeIds: ['st-he'] }));
  if (hold) tasks.push({ id: `${id}-hold`, stepOrder: levels + 1, action: 'Unstained (hold for ancillary tests)', stainTypeIds: [], isHold: true });
  return { id, pathwayName, materialKind: 'block', fixativeType: '10% Neutral Buffered Formalin', requiresDecal: false, processingFormat: 'Standard', defaultCount, tasks };
}

export const SURGICAL_DEMO_PROTOCOLS: Protocol[] = [
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.colonResectionTumor,
    name: 'Colon — Segmental Resection for Tumor',
    description: 'Colon resection for carcinoma: tumor with its deepest invasion, the closest margins, lymph nodes and uninvolved mucosa. Ink the radial (mesenteric) margin before sectioning; submit every lymph node found.',
    requiresTriage: false,
    pathways: [
      track('path-colon-tumor', 'Tumor (deepest invasion)', 4, 1, true),
      track('path-colon-margins', 'Margins (proximal, distal, radial)', 3),
      track('path-colon-nodes', 'Lymph nodes', 4),
      track('path-colon-mucosa', 'Uninvolved mucosa', 1),
    ],
    ...seeded,
  },
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.colonResection,
    name: 'Colon — Segmental Resection, No Tumor',
    description: 'Colon resection without a tumor (for example diverticular disease): both margins and representative sections of the abnormal area.',
    requiresTriage: false,
    pathways: [
      track('path-colonb-margins', 'Margins (proximal, distal)', 2),
      track('path-colonb-lesion', 'Representative sections', 3),
    ],
    ...seeded,
  },
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.smallBiopsy,
    name: 'Small Biopsy — Three Levels',
    description: 'Endoscopic or small mucosal biopsy: submitted entirely in one cassette (sponge or mesh bag), three H&E levels.',
    requiresTriage: false,
    pathways: [track('path-smallbx', 'Entire specimen', 1, 3)],
    ...seeded,
  },
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.skinBiopsy,
    name: 'Skin — Punch or Shave Biopsy',
    description: 'Skin biopsy: submitted entirely; a punch is bisected, a shave is serially sectioned. Two H&E levels.',
    requiresTriage: false,
    pathways: [track('path-skinbx', 'Entire specimen', 1, 2)],
    ...seeded,
  },
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.breastCore,
    name: 'Breast — Core Needle Biopsy',
    description: 'Breast core biopsy: cores submitted entirely, three H&E levels and unstained sections held for ER, PR and HER2. Record when the specimen was placed in formalin and when fixation ended (6 to 72 hours).',
    requiresTriage: false,
    pathways: [track('path-breastcore', 'Cores', 1, 3, true)],
    ...seeded,
  },
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.breastExcision,
    name: 'Breast — Excision or Lumpectomy',
    description: 'Breast excision: ink the six margins, then the lesion with the closest margins, and the remaining margins. Unstained sections of the lesion held for biomarkers.',
    requiresTriage: false,
    pathways: [
      track('path-breastex-lesion', 'Lesion', 3, 1, true),
      track('path-breastex-margins', 'Margins', 4),
    ],
    ...seeded,
  },
  {
    id: SURGICAL_DEMO_PROTOCOL_IDS.prostateCore,
    name: 'Prostate — Needle Core Biopsy (per site)',
    description: 'Prostate needle cores, one part per site: the cores of each site in one cassette, three H&E levels with an unstained level held for immunohistochemistry.',
    requiresTriage: false,
    pathways: [track('path-prostate', 'Cores', 1, 3, true)],
    ...seeded,
  },
];

/** Which starter Specimen Dictionary entry (scripts/terminology-sources/specimens-starter.json) uses which protocol. */
export const SURGICAL_DEMO_PROTOCOL_BY_ENTRY: Readonly<Record<string, string>> = {
  sp001: SURGICAL_DEMO_PROTOCOL_IDS.breastCore,        // Core Needle Biopsy — Breast
  sp002: SURGICAL_DEMO_PROTOCOL_IDS.breastExcision,    // Breast, Excisional Biopsy
  sp011: SURGICAL_DEMO_PROTOCOL_IDS.smallBiopsy,       // Colon, Biopsy
  sp013: SURGICAL_DEMO_PROTOCOL_IDS.colonResection,    // Colon, Segmental Resection — No Tumor
  sp014: SURGICAL_DEMO_PROTOCOL_IDS.colonResectionTumor, // Colon, Segmental Resection for Tumor
  sp028: SURGICAL_DEMO_PROTOCOL_IDS.prostateCore,      // Prostate, Needle Biopsy
  sp050: SURGICAL_DEMO_PROTOCOL_IDS.skinBiopsy,        // Skin, Biopsy
};

/** Gives the starter entries their demo protocol; an entry that already names one keeps it. */
export function applySurgicalDemoProtocols<T extends { id: string; protocolId?: string }>(entries: T[]): T[] {
  return entries.map(e => (e.protocolId || !SURGICAL_DEMO_PROTOCOL_BY_ENTRY[e.id] ? e : { ...e, protocolId: SURGICAL_DEMO_PROTOCOL_BY_ENTRY[e.id] }));
}
