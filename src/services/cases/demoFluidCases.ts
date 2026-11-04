// src/services/cases/demoFluidCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 744 (Pete's Demo Seed Data Requirements, row S14: "Fluid and FNA workup, end to end", for Videos 2, 3 and 7).
// Fictional patients and clinicians only; every time is relative to the reset.
//
// Five body-fluid cases, one at each stage of the cytology preparation bench (Batches 739 to 741):
//   S26-5105  Bronchial washing   received: the two cell block cassettes the fluid protocol plans at accession, nothing else
//   S26-5102  Peritoneal fluid    decanted: 1,200 mL, bloody, high yield recorded; the preparation suggestions are showing
//                                 (over 20 mL with a high yield, so a second cell block is suggested), none accepted yet
//   S26-5103  CSF                 preparation accepted and slides staining: 3 mL, two cytospins (one coverslipped, one on the
//                                 stainer); no cell block (too little material, the planned cassettes cancelled)
//   S26-5101  Pleural fluid       cell block made and ready to screen: ThinPrep Paps and a Diff-Quik smear ready for review,
//                                 a cell block cut and stained, a second held for immunostains, and the specimen divided into
//                                 flow cytometry, microbiology and molecular aliquots, each with a destination and a status
//   S26-5104  Urine (voided)      ready to sign: 15 mL (under 20 mL, low yield), ThinPrep and smear reviewed, the Paris
//                                 synoptic complete, assigned to Dr. Sarah Johnson
// And:
//   S26-5106  EBUS FNA, station 7 lymph node: ROSE adequate on pass 2; Diff-Quik and Pap smears ready to screen; the cell block
//             handed off and at the Microtome with its H&E and a TTF-1 add-on waiting to be cut
//   S26-5107  Pap, ThinPrep  ┐ the vial and its Pap slide, loaded on a Liquid-Based Cytology Processing batch on the ThinPrep
//   S26-5108  Pap, SurePath  ┘ or the SurePath processor, each with its instrument order (batchDemoSeeds.ts, molecularOrderDemoSeed.ts)
// withFluidDemo adds the second ROSE evaluation (inadequate) to the thyroid FNA S26-5005.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { Decant } from '@/types/case/Material';
import { decantIdentifier, decantSlideIdentifier } from '@/types/labels/LabelData';

const HOUR = 3_600_000;
const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * HOUR).toISOString();

export const DEMO_FLUID_CASE_IDS = {
  pleural: 'S26-5101-CYT-001', peritoneal: 'S26-5102-CYT-001', csf: 'S26-5103-CYT-001', urine: 'S26-5104-CYT-001',
  bronchial: 'S26-5105-CYT-001', ebusFna: 'S26-5106-CYT-001', thinPrepPap: 'S26-5107-CYT-001', surePathPap: 'S26-5108-CYT-001',
} as const;

const PRIYA = { id: 'CT-001', name: 'Priya Desai' };
const NADIA = { id: 'CT-002', name: 'Nadia Rahman' };

type StainSeed = { id: string; stainName: string; stainTypeId?: string; status: string; preparationMethod?: string; userAdded?: boolean };

/** One case's decant builder: identifiers as the app builds them (decantIdentifier, decantSlideIdentifier). */
function decantsFor(acc: string, spLabel: string) {
  return (label: string, fields: Partial<Decant> & Pick<Decant, 'decantType'>, h: number, by: string, stains: StainSeed[] = []): Decant => ({
    id: `dcnt-demo-${acc}-${label}`,
    label,
    displayId: decantIdentifier(acc, spLabel, label),
    createdAt: hoursAgo(h),
    createdBy: by,
    ...fields,
    stains: stains.map((s, i) => ({ ...s, displayId: decantSlideIdentifier(acc, spLabel, label, `L${i + 1}`) })) as Decant['stains'],
  } as Decant);
}

