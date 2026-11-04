// src/services/migration/importLegacyFile.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (#132, #166): runLegacyFileImport wired to the app's own services,
// the one entry the Migration Jobs page calls (through @/services).
// ─────────────────────────────────────────────────────────────────────────────

import { runLegacyFileImport, type LegacyImportInput, type LegacyImportOutcome, type LegacyImportDeps } from './runLegacyFileImport';
import { processLegacyRecordImport } from './processLegacyRecordImport';
import { migrationJobService } from './migrationJobServiceInstance';
import { migrationRecordResultService } from './migrationRecordResultServiceInstance';
import { migrationFieldMappingService } from './migrationFieldMappingServiceInstance';
import { caseService } from '../cases/caseServiceInstance';
import { auditService } from '../auditlog/auditServiceInstance';
import { getOrganisationByHospitalId, resolveMpiScopeEnterpriseId } from '../organisation/organisationService';

const defaultDeps = (): LegacyImportDeps => ({
  enforce: async (capability) => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return authorizationService.enforce(capability);
  },
  getMappings: (s) => migrationFieldMappingService.getBySourceSystem(s),
  createJob: (e) => migrationJobService.create(e),
  startJob: (id) => migrationJobService.start(id),
  recordJobOutcome: (id, o) => migrationJobService.recordOutcome(id, o),
  completeJob: (id) => migrationJobService.complete(id),
  recordResult: (r) => migrationRecordResultService.record(r),
  processRecord: processLegacyRecordImport,
  importedAccessions: async () => {
    const all = await caseService.getAll();
    const set = new Set<string>();
    if (all.ok) for (const c of all.data) if (c.importSource && c.accession.externalAccession) set.add(c.accession.externalAccession);
    return set;
  },
  createCase: (c) => caseService.createCase(c),
  audit: async (event, detail, user) => {
    await auditService.logEvent({ type: 'system', event, detail, user, caseId: null, confidence: null }).catch(() => {});
  },
  now: () => new Date(),
});

/** The lab's own enterprise is the MPI scope unless the caller names one (same rule as the Accession page). */
export const DEFAULT_IMPORT_HOSPITAL_ID = 'HOSP-001';

export type ImportLegacyFileInput = Omit<LegacyImportInput, 'organisationId'> & { organisationId?: string };

export function importLegacyFile(input: ImportLegacyFileInput): Promise<LegacyImportOutcome> {
  const organisationId = input.organisationId ?? resolveMpiScopeEnterpriseId(getOrganisationByHospitalId(DEFAULT_IMPORT_HOSPITAL_ID));
  return runLegacyFileImport({ ...input, organisationId }, defaultDeps());
}
