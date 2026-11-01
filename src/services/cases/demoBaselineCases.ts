// src/services/cases/demoBaselineCases.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 455 (Pete, Oct 4): "enough baseline demo data that the entire
// application can be exercised ... Some workflow require a second staff
// person with the appropriate RBPs. Then we can reset the demo system that
// removes all the experimentation."
//
// These cases fill the gaps the demo inventory found. All are at Metro
// General Hospital (DVMC organisation, facility c1); dates are relative to
// today, so a Full Reset always brings back the same situation.
//
//   S26-4601..4604  work for Dr. Sarah Johnson, and the delegation and
//                   informal-review pairs between her and Pete Nimmo
//                   (services/delegations/delegationStore.ts,
//                   services/reports/mockInformalReviewService.ts)
//   S26-4610        a resident draft (Dr. James Okafor, attending Pete
//                   Nimmo) ready to release for countersign
//   S26-4620..4623  the statuses nobody could see: finalizing, pending
//                   release (inside its buffer), on hold, closed
//   S26-4630..4633  biopsy → resection pairs and follow-ups: received,
//                   overdue and due soon (services/followUp/followUpDemoSeed.ts)
//   S26-4640..4642  abnormal Paps for cyto-histo correlation and the
//                   follow-up report: one overdue, one with its LEEP received
//   S26-4650..4652  Paps waiting for cytology QC: two screened by Priya
//                   Desai (CT-001) for Nadia Rahman (CT-002) to rescreen,
//                   one the other way round (review records in
//                   services/cytology/mockCytologyReviewRecordService.ts)
//                   Batch 456: all three also carry a pending HPV co-test,
//                   which the Molecular workcenter seed runs
//                   (services/molecular/molecularDemoSeed.ts)
//   A26-4660..4662  Batch 456: hospital-consented autopsies (US), one at each
//                   stage: body in the mortuary awaiting prosection (Pete),
//                   prosected with the PAD drafted and ready to sign (Pete;
//                   once signed the body can be released), and PAD signed
//                   with the FAD waiting on neuropathology (Sarah Johnson)
//                   Batch 468: A26-4661's consent is narrowed to exclude
//                   the brain from examination/retention, to demo the
//                   new consent-scope warning (the retention-tier hard
//                   block is HTA-jurisdiction-only — see
//                   resolveHtaApplicability.ts — and has no seeded US
//                   case to demo it against; covered by unit tests
//                   instead, see resolveAutopsyConsentScopeViolation.test.ts).
//   A26-4663        Batch 468: a medicolegal/forensic autopsy (no NOK
//                   consent — a county Medical Examiner order), prosected,
//                   with one chain-of-custody transfer already on record
//                   (toxicology specimens to the ME's lab) to demo the new
//                   custody log; Batch 469 adds a still-pending toxicology
//                   order on the same specimens, to demo recording its result.
//   S26-4670..4673  Batch 516: Tumor Board / MDT cases (lung, colon,
//                   endometrium, pancreas); their board listings, with
//                   listings on S26-4630, S26-4631 and S26-4642, are in
//                   services/tumorBoard/tumorBoardDemoSeed.ts
//   A26-4665..4667  Batch 745 (seed row S6, Video 4): a temporary accession under a Medical Examiner's verbal order with
//                   the written order pending; a hospital-consented case (brain excluded, retention refused) with the
//                   PAD signed and the body ready for release; a closed case with PAD and FAD signed (Dr. Sarah Johnson).
//   A26-4664        Batch 469: an HTA-governed jurisdiction (England &
//                   Wales) case with full organ retention consented and a
//                   tier already on file, disposal not yet recorded — the
//                   only seeded case resolveHtaApplicability.ts actually
//                   applies to, so it demos the organ/tissue retention
//                   disposal panel.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CaseStatus } from '@/types/case/CaseStatus';
import { DEMO_SIGN_OUT_READY_CASE } from './demoSignOutReadyCase';
import { DEMO_FLUID_CASES } from './demoFluidCases';
import { DEMO_MOLECULAR_CASES } from './demoMolecularCases';
import { DEMO_WALL_VOLUME_CASES } from './demoWallVolumeCases';


const DAY = 86_400_000;
/** N days before now (seed dates stay relative to today). */
export const demoDaysAgo = (days: number): string => new Date(Date.now() - days * DAY).toISOString();
const daysAhead = (days: number): string => new Date(Date.now() + days * DAY).toISOString();
const born = (years: number, month: number, day: number) => new Date(Date.UTC(new Date().getUTCFullYear() - years, month - 1, day)).toISOString();

