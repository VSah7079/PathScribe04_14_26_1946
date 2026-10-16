// src/services/material/materialDemoSeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 456 (demo baseline): decants and a matrix block on demo cases, so the
// cytology and histology material views have something to show after a Full
// Reset. Decants and matrix blocks live on the case itself (Specimen.decants,
// Case.matrixBlocks), so this is applied to the seed cases the way
// withAddOnOrderDemo is (services/cases/mockCaseService.ts):
//
//   Decants (Paps from services/cases/demoBaselineCases.ts)
//     S26-4650-CYT-001  D1 residual PreservCyt, 17 mL, kept for reflex HPV;
//                       no slides (Priya Desai)
//     S26-4651-CYT-001  D1 residual fluid, 20 mL: p16/Ki-67 dual stain slide
//                       staining (HPV positive after ASC-US) → the Cytology
//                       "Cell Block / Ancillary Pending" tile
//     S26-4652-CYT-001  D1 residual fluid, 18 mL, bloody: glacial acetic acid
//                       wash and a repeat ThinPrep, coverslipped (Nadia Rahman)
//   Decants (non-GYN FNA, mockCaseService.ts)
//     S26-5005-CYT-001  D1 needle rinse, 6 mL → D2 cell block split from it,
//                       green/mesh cassette, H&E pending cut (Microtomy)
//   Matrix block (mockCaseService.ts)
//     S26-4404          M1: the left-sided prostate cores D, E and F, inked
//                       by site and embedded in one cassette; H&E level
//                       ready for review (the "Biopsy Array" in the
//                       report page's Material tab)
//
// Pure: takes the seed cases and a clock, returns new cases. Cases that
// aren't there are left alone.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Decant } from '@/types/case/Material';
import type { MatrixBlock } from '@/types/case/MatrixBlock';
import { decantIdentifier, decantSlideIdentifier, matrixSlideIdentifier } from '@/types/labels/LabelData';


export const DEMO_DECANT_CASE_IDS = ['S26-4650-CYT-001', 'S26-4651-CYT-001', 'S26-4652-CYT-001', 'S26-5005-CYT-001'] as const;
export const DEMO_MATRIX_BLOCK_CASE_ID = 'S26-4404';
export const DEMO_MATRIX_BLOCK_ID = 'mtx-S26-4404-demo';

const HOUR = 3_600_000;

