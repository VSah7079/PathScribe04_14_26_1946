// src/services/interfaceDictionary/interfaceDictionaryAudit.ts
// ─────────────────────────────────────────────────
// Batch 612: the audit entries for the Interface Dictionary. Pure. Audit text stays
// literal English and PHI-free: vendor name, version numbers and counts only. Never a
// sample message, a mapped value or a path into a message.
// ─────────────────────────────────────────────────
import type { NewAuditLog } from '../auditlog/IAuditService';

const entry = (event: string, detail: string, user: string, caseId: string | null = null): NewAuditLog =>
  ({ type: 'user', event, detail, user, caseId, confidence: null });

export const profileCreatedAudit = (vendor: string, format: string, messageType: string, user: string) =>
  entry('Interface Profile Created', `Vendor profile "${vendor}" created (${format}${messageType ? `, ${messageType}` : ''}).`, user);

export const draftStartedAudit = (vendor: string, version: number, user: string) =>
  entry('Interface Profile Draft Started', `Vendor profile "${vendor}": draft version ${version} opened.`, user);

export const mappingsSavedAudit = (vendor: string, version: number, count: number, user: string) =>
  entry('Interface Profile Mappings Saved', `Vendor profile "${vendor}" version ${version}: ${count} mapping${count === 1 ? '' : 's'} saved.`, user);

export const testedAudit = (vendor: string, version: number, r: { passed: boolean; mapped: number; missingRequired: number; problems: number }, user: string) =>
  entry('Interface Profile Tested', `Vendor profile "${vendor}" version ${version}: test ${r.passed ? 'passed' : 'failed'} (mapped ${r.mapped}, required missing ${r.missingRequired}, problems ${r.problems}). Simulated: the sample was pasted in, not received.`, user);

export const publishedAudit = (vendor: string, version: number, superseded: number | null, user: string) =>
  entry('Interface Profile Published', `Vendor profile "${vendor}" version ${version} published${superseded ? `; version ${superseded} superseded` : ''}.`, user);

export const rolledBackAudit = (vendor: string, from: number, restored: number, newVersion: number, user: string) =>
  entry('Interface Profile Rolled Back', `Vendor profile "${vendor}": version ${from} replaced by a copy of version ${restored}, published as version ${newVersion}.`, user);

export const retiredAudit = (vendor: string, version: number, user: string) =>
  entry('Interface Profile Retired', `Vendor profile "${vendor}" version ${version} switched off.`, user);

export const fieldsAppliedAudit = (vendor: string, version: number, count: number, caseId: string, user: string) =>
  entry('Vendor Fields Applied', `Simulated: ${count} vendor field${count === 1 ? '' : 's'} from "${vendor}" version ${version} added to the case from a pasted message.`, user, caseId);
