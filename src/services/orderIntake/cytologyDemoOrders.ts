// src/services/orderIntake/cytologyDemoOrders.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 716 (Pete, Oct 28 2026: "set demo data for Cytology Part 2"): pending orders for the Accession video's
// "Import from Order" step. All patients, providers and numbers are fictional.
//
// Each order's specimen description is exactly the name of a Specimen Dictionary entry, so it resolves to that
// entry on import (the order's department and series follow from the entry). The HPV co-test request on
// ord-030 is carried in its clinical indication, because an order has no structured HPV field; the HPV order itself
// is sent by the entry's processing protocol when the case is accessioned.
// ─────────────────────────────────────────────────────────────────────────────

import type { IncomingOrder } from './IOrderIntakeService';

// eslint-disable-next-line no-restricted-properties -- Real, honest justification: a FAKE "N days ago from right now" timestamp for seeded demo data (see isoDaysAgo in mockOrderIntakeService.ts).
const isoDaysAgo = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString(); };

const provider = (prefix: string, given: string, family: string) =>
  ({ rawName: `${prefix} ${given} ${family}`, namePrefix: prefix, givenNames: given, familyNames: family });

export const CYTOLOGY_DEMO_ORDERS: IncomingOrder[] = [
  {
    id: 'ord-030', externalOrderNumber: 'MGH-ORD-71030', source: 'hl7', receivedAt: isoDaysAgo(1), status: 'pending',
    externalAssigningAuthority: 'MGH',
    patient: { firstName: 'Priya', lastName: 'Lindqvist', dateOfBirth: '1988-03-14', sex: 'F', mrn: 'MGH-710301' },
    requestingProvider: provider('Dr.', 'Jennifer', 'Davis'), priority: 'Routine',
    clinicalIndication: 'Routine cervical screening, age 38. HPV co-test requested. Last Pap 3 years ago, negative. No history of abnormal cervical results.',
    icd10Codes: [{ code: 'Z12.4', description: 'Encounter for screening for malignant neoplasm of cervix' }],
    specimens: [{ description: 'Pap Test with HPV Co-test (ThinPrep)' }],
  },
  {
    id: 'ord-031', externalOrderNumber: 'MGH-ORD-71031', source: 'hl7', receivedAt: isoDaysAgo(1), status: 'pending',
    externalAssigningAuthority: 'MGH',
    patient: { firstName: 'Rosalind', lastName: 'Achterberg', dateOfBirth: '1975-09-02', sex: 'F', mrn: 'MGH-710302' },
    requestingProvider: provider('Dr.', 'Jennifer', 'Davis'), priority: 'Routine',
    clinicalIndication: 'Postcoital bleeding for 3 months; contact bleeding noted at speculum examination. On a combined oral contraceptive. LEEP in 2019 for CIN 2.',
    icd10Codes: [{ code: 'N93.0', description: 'Postcoital and contact bleeding' }],
    specimens: [{ description: 'Pap Test, Liquid-Based (ThinPrep)' }],
  },
  {
    id: 'ord-032', externalOrderNumber: 'NSC-ORD-27901', source: 'api', receivedAt: isoDaysAgo(1), status: 'pending',
    externalAssigningAuthority: 'NSC',
    patient: { firstName: 'Noor', lastName: 'Haddad', dateOfBirth: '1993-11-21', sex: 'F', mrn: 'NSC-279011' },
    requestingProvider: provider('Dr.', 'Patricia', 'Miller'), priority: 'Routine',
    clinicalIndication: 'Cervical screening by self-collected vaginal swab for primary HPV testing; patient declined a speculum examination.',
    icd10Codes: [{ code: 'Z12.4', description: 'Encounter for screening for malignant neoplasm of cervix' }],
    specimens: [{ description: 'Self-Collected Vaginal Swab (HPV Only)' }],
  },
  {
    id: 'ord-033', externalOrderNumber: 'RMC-ORD-63401', source: 'hl7', receivedAt: isoDaysAgo(1), status: 'pending',
    externalAssigningAuthority: 'RMC',
    patient: { firstName: 'Marcus', lastName: 'Delgado', dateOfBirth: '1966-05-09', sex: 'M', mrn: 'RMC-634011' },
    requestingProvider: provider('Dr.', 'Michael', 'Brown'), priority: 'Routine',
    clinicalIndication: '2.1 cm solid hypoechoic right thyroid nodule, TI-RADS 4, on ultrasound. Ultrasound-guided fine needle aspiration for a Bethesda category. Rapid on-site evaluation requested.',
    icd10Codes: [{ code: 'E04.1', description: 'Nontoxic single thyroid nodule' }],
    specimens: [{ description: 'Thyroid Fine Needle Aspiration' }],
  },
  {
    id: 'ord-034', externalOrderNumber: 'RMC-ORD-63402', source: 'hl7', receivedAt: isoDaysAgo(1), status: 'pending',
    externalAssigningAuthority: 'RMC',
    patient: { firstName: 'Helena', lastName: 'Brandt', dateOfBirth: '1979-01-30', sex: 'F', mrn: 'RMC-634012' },
    requestingProvider: provider('Dr.', 'Michael', 'Brown'), priority: 'Routine',
    clinicalIndication: 'Palpable 2.5 cm left supraclavicular lymph node, enlarging over 6 weeks. Fine needle aspiration to look for metastatic disease or lymphoma.',
    icd10Codes: [{ code: 'R59.0', description: 'Localized enlarged lymph nodes' }],
    specimens: [{ description: 'Lymph Node, Fine Needle Aspiration' }],
  },
  {
    id: 'ord-035', externalOrderNumber: 'MGH-ORD-71035', source: 'hl7', receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'MGH',
    patient: { firstName: 'Walter', lastName: 'Kessler', dateOfBirth: '1951-07-17', sex: 'M', mrn: 'MGH-710303' },
    requestingProvider: provider('Dr.', 'David', 'Wilson'), priority: 'Routine',
    clinicalIndication: 'Painless gross hematuria for 2 weeks; 30 pack-year smoking history. Voided urine for cytology before cystoscopy.',
    icd10Codes: [{ code: 'R31.0', description: 'Gross hematuria' }],
    specimens: [{ description: 'Urine Cytology' }],
  },
  {
    id: 'ord-036', externalOrderNumber: 'MGH-ORD-71036', source: 'hl7', receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'MGH',
    patient: { firstName: 'Dolores', lastName: 'Ibarra', dateOfBirth: '1948-12-03', sex: 'F', mrn: 'MGH-710304' },
    requestingProvider: provider('Dr.', 'Michael', 'Brown'), priority: 'STAT',
    clinicalIndication: 'New large right pleural effusion, unexplained. Therapeutic and diagnostic thoracentesis; 900 mL of straw-coloured fluid sent for cytology.',
    icd10Codes: [{ code: 'J90', description: 'Pleural effusion, not elsewhere classified' }],
    specimens: [{ description: 'Pleural Fluid Cytology' }],
  },
  {
    id: 'ord-037', externalOrderNumber: 'NSC-ORD-27902', source: 'api', receivedAt: isoDaysAgo(0), status: 'pending',
    externalAssigningAuthority: 'NSC',
    patient: { firstName: 'Imogen', lastName: 'Farrow', dateOfBirth: '1984-04-26', sex: 'F', mrn: 'NSC-279012' },
    requestingProvider: provider('Dr.', 'Patricia', 'Miller'), priority: 'Routine',
    clinicalIndication: 'Palpable 1.4 cm mobile right breast lump, upper outer quadrant; ultrasound suggests a complicated cyst versus a solid nodule. Fine needle aspiration.',
    icd10Codes: [{ code: 'N63.10', description: 'Unspecified lump in the right breast, unspecified quadrant' }],
    specimens: [{ description: 'Breast, Fine Needle Aspiration' }],
  },
];
