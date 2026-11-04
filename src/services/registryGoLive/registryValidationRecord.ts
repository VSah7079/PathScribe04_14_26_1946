// src/services/registryGoLive/registryValidationRecord.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 424: the evidence that crosses from the validation instance to the
// production instance. On validation, once the registry's test system has
// accepted the synthetic suite on the latest template, the lab exports a
// validation record (a JSON file). On production, it is imported and checked
// before go-live can be requested: the same registry, the template version
// being approved, the PathScribe release production is running (validate on
// test before updating production), from a validation instance, enough
// accepted synthetic submissions, and an intact digest (SHA-256 over the
// record's content; the API server should sign it instead). Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { sha256Hex } from '../registrySubmission/sha256';
import type { RegistryDomain } from './registryTemplateVersions';

export const VALIDATION_RECORD_FORMAT = 'pathscribe-registry-validation/1' as const;

export interface RegistryValidationRecord {
  format: typeof VALIDATION_RECORD_FORMAT;
  domain: RegistryDomain;
  registryId: string;
  templateVersion: string;
  release: string;
  instance: 'validation';
  validatedAt: string;
  exportedBy: { id: string; name: string };
  agreementReference: string;
  /** The accepted synthetic submissions it rests on. */
  accepted: { caseRef: string; submissionGuid: string; outcome: string }[];
  digest: string;
}

/** JSON with keys sorted at every level, so the digest doesn't depend on key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export const validationRecordDigest = (r: Omit<RegistryValidationRecord, 'digest'>) => sha256Hex(canonical(r));

export function buildValidationRecord(input: Omit<RegistryValidationRecord, 'format' | 'instance' | 'digest'>): RegistryValidationRecord {
  const body = { ...input, format: VALIDATION_RECORD_FORMAT, instance: 'validation' as const };
  return { ...body, digest: validationRecordDigest(body) };
}

export const validationRecordFileName = (r: Pick<RegistryValidationRecord, 'registryId' | 'templateVersion'>) =>
  `pathscribe-validation-${r.registryId}-${r.templateVersion}.json`;

export type ValidationRecordProblem = 'unreadable' | 'wrongFormat' | 'digestMismatch' | 'notFromValidation'
  | 'wrongRegistry' | 'wrongVersion' | 'wrongRelease' | 'notEnoughAccepted';

/** Parse and check an imported record. No problems: it can back a go-live request. */
export function checkValidationRecord(
  text: string,
  expect: { domain: RegistryDomain; registryId: string; templateVersion: string; release: string; minAccepted: number },
): { record?: RegistryValidationRecord; problems: ValidationRecordProblem[] } {
  let record: RegistryValidationRecord;
  try { record = JSON.parse(text); } catch { return { problems: ['unreadable'] }; }
  if (!record || record.format !== VALIDATION_RECORD_FORMAT) return { problems: ['wrongFormat'] };
  const { digest, ...body } = record;
  const problems: ValidationRecordProblem[] = [];
  if (validationRecordDigest(body) !== digest) problems.push('digestMismatch');
  if (record.instance !== 'validation') problems.push('notFromValidation');
  if (record.domain !== expect.domain || record.registryId !== expect.registryId) problems.push('wrongRegistry');
  if (record.templateVersion !== expect.templateVersion) problems.push('wrongVersion');
  if (record.release !== expect.release) problems.push('wrongRelease');
  if ((record.accepted?.length ?? 0) < expect.minAccepted) problems.push('notEnoughAccepted');
  return { record, problems };
}
