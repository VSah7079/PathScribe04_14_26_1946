// src/services/migration/runLegacyFileImport.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#132, #166): the "Import legacy file" run on Migration Jobs.
//
//   1. needs config:migration-mappings:manage (the same trust as editing the
//      mappings; refused otherwise, nothing is created);
//   2. reads the file's text (parseLegacyFile) and the active field mappings
//      saved for the chosen source system;
//   3. creates and starts a MigrationJob, then runs every record through
//      processLegacyRecordImport (mapping, validation, MPI matching);
//   4. a record that succeeded becomes a draft case in the case store, marked
//      Simulated bulk import (buildDraftCaseFromMigration); a record whose
//      legacy accession was already imported is recorded as failed instead of
//      creating a second case; needs-review and failed records create nothing;
//   5. writes each record's result, then completes the job and audits.
//
// The file's text and the records' contents are not kept: the job keeps only
// counts, and each result keeps the legacy accession number, the outcome, the
// case id and the error text. Audit detail is counts and the source system's
// name only, never a patient, accession or file name (a file name can name a
// patient).
//
// Server work this stands in for: bulk import jobs and OCR in the interface
// engine (docs/product/KNOWN_GAPS.md).
// ─────────────────────────────────────────────────────────────────────────────

import type { ProcessLegacyRecordImportResult } from './processLegacyRecordImport';
import { parseLegacyFile, type LegacyFileFormat, type LegacyParseError } from './parseLegacyFile';
import { buildDraftCaseFromMigration, MIGRATION_CASE_ID_PREFIX } from './buildDraftCaseFromMigration';
import type { MigrationFieldMapping } from './IMigrationFieldMappingService';
import type { MigrationJob } from './IMigrationJobService';
import type { MigrationRecordResult } from './IMigrationRecordResultService';
import type { Case } from '@/types/case/Case';

export const LEGACY_IMPORT_CAPABILITY = 'config:migration-mappings:manage';

/** The source systems that have at least one active field mapping (the ones a file can be imported from), sorted. */
export function sourceSystemsWithMappings(mappings: ReadonlyArray<Pick<MigrationFieldMapping, 'sourceSystemName' | 'active'>>): string[] {
  return [...new Set(mappings.filter(m => m.active && m.sourceSystemName.trim()).map(m => m.sourceSystemName))].sort((a, b) => a.localeCompare(b));
}

export interface LegacyImportInput {
  text: string;
  format: LegacyFileFormat;
  sourceSystemName: string;
  organisationId: string;
  /** The source system's own stated record count, if the person knows it. */
  claimedSourceRecordCount?: number;
  /** Whether to create draft cases from succeeded records (default true). */
  createDraftCases?: boolean;
  createdByUserId: string;
  createdByUserName: string;
}

export type LegacyImportError =
  | LegacyParseError | 'notPermitted' | 'noSourceSystem' | 'noMappings' | 'jobFailed';

export interface LegacyImportSummary {
  job: MigrationJob;
  results: MigrationRecordResult[];
  draftCasesCreated: number;
  alreadyImported: number;
  unmappedFields: string[];
  skippedNested: number;
}

export type LegacyImportOutcome =
  | { ok: true; summary: LegacyImportSummary }
  | { ok: false; error: LegacyImportError; max?: number };

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** What the run needs; the app's own services by default, fakes in tests. */
export interface LegacyImportDeps {
  enforce: (capability: string) => Promise<{ allowed: boolean }>;
  getMappings: (sourceSystemName: string) => Promise<Result<MigrationFieldMapping[]>>;
  createJob: (entry: { sourceSystemName: string; claimedSourceRecordCount?: number; createdByUserId: string; createdByUserName: string; simulated?: boolean }) => Promise<Result<MigrationJob>>;
  startJob: (id: string) => Promise<Result<MigrationJob>>;
  recordJobOutcome: (id: string, outcome: 'succeeded' | 'failed' | 'needs_review') => Promise<Result<MigrationJob>>;
  completeJob: (id: string) => Promise<Result<MigrationJob>>;
  recordResult: (r: Omit<MigrationRecordResult, 'id' | 'processedAt'>) => Promise<Result<MigrationRecordResult>>;
  processRecord: (raw: Record<string, string>, mappings: MigrationFieldMapping[], organisationId: string) => Promise<ProcessLegacyRecordImportResult>;
  /** Legacy accession numbers of cases already in the store (to refuse a second import). */
  importedAccessions: () => Promise<Set<string>>;
  createCase: (c: Case) => Promise<void>;
  audit: (event: string, detail: string, user: string) => Promise<void>;
  now: () => Date;
}

