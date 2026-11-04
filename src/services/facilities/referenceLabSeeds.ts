// src/services/facilities/referenceLabSeeds.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 403 (Pete: "Add some seed data and some demo data"). Three fictional
// reference labs (Facility role reference_lab), so the Stain Dictionary can
// link molecular tests to them and an add-on send-out has somewhere to go.
// Added to a browser's stored facilities when missing (never replacing an
// administrator's changes); see mockFacilityService.ts.
//
// Pure data.
// ─────────────────────────────────────────────────────────────────────────────

import type { Facility } from './IFacilityService';

export const REFERENCE_LAB_IDS = {
  summit: 'ref-summit-molecular',
  pacific: 'ref-pacific-genomics',
  greatLakes: 'ref-great-lakes-cytogenetics',
} as const;

const referenceLab = (id: string, name: string, assigningAuthority: string, address: string, email: string, tatTotalHours: number): Facility => ({
  id, name, assigningAuthority, address, phone: '555-7000', fax: '', email,
  roles: ['reference_lab'], isEnterprise: true, jurisdiction: 'US',
  reporting: { reportFormat: 'PDF', deliveryMethod: 'Portal', autoRelease: false, copyToReferring: false },
  status: 'Active', pediatricAgeThreshold: null, authorizedPediatricPathologistIds: [],
  tatFirstTouchHours: 24, tatTotalHours,
  escalationTargets: ['admin'], escalationPriority: 'high',
});

export const REFERENCE_LAB_SEEDS: Facility[] = [
  referenceLab(REFERENCE_LAB_IDS.summit, 'Summit Molecular Reference Laboratory', 'SMRL', '1200 Summit Pkwy, Denver, CO 80202', 'sendouts@summitmolecular.example', 168),
  referenceLab(REFERENCE_LAB_IDS.pacific, 'Pacific Genomics Reference Lab', 'PGRL', '88 Harbor Blvd, San Diego, CA 92101', 'orders@pacificgenomics.example', 240),
  referenceLab(REFERENCE_LAB_IDS.greatLakes, 'Great Lakes Cytogenetics', 'GLCG', '410 Lakeshore Dr, Chicago, IL 60611', 'lab@greatlakescyto.example', 120),
];
