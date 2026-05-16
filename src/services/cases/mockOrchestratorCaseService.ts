// src/services/cases/mockOrchestratorCaseService.ts
// ─────────────────────────────────────────────────────────────
// Orchestrator-mode mock cases for PathScribe development & QA.
//
// These cases represent specimens arriving at the bench for workup —
// no gross description, no microscopic findings, no narrative.
// The PA or pathologist opens the case, fills the gross synoptic,
// the AI generates a narrative, and the pathologist signs off.
//
// Contrast with mockCaseService (Copilot mode) where cases arrive
// from a LIS with fully-formed narratives already present.
// ─────────────────────────────────────────────────────────────

import type { ICaseService } from './ICaseService';
import type { Case } from '../../types/case/Case';
import { storageGet, storageSet } from '../mockStorage';

const STORAGE_KEY = 'orch_cases';
const delay = (ms = 30) => new Promise(res => setTimeout(res, ms));

function isoYearsAgo(years: number, month = 6, day = 15): string {
  return new Date(new Date().getFullYear() - years, month - 1, day).toISOString();
}
function isoDaysAgo(days: number): string {
  const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString();
}
function iid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Seeded Orchestrator Cases ────────────────────────────────

const ORCH_CASES: Case[] = [

  // ── Case 1: Right Hemicolectomy ───────────────────────────────────────────
  // Colorectal adenocarcinoma — 3 specimens, arriving for bench workup.
  // PA will gross the resection, fill the synoptic, AI generates narrative.
  {
    id:  'O26-0001',
    reportingMode: 'pathscribe',
    accession: {
      accessionNumber: 'O0001',
      accessionPrefix: 'O',
      accessionYear: 2026,
      fullAccession: 'O26-0001',
    },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-ACME',
    status: 'draft' as any,
    priority: 'Routine',
    patient: {
      id: 'OPAT-001',
      mrn: '200001',
      firstName: 'Robert',
      lastName: 'Ashford',
      dateOfBirth: isoYearsAgo(67, 4, 22),
      sex: 'M',
    },
    specimens: [
      {
        id: 'O26-0001-SP-A',
        label: 'A',
        description: 'Right hemicolectomy',
        receivedAt: isoDaysAgo(0),
        collectedAt: isoDaysAgo(0),
        specimenFlags: [],
      },
      {
        id: 'O26-0001-SP-B',
        label: 'B',
        description: 'Ileocolic lymph nodes, separate packet',
        receivedAt: isoDaysAgo(0),
        collectedAt: isoDaysAgo(0),
        specimenFlags: [],
      },
      {
        id: 'O26-0001-SP-C',
        label: 'C',
        description: 'Appendix',
        receivedAt: isoDaysAgo(0),
        collectedAt: isoDaysAgo(0),
        specimenFlags: [],
      },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. James Caldwell',
      clientId: 'c1',
      clientName: "St. Catherine's University Hospital",
      clinicalIndication: 'Colorectal adenocarcinoma. CT chest/abdomen/pelvis: 4.2 cm mass at hepatic flexure with possible involvement of the adjacent mesentery, no distant metastases. CEA 12.4. Proceeding to right hemicolectomy.',
      receivedDate: isoDaysAgo(0),
      assignedTo: 'PATH-001',
      assignedParticipationTypeId: 'primary',
    },
    diagnostic: {
      grossDescription: '',
      microscopicDescription: '',
      ancillaryStudies: '',
    },
    synopticReports: [
      {
        instanceId: `O26-0001-SP-A_colon_${iid()}`,
        specimenId: 'O26-0001-SP-A',
        templateId: 'colon_resection',
        templateName: 'CAP Colon & Rectum Carcinoma — Resection',
        status: 'draft',
        answers: {},
        createdAt: isoDaysAgo(0),
        updatedAt: isoDaysAgo(0),
      },
    ],
    createdAt: isoDaysAgo(0),
    updatedAt: isoDaysAgo(0),
  } as any,

  // ── Case 2: Right Lower Lobe Lobectomy ────────────────────────────────────
  // Lung adenocarcinoma — 2 specimens. Different patient from the Copilot
  // lung case (S26-4403) in mockCaseService.
  {
    id:  'O26-0002',
    reportingMode: 'pathscribe',
    accession: {
      accessionNumber: 'O0002',
      accessionPrefix: 'O',
      accessionYear: 2026,
      fullAccession: 'O26-0002',
    },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-ACME',
    status: 'draft' as any,
    priority: 'STAT',
    patient: {
      id: 'OPAT-002',
      mrn: '200002',
      firstName: 'Patricia',
      lastName: 'Okafor',
      dateOfBirth: isoYearsAgo(61, 9, 3),
      sex: 'F',
    },
    specimens: [
      {
        id: 'O26-0002-SP-A',
        label: 'A',
        description: 'Right lower lobe lobectomy',
        receivedAt: isoDaysAgo(0),
        collectedAt: isoDaysAgo(0),
        specimenFlags: [],
      },
      {
        id: 'O26-0002-SP-B',
        label: 'B',
        description: 'Station 7 subcarinal lymph nodes',
        receivedAt: isoDaysAgo(0),
        collectedAt: isoDaysAgo(0),
        specimenFlags: [],
      },
    ],
    order: {
      priority: 'STAT',
      requestingProvider: 'Mr. Andrew Pearce',
      clientId: 'c1',
      clientName: "St. Catherine's University Hospital",
      clinicalIndication: 'Right lower lobe mass, 3.1 cm. CT-guided core biopsy: adenocarcinoma, TTF-1 positive. EGFR/ALK/ROS1 pending. No mediastinal or distant disease on PET-CT. Proceeding to VATS right lower lobectomy with mediastinal node dissection.',
      receivedDate: isoDaysAgo(0),
      assignedTo: 'PATH-001',
      assignedParticipationTypeId: 'primary',
    },
    diagnostic: {
      grossDescription: '',
      microscopicDescription: '',
      ancillaryStudies: '',
    },
    synopticReports: [
      {
        instanceId: `O26-0002-SP-A_lung_${iid()}`,
        specimenId: 'O26-0002-SP-A',
        templateId: 'lung_resection',
        templateName: 'CAP Lung — Resection',
        status: 'draft',
        answers: {},
        createdAt: isoDaysAgo(0),
        updatedAt: isoDaysAgo(0),
      },
    ],
    createdAt: isoDaysAgo(0),
    updatedAt: isoDaysAgo(0),
  } as any,

  // ── Case 3: Radical Prostatectomy ─────────────────────────────────────────
  // Prostate adenocarcinoma — 3 specimens including bilateral pelvic nodes.
  {
    id:  'O26-0003',
    reportingMode: 'pathscribe',
    accession: {
      accessionNumber: 'O0003',
      accessionPrefix: 'O',
      accessionYear: 2026,
      fullAccession: 'O26-0003',
    },
    originHospitalId: 'HOSP-001',
    originEnterpriseId: 'ENT-ACME',
    status: 'draft' as any,
    priority: 'Routine',
    patient: {
      id: 'OPAT-003',
      mrn: '200003',
      firstName: 'David',
      lastName: 'Marchetti',
      dateOfBirth: isoYearsAgo(64, 1, 8),
      sex: 'M',
    },
    specimens: [
      {
        id: 'O26-0003-SP-A',
        label: 'A',
        description: 'Radical prostatectomy',
        receivedAt: isoDaysAgo(1),
        collectedAt: isoDaysAgo(1),
        specimenFlags: [],
      },
      {
        id: 'O26-0003-SP-B',
        label: 'B',
        description: 'Right pelvic lymph nodes',
        receivedAt: isoDaysAgo(1),
        collectedAt: isoDaysAgo(1),
        specimenFlags: [],
      },
      {
        id: 'O26-0003-SP-C',
        label: 'C',
        description: 'Left pelvic lymph nodes',
        receivedAt: isoDaysAgo(1),
        collectedAt: isoDaysAgo(1),
        specimenFlags: [],
      },
    ],
    order: {
      priority: 'Routine',
      requestingProvider: 'Mr. Simon Hartley',
      clientId: 'c1',
      clientName: "St. Catherine's University Hospital",
      clinicalIndication: 'Prostate adenocarcinoma. Systematic biopsy: Gleason 3+4=7 (Grade Group 2), PSA 8.2. Multiparametric MRI: PI-RADS 4 lesion posterior left mid-gland, no extraprostatic extension. Proceeding to robotic-assisted radical prostatectomy with bilateral pelvic lymph node dissection.',
      receivedDate: isoDaysAgo(1),
      assignedTo: 'PATH-001',
      assignedParticipationTypeId: 'primary',
    },
    diagnostic: {
      grossDescription: '',
      microscopicDescription: '',
      ancillaryStudies: '',
    },
    synopticReports: [
      {
        instanceId: `O26-0003-SP-A_prostate_${iid()}`,
        specimenId: 'O26-0003-SP-A',
        templateId: 'prostate_resection',
        templateName: 'CAP Prostate Gland — Radical Prostatectomy',
        status: 'draft',
        answers: {},
        createdAt: isoDaysAgo(1),
        updatedAt: isoDaysAgo(1),
      },
    ],
    createdAt: isoDaysAgo(1),
    updatedAt: isoDaysAgo(1),
  } as any,
];

// Persist to / restore from mock storage
let CASES: Case[] = (() => {
  const stored = storageGet<Case[]>(STORAGE_KEY, []);
  return stored?.length ? stored : ORCH_CASES;
})();

// ─── Service implementation ───────────────────────────────────

export const mockOrchestratorCaseService: ICaseService = {

  async getCase(id: string): Promise<Case | undefined> {
    await delay();
    return CASES.find(c => c.id === id);
  },

  async getAll(params?) {
    await delay();
    let results = [...CASES];
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(c =>
        c.accession?.fullAccession?.toLowerCase().includes(q) ||
        `${c.patient?.firstName} ${c.patient?.lastName}`.toLowerCase().includes(q)
      );
    }
    return { ok: true, data: results as any[] };
  },

  async listCasesForUser(_userId: string): Promise<Case[]> {
    await delay();
    return CASES;
  },

  async updateCase(caseId: string, updates: Partial<Case>): Promise<void> {
    await delay();
    const idx = CASES.findIndex(c => c.id === caseId);
    if (idx !== -1) {
      CASES[idx] = { ...CASES[idx], ...updates, updatedAt: new Date().toISOString() };
      storageSet(STORAGE_KEY, CASES);
    }
  },
};