const DVMC = { originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT' };
const order = (extra: Record<string, unknown>) => ({
  priority: 'Routine', facilityId: 'c1', facilityName: 'Metro General Hospital', ...extra,
});
const acc = (n: string, full = `S26-${n}`) => ({ accessionNumber: n, accessionPrefix: 'S', accessionYear: 2026, fullAccession: full });
const patient = (id: string, mrn: string, firstName: string, lastName: string, dob: string, sex: 'F' | 'M') =>
  ({ id, mrn, firstName, lastName, dateOfBirth: dob, sex, phone: '555-460-' + mrn.slice(-4), email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.org`, address: '1 Demo Way, Phoenix, AZ 85004' });
const draftReport = (specimenId: string, templateId: string, templateName: string, days: number) => ([{
  instanceId: `${specimenId}_${templateId}_demo`, specimenId, templateId, templateName,
  status: 'draft', answers: {}, createdAt: demoDaysAgo(days), updatedAt: demoDaysAgo(days),
}]);
const base = (id: string, status: CaseStatus, days: number) => ({
  id, status, ...DVMC, createdAt: demoDaysAgo(days), updatedAt: demoDaysAgo(Math.max(0, days - 1)),
  caseFlags: [], specimenFlags: [], reportingMode: 'assist', coding: {},
});
const attending = (id: string, name: string, days: number) =>
  ({ staffId: id, staffName: name, source: 'system', participationTypeIds: ['attending'], addedBy: 'system', addedAt: demoDaysAgo(days), status: 'active' });

/** A cytology correlation window as signOutCytologyCase stores it (PS-156). */
const cytoWindow = (collectedDaysAgo: number, reviewId: string, rank: number) => ({
  anchor: 'collection', anchorUsed: 'collection', startsAt: demoDaysAgo(collectedDaysAgo), endsAt: demoDaysAgo(collectedDaysAgo - 180),
  windowDays: 180, ruleSource: 'enterprise', diagnosticRank: rank, reviewId,
});

/** Batch 456: an HPV co-test ordered with the Pap, result not back yet. */
const HPV_PENDING = { hpvCoTestOrdered: true, hpvResult: 'Pending' };

// ── Autopsy (Batch 456) ─────────────────────────────────────────────────────
// Autopsy cases are ordinary cases with Case.autopsy set (services/autopsy/
// README.md); they show on the worklist's Autopsy branch tab and are signed
// (PAD, then FAD) on the report page. The body is the first specimen and its
// locationHistory is where it is (resolveMortuaryStorageOccupancy).
const autopsyAcc = (n: string) => ({ accessionNumber: n, accessionPrefix: 'A', accessionYear: 2026, fullAccession: `A26-${n}` });
const MORTUARY_TRAY_A = 'Mortuary Cooler 1 — Tray A';
const MORTUARY_TRAY_B = 'Mortuary Cooler 1 — Tray B';
const intoMortuary = (tray: string, days: number) =>
  ({ location: tray, workflowStage: 'Mortuary', action: 'Received', at: demoDaysAgo(days), source: 'PathScribe', performedByName: 'Mortuary attendant' });
const body = (n: string, diedDaysAgo: number, receivedDaysAgo: number, locationHistory: Record<string, unknown>[]) => ({
  id: `A26-${n}-SP-1`, label: 'A', description: 'Body (decedent), complete autopsy',
  collectedAt: demoDaysAgo(diedDaysAgo), receivedAt: demoDaysAgo(receivedDaysAgo), specimenFlags: [], locationHistory,
});
// Batch 468: status/excludedOrgans/retentionPermitted are now real,
// structured fields (see AutopsyCaseDetails.ts) — every seeded
// consent here is active, unrestricted scope (none of the demo
// cases' own consentScope text names an organ exclusion), and
// retention-permitting (each one's own scope text already says so:
// "Retention of tissue samples for diagnosis").
const hospitalConsent = (relative: string, relationship: string, days: number, scope: string[]) => ({
  consentingRelativeName: relative, consentingRelativeRelationship: relationship, consentGivenAt: demoDaysAgo(days),
  status: 'active' as const, consentScope: scope, excludedOrgans: [], retentionPermitted: true,
});
const orchSection = (id: string, label: string, text: string) =>
  ({ id, label, type: 'narrative', text, aiGenerated: '', userEdited: true, isStreaming: false });

/** Batch 745: A26-4666's report sections as its PAD froze them (chest and abdomen only). */
const A4666_PAD_SECTIONS = [
  orchSection('aut-4666-external', 'External Examination', 'The body is that of a frail elderly woman appearing the stated age of 86 years; length 155 cm, weight 51 kg. A healing 12 cm right lateral hip incision is closed with staples. Bruising of the right flank. No other injuries.'),
  orchSection('aut-4666-internal', 'Internal Examination', 'Limited to the chest and abdomen, as consented. Bilateral pulmonary thromboemboli in the lower lobe segmental arteries. The right femoral vein contains adherent thrombus. Heart 380 g with moderate aortic valve calcification. Lungs congested. Kidneys with finely granular surfaces.'),
  orchSection('aut-4666-pad', 'Preliminary Anatomic Diagnosis', '1. Bilateral segmental pulmonary thromboemboli.\n2. Deep venous thrombosis, right femoral vein.\n3. Status post open reduction and internal fixation of right hip fracture (postoperative day 3).\n4. Calcific aortic valve sclerosis.\nCause of death (provisional): pulmonary thromboembolism following hip fracture repair. Brain not examined (excluded by consent).'),
];
/** Batch 745: A26-4667's report sections, PAD then FAD. */
const A4667_SECTIONS = [
  orchSection('aut-4667-external', 'External Examination', 'The body is that of an adult man appearing the stated age of 72 years; length 178 cm, weight 84 kg. A 28 cm healing midline laparotomy incision. Anasarca.'),
  orchSection('aut-4667-internal', 'Internal Examination', 'A tube graft replaces the infrarenal abdominal aorta, intact, with no leak. Retroperitoneal hematoma, organizing. Kidneys pale and swollen. Liver with centrilobular pallor. Bowel dusky in the sigmoid colon.'),
  orchSection('aut-4667-pad', 'Preliminary Anatomic Diagnosis', '1. Status post repair of ruptured infrarenal abdominal aortic aneurysm with tube graft.\n2. Organizing retroperitoneal hematoma.\n3. Ischemic colitis, sigmoid colon.\nFinal diagnosis to follow histology.'),
  orchSection('aut-4667-fad', 'Final Anatomic Diagnosis', '1. Ruptured infrarenal abdominal aortic aneurysm, status post repair with tube graft.\n2. Acute tubular necrosis, both kidneys.\n3. Centrilobular hepatic necrosis, consistent with shock liver.\n4. Transmural ischemic necrosis of the sigmoid colon.\nCause of death: multiorgan failure following ruptured abdominal aortic aneurysm.'),
];

/** A26-4662's report sections as its PAD froze them (the FAD section is added empty). */
const A4662_PAD_SECTIONS = [
  orchSection('aut-4662-external', 'External Examination', 'The body is that of a thin elderly man appearing the stated age of 81 years; length 172 cm, weight 58 kg. Bilateral pitting edema of the lower legs to the knees. Stage 2 sacral pressure ulcer, 3 × 2 cm.'),
  orchSection('aut-4662-internal', 'Internal Examination', 'Heart 560 g with four-chamber dilatation; left ventricle 1.4 cm. Severe three-vessel coronary atherosclerosis, up to 80% stenosis of the left anterior descending artery, with a 3 cm healed posterior wall scar. Bilateral pleural effusions (right 600 mL, left 450 mL). Lungs heavy and congested. Liver with a nutmeg cut surface. Brain 1,080 g with marked frontal and temporal atrophy and hippocampal atrophy; fixed whole for neuropathology.'),
  orchSection('aut-4662-pad', 'Preliminary Anatomic Diagnosis', '1. Severe three-vessel coronary atherosclerosis with healed posterior myocardial infarction.\n2. Cardiomegaly (560 g) with four-chamber dilatation.\n3. Chronic passive congestion: bilateral pleural effusions, pulmonary congestion, centrilobular hepatic congestion.\n4. Cerebral atrophy, frontal and temporal predominant, with hippocampal atrophy (brain 1,080 g); neuropathology to follow.\nCause of death (provisional): congestive heart failure due to ischemic cardiomyopathy.'),
];

const pap = (id: string, n: string, pt: ReturnType<typeof patient>, days: number, screening: Record<string, unknown>, extra: Record<string, unknown>) => ({
  ...base(id, 'in-progress', days),
  accession: acc(n, id),
  patient: { ...pt, sex: 'F' },
  specimens: [{
    id: `S26-${n}-SP-1`, label: 'A', description: 'Cervical/vaginal Pap smear, liquid-based', receivedAt: demoDaysAgo(days), collectedAt: demoDaysAgo(days),
    specimenFlags: [], specimenDictionaryEntryId: 'sp-cyto-pap', collection: { bodySite: 'Cervix' }, cytologyScreening: screening,
  }],
  order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Routine cervical screening.', receivedDate: demoDaysAgo(days), assignedTo: null }),
  diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
  synopticReports: [],
  reportingMode: 'orchestrator',
  ...extra,
});

export const DEMO_BASELINE_CASES: Case[] = [
  // ── Dr. Sarah Johnson's work ──────────────────────────────────────────────
  {
    ...base('S26-4601', 'in-progress', 2),
    accession: acc('4601'),
    patient: patient('PAT-D601', '104601', 'Helen', 'Marsh', born(61, 4, 2), 'F'),
    specimens: [{ id: 'S26-4601-SP-1', label: 'A', description: 'Sigmoid colon polyp, polypectomy', receivedAt: demoDaysAgo(2), collectedAt: demoDaysAgo(3), specimenFlags: [], collection: { bodySite: 'Sigmoid colon' } }],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'Screening colonoscopy: 1.2 cm pedunculated sigmoid polyp.', receivedDate: demoDaysAgo(2), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Received in formalin labeled "sigmoid polyp" is a pedunculated polyp, 1.2 × 1.0 × 0.8 cm, with a 0.4 cm stalk. Bisected and entirely submitted in A1.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 2)],
  },
  {
    ...base('S26-4602', 'draft', 3),
    accession: acc('4602'),
    patient: patient('PAT-D602', '104602', 'George', 'Ellis', born(70, 9, 18), 'M'),
    specimens: [{ id: 'S26-4602-SP-1', label: 'A', description: 'Skin, left forearm, excision', receivedAt: demoDaysAgo(3), collectedAt: demoDaysAgo(4), specimenFlags: [], collection: { bodySite: 'Skin, forearm', laterality: 'Left' } }],
    order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Pigmented lesion, changing. Rule out melanoma.', receivedDate: demoDaysAgo(3), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Ellipse of skin 2.1 × 0.9 × 0.5 cm with a 0.6 cm irregular brown macule. Margins inked; serially sectioned and entirely submitted in A1–A3.', microscopicDescription: 'Compound melanocytic proliferation with architectural disorder and focal cytologic atypia.', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 3)],
  },
  {
    // Sarah Johnson has asked Pete Nimmo for a second opinion (delegation, pending).
    ...base('S26-4603', 'in-progress', 2),
    accession: acc('4603'),
    patient: patient('PAT-D603', '104603', 'Irene', 'Fowler', born(55, 1, 30), 'F'),
    specimens: [{ id: 'S26-4603-SP-1', label: 'A', description: 'Thyroid, right lobectomy', receivedAt: demoDaysAgo(2), collectedAt: demoDaysAgo(2), specimenFlags: [], collection: { bodySite: 'Thyroid', laterality: 'Right' } }],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Bethesda IV nodule, 2.4 cm.', receivedDate: demoDaysAgo(2), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Right thyroid lobe, 14 g, with a 2.3 cm encapsulated tan nodule.', microscopicDescription: 'Encapsulated follicular-patterned lesion. Capsule examined in full; one focus suspicious for capsular invasion.', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 2)],
  },
  {
    // Pete Nimmo has asked Sarah Johnson for a second opinion (delegation, pending),
    // and Sarah has asked Pete for an informal review of S26-4601.
    ...base('S26-4604', 'in-progress', 1),
    accession: acc('4604'),
    patient: patient('PAT-D604', '104604', 'Walter', 'Brennan', born(66, 6, 7), 'M'),
    specimens: [{ id: 'S26-4604-SP-1', label: 'A', description: 'Prostate, transurethral resection chips', receivedAt: demoDaysAgo(1), collectedAt: demoDaysAgo(1), specimenFlags: [], collection: { bodySite: 'Prostate' } }],
    order: order({ requestingProvider: 'Dr. David Wilson', orderingPhysicianId: 'ph5', clinicalIndication: 'BPH with retention. PSA 6.1.', receivedDate: demoDaysAgo(1), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '18 g of tan rubbery chips. 12 cassettes submitted.', microscopicDescription: 'Nodular hyperplasia. Small focus of crowded small glands in one chip.', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-001', 'Pete Nimmo', 1)],
  },

  // ── Resident case ready to release for countersign ───────────────────────
  {
    ...base('S26-4610', 'in-progress', 1),
    accession: acc('4610'),
    patient: patient('PAT-D610', '104610', 'Lorraine', 'Hughes', born(49, 11, 3), 'F'),
    specimens: [{ id: 'S26-4610-SP-1', label: 'A', description: 'Left breast core needle biopsy', receivedAt: demoDaysAgo(1), collectedAt: demoDaysAgo(2), specimenFlags: [], collection: { bodySite: 'Breast', laterality: 'Left' } }],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'BIRADS 4C mass, left breast 10 o\'clock.', receivedDate: demoDaysAgo(1), assignedTo: '2', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Four cores, 0.8–1.6 cm, entirely submitted in A1.', microscopicDescription: 'Invasive carcinoma of no special type, Nottingham grade 2 on this sample. No lymphovascular invasion seen.', ancillaryStudies: 'ER, PR and HER2 to follow.' },
    synopticReports: draftReport('S26-4610-SP-1', 'breast_invasive', 'Generic Template — Breast Invasive', 1),
    requiresCountersign: true,
    participants: [
      attending('PATH-001', 'Pete Nimmo', 1),
      { staffId: '2', staffName: 'Dr. James Okafor', source: 'system', participationTypeIds: ['resident'], addedBy: 'PATH-001', addedAt: demoDaysAgo(1), status: 'active' },
    ],
  },

  // ── Statuses nobody could see before ──────────────────────────────────────
  {
    ...base('S26-4620', 'finalizing', 2),
    accession: acc('4620'),
    patient: patient('PAT-D620', '104620', 'Martin', 'Cole', born(58, 2, 14), 'M'),
    specimens: [{ id: 'S26-4620-SP-1', label: 'A', description: 'Gallbladder, cholecystectomy', receivedAt: demoDaysAgo(2), collectedAt: demoDaysAgo(2), specimenFlags: [], collection: { bodySite: 'Gallbladder' } }],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Symptomatic cholelithiasis.', receivedDate: demoDaysAgo(2), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Gallbladder 8.5 cm, wall 0.3 cm, containing multiple yellow stones.', microscopicDescription: 'Chronic cholecystitis with cholelithiasis.', ancillaryStudies: '' },
    synopticReports: [],
  },
  {
    // Signed out and held in its release buffer (the Pending Release tile).
    ...base('S26-4621', 'pending-release', 1),
    accession: acc('4621'),
    patient: patient('PAT-D621', '104621', 'Agnes', 'Porter', born(72, 7, 21), 'F'),
    specimens: [{ id: 'S26-4621-SP-1', label: 'A', description: 'Skin, nose, shave biopsy', receivedAt: demoDaysAgo(1), collectedAt: demoDaysAgo(2), specimenFlags: [], collection: { bodySite: 'Skin, nose' } }],
    order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Pearly papule.', receivedDate: demoDaysAgo(1), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Shave, 0.6 × 0.5 cm. Entirely submitted.', microscopicDescription: 'Basal cell carcinoma, nodular type, extending to the deep margin.', ancillaryStudies: '' },
    synopticReports: [],
    finalizedAt: demoDaysAgo(0), finalizedBy: 'PATH-001',
    releaseBufferExpiresAt: daysAhead(1), releaseBufferDurationMinutes: 1440, preReleaseBufferStatus: 'in-progress',
  },
  {
    ...base('S26-4622', 'in-progress', 4),
    accession: acc('4622'),
    patient: patient('PAT-D622', '104622', 'Victor', 'Lang', born(63, 3, 9), 'M'),
    specimens: [{ id: 'S26-4622-SP-1', label: 'A', description: 'Stomach, antral biopsies', receivedAt: demoDaysAgo(4), collectedAt: demoDaysAgo(4), specimenFlags: [], collection: { bodySite: 'Stomach' } }],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'Dyspepsia; prior H. pylori.', receivedDate: demoDaysAgo(4), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Three tan fragments, 0.2–0.4 cm.', microscopicDescription: 'Chronic active gastritis. Organisms not definitely seen on H&E.', ancillaryStudies: 'H. pylori IHC ordered.' },
    synopticReports: [],
    caseHolds: [{ id: 'hold-demo-4622', reason: 'awaiting_outside_materials', note: 'Waiting for the prior outside endoscopy report and slides from the referring practice.', setAt: demoDaysAgo(2), setByUserId: 'PATH-001', setByUserName: 'Pete Nimmo', active: true }],
  },
  {
    ...base('S26-4623', 'closed', 30),
    accession: acc('4623'),
    patient: patient('PAT-D623', '104623', 'Doris', 'Kemp', born(80, 12, 1), 'F'),
    specimens: [{ id: 'S26-4623-SP-1', label: 'A', description: 'Skin, back, punch biopsy', receivedAt: demoDaysAgo(30), collectedAt: demoDaysAgo(31), specimenFlags: [], collection: { bodySite: 'Skin, back' } }],
    order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Rash, rule out vasculitis.', receivedDate: demoDaysAgo(30), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '4 mm punch, entirely submitted.', microscopicDescription: 'Superficial perivascular dermatitis. No vasculitis.', ancillaryStudies: '' },
    synopticReports: [],
    finalizedAt: demoDaysAgo(28), finalizedBy: 'PATH-001', releasedAt: demoDaysAgo(28),
  },

  // ── Biopsy → resection pairs and follow-ups ──────────────────────────────
  {
    // Biopsy marked "follow-up expected"; the mastectomy (S26-4631) arrived: received.
    ...base('S26-4630', 'finalized', 40),
    accession: acc('4630'),
    patient: patient('PAT-D630', '104630', 'Carol', 'Benson', born(57, 5, 5), 'F'),
    specimens: [{ id: 'S26-4630-SP-1', label: 'A', description: 'Left breast core needle biopsy', receivedAt: demoDaysAgo(39), collectedAt: demoDaysAgo(40), specimenFlags: [], collection: { bodySite: 'Breast', laterality: 'Left' } }],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'BIRADS 5 mass, left breast.', receivedDate: demoDaysAgo(39), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Three cores, entirely submitted.', microscopicDescription: 'Invasive carcinoma of no special type, grade 2.', ancillaryStudies: 'ER positive, PR positive, HER2 negative (1+).' },
    synopticReports: [],
    finalizedAt: demoDaysAgo(37), finalizedBy: 'PATH-001', releasedAt: demoDaysAgo(37),
  },
  {
    ...base('S26-4631', 'in-progress', 5),
    accession: acc('4631'),
    patient: patient('PAT-D630', '104630', 'Carol', 'Benson', born(57, 5, 5), 'F'),
    specimens: [
      { id: 'S26-4631-SP-1', label: 'A', description: 'Left breast mastectomy', receivedAt: demoDaysAgo(5), collectedAt: demoDaysAgo(5), specimenFlags: [], collection: { bodySite: 'Breast', laterality: 'Left' } },
      { id: 'S26-4631-SP-2', label: 'B', description: 'Left axillary sentinel lymph node', receivedAt: demoDaysAgo(5), collectedAt: demoDaysAgo(5), specimenFlags: [], collection: { bodySite: 'Axillary lymph node', laterality: 'Left' } },
    ],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Invasive carcinoma on core biopsy S26-4630. Mastectomy and sentinel node.', receivedDate: demoDaysAgo(5), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Mastectomy 640 g with a 2.6 cm firm stellate mass in the upper outer quadrant, 1.1 cm from the deep margin.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: draftReport('S26-4631-SP-1', 'breast_invasive', 'Generic Template — Breast Invasive', 4),
    participants: [attending('PATH-001', 'Pete Nimmo', 5)],
  },
  {
    // Follow-up expected, nothing arrived: overdue (about 20 days).
    ...base('S26-4632', 'finalized', 200),
    accession: acc('4632'),
    patient: patient('PAT-D632', '104632', 'Rita', 'Gallagher', born(64, 8, 30), 'F'),
    specimens: [{ id: 'S26-4632-SP-1', label: 'A', description: 'Right breast core needle biopsy', receivedAt: demoDaysAgo(199), collectedAt: demoDaysAgo(200), specimenFlags: [], collection: { bodySite: 'Breast', laterality: 'Right' } }],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'BIRADS 4B mass, right breast.', receivedDate: demoDaysAgo(199), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Two cores, entirely submitted.', microscopicDescription: 'Atypical ductal hyperplasia. Excision recommended.', ancillaryStudies: '' },
    synopticReports: [],
    finalizedAt: demoDaysAgo(197), finalizedBy: 'PATH-001', releasedAt: demoDaysAgo(197),
  },
  {
    // Follow-up expected (re-excision), due in about 20 days: due soon.
    ...base('S26-4633', 'finalized', 160),
    accession: acc('4633'),
    patient: patient('PAT-D633', '104633', 'Frank', 'Delaney', born(69, 10, 12), 'M'),
    specimens: [{ id: 'S26-4633-SP-1', label: 'A', description: 'Skin, right cheek, shave biopsy', receivedAt: demoDaysAgo(159), collectedAt: demoDaysAgo(160), specimenFlags: [], collection: { bodySite: 'Skin, cheek', laterality: 'Right' } }],
    order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Changing pigmented lesion.', receivedDate: demoDaysAgo(159), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Shave, 0.7 × 0.6 cm, entirely submitted.', microscopicDescription: 'Melanoma in situ, lentigo maligna type, involving the peripheral margin. Re-excision recommended.', ancillaryStudies: '' },
    synopticReports: [],
    finalizedAt: demoDaysAgo(157), finalizedBy: 'PATH-SJ-001', releasedAt: demoDaysAgo(157),
  },

  // ── Abnormal Paps: cyto-histo correlation and follow-up ──────────────────
  pap('S26-4640-CYT-001', '4640', patient('PAT-D640', '104640', 'Monica', 'Reyes', born(33, 2, 19), 'F'), 210, {
    finalDiagnosis: {
      reviewRecordId: 'cyto-review-demo-4640-primary', primaryInterpretationId: 'cyto-squam-hsil',
      adequacySelections: [{ categoryId: 'cyto-adeq-satisfactory' }],
      selectedBy: 'PATH-SJ-001', selectedByName: 'Dr. Sarah Johnson', selectedAt: demoDaysAgo(207),
    },
    // HSIL, no histology since: the follow-up is about 30 days overdue.
    histologyCorrelationWindow: cytoWindow(210, 'cyto-review-demo-4640-primary', 4),
  }, { status: 'finalized', finalizedAt: demoDaysAgo(207), finalizedBy: 'PATH-SJ-001', releasedAt: demoDaysAgo(207), order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Routine cervical screening.', receivedDate: demoDaysAgo(210), assignedTo: 'PATH-SJ-001' }) }),
  pap('S26-4641-CYT-001', '4641', patient('PAT-D641', '104641', 'Elena', 'Cruz', born(29, 6, 4), 'F'), 100, {
    finalDiagnosis: {
      reviewRecordId: 'cyto-review-demo-4641-primary', primaryInterpretationId: 'cyto-squam-hsil',
      adequacySelections: [{ categoryId: 'cyto-adeq-satisfactory' }],
      selectedBy: 'PATH-SJ-001', selectedByName: 'Dr. Sarah Johnson', selectedAt: demoDaysAgo(97),
    },
    histologyCorrelationWindow: cytoWindow(100, 'cyto-review-demo-4641-primary', 4),
    // The LEEP (S26-4642) arrived inside the window: a correlation to record.
    histologyCorrelationCandidates: [{ candidateCaseId: 'S26-4642', detectedAt: demoDaysAgo(29) }],
  }, { status: 'finalized', finalizedAt: demoDaysAgo(97), finalizedBy: 'PATH-SJ-001', releasedAt: demoDaysAgo(97), order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Routine cervical screening.', receivedDate: demoDaysAgo(100), assignedTo: 'PATH-SJ-001' }) }),
  {
    ...base('S26-4642', 'in-progress', 30),
    accession: acc('4642'),
    patient: patient('PAT-D641', '104641', 'Elena', 'Cruz', born(29, 6, 4), 'F'),
    specimens: [{ id: 'S26-4642-SP-1', label: 'A', description: 'Cervix, loop electrosurgical excision (LEEP)', receivedAt: demoDaysAgo(30), collectedAt: demoDaysAgo(30), specimenFlags: [], collection: { bodySite: 'Cervix' } }],
    order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'HSIL on Pap S26-4641. Colposcopy-directed LEEP.', receivedDate: demoDaysAgo(30), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'LEEP cone, 2.2 × 1.8 × 0.9 cm, inked and serially sectioned in 10 slices.', microscopicDescription: 'High-grade squamous intraepithelial lesion (CIN 3). Margins free.', ancillaryStudies: 'p16 block positive.' },
    synopticReports: [],
  },

  // ── Paps waiting for cytology QC ─────────────────────────────────────────
  pap('S26-4650-CYT-001', '4650', patient('PAT-D650', '104650', 'Lucy', 'Hart', born(41, 3, 3), 'F'), 2, {
    qcFlag: { reason: 'random_selection', flaggedBy: 'system', flaggedByName: 'QC selection', flaggedAt: demoDaysAgo(1) },
    ...HPV_PENDING,
  }, { order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Routine cervical screening.', receivedDate: demoDaysAgo(2), assignedTo: 'CT-001' }) }),
  pap('S26-4651-CYT-001', '4651', patient('PAT-D651', '104651', 'Grace', 'Oyelaran', born(36, 9, 27), 'F'), 2, {
    qcFlag: { reason: 'targeted_high_risk', flaggedBy: 'system', flaggedByName: 'QC selection', flaggedAt: demoDaysAgo(1) },
    ...HPV_PENDING,
  }, { order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Prior ASC-US; HPV positive.', receivedDate: demoDaysAgo(2), assignedTo: 'CT-001' }) }),
  pap('S26-4652-CYT-001', '4652', patient('PAT-D652', '104652', 'Ruth', 'Okonjo', born(52, 4, 16), 'F'), 1, {
    qcFlag: { reason: 'random_selection', flaggedBy: 'system', flaggedByName: 'QC selection', flaggedAt: demoDaysAgo(0) },
    ...HPV_PENDING,
  }, { order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Routine cervical screening.', receivedDate: demoDaysAgo(1), assignedTo: 'CT-002' }) }),

  // ── Autopsies (Batch 456) ────────────────────────────────────────────────
  {
    // Consent logged, body in the mortuary: ready for prosection (the gross
    // examination gate is open). Pete Nimmo's; Connor Whitlock (PA) prosects.
    ...base('A26-4660', 'accessioned', 1),
    accession: autopsyAcc('4660'),
    reportingMode: 'orchestrator',
    patient: patient('PAT-D660', '104660', 'Harold', 'Vance', born(78, 1, 22), 'M'),
    specimens: [body('4660', 1, 1, [intoMortuary(MORTUARY_TRAY_A, 1)])],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Inpatient death, hospital day 6. Community-acquired pneumonia with septic shock; 3.1 cm right upper lobe mass on admission CT, never biopsied. Clinical team requests autopsy for cause of death and nature of the lung mass.', receivedDate: demoDaysAgo(1), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-001', 'Pete Nimmo', 1)],
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      hospitalConsent: hospitalConsent('Margaret Vance', 'spouse', 1, ['Complete autopsy including brain', 'Retention of tissue samples for diagnosis']),
    },
  },
  {
    // Prosected two days ago; the PAD is drafted and ready to sign. Once Pete
    // signs it, the body (Tray B) can be released to the funeral home.
    ...base('A26-4661', 'in-progress', 3),
    accession: autopsyAcc('4661'),
    reportingMode: 'orchestrator',
    patient: patient('PAT-D661', '104661', 'Eleanor', 'Brooks', born(64, 8, 11), 'F'),
    specimens: [{ ...body('4661', 3, 3, [intoMortuary(MORTUARY_TRAY_B, 3)]), organCodes: ['brain', 'heart'] }],
    order: order({ requestingProvider: 'Dr. David Wilson', orderingPhysicianId: 'ph5', clinicalIndication: 'Sudden collapse and death on postoperative day 4 after right total knee arthroplasty. Suspected pulmonary embolism. Medical examiner notified and declined jurisdiction.', receivedDate: demoDaysAgo(3), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [
      attending('PATH-001', 'Pete Nimmo', 3),
      { staffId: 'PA-001', staffName: 'Connor Whitlock', source: 'system', participationTypeIds: ['grossing'], addedBy: 'PATH-001', addedAt: demoDaysAgo(2), status: 'active' },
    ],
    orchSections: [
      orchSection('aut-4661-external', 'External Examination', 'The body is that of a well-developed, obese adult woman appearing the stated age of 64 years; length 163 cm, weight 98 kg. A healing 14 cm midline anterior right knee incision is closed with staples, without dehiscence or purulence. The right calf is 3 cm larger in circumference than the left. No other injuries.'),
      orchSection('aut-4661-internal', 'Internal Examination', 'A saddle thromboembolus straddles the bifurcation of the main pulmonary artery and extends into both lower lobe arteries. The right popliteal and superficial femoral veins contain adherent laminated thrombus. Heart 450 g; left ventricular wall 1.6 cm; coronary arteries with up to 40% stenosis. Lungs 620 g (right) and 540 g (left), congested. Kidneys with finely granular cortical surfaces.'),
      orchSection('aut-4661-pad', 'Preliminary Anatomic Diagnosis', '1. Saddle pulmonary thromboembolus with extension into both lower lobe pulmonary arteries.\n2. Deep venous thrombosis, right popliteal and superficial femoral veins.\n3. Status post right total knee arthroplasty (postoperative day 4).\n4. Cardiomegaly (450 g) with left ventricular hypertrophy.\n5. Mild coronary atherosclerosis.\n6. Arterionephrosclerosis.\nCause of death (provisional): pulmonary thromboembolism due to deep venous thrombosis following knee arthroplasty. Final diagnosis to follow histology.'),
    ],
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      // Batch 468: narrowed — family declined brain examination/retention
      // specifically; the body specimen's organCodes (above) include
      // 'brain', so the report page's consent-scope warning banner fires.
      hospitalConsent: {
        ...hospitalConsent('Daniel Brooks', 'adult_child', 3, ['Complete autopsy, brain excluded', 'Retention of tissue samples for diagnosis']),
        status: 'narrowed', statusChangedAt: demoDaysAgo(3), excludedOrgans: ['brain'],
      },
    },
  },
  {
    // PAD signed 11 days ago and the body released; the FAD waits on the
    // fixed-brain neuropathology examination (ancillary hold, SLA paused).
    ...base('A26-4662', 'in-progress', 12),
    accession: autopsyAcc('4662'),
    reportingMode: 'orchestrator',
    patient: patient('PAT-D662', '104662', 'Samuel', 'Ortiz', born(81, 5, 3), 'M'),
    specimens: [body('4662', 12, 12, [
      intoMortuary(MORTUARY_TRAY_A, 12),
      { location: 'Saguaro Family Funeral Home', action: 'Released', at: demoDaysAgo(11), source: 'PathScribe', performedByName: 'Dr. Sarah Johnson' },
    ])],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'Death in hospital with chronic heart failure and progressive dementia over 6 years. Family requests autopsy including brain examination to establish the type of dementia.', receivedDate: demoDaysAgo(12), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 12)],
    orchSections: [...A4662_PAD_SECTIONS, orchSection('aut-4662-final', 'Final Anatomic Diagnosis', '')],
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [],
      hospitalConsent: hospitalConsent('Lucia Ortiz', 'adult_child', 12, ['Complete autopsy including brain', 'Retention of brain for neuropathology examination']),
      padSnapshot: {
        tier: 'PAD',
        frozenPayload: { scope: 'full', jurisdiction: 'US', sections: A4662_PAD_SECTIONS.map(({ id, label, text }) => ({ id, label, text })) },
        signedBy: { name: 'Dr. Sarah Johnson', isPathologist: true },
        signedAt: demoDaysAgo(11.5),
      },
      // Set after the body was released (the release gate refuses while a hold is active).
      ancillaryHold: { active: true, reason: 'Fixed-brain neuropathology examination (brain in formalin for 2 weeks)', startedAt: demoDaysAgo(10.5) },
    },
  },
  {
    // Batch 468: a medicolegal/forensic case — no NOK consent, prosected
    // under a county ME order. One custody transfer already on record
    // (toxicology specimens to the ME's lab); demos the new custody log
    // and recording a second transfer.
    ...base('A26-4663', 'in-progress', 2),
    accession: autopsyAcc('4663'),
    reportingMode: 'orchestrator',
    patient: patient('PAT-D663', '104663', 'Marcus', 'Devereaux', born(47, 11, 9), 'M'),
    specimens: [{ ...body('4663', 2, 2, [intoMortuary(MORTUARY_TRAY_A, 2)]), organCodes: ['heart', 'stomach'] }],
    order: order({ requestingProvider: 'County Medical Examiner', orderingPhysicianId: 'ph1', clinicalIndication: 'Unattended death found at home; circumstances unclear. Medical Examiner has assumed jurisdiction and ordered a full forensic autopsy.', receivedDate: demoDaysAgo(2), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-001', 'Pete Nimmo', 2)],
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false },
      forensicAuthorization: {
        authorityType: 'Medical Examiner', authorityName: 'County Medical Examiner, Office of the ME',
        orderReference: 'ME-2026-04663', orderDate: demoDaysAgo(2),
      },
      custodyLog: [{
        id: 'A26-4663-CUSTODY-1', occurredAt: demoDaysAgo(1),
        itemDescription: 'Postmortem blood and vitreous fluid (toxicology specimens)',
        fromCustodianType: 'pathology_department', fromCustodianName: 'PathScribe Mortuary',
        toCustodianType: 'medical_examiner', toCustodianName: 'County Medical Examiner Toxicology Lab',
        releasedByName: 'Pete Nimmo', receivedByName: 'Tech. R. Alvarez',
        notes: 'Sealed kit, courier transport, chain-of-custody seal #40217.',
      }],
      // Batch 469 (PS-261 §2.3): the custody transfer above is the
      // specimen handoff; this is the toxicology order itself, still
      // pending — demos the toxicology panel's "Record Result" action
      // and its own ancillaryHold (distinct from the case's current
      // false/inactive hold above, which this order would in reality
      // have set active — kept false here only so the earlier Batch
      // 468 demo narrative around this case's SLA isn't disturbed).
      toxicologyOrders: [{
        id: 'tox-A26-4663-1', orderedAt: demoDaysAgo(1), orderedByName: 'Pete Nimmo',
        specimenDescription: 'Postmortem blood and vitreous fluid',
        analytesRequested: 'Ethanol, common drugs of abuse panel', labName: 'County Medical Examiner Toxicology Lab',
        status: 'ordered',
      }],
    },
  },
  {
    // Batch 469 (PS-261 §2.4.2): an HTA-governed jurisdiction (England
    // & Wales) case with full organ retention consented and a tier
    // already on file, disposal not yet recorded — demos the organ/
    // tissue retention disposal panel (resolveHtaApplicability.ts has
    // no other seeded case where this control even shows: A26-4660..
    // 4663 are all US). Consent permits retention; no NOK narrowing.
    ...base('A26-4664', 'in-progress', 6),
    accession: autopsyAcc('4664'),
    reportingMode: 'orchestrator',
    patient: patient('PAT-D664', '104664', 'Winifred', 'Carrow', born(73, 2, 14), 'F'),
    specimens: [body('4664', 6, 6, [intoMortuary(MORTUARY_TRAY_A, 6)])],
    order: order({ requestingProvider: 'Dr. Olivia Hart', orderingPhysicianId: 'ph5', clinicalIndication: 'Unexpected inpatient death with a progressive neurological decline of unknown cause. Family requests full autopsy including brain retention for specialist neuropathology opinion.', receivedDate: demoDaysAgo(6), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 6)],
    autopsy: {
      jurisdiction: 'GB_EW', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      hospitalConsent: hospitalConsent('Thomas Carrow', 'spouse', 6, ['Complete autopsy including brain', 'Retention of organs for neuropathology and research']),
      organRetentionTier: 'tier_2_full_organ_retention',
    },
  },
  // ── Batch 745 (Pete's seed row S6, Video 4): the three stages the video needs and the seed did not have ──
  {
    // Temporary (downtime) accession under a Medical Examiner's verbal order; the written order is not in yet, so the
    // report page shows "temporary accession, written authorization pending" and Complete authorization.
    ...base('A26-4665', 'accessioned', 0.3),
    accession: autopsyAcc('4665'),
    reportingMode: 'orchestrator', intakeType: 'downtime',
    patient: patient('PAT-D665', '104665', 'Gordon', 'Pryce', born(69, 4, 8), 'M'),
    specimens: [{ ...body('4665', 0.5, 0.3, [intoMortuary(MORTUARY_TRAY_B, 0.3)]), specimenDictionaryEntryId: 'sp-autopsy-complete', organCodes: ['heart', 'right_lung', 'left_lung', 'liver'] }],
    order: order({ requestingProvider: 'County Medical Examiner', orderingPhysicianId: 'ph1', clinicalIndication: 'Found unresponsive at work; witnessed collapse. Medical Examiner has taken jurisdiction by telephone; the written order is to follow.', receivedDate: demoDaysAgo(0.3), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 0.3)],
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'statutory_judicial', scope: 'full', addenda: [], ancillaryHold: { active: false },
      forensicAuthorization: {
        authorityType: 'Medical Examiner', authorityName: 'County Medical Examiner, Office of the ME',
        verbalOrderReceivedAt: demoDaysAgo(0.35), verbalOrderReceivedFrom: 'Deputy Medical Examiner L. Moreno',
        orderReference: '', orderDate: '',
      },
    },
  },
  {
    // Hospital-consented, the family excluding the brain and refusing retention; prosected, the PAD signed, the body
    // still in Tray B with no hold: "Autopsy — Ready for Body Release".
    ...base('A26-4666', 'in-progress', 2),
    accession: autopsyAcc('4666'),
    reportingMode: 'orchestrator',
    patient: patient('PAT-D666', '104666', 'Mildred', 'Ashcombe', born(86, 9, 30), 'F'),
    specimens: [{ ...body('4666', 2.2, 2, [intoMortuary(MORTUARY_TRAY_B, 2)]), specimenDictionaryEntryId: 'sp-autopsy-complete', organCodes: ['heart', 'right_lung', 'left_lung', 'liver', 'right_kidney', 'left_kidney'] }],
    order: order({ requestingProvider: 'Dr. Olivia Hart', orderingPhysicianId: 'ph5', clinicalIndication: 'Inpatient death after a fall at home with a right hip fracture; rapid decline on day 3. Family requests autopsy to exclude pulmonary embolism; brain examination declined.', receivedDate: demoDaysAgo(2), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 2)],
    orchSections: A4666_PAD_SECTIONS,
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'trunk_visceral_only', addenda: [], ancillaryHold: { active: false },
      hospitalConsent: {
        ...hospitalConsent('Graham Ashcombe', 'adult_child', 2, ['Chest and abdomen only; brain excluded', 'No retention of organs or tissue beyond diagnostic sections']),
        status: 'narrowed', statusChangedAt: demoDaysAgo(2), excludedOrgans: ['brain'], retentionPermitted: false,
      },
      padSnapshot: {
        tier: 'PAD',
        frozenPayload: { scope: 'trunk_visceral_only', jurisdiction: 'US', sections: A4666_PAD_SECTIONS.map(({ id, label, text }) => ({ id, label, text })) },
        signedBy: { name: 'Dr. Sarah Johnson', isPathologist: true },
        signedAt: demoDaysAgo(0.5),
      },
    },
  },
  {
    // Final signed: PAD and FAD signed, the body released, the case closed.
    ...base('A26-4667', 'finalized', 30),
    accession: autopsyAcc('4667'),
    reportingMode: 'orchestrator',
    finalizedAt: demoDaysAgo(4), finalizedBy: 'PATH-SJ-001', releasedAt: demoDaysAgo(4),
    patient: patient('PAT-D667', '104667', 'Reginald', 'Okafor-Lindt', born(72, 12, 19), 'M'),
    specimens: [{ ...body('4667', 30.5, 30, [
      intoMortuary(MORTUARY_TRAY_A, 30),
      { location: 'Desert Rose Funeral Chapel', action: 'Released', at: demoDaysAgo(28), source: 'PathScribe', performedByName: 'Dr. Sarah Johnson' },
    ]), specimenDictionaryEntryId: 'sp-autopsy-complete' }],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Death in the intensive care unit with multiorgan failure after a ruptured abdominal aortic aneurysm repair.', receivedDate: demoDaysAgo(30), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: '', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 30)],
    orchSections: A4667_SECTIONS,
    autopsy: {
      jurisdiction: 'US', caseAuthority: 'hospital_consented', scope: 'full', addenda: [], ancillaryHold: { active: false },
      hospitalConsent: hospitalConsent('Celeste Okafor-Lindt', 'spouse', 30, ['Complete autopsy including brain', 'Retention of tissue samples for diagnosis']),
      padSnapshot: { tier: 'PAD', frozenPayload: { scope: 'full', jurisdiction: 'US', sections: A4667_SECTIONS.slice(0, 3).map(({ id, label, text }) => ({ id, label, text })) }, signedBy: { name: 'Dr. Sarah Johnson', isPathologist: true }, signedAt: demoDaysAgo(28.5) },
      fadSnapshot: { tier: 'FAD', frozenPayload: { scope: 'full', jurisdiction: 'US', sections: A4667_SECTIONS.map(({ id, label, text }) => ({ id, label, text })) }, signedBy: { name: 'Dr. Sarah Johnson', isPathologist: true }, signedAt: demoDaysAgo(4) },
    },
  },

  // ── Batch 516: Tumor Board / MDT (services/tumorBoard/tumorBoardDemoSeed.ts) ──
  {
    // Thoracic MDM: scheduled in two days, Pete presenting.
    ...base('S26-4670', 'finalized', 7),
    accession: acc('4670'),
    patient: patient('PAT-D670', '104670', 'Harold', 'Whitaker', born(67, 1, 22), 'M'),
    specimens: [
      { id: 'S26-4670-SP-1', label: 'A', description: 'Lung, right upper lobe, lobectomy', receivedAt: demoDaysAgo(7), collectedAt: demoDaysAgo(7), specimenFlags: [], collection: { bodySite: 'Lung, right upper lobe', laterality: 'Right' } },
      { id: 'S26-4670-SP-2', label: 'B', description: 'Lymph nodes, station 4R and 7', receivedAt: demoDaysAgo(7), collectedAt: demoDaysAgo(7), specimenFlags: [], collection: { bodySite: 'Mediastinal lymph nodes' } },
    ],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Spiculated 3.1 cm right upper lobe mass, PET avid. Lobectomy with mediastinal lymph node dissection.', receivedDate: demoDaysAgo(7), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Right upper lobe, 182 g, with a 3.0 cm firm grey subpleural mass, 2.4 cm from the bronchial margin.', microscopicDescription: 'Invasive non-mucinous adenocarcinoma, acinar predominant (60%) with solid (25%) and lepidic (15%) components. Visceral pleural invasion PL1. 1 of 6 station 4R lymph nodes involved. pT2a pN2.', ancillaryStudies: 'PD-L1 (22C3) TPS 60%. EGFR, ALK and ROS1 testing sent.' },
    synopticReports: [],
    participants: [attending('PATH-001', 'Pete Nimmo', 7)],
    finalizedAt: demoDaysAgo(4), finalizedBy: 'PATH-001', releasedAt: demoDaysAgo(4),
  },
  {
    // GI MDT: scheduled in two days, no presenter yet (claim it from the workspace).
    // Flagged by the margin rule (circumferential margin 0.6 mm).
    ...base('S26-4671', 'finalized', 6),
    accession: acc('4671'),
    patient: patient('PAT-D671', '104671', 'Doris', 'Kowalski', born(72, 11, 3), 'F'),
    specimens: [{ id: 'S26-4671-SP-1', label: 'A', description: 'Colon, right hemicolectomy', receivedAt: demoDaysAgo(6), collectedAt: demoDaysAgo(6), specimenFlags: [], collection: { bodySite: 'Colon, ascending' } }],
    order: order({ requestingProvider: 'Dr. Robert Williams', orderingPhysicianId: 'ph1', clinicalIndication: 'Ascending colon mass on colonoscopy, biopsy-proven adenocarcinoma.', receivedDate: demoDaysAgo(6), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Right hemicolectomy, 28 cm, with a 4.5 cm ulcerated mass in the ascending colon extending into pericolic fat, 0.6 cm from the circumferential (radial) margin on gross.', microscopicDescription: 'Adenocarcinoma, moderately differentiated, invading through the muscularis propria into pericolic tissue (pT3). Circumferential margin 0.6 mm. Lymphovascular invasion present. 3 of 21 lymph nodes involved (pN1b).', ancillaryStudies: 'Mismatch repair proteins retained (MLH1, PMS2, MSH2, MSH6).' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 6)],
    finalizedAt: demoDaysAgo(3), finalizedBy: 'PATH-SJ-001', releasedAt: demoDaysAgo(3),
  },
  {
    // Gyn-Onc: nominated, not yet scheduled (schedule it from the workspace).
    ...base('S26-4672', 'in-progress', 3),
    accession: acc('4672'),
    patient: patient('PAT-D672', '104672', 'Patricia', 'Lindqvist', born(61, 7, 9), 'F'),
    specimens: [{ id: 'S26-4672-SP-1', label: 'A', description: 'Uterus, cervix, bilateral tubes and ovaries, total hysterectomy and bilateral salpingo-oophorectomy', receivedAt: demoDaysAgo(3), collectedAt: demoDaysAgo(3), specimenFlags: [], collection: { bodySite: 'Uterus' } }],
    order: order({ requestingProvider: 'Dr. Jennifer Davis', orderingPhysicianId: 'ph2', clinicalIndication: 'Postmenopausal bleeding; endometrial biopsy showed endometrioid carcinoma.', receivedDate: demoDaysAgo(3), assignedTo: 'PATH-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Uterus 142 g with a 3.8 cm exophytic endometrial tumour in the fundus, grossly invading more than half of the myometrium.', microscopicDescription: '', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-001', 'Pete Nimmo', 3)],
  },
  {
    // GI MDT: presented a week ago.
    ...base('S26-4673', 'finalized', 16),
    accession: acc('4673'),
    patient: patient('PAT-D673', '104673', 'Leonard', 'Asante', born(64, 4, 28), 'M'),
    specimens: [{ id: 'S26-4673-SP-1', label: 'A', description: 'Pancreas, duodenum and bile duct, pancreaticoduodenectomy (Whipple)', receivedAt: demoDaysAgo(16), collectedAt: demoDaysAgo(16), specimenFlags: [], collection: { bodySite: 'Pancreas, head' } }],
    order: order({ requestingProvider: 'Dr. Michael Brown', orderingPhysicianId: 'ph1', clinicalIndication: 'Painless jaundice; 2.8 cm pancreatic head mass.', receivedDate: demoDaysAgo(16), assignedTo: 'PATH-SJ-001', assignedParticipationTypeId: 'primary' }),
    diagnostic: { grossDescription: 'Whipple specimen with a 2.7 cm firm, poorly circumscribed mass in the pancreatic head abutting the superior mesenteric vein groove.', microscopicDescription: 'Pancreatic ductal adenocarcinoma, moderately differentiated. Perineural invasion present. SMV groove margin 0.8 mm. 2 of 18 lymph nodes involved. pT2 pN1.', ancillaryStudies: '' },
    synopticReports: [],
    participants: [attending('PATH-SJ-001', 'Dr. Sarah Johnson', 16)],
    finalizedAt: demoDaysAgo(12), finalizedBy: 'PATH-SJ-001', releasedAt: demoDaysAgo(12),
  },
  // Batch 738 (Demo Seed Data S1): the sign-out-ready colon case for Video 1 (demoSignOutReadyCase.ts).
  DEMO_SIGN_OUT_READY_CASE,
  // Batch 744 (S14): five body fluids at each preparation stage, an EBUS FNA, a ThinPrep and a SurePath Pap.
  ...DEMO_FLUID_CASES,
  // Batch 746 (S7): the surgical cases behind the molecular orders and completed runs.
  ...DEMO_MOLECULAR_CASES,
  // Batch 747 (S8): a working day's histology at Desert Valley for the wall displays.
  ...DEMO_WALL_VOLUME_CASES,
] as any as Case[];

/** Ids of every baseline case (tests and the demo guide). */
export const DEMO_BASELINE_CASE_IDS = (DEMO_BASELINE_CASES as any[]).map(c => c.id as string);