const note = (id: string, who: { id: string; name: string }, text: string, h: number) => ({ id, authorId: who.id, authorName: who.name, text, createdAt: hoursAgo(h) });
const pap = (id: string, status: string) => ({ id, stainName: 'Pap Smear, Liquid-Based (ThinPrep)', stainTypeId: 'st-pap-thinprep', status, preparationMethod: 'ThinPrep/Liquid-Based', userAdded: true });
const diffQuik = (id: string, status: string, method = 'Direct Smear (Air-Dried)') => ({ id, stainName: 'Diff-Quik / Wright-Giemsa', stainTypeId: 'st-diffquik', status, preparationMethod: method, userAdded: true });
const he = (id: string, status: string) => ({ id, stainName: 'H&E', stainTypeId: 'st-he', status, preparationMethod: 'Cell Block' });
/** The two cell block cassettes the fluid protocol plans at accession (proto-nongyn-fluid-cellblock). */
const plannedCellBlocks = (d: ReturnType<typeof decantsFor>, acc: string, h: number, heStatus = 'Pending Cut') => [
  d('D1', { decantType: 'cell_block', cassetteColorId: 'color-green-mesh' }, h, 'system', [he(`stn-demo-${acc}-d1-he`, heStatus)]),
  d('D2', { decantType: 'cell_block', cassetteColorId: 'color-green-mesh' }, h, 'system', [he(`stn-demo-${acc}-d2-he`, heStatus)]),
];

const base = (id: string, patient: Record<string, unknown>, specimen: Record<string, unknown>, extra: Record<string, unknown>, h: number) => ({
  id,
  accession: { accessionNumber: id.slice(4, 8), accessionPrefix: 'S', accessionYear: 2026, fullAccession: id },
  originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
  patient,
  specimens: [{ id: `${id.slice(0, 8)}-SP-1`, label: 'A', receivedAt: hoursAgo(h), collectedAt: hoursAgo(h + 2), specimenFlags: [], ...specimen }],
  diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
  synopticReports: [],
  status: 'in-progress',
  createdAt: hoursAgo(h), updatedAt: hoursAgo(1),
  caseFlags: [], specimenFlags: [], reportingMode: 'orchestrator', coding: {},
  ...extra,
});
const order = (clinician: string, indication: string, h: number, assignedTo: string | null, priority = 'Routine') =>
  ({ priority, requestingProvider: clinician, facilityId: 'c1', facilityName: 'Metro General Hospital', clinicalIndication: indication, receivedDate: hoursAgo(h), assignedTo });

