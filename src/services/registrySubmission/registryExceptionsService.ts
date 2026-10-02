// src/services/registrySubmission/registryExceptionsService.ts
// Batch 421: the worklist's load: run the 72-hour escalation, then list the exceptions.
import { escalateStaleRegistrySubmissions, type RegistryAckDeps } from './recordRegistryAcknowledgement';
import { REGISTRY_TRANSMISSION_AUDIT_CAPABILITY, registryTransmissionAuditCsvRows, registryTransmissionAuditRows, type RegistryTransmissionEntry } from './registryTransmissionAudit';
import { registryExceptionRows, type RegistryExceptionRow, type RegistryQueueEntryForWorklist, type RegistryQueueName } from './registryExceptions';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

export interface RegistryExceptionsLoadDeps {
  ack: RegistryAckDeps;
  getAll: Record<RegistryQueueName, () => Promise<Result<RegistryQueueEntryForWorklist[]>>>;
}

export async function loadRegistryExceptions(deps: RegistryExceptionsLoadDeps): Promise<RegistryExceptionRow[]> {
  await escalateStaleRegistrySubmissions(deps.ack);
  const [cytology, cancer] = await Promise.all([deps.getAll.cytology(), deps.getAll.cancer()]);
  return registryExceptionRows({ cytology: cytology.ok ? cytology.data : [], cancer: cancer.ok ? cancer.data : [] });
}

/**
 * Batch 425: the worklist, the live badge and the transmission audit are scoped to the
 * cases the signed-in user can see (their organisation and facilities, via the case
 * router's own access filter), so one organisation never sees another's submissions.
 * The go-live catch-up (registryGoLiveDeps) still uses the unscoped load: it is the
 * system resending everything held for a registry.
 */
export interface RegistryExceptionScopeDeps {
  visibleCaseIds: () => Promise<Set<string>>;
}

export async function loadRegistryExceptionsForUser(deps: RegistryExceptionsLoadDeps & RegistryExceptionScopeDeps): Promise<RegistryExceptionRow[]> {
  const rows = await loadRegistryExceptions(deps);
  if (!rows.length) return rows; // nothing to scope: no case lookup (the badge polls)
  const visible = await deps.visibleCaseIds();
  return rows.filter(r => visible.has(r.caseId));
}

/** The badge's number (top nav, Quality & Compliance tile). */
export async function countRegistryExceptionsForUser(deps: RegistryExceptionsLoadDeps & RegistryExceptionScopeDeps): Promise<number> {
  return (await loadRegistryExceptionsForUser(deps)).length;
}

export interface RegistryTransmissionExportDeps extends RegistryExceptionScopeDeps {
  getAll: Record<RegistryQueueName, () => Promise<Result<RegistryTransmissionEntry[]>>>;
  /** exportQaReport with its capability check (qa:registry-transmission-audit:export). */
  exportQaReport: (capability: typeof REGISTRY_TRANSMISSION_AUDIT_CAPABILITY, rows: Record<string, string | number>[], filename: string) => Promise<{ ok: boolean; reason?: string; rowCount?: number }>;
}

/** Batch 425: downloads the transmission audit (one queue, or both), the same columns for cytology and cancer. */
export async function exportRegistryTransmissionAudit(
  input: { queue?: RegistryQueueName; today: string },
  deps: RegistryTransmissionExportDeps,
): Promise<{ ok: boolean; reason?: string; rowCount?: number }> {
  const [cytology, cancer, visible] = await Promise.all([deps.getAll.cytology(), deps.getAll.cancer(), deps.visibleCaseIds()]);
  const rows = registryTransmissionAuditRows(
    { cytology: cytology.ok ? cytology.data : [], cancer: cancer.ok ? cancer.data : [] },
    { queue: input.queue, caseIds: visible },
  );
  const name = `registry-transmission-audit${input.queue ? `-${input.queue}` : ''}-${input.today}.csv`;
  return deps.exportQaReport('qa:registry-transmission-audit:export', registryTransmissionAuditCsvRows(rows), name);
}