export async function runLegacyFileImport(input: LegacyImportInput, deps: LegacyImportDeps): Promise<LegacyImportOutcome> {
  const system = input.sourceSystemName.trim();
  if (!system) return { ok: false, error: 'noSourceSystem' };

  const decision = await deps.enforce(LEGACY_IMPORT_CAPABILITY);
  if (!decision.allowed) return { ok: false, error: 'notPermitted' };

  const parsed = parseLegacyFile(input.text, input.format);
  if (!parsed.ok) return { ok: false, error: parsed.error, max: parsed.max };

  const mappingsRes = await deps.getMappings(system);
  const mappings = mappingsRes.ok ? mappingsRes.data.filter(m => m.active) : [];
  if (mappings.length === 0) return { ok: false, error: 'noMappings' };

  const jobRes = await deps.createJob({
    sourceSystemName: system,
    claimedSourceRecordCount: input.claimedSourceRecordCount,
    createdByUserId: input.createdByUserId,
    createdByUserName: input.createdByUserName,
    simulated: true,
  });
  if (!jobRes.ok) return { ok: false, error: 'jobFailed' };
  const started = await deps.startJob(jobRes.data.id);
  if (!started.ok) return { ok: false, error: 'jobFailed' };

  const known = await deps.importedAccessions();
  const createCases = input.createDraftCases !== false;
  const jobId = jobRes.data.id;
  const results: MigrationRecordResult[] = [];
  const unmapped = new Set<string>();
  let draftCasesCreated = 0;
  let alreadyImported = 0;

  for (let i = 0; i < parsed.records.length; i++) {
    const raw = parsed.records[i];
    const out = await deps.processRecord(raw, mappings, input.organisationId);
    out.unmappedSourceFields.forEach(f => unmapped.add(f));
    const accession = out.draft.legacyAccessionNumber;
    const sourceRecordId = accession || `row-${i + 1}`;

    let outcome = out.outcome;
    let errorMessage = out.errorMessage;
    let targetCaseId: string | undefined;

    if (outcome === 'succeeded' && createCases) {
      if (accession && known.has(accession)) {
        outcome = 'failed';
        errorMessage = 'Already imported: a case with this legacy accession number exists.';
        alreadyImported++;
      } else {
        targetCaseId = `${MIGRATION_CASE_ID_PREFIX}${jobId.replace(/^migjob-/, '')}-${i + 1}`;
        await deps.createCase(buildDraftCaseFromMigration(out.draft, {
          caseId: targetCaseId, patientId: out.patientId ?? '', jobId, sourceSystemName: system,
          organisationId: input.organisationId, originHospitalId: 'HOSP-001', originEnterpriseId: 'ENT-DEFAULT',
          now: deps.now(),
        }));
        if (accession) known.add(accession);
        draftCasesCreated++;
      }
    }

    const rec = await deps.recordResult({
      migrationJobId: jobId, sourceRecordId, targetCaseId, outcome,
      mpiCandidatePatientIds: out.mpiCandidatePatientIds,
      unmappedSourceFields: out.unmappedSourceFields, errorMessage,
    });
    if (rec.ok) results.push(rec.data);
    await deps.recordJobOutcome(jobId, outcome);
  }

  const done = await deps.completeJob(jobId);
  const job = done.ok ? done.data : jobRes.data;

  await deps.audit(
    'Legacy File Import (Simulated bulk import)',
    `Simulated bulk import from "${system}": ${job.succeededCount} succeeded, ${job.failedCount} failed, ${job.needsReviewCount} need review; ${draftCasesCreated} draft case${draftCasesCreated === 1 ? '' : 's'} created.`,
    input.createdByUserName,
  );

  return {
    ok: true,
    summary: { job, results, draftCasesCreated, alreadyImported, unmappedFields: [...unmapped].sort(), skippedNested: parsed.skippedNested },
  };
}