// ── S26-5101 Pleural fluid: cell block made, divided into aliquots, ready to screen ───────────────────────────────
function pleuralCase(): Case {
  const acc = DEMO_FLUID_CASE_IDS.pleural;
  const d = decantsFor(acc, 'A');
  const fluid = d('D3', {
    decantType: 'residual_fluid', totalVolumeMl: 500, appearance: 'Turbid', yieldPelletSize: 'High',
    comments: [note('mc-demo-5101-d3', PRIYA, 'Turbid straw-coloured fluid, 500 mL received. Large pellet. 50 mL divided off for flow, culture and molecular before spinning.', 30)],
  }, 31, PRIYA.name, [pap('stn-demo-5101-d3-1', 'Ready for Review'), pap('stn-demo-5101-d3-2', 'Ready for Review'), diffQuik('stn-demo-5101-d3-3', 'Ready for Review')]);
  const handoff = (h: number) => ({ at: hoursAgo(h), byId: PRIYA.id, byName: PRIYA.name, sourceItemId: fluid.displayId!, stationId: 'station-cytoprep-1' });
  const cellBlock1 = d('D1', { decantType: 'cell_block', cassetteColorId: 'color-green-mesh', handoff: handoff(28) }, 33, 'system', [he('stn-demo-5101-d1-he', 'Ready for Review')]);
  const cellBlock2 = d('D2', {
    decantType: 'cell_block', cassetteColorId: 'color-green-mesh', handoff: handoff(28),
    comments: [note('mc-demo-5101-d2', PRIYA, 'Second cell block held for immunostains (calretinin, MOC-31, TTF-1) if the pathologist asks for them.', 28)],
  }, 33, 'system', []);
  const aliquot = (label: string, purpose: 'flow_cytometry' | 'microbiology' | 'molecular', ml: number, dest: string, status: 'sent' | 'received' | 'result_back', receiving?: string) => {
    const history: { status: 'not_sent' | 'sent' | 'received' | 'result_back'; at: string; byName: string }[] = [{ status: 'not_sent', at: hoursAgo(31), byName: PRIYA.name }, { status: 'sent', at: hoursAgo(30), byName: PRIYA.name }];
    if (status !== 'sent') history.push({ status: 'received', at: hoursAgo(29), byName: PRIYA.name });
    if (status === 'result_back') history.push({ status: 'result_back', at: hoursAgo(6), byName: PRIYA.name });
    return d(label, {
      decantType: 'aliquot', aliquotPurpose: purpose, volumeMl: ml, destination: { kind: 'department', name: dest },
      aliquotStatus: status, aliquotStatusHistory: history, ...(receiving ? { receivingAccession: receiving } : {}),
    }, 31, PRIYA.name);
  };
  const aliquots = [
    aliquot('D4', 'flow_cytometry', 20, 'Flow Cytometry', 'received'),
    aliquot('D5', 'microbiology', 20, 'Microbiology', 'result_back', 'MB26-11873'),
    aliquot('D6', 'molecular', 10, 'Molecular', 'sent'),
  ];
  return base(acc,
    { id: 'PAT-CYT-024', mrn: '105101', firstName: 'Harriet', lastName: 'Okonkwo', dateOfBirth: '1951-02-17T12:00:00.000Z', sex: 'F', phone: '555-510-1001', email: 'harriet.okonkwo@example.org', address: '14 Palo Verde Lane, Phoenix, AZ 85016' },
    {
      description: 'Pleural fluid, right, thoracentesis', specimenDictionaryEntryId: 'sp034',
      decants: [cellBlock1, cellBlock2, fluid, ...aliquots],
      division: { startingVolumeMl: 500, dividedAt: hoursAgo(31), dividedByName: PRIYA.name, aliquotIds: aliquots.map(a => a.id), splitMl: 50, remainingMl: 450 },
    },
    { order: order('Dr. Miriam Castellano', 'Recurrent right pleural effusion; history of breast carcinoma, 2019. Rule out malignancy.', 33, PRIYA.id) },
    33) as unknown as Case;
}

// ── S26-5102 Peritoneal fluid: decanted, suggestions showing ─────────────────────────────────────────────────────
function peritonealCase(): Case {
  const acc = DEMO_FLUID_CASE_IDS.peritoneal;
  const d = decantsFor(acc, 'A');
  const fluid = d('D3', {
    decantType: 'residual_fluid', totalVolumeMl: 1200, appearance: 'Bloody', yieldPelletSize: 'High',
    comments: [note('mc-demo-5102-d3', NADIA, 'Two 600 mL bottles, bloody. Volume, appearance and yield recorded; preparations not chosen yet.', 3)],
  }, 4, NADIA.name);
  return base(acc,
    { id: 'PAT-CYT-025', mrn: '105102', firstName: 'Desmond', lastName: 'Arkwright', dateOfBirth: '1963-08-05T12:00:00.000Z', sex: 'M', phone: '555-510-1002', email: 'desmond.arkwright@example.org', address: '702 Mesquite Bend, Phoenix, AZ 85008' },
    { description: 'Peritoneal fluid, paracentesis', specimenDictionaryEntryId: 'sp035', decants: [...plannedCellBlocks(d, acc, 6), fluid] },
    { order: order('Dr. Leonard Achebe', 'New ascites with omental thickening on CT. Paracentesis 1.2 L.', 6, NADIA.id) },
    6) as unknown as Case;
}

