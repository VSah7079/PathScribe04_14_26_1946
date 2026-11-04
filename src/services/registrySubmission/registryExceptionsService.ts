// src/services/registrySubmission/registryExceptionsService.ts
// Batch 421: the worklist's load: run the 72-hour escalation, then list the exceptions.
import { escalateStaleRegistrySubmissions, type RegistryAckDeps } from './recordRegistryAcknowledgement';
import { browserRunsServerJob } from '../serverJobs/browserStandIns';
import { REGISTRY_TRANSMISSION_AUDIT_CAPABILITY, registryTransmissionAuditCsvRows, registryTransmissionAuditRows, type RegistryTransmissionEntry } from './registryTransmissionAudit';
import { registryExceptionRows, type RegistryExceptionRow, type RegistryQueueEntryForWorklist, type RegistryQueueName } from './registryExceptions';

type Result<T> = { ok: true; data: T } | { ok: false; error?: string };

export interface RegistryExceptionsLoadDeps {
  ack: RegistryAckDeps;
  getAll: Record<RegistryQueueName, () => Promise<Result<RegistryQueueEntryForWorklist[]>>>;
  /** Batch 555: whether this browser runs the escalation. Defaults to browserRunsServerJob('registry.escalateStale'). */
  runServerJobs?: boolean;
}

export async function loadRegistryExceptions(deps: RegistryExceptionsLoadDeps): Promise<RegistryExceptionRow[]> {
  // Batch 555: once the API server runs registry.escalateStale (VITE_SERVER_JOBS), it escalates.
  if (deps.runServerJobs ?? browserRunsServerJob('registry.escalateStale')) await escalateStaleRegistrySubmissions(deps.ack);
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
  /** Batch 551: true when the API server builds exports, so the browser doesn't read the queues for rows it won't use. */
  exportsViaServer?: boolean;
  /** exportQaReport with its capability check (qa:registry-transmission-audit:export). */
  exportQaReport: (capability: typeof REGISTRY_TRANSMISSION_AUDIT_CAPABILITY, rows: Record<string, string | number>[], filename: string, parameters?: Record<string, unknown>) => Promise<{ ok: boolean; reason?: string; rowCount?: number; viaServer?: boolean }>;
}

/** Batch 425: downloads the transmission audit (one queue, or both), the same columns for cytology and cancer. */
export async function exportRegistryTransmissionAudit(
  input: { queue?: RegistryQueueName; today: string },
  deps: RegistryTransmissionExportDeps,
): Promise<{ ok: boolean; reason?: string; rowCount?: number; viaServer?: boolean }> {
  const name = `registry-transmission-audit${input.queue ? `-${input.queue}` : ''}-${input.today}.csv`;
  // Batch 551 (carried over from 550): with the API server the file is built there, so nothing is read here.
  if (deps.exportsViaServer) return deps.exportQaReport('qa:registry-transmission-audit:export', [], name, { queue: input.queue ?? 'all' });
  const [cytology, cancer, visible] = await Promise.all([deps.getAll.cytology(), deps.getAll.cancer(), deps.visibleCaseIds()]);
  const rows = registryTransmissionAuditRows(
    { cytology: cytology.ok ? cytology.data : [], cancer: cancer.ok ? cancer.data : [] },
    { queue: input.queue, caseIds: visible },
  );
  // Batch 550: with the API server the file is built there from the queue; its notice reports the outcome (viaServer).
  return deps.exportQaReport('qa:registry-transmission-audit:export', registryTransmissionAuditCsvRows(rows), name, { queue: input.queue ?? 'all' });
}
