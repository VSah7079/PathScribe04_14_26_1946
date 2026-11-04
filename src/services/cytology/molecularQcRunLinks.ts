// src/services/cytology/molecularQcRunLinks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 406. The molecular QC Batch Management page's decisions, moved out of
// the page: runs newest first, and which specimens each run holds (the
// molecularRunId the inbound batch event set on a specimen,
// services/hl7/processInboundMolecularBatchEvent.ts; the page never assigns it).
//
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import type { MolecularQcRunRecord } from './IMolecularQcRunRecordService';

export interface QcRunSpecimenLink {
  caseId: string;
  accessionNumber?: string;
  specimenId: string;
  specimenLabel: string;
  patientMrn?: string;
}

export function qcRunsNewestFirst(runs: readonly MolecularQcRunRecord[]): MolecularQcRunRecord[] {
  return [...runs].sort((a, b) => b.runDate.localeCompare(a.runDate));
}

type CaseLike = {
  id: string;
  accession?: { accessionNumber?: string };
  patient?: { mrn?: string };
  specimens?: { id: string; label: string; cytologyScreening?: { molecularRunId?: string } }[];
};

/** Run id → the specimens on it. */
export function specimensByMolecularRun(cases: readonly CaseLike[]): Record<string, QcRunSpecimenLink[]> {
  const grouped: Record<string, QcRunSpecimenLink[]> = {};
  for (const c of cases) {
    for (const sp of c?.specimens ?? []) {
      const runId = sp?.cytologyScreening?.molecularRunId;
      if (!runId) continue;
      (grouped[runId] ??= []).push({ caseId: c.id, accessionNumber: c?.accession?.accessionNumber, specimenId: sp.id, specimenLabel: sp.label, patientMrn: c?.patient?.mrn });
    }
  }
  return grouped;
}