// ── S26-5103 CSF: cytospins accepted, one coverslipped, one staining ─────────────────────────────────────────────
function csfCase(): Case {
  const acc = DEMO_FLUID_CASE_IDS.csf;
  const d = decantsFor(acc, 'A');
  const fluid = d('D3', {
    decantType: 'residual_fluid', totalVolumeMl: 3, appearance: 'Clear', yieldPelletSize: 'Low',
    comments: [note('mc-demo-5103-d3', PRIYA, '3 mL clear CSF: two cytospins accepted. Too little for a cell block, so the planned cassettes are cancelled.', 2)],
  }, 3, PRIYA.name, [diffQuik('stn-demo-5103-d3-1', 'Coverslipped', 'Cytospin'), diffQuik('stn-demo-5103-d3-2', 'Staining', 'Cytospin')]);
  return base(acc,
    { id: 'PAT-CYT-026', mrn: '105103', firstName: 'Tobias', lastName: 'Lindqvist', dateOfBirth: '1988-12-02T12:00:00.000Z', sex: 'M', phone: '555-510-1003', email: 'tobias.lindqvist@example.org', address: '55 Juniper Row, Phoenix, AZ 85021' },
    { description: 'Cerebrospinal fluid, lumbar puncture', specimenDictionaryEntryId: 'sp-cyto-csf', decants: [...plannedCellBlocks(d, acc, 5, 'Cancelled'), fluid] },
    { order: order('Dr. Ingrid Solberg', 'Diffuse large B-cell lymphoma on treatment; new headaches. Rule out CNS involvement.', 5, PRIYA.id, 'STAT') },
    5) as unknown as Case;
}

// ── S26-5104 Urine: screened, synoptic complete, ready to sign ───────────────────────────────────────────────────
function urineCase(): Case {
  const acc = DEMO_FLUID_CASE_IDS.urine;
  const sp = `${acc.slice(0, 8)}-SP-1`;
  const d = decantsFor(acc, 'A');
  const fluid = d('D3', {
    decantType: 'residual_fluid', totalVolumeMl: 15, appearance: 'Clear', yieldPelletSize: 'Low',
    comments: [note('mc-demo-5104-d3', PRIYA, 'Screened: scattered single cells with high N:C ratios and hyperchromasia. Suspicious; to Dr. Johnson.', 4)],
  }, 26, PRIYA.name, [pap('stn-demo-5104-d3-1', 'Ready for Review'), diffQuik('stn-demo-5104-d3-2', 'Ready for Review')]);
  return base(acc,
    { id: 'PAT-CYT-027', mrn: '105104', firstName: 'Clifford', lastName: 'Pennington', dateOfBirth: '1948-05-23T12:00:00.000Z', sex: 'M', phone: '555-510-1004', email: 'clifford.pennington@example.org', address: '9 Ocotillo Court, Phoenix, AZ 85018' },
    { description: 'Urine, voided', specimenDictionaryEntryId: 'sp036', decants: [...plannedCellBlocks(d, acc, 28, 'Cancelled'), fluid] },
    {
      order: order('Dr. Marcus Feld', 'Painless gross hematuria; 40 pack-year smoker.', 28, 'PATH-SJ-001'),
      synopticReports: [{
        instanceId: `${sp}_urine_cytology_demo`, specimenId: sp, templateId: 'urine_cytology', templateName: 'Urine Cytology — Paris System',
        status: 'draft', createdAt: hoursAgo(4), updatedAt: hoursAgo(3),
        answers: {
          specimen_type: 'voided_urine', clinical_indication: ['hematuria'], adequacy_status: 'satisfactory', urothelial_cell_count_note: 'adequate_count',
          paris_category: 'shguc', cellularity: 'moderate', cell_pattern: ['single_cells'], nc_ratio: 'markedly_increased',
          nuclear_features: ['hyperchromasia', 'irregular_membrane'], fish_ordered: 'no',
          comment: 'Rare single atypical urothelial cells with N:C ratio above 0.7, hyperchromasia and irregular nuclear membranes, too few for a definite diagnosis. Cystoscopy is recommended.',
        },
      }],
      participants: [{ staffId: 'PATH-SJ-001', staffName: 'Dr. Sarah Johnson', source: 'system', participationTypeIds: ['attending'], addedBy: 'system', addedAt: hoursAgo(28), status: 'active' }],
    },
    28) as unknown as Case;
}

