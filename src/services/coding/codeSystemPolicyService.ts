// src/services/coding/codeSystemPolicyService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 595: the code-system policy per jurisdiction, kept as configuration
// (Configuration → System → Code Systems). The rules and dates are in
// codeSystemPolicy.ts; the checks in codeSystemPolicyRules.ts.
//
//   list()         the records an administrator has set (configuration, shown
//                  to anyone who opens the section);
//   save() / reset()  need config:code-systems:manage (Admin and Lab Director
//                  by default); each change is audited
//                  (CODE_SYSTEM_POLICY_CHANGED, before and after);
//   policyFor()    the policy in force for a jurisdiction: the record, or the
//                  default; a system read, whoever is working;
//   served()       the jurisdictions work comes from: the laboratory's own and
//                  each active facility's.
//
// Nothing reads policyFor() yet: the Add Code window, sign-out and outbound
// messages will (Planned, docs/architecture/DIAGNOSIS_CODING.md).
// In production the API server holds the policy. Dependencies are passed in.
// ─────────────────────────────────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { Jurisdiction } from '@/types/systemConfig';
import { defaultCodePolicy, type CodeSystemPolicy } from './codeSystemPolicy';
import {
  codeSystemPolicyChangeAudit, codeSystemRecordProblem, normalizeCodeSystemRecord,
  type CodeSystemPolicyProblem, type CodeSystemPolicyRecord,
} from './codeSystemPolicyRules';

export const CODE_SYSTEMS_MANAGE = 'config:code-systems:manage';
export const CODE_SYSTEM_POLICY_STORAGE_KEY = 'pathscribe_code_system_policy';

export type CodeSystemPolicyError = 'CONFIG_NOT_PERMITTED' | 'NOT_FOUND' | CodeSystemPolicyProblem;

export interface ICodeSystemPolicyService {
  list(): Promise<ServiceResult<CodeSystemPolicyRecord[]>>;
  /** Adds the record for its jurisdiction, or replaces it. */
  save(record: CodeSystemPolicyRecord): Promise<ServiceResult<CodeSystemPolicyRecord[]>>;
  /** Removes a jurisdiction's record (back to the default policy). */
  reset(jurisdiction: Jurisdiction): Promise<ServiceResult<CodeSystemPolicyRecord[]>>;
  policyFor(jurisdiction: Jurisdiction): Promise<CodeSystemPolicy>;
  served(): Promise<Jurisdiction[]>;
}

export interface CodeSystemPolicyDeps {
  read(): CodeSystemPolicyRecord[] | null;
  write(records: CodeSystemPolicyRecord[]): void;
  enforce(capability: string): Promise<{ allowed: boolean }>;
  audit(entry: NewAuditLog): Promise<unknown>;
  actorName(): string;
  now(): Date;
  /** Jurisdictions of the active facilities. */
  facilityJurisdictions(): Promise<Jurisdiction[]>;
  /** The laboratory's own jurisdiction (System configuration). */
  defaultJurisdiction(): Jurisdiction;
  refused?(capability: string): void;
}

const fail = <T>(error: CodeSystemPolicyError): ServiceResult<T> => ({ ok: false, error });
const sortRecords = (records: CodeSystemPolicyRecord[]) => [...records].sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));

export function createCodeSystemPolicyService(deps: CodeSystemPolicyDeps): ICodeSystemPolicyService {
  const current = () => sortRecords(deps.read() ?? []);
  const permitted = async () => {
    const decision = await deps.enforce('config:code-systems:manage');
    if (!decision.allowed) deps.refused?.(CODE_SYSTEMS_MANAGE);
    return decision.allowed;
  };

  return {
    async list() { return { ok: true, data: current() }; },

    async save(input) {
      if (!(await permitted())) return fail('CONFIG_NOT_PERMITTED');
      const record = normalizeCodeSystemRecord({ ...input, updatedAt: deps.now().toISOString(), updatedBy: deps.actorName() });
      const problem = codeSystemRecordProblem(record);
      if (problem) return fail(problem);
      const records = current();
      const before = records.find(r => r.jurisdiction === record.jurisdiction) ?? null;
      const next = sortRecords([...records.filter(r => r.jurisdiction !== record.jurisdiction), record]);
      deps.write(next);
      await deps.audit(codeSystemPolicyChangeAudit(before, record, deps.actorName())).catch(() => {});
      return { ok: true, data: next };
    },

    async reset(jurisdiction) {
      if (!(await permitted())) return fail('CONFIG_NOT_PERMITTED');
      const records = current();
      const before = records.find(r => r.jurisdiction === jurisdiction);
      if (!before) return fail('NOT_FOUND');
      const next = records.filter(r => r.jurisdiction !== jurisdiction);
      deps.write(next);
      await deps.audit(codeSystemPolicyChangeAudit(before, null, deps.actorName())).catch(() => {});
      return { ok: true, data: next };
    },

    async policyFor(jurisdiction) {
      const record = current().find(r => r.jurisdiction === jurisdiction);
      return record ? { rules: record.rules } : defaultCodePolicy(jurisdiction);
    },

    async served() {
      const own = deps.defaultJurisdiction();
      const fromFacilities = await deps.facilityJurisdictions().catch(() => [] as Jurisdiction[]);
      return [...new Set([own, ...fromFacilities])];
    },
  };
}
