// src/services/printing/exportGate.ts
// ─────────────────────────────────────────────────────────────────────────────
// PS-282 + PS-357 (Batch 437): before a CSV leaves the app, check the export's
// capability, then record the export in the audit log.
//
//   • Exports that list cases or audit records have a capability each (Pete:
//     no blanket flags): the Audit Log page's five logs, the case search
//     results and the two My Contributions files. A refusal makes no file;
//     the check itself is audited by the authorization service.
//   • Configuration exports (dictionaries, crosswalks, the physician list)
//     are already behind the Configuration screen and their section; they
//     are audited, not separately permitted (`recordExport`).
// ─────────────────────────────────────────────────────────────────────────────

import { recordDocumentOutput } from './recordDocumentOutput';
import { DESTINATION } from './documentOutputAudit';

type Decision = Promise<{ allowed: boolean }>;
const authorization = async () => (await import('../authorization/defaultAuthorizationService')).authorizationService;

/** Each gated export and its check. */
export const EXPORT_CHECKS = {
  'audit-log':              async (): Decision => (await authorization()).enforce('audit:audit-log:export'),
  'error-log':              async (): Decision => (await authorization()).enforce('audit:error-log:export'),
  'interface-log':          async (): Decision => (await authorization()).enforce('audit:interface-log:export'),
  'qa-log':                 async (): Decision => (await authorization()).enforce('audit:qa-log:export'),
  'billing-log':            async (): Decision => (await authorization()).enforce('audit:billing-log:export'),
  'case-search':            async (): Decision => (await authorization()).enforce('search:case-results:export'),
  'trainee-case-reference': async (): Decision => (await authorization()).enforce('contribution:trainee-case-reference:export'),
  'case-mix-summary':       async (): Decision => (await authorization()).enforce('contribution:case-mix-summary:export'),
} as const;

export type GatedExport = keyof typeof EXPORT_CHECKS;

export interface ExportFile {
  filename: string;
  rowCount: number;
  format?: 'csv' | 'json';
}

export interface ExportGateDeps {
  check: () => Decision;
  record: typeof recordDocumentOutput;
}

/** Checks the export's capability and records it. False: refused, make no file. */
export async function beginExport(kind: GatedExport, file: ExportFile, deps: ExportGateDeps = { check: EXPORT_CHECKS[kind], record: recordDocumentOutput }): Promise<boolean> {
  const decision = await deps.check();
  if (!decision.allowed) return false;
  await deps.record({
    action: 'export', document: kind, destination: DESTINATION.download(file.filename),
    status: 'success', format: file.format ?? 'csv', rowCount: file.rowCount,
  });
  return true;
}

/** Records an export that has no capability of its own (configuration data). */
export function recordExport(document: string, file: ExportFile): Promise<void> {
  return recordDocumentOutput({
    action: 'export', document, destination: DESTINATION.download(file.filename),
    status: 'success', format: file.format ?? 'csv', rowCount: file.rowCount,
  });
}