// ── S26-5105 Bronchial washing: received ─────────────────────────────────────────────────────────────────────────
function bronchialCase(): Case {
  const acc = DEMO_FLUID_CASE_IDS.bronchial;
  const d = decantsFor(acc, 'A');
  return base(acc,
    { id: 'PAT-CYT-028', mrn: '105105', firstName: 'Agnes', lastName: 'Thorburn', dateOfBirth: '1957-10-11T12:00:00.000Z', sex: 'F', phone: '555-510-1005', email: 'agnes.thorburn@example.org', address: '330 Ironwood Trail, Phoenix, AZ 85020' },
    { description: 'Bronchial washing, right upper lobe', specimenDictionaryEntryId: 'sp037', decants: plannedCellBlocks(d, acc, 1) },
    { order: order('Dr. Priyanka Raman', 'Right upper lobe mass, 3.1 cm; bronchoscopy with washing.', 1, null) },
    1) as unknown as Case;
}

// ── S26-5106 EBUS FNA: ROSE adequate, smears to screen, cell block at the Microtome with H&E and TTF-1 ───────────
function ebusFnaCase(): Case {
  const acc = DEMO_FLUID_CASE_IDS.ebusFna;
  const d = decantsFor(acc, 'A');
  const rinse = d('D2', { decantType: 'residual_fluid', totalVolumeMl: 4, appearance: 'Bloody', yieldPelletSize: 'High' }, 9, PRIYA.name,
    [diffQuik('stn-demo-5106-d2-1', 'Ready for Review'), { id: 'stn-demo-5106-d2-2', stainName: 'Pap Smear, Conventional', stainTypeId: 'st-pap-conventional', status: 'Ready for Review', preparationMethod: 'Direct Smear (Fixed)', userAdded: true }]);
  const cellBlock = d('D1', {
    decantType: 'cell_block', cassetteColorId: 'color-green-mesh',
    handoff: { at: hoursAgo(7), byId: PRIYA.id, byName: PRIYA.name, sourceItemId: rinse.displayId!, stationId: 'station-cytoprep-1' },
    comments: [note('mc-demo-5106-d1', PRIYA, 'ROSE: malignant cells, likely non-small cell carcinoma. TTF-1 added for the cell block so it is cut with the H&E.', 8)],
  }, 10, 'system', [he('stn-demo-5106-d1-he', 'Pending Cut'), { id: 'stn-demo-5106-d1-ttf1', stainName: 'TTF-1', stainTypeId: 'st-ttf1', status: 'Pending Cut', preparationMethod: 'Cell Block', userAdded: true }]);
  return base(acc,
    { id: 'PAT-CYT-029', mrn: '105106', firstName: 'Bernard', lastName: 'Vasquez-Hale', dateOfBirth: '1955-03-29T12:00:00.000Z', sex: 'M', phone: '555-510-1006', email: 'bernard.vasquezhale@example.org', address: '81 Cholla Street, Phoenix, AZ 85006' },
    {
      description: 'Lymph node, mediastinal station 7, EBUS-guided fine needle aspiration', specimenDictionaryEntryId: 'sp038',
      decants: [cellBlock, rinse],
      roseEvaluations: [{
        id: 'rose-demo-5106', performedAt: hoursAgo(9), performedBy: { userId: PRIYA.id, userName: PRIYA.name }, location: 'other',
        passes: [
          { passNumber: 1, adequacyAssessment: 'indeterminate', preliminaryImpression: 'Blood and scattered lymphocytes only.' },
          { passNumber: 2, adequacyAssessment: 'adequate', preliminaryImpression: 'Lymphocytes with clusters of malignant epithelial cells; consistent with non-small cell carcinoma.' },
        ],
      }],
    },
    { order: order('Dr. Priyanka Raman', 'Right upper lobe mass with enlarged subcarinal node on PET-CT. EBUS staging.', 10, PRIYA.id, 'STAT') },
    10) as unknown as Case;
}

