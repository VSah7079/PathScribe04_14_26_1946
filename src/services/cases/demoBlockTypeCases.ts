// src/services/cases/demoBlockTypeCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 748 (Pete's Demo Seed Data Requirements, row S11: "Block types and exhausted-block cases", Videos 1 and 7).
// The block types Batch 732 built (types/case/blockPieces.ts, utils/blockPieceRules.ts) and the exhausted-block rule of
// Batch 731 (utils/exhaustedBlockRules.ts), each on a case Dr. Sarah Johnson can open:
//   S26-5401  Prostate needle biopsies, six sites: two multi-piece cassettes, A1 holding the right-side cores (parts A, B
//             and C, inked) and D1 the left (D, E and F), each with its piece map
//   S26-5402  Breast wide local excision for whole-mount sections: a megablock (mega cassette and mold) with two
//             large-format H&E slides
//   S26-5403  Lymph node core biopsy: block A1 used up (Exhausted) after its H&E and three immunostains, and a Ki-67
//             add-on that waits for the block to be re-embedded (ordered through the exhausted-block alternatives)
// Batch 750 (row S10): the slides also show the image states a slide's reference preview can have: S26-5402 A1-L1
// Scanned and A1-L2 Scanning, S26-5403 A1-L1 Queued and A1-L2 Scan failed, S26-5401 No image yet.
// The matrix block the row also names already exists and is accepted at Embedding since Batch 729 (S26-4404-M1).
// Fictional patients and clinicians; times relative to the reset.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();
const born = (years: number, month: number, day: number) => new Date(Date.UTC(new Date().getUTCFullYear() - years, month - 1, day)).toISOString();
const SARAH = { id: 'PATH-SJ-001', name: 'Dr. Sarah Johnson' };

export const DEMO_BLOCK_TYPE_CASE_IDS = { prostate: 'S26-5401', megablock: 'S26-5402', exhausted: 'S26-5403' } as const;
export const DEMO_BLOCK_TYPE_PATIENTS = [
  { id: 'PAT-B5401', mrn: '105401', firstName: 'Ambrose', lastName: 'Kilbride', age: 67, month: 6, day: 12, sex: 'M' as const },
  { id: 'PAT-B5402', mrn: '105402', firstName: 'Clementine', lastName: 'Ashgrove', age: 54, month: 9, day: 3, sex: 'F' as const },
  { id: 'PAT-B5403', mrn: '105403', firstName: 'Bartholomew', lastName: 'Fenn', age: 61, month: 2, day: 20, sex: 'M' as const },
];

const he = (id: string, status: string, extra: Record<string, unknown> = {}) => ({ id, stainName: 'H&E', stainTypeId: 'st-he', status, ...extra });
const ihc = (id: string, name: string, status: string) => ({ id, stainName: name, status, userAdded: true, orderedByPathologistId: SARAH.id, orderedByPathologistName: SARAH.name, orderedAt: hoursAgo(30) });