export function withMaterialDemo(cases: Case[], now: number = Date.now()): Case[] {
  const hoursAgo = (h: number) => new Date(now - h * HOUR).toISOString();
  const comment = (id: string, authorId: string, authorName: string, text: string, h: number) =>
    ({ id, authorId, authorName, text, createdAt: hoursAgo(h) });

  /** A decant on specimen A, with its identifier built the way handleAddDecant builds it. */
  const decant = (c: any, label: string, fields: Partial<Decant> & Pick<Decant, 'decantType'>, h: number, by: string): Decant => {
    const acc = c.accession?.fullAccession ?? c.id;
    const sp = c.specimens[0];
    return {
      id: `dcnt-demo-${c.id}-${label}`,
      label,
      stains: [],
      createdAt: hoursAgo(h),
      createdBy: by,
      displayId: decantIdentifier(acc, sp.label, label),
      ...fields,
      // Slides get the decant slide identifier (…-AD1-L1).
      ...(fields.stains ? { stains: fields.stains.map((s, i) => ({ displayId: decantSlideIdentifier(acc, sp.label, label, `L${i + 1}`), ...s })) } : {}),
    } as Decant;
  };

  const decantsFor: Record<string, (c: any) => Decant[]> = {
    'S26-4650-CYT-001': c => [decant(c, 'D1', {
      decantType: 'residual_fluid', totalVolumeMl: 17, appearance: 'Clear', yieldPelletSize: 'Moderate',
      comments: [comment('mc-demo-4650-d1', 'CT-001', 'Priya Desai', 'Residual PreservCyt vial retained for reflex HPV testing if the screen is abnormal.', 20)],
    }, 22, 'Priya Desai')],
    'S26-4651-CYT-001': c => [decant(c, 'D1', {
      decantType: 'residual_fluid', totalVolumeMl: 20, appearance: 'Clear', yieldPelletSize: 'Moderate',
      stains: [{ id: 'stn-demo-4651-d1-1', stainName: 'p16/Ki-67 Dual Stain', status: 'Staining', preparationMethod: 'ThinPrep/Liquid-Based' } as any],
      comments: [comment('mc-demo-4651-d1', 'CT-001', 'Priya Desai', 'HPV positive after ASC-US: dual-stain slide made from the residual vial for triage.', 18)],
    }, 20, 'Priya Desai')],
    'S26-4652-CYT-001': c => [decant(c, 'D1', {
      decantType: 'residual_fluid', totalVolumeMl: 18, appearance: 'Bloody', yieldPelletSize: 'Low',
      stains: [{ id: 'stn-demo-4652-d1-1', stainName: 'Pap Smear, Liquid-Based (ThinPrep)', status: 'Coverslipped', preparationMethod: 'ThinPrep/Liquid-Based' } as any],
      comments: [comment('mc-demo-4652-d1', 'CT-002', 'Nadia Rahman', 'First slide obscured by blood. Residual re-processed with a glacial acetic acid wash; repeat ThinPrep made.', 6)],
    }, 8, 'Nadia Rahman')],
    'S26-5005-CYT-001': c => {
      const rinse = decant(c, 'D1', { decantType: 'residual_fluid', totalVolumeMl: 6, appearance: 'Bloody', yieldPelletSize: 'High' }, 20, 'Priya Desai');
      const cellBlock = decant(c, 'D2', {
        decantType: 'cell_block', parentDecantId: rinse.id, cassetteColorId: 'color-green-mesh',
        stains: [{ id: 'stn-demo-5005-d2-1', stainName: 'H&E', status: 'Pending Cut', preparationMethod: 'Cell Block' } as any],
        comments: [comment('mc-demo-5005-d2', 'CT-001', 'Priya Desai', 'Cell block from the needle rinse pellet. Fragile: green mesh cassette.', 18)],
      }, 18, 'Priya Desai');
      return [rinse, cellBlock];
    },
  };

  const matrixBlockFor = (c: any): MatrixBlock => {
    const acc = c.accession?.fullAccession ?? c.id;
    const site = (label: string) => c.specimens.find((s: any) => s.label === label);
    return {
      id: DEMO_MATRIX_BLOCK_ID,
      label: 'M1',
      status: 'Embedded',
      participants: [
        { specimenId: site('D').id, positionInBlock: 1, tissueType: 'Needle cores, left apex (red ink)' },
        { specimenId: site('E').id, positionInBlock: 2, tissueType: 'Needle cores, left mid (blue ink)' },
        { specimenId: site('F').id, positionInBlock: 3, tissueType: 'Needle cores, left base (green ink)' },
      ],
      slides: [{ id: 'stn-demo-4404-m1-1', stainName: 'H&E', status: 'Ready for Review', displayId: matrixSlideIdentifier(acc, 'M1', 'L1') } as any],
      locationHistory: [
        { location: 'Grossing Station 2', workflowStage: 'Grossing', action: 'Grossed & Cut', at: hoursAgo(26), source: 'PathScribe', performedByName: 'Connor Whitlock' },
        { location: 'Histology — Embedding', workflowStage: 'Embedding', action: 'Embedded', at: hoursAgo(14), source: 'PathScribe', performedByName: 'Kevin Brooks' },
      ],
      pieceCount: 6,
      pieceDescription: 'Two cores from each of D, E and F, inked by site (D red, E blue, F green).',
      pieceCountAtEmbedding: 6,
      isEntirelySubmitted: true,
      createdAt: hoursAgo(26),
      createdBy: 'PA-001',
      comments: [{ id: 'mc-demo-4404-m1', authorId: 'HT-001', authorName: 'Kevin Brooks', text: 'Embedded in ink order D, E, F, top to bottom.', createdAt: hoursAgo(14) }],
    };
  };

  return cases.map(c0 => {
    const c = c0 as any;
    const decants = decantsFor[c.id];
    if (decants && c.specimens?.length) {
      return { ...c, specimens: c.specimens.map((sp: any, i: number) => (i === 0 ? { ...sp, decants: decants(c) } : sp)) } as Case;
    }
    if (c.id === DEMO_MATRIX_BLOCK_CASE_ID && ['D', 'E', 'F'].every(l => c.specimens?.some((s: any) => s.label === l))) {
      const mb = matrixBlockFor(c);
      const ids = new Set(mb.participants.map(p => p.specimenId));
      return {
        ...c,
        specimens: c.specimens.map((sp: any) => (ids.has(sp.id) ? { ...sp, matrixBlockIds: [...(sp.matrixBlockIds ?? []), mb.id] } : sp)),
        matrixBlocks: [...(c.matrixBlocks ?? []), mb],
      } as Case;
    }
    return c0;
  });
}