// ── S26-5107 / 5108 Liquid-based Paps: the vial and its Pap slide, loaded on the processor ───────────────────────
function lbcPapCase(id: string, kind: 'thinprep' | 'surepath', patient: Record<string, unknown>): Case {
  const d = decantsFor(id, 'A');
  const vial = d('D1', { decantType: 'residual_fluid' }, 5, 'system', [kind === 'thinprep'
    ? { id: `stn-demo-${id}-d1-pap`, stainName: 'Pap Smear, Liquid-Based (ThinPrep)', stainTypeId: 'st-pap-thinprep', status: 'Pending Cut', preparationMethod: 'ThinPrep/Liquid-Based' }
    : { id: `stn-demo-${id}-d1-pap`, stainName: 'Pap Smear, Liquid-Based (SurePath)', stainTypeId: 'st-pap-surepath', status: 'Pending Cut', preparationMethod: 'ThinPrep/Liquid-Based' }]);
  return base(id, patient,
    { description: kind === 'thinprep' ? 'Cervical, liquid-based Pap test (ThinPrep)' : 'Cervical, liquid-based Pap test (SurePath)', specimenDictionaryEntryId: kind === 'thinprep' ? 'sp-cyto-pap-thinprep' : 'sp-cyto-pap-surepath', decants: [vial], cytologyScreening: {} },
    { order: order('Dr. Amanda Chen', 'Routine screening.', 5, null) },
    5) as unknown as Case;
}

export const DEMO_FLUID_CASES: Case[] = [
  pleuralCase(), peritonealCase(), csfCase(), urineCase(), bronchialCase(), ebusFnaCase(),
  lbcPapCase(DEMO_FLUID_CASE_IDS.thinPrepPap, 'thinprep', { id: 'PAT-CYT-030', mrn: '105107', firstName: 'Rosalind', lastName: 'Ferreira', dateOfBirth: '1990-07-14T12:00:00.000Z', sex: 'F', phone: '555-510-1007', email: 'rosalind.ferreira@example.org', address: '17 Agave Way, Phoenix, AZ 85014' }),
  lbcPapCase(DEMO_FLUID_CASE_IDS.surePathPap, 'surepath', { id: 'PAT-CYT-031', mrn: '105108', firstName: 'Imogen', lastName: 'Castellanos', dateOfBirth: '1984-01-30T12:00:00.000Z', sex: 'F', phone: '555-510-1008', email: 'imogen.castellanos@example.org', address: '240 Desert Willow Dr, Phoenix, AZ 85022' }),
];

/** The thyroid FNA S26-5005 gets its ROSE evaluation, no adequate pass (the second of S14's two ROSE records), and goes
 *  to Priya Desai's worklist: it was assigned to PATH-001, whom no demo video signs in as, so neither the case nor its
 *  ROSE showed for any demo user. Pure. */
export function withFluidDemo(cases: Case[], now: number = Date.now()): Case[] {
  const ago = (h: number) => new Date(now - h * HOUR).toISOString();
  return cases.map(c => {
    if (c.id !== 'S26-5005-CYT-001' || !c.specimens?.length || (c.specimens[0] as { roseEvaluations?: unknown[] }).roseEvaluations?.length) return c;
    const rose = {
      id: 'rose-demo-5005', performedAt: ago(22), performedBy: { userId: NADIA.id, userName: NADIA.name }, location: 'radiology',
      passes: [
        { passNumber: 1, adequacyAssessment: 'inadequate', preliminaryImpression: 'Blood only.' },
        { passNumber: 2, adequacyAssessment: 'inadequate', preliminaryImpression: 'Rare follicular cells, fewer than six groups.' },
        { passNumber: 3, adequacyAssessment: 'indeterminate', preliminaryImpression: 'Colloid and a few follicular groups; the rinse goes for a cell block.' },
      ],
    };
    return {
      ...c, order: c.order ? { ...c.order, assignedTo: PRIYA.id } : c.order,
      specimens: c.specimens.map((sp, i) => (i === 0 ? { ...sp, roseEvaluations: [rose] } : sp)),
    } as unknown as Case;
  });
}