function caseShell(id: string, p: (typeof DEMO_BLOCK_TYPE_PATIENTS)[number], specimens: unknown[], indication: string, h: number, diagnostic: Record<string, string>): Case {
  return {
    id,
    accession: { accessionNumber: id.slice(4), accessionPrefix: 'S', accessionYear: 2026, fullAccession: id },
    originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
    patient: {
      id: p.id, mrn: p.mrn, firstName: p.firstName, lastName: p.lastName, dateOfBirth: born(p.age, p.month, p.day), sex: p.sex,
      phone: '555-540-' + p.mrn.slice(-4), email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@example.org`, address: '1 Demo Way, Phoenix, AZ 85004',
    },
    specimens,
    order: { priority: 'Routine', facilityId: 'c1', facilityName: 'Metro General Hospital', requestingProvider: 'Dr. Michael Brown', clinicalIndication: indication, receivedDate: hoursAgo(h), assignedTo: SARAH.id, assignedParticipationTypeId: 'primary' },
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '', ...diagnostic },
    synopticReports: [],
    status: 'in-progress',
    createdAt: hoursAgo(h), updatedAt: hoursAgo(2),
    caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
  } as unknown as Case;
}

// ── S26-5401: prostate biopsies in two multi-piece cassettes ───────────────────────────────────────────────────────
function prostateCase(): Case {
  const id = DEMO_BLOCK_TYPE_CASE_IDS.prostate;
  const SITES = ['Right base', 'Right mid', 'Right apex', 'Left base', 'Left mid', 'Left apex'];
  const INK = ['Blue', 'Green', 'Black'];
  const parts = SITES.map((_site, i) => String.fromCharCode(65 + i));
  const multiPiece = (spIndex: number) => {
    const label = parts[spIndex];
    const own = parts.slice(spIndex, spIndex + 3);
    return {
      id: `blk-demo-5401-${label.toLowerCase()}1`, label: '1', status: 'Embedded', blockType: 'multi_piece',
      pieceCount: 6, pieceDescription: 'Six cores, two from each of three sites, inked by site',
      pieces: own.map((part, i) => ({ id: `piece-5401-${part.toLowerCase()}`, position: i + 1, partLabel: part, description: `${SITES[spIndex + i]}, two cores`, orientation: 'Laid flat, parallel', ink: INK[i] })),
      stains: [he(`stn-demo-5401-${label.toLowerCase()}1-he`, 'Ready for Review', { displayId: `${id}-${label}1-L1` })],
    };
  };
  const specimens = SITES.map((site, i) => ({
    id: `${id}-SP-${i + 1}`, label: parts[i], description: `Prostate, ${site.toLowerCase()}, needle biopsy (two cores)`,
    receivedAt: hoursAgo(28), collectedAt: hoursAgo(31), specimenFlags: [], collection: { bodySite: 'Prostate' },
    blocks: i === 0 || i === 3 ? [multiPiece(i)] : [],
  }));
  return caseShell(id, DEMO_BLOCK_TYPE_PATIENTS[0], specimens, 'PSA 9.4 ng/mL, PI-RADS 4 lesion, right mid gland. Systematic six-site biopsy.', 28, {
    grossDescription: 'Six containers, each with two tan cores 1.0 to 1.6 cm. Right-side cores (A, B, C) inked blue, green and black and submitted together in cassette A1; left-side cores (D, E, F) the same in cassette D1. Piece map recorded.',
  });
}

// ── S26-5402: a megablock with large-format slides ──────────────────────────────────────────────────────────────────
function megablockCase(): Case {
  const id = DEMO_BLOCK_TYPE_CASE_IDS.megablock;
  const specimens = [{
    id: `${id}-SP-1`, label: 'A', description: 'Breast, left, wide local excision (whole-mount sections)',
    receivedAt: hoursAgo(50), collectedAt: hoursAgo(53), specimenFlags: [], collection: { bodySite: 'Breast', laterality: 'Left' },
    blocks: [{
      id: 'blk-demo-5402-a1', label: '1', status: 'Embedded', blockType: 'megablock', moldSize: 'Mega Mold',
      pieceCount: 1, pieceDescription: 'One whole-mount slice through the lesion, 4.5 x 3.2 cm',
      stains: [he('stn-demo-5402-a1-he1', 'Ready for Review', { slideSize: 'large_format', displayId: 'S26-5402-A1-L1', distributionDestination: 'digital', distributionStatus: 'Scanned', lastScanOutcome: 'scanned' }), he('stn-demo-5402-a1-he2', 'Coverslipped', { slideSize: 'large_format', displayId: 'S26-5402-A1-L2', distributionDestination: 'digital', distributionStatus: 'Loaded on Scanner' })],
    }],
  }];
  return caseShell(id, DEMO_BLOCK_TYPE_PATIENTS[1], specimens, 'Left breast carcinoma, 2.4 cm on imaging. Wide local excision; whole-mount sections requested for margin mapping.', 50, {
    grossDescription: 'Wide local excision, 6.0 x 4.8 x 3.0 cm, inked. Serially sliced; the central slice through the lesion submitted whole in a mega cassette (A1).',
  });
}

// ── S26-5403: an exhausted block with an add-on waiting for re-embedding ───────────────────────────────────────────
function exhaustedCase(): Case {
  const id = DEMO_BLOCK_TYPE_CASE_IDS.exhausted;
  const flaggedAt = hoursAgo(6);
  const note = 'Block cut through after the H&E and three immunostains; Ki-67 needs more tissue. Re-embed to reach the deeper core.';
  const specimens = [{
    id: `${id}-SP-1`, label: 'A', description: 'Lymph node, right inguinal, core biopsy',
    receivedAt: hoursAgo(54), collectedAt: hoursAgo(56), specimenFlags: [], collection: { bodySite: 'Lymph node, inguinal', laterality: 'Right' },
    blocks: [{
      id: 'blk-demo-5403-a1', label: '1', status: 'Exhausted',
      stains: [
        he('stn-demo-5403-a1-he', 'Ready for Review', { displayId: 'S26-5403-A1-L1', distributionDestination: 'digital', distributionStatus: 'In Scanning Queue' }),
        { ...ihc('stn-demo-5403-a1-cd20', 'CD20', 'Ready for Review'), displayId: 'S26-5403-A1-L2', distributionDestination: 'digital', distributionStatus: 'In Scanning Queue', lastScanOutcome: 'scanFailed' },
        ihc('stn-demo-5403-a1-cd3', 'CD3', 'Ready for Review'),
        ihc('stn-demo-5403-a1-bcl2', 'BCL2', 'Ready for Review'),
        {
          id: 'addon-demo-5403-ki67', stainName: 'Ki-67', stainTypeId: 'st-ki67', status: 'Pending Cut', userAdded: true, printStatus: 'Pending',
          orderedByPathologistId: SARAH.id, orderedByPathologistName: SARAH.name, orderedAt: flaggedAt, addOnPriority: 'Routine Sign-Out',
          exception: { reason: 'Block exhausted', note, flaggedBy: SARAH.id, flaggedByName: SARAH.name, flaggedAt, status: 'reembed_requested', blockStatusBefore: 'Embedded' },
          exceptionEvents: [{ id: 'exev-demo-5403-1', action: 'reembed_requested', timestamp: flaggedAt, actorId: SARAH.id, actorName: SARAH.name, detail: `Ordered on an exhausted block; waits until the block is re-embedded — ${note}` }],
        },
      ],
    }],
  }];
  return caseShell(id, DEMO_BLOCK_TYPE_PATIENTS[2], specimens, 'Enlarging right inguinal node, 3.1 cm. Core biopsy for lymphoma work-up.', 54, {
    microscopicDescription: 'Diffuse proliferation of small to medium lymphoid cells; CD20 positive, CD3 highlights background T cells, BCL2 positive. Proliferation index pending (Ki-67, awaiting re-embedding).',
  });
}

export const DEMO_BLOCK_TYPE_CASES: Case[] = [prostateCase(), megablockCase(), exhaustedCase()];
