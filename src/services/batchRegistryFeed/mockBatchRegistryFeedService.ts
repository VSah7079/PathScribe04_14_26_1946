// src/services/batchRegistryFeed/mockBatchRegistryFeedService.ts
// Batch 620 part S (PS-800): the demo's batch file feed. Profiles and run manifests live in browser storage (no patient data in
// either); the records for a file are read from the cases when the file is made and the file is handed back, never kept.
// Profile changes need config:batch-registry-feed:manage (guardConfigWrites, audited); making a file needs registry:batch-file:generate.
import { storageGet, storageSet } from '../mockStorage';
import { isServiceOk, type ServiceResult } from '../types';
import type { IBatchRegistryFeedService, RunPreview } from './IBatchRegistryFeedService';
import {
  buildBatchFile, fileAckToEntryAcks, SHIPPED_PROFILE_IDS, partitionRecords, planRun, runStatusFor, scheduleIsBatch, seedProfiles, validateProfile, deadlineCount,
  type BatchProgramProfile, type BatchRunManifest, type FileAcknowledgement,
} from './batchRegistryFeed';
import { createMockBatchRecordSource, type IBatchRecordSource } from './batchRecordSource';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import type { ICytologyRegistryOutboundQueueService } from '../cytology/ICytologyRegistryOutboundQueueService';
import type { DeliveryScheduleEntry } from '../deliverySchedules/deliverySchedule';
import type { CytologyRegistryOutboundQueueEntry } from '@/types/case/CytologyRegistryOutboundQueueEntry';

export const BATCH_PROFILES_KEY = 'batch_registry_profiles_v1';
export const BATCH_RUNS_KEY = 'batch_registry_runs_v1';

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const SCREENING = 'screening:';

export interface BatchFeedDeps {
  queue: Pick<ICytologyRegistryOutboundQueueService, 'getAll' | 'markSent' | 'markFailed'>;
  source: IBatchRecordSource;
  schedules: () => Promise<DeliveryScheduleEntry[]>;
  /** The existing acknowledgement path (recordRegistryAcknowledgement): one engine answer per submission. */
  recordAck: (input: { format: string; body: string; submissionGuid?: string }) => Promise<unknown>;
  /** The permission check (audited by the authorization service). */
  enforce: (capability: string) => Promise<boolean>;
  /** An audit entry with no patient text. */
  audit: (event: string, detail: string) => unknown;
  now: () => Date;
}

const loadProfiles = (now: Date) => storageGet<BatchProgramProfile[]>(BATCH_PROFILES_KEY, seedProfiles(now.toISOString()));
const loadRuns = () => storageGet<BatchRunManifest[]>(BATCH_RUNS_KEY, []);
const registryIdOf = (p: BatchProgramProfile) => (p.registryKey.startsWith(SCREENING) ? p.registryKey.slice(SCREENING.length) : null);

export function createBatchRegistryFeedUnchecked(deps: BatchFeedDeps): IBatchRegistryFeedService {
  const waitingEntries = async (p: BatchProgramProfile): Promise<CytologyRegistryOutboundQueueEntry[]> => {
    const id = registryIdOf(p);
    const all = id ? await deps.queue.getAll() : null;
    return all && isServiceOk(all) ? all.data.filter(e => e.registryId === id && e.status === 'QUEUED' && !e.errorCode) : [];
  };
  const find = (id: string) => loadProfiles(deps.now()).find(p => p.id === id);

  return {
    async getProfiles() { return ok(loadProfiles(deps.now())); },

    async saveProfile(input) {
      const problems = validateProfile(input);
      if (problems.length) return err(`PROFILE_REFUSED:${problems[0]}`);
      const all = loadProfiles(deps.now());
      const prior = input.id ? all.find(p => p.id === input.id) : undefined;
      if (input.id && !prior) return err('NOT_FOUND');
      const saved: BatchProgramProfile = { ...input, id: input.id ?? newId('batch-profile'), isExample: prior?.isExample ?? false, updatedAt: deps.now().toISOString() };
      storageSet(BATCH_PROFILES_KEY, prior ? all.map(p => (p.id === saved.id ? saved : p)) : [...all, saved]);
      return ok(saved);
    },

    async removeProfile(id) {
      if (SHIPPED_PROFILE_IDS.includes(id)) return err('PROFILE_PROTECTED');
      const all = loadProfiles(deps.now());
      if (!all.some(p => p.id === id)) return err('NOT_FOUND');
      storageSet(BATCH_PROFILES_KEY, all.filter(p => p.id !== id));
      return ok(undefined as void);
    },

    async isBatchProgram(screeningRegistryId) {
      return ok(loadProfiles(deps.now()).some(p => p.enabled && p.registryKey === `${SCREENING}${screeningRegistryId}`));
    },

    async getRuns(profileId) {
      return ok(loadRuns().filter(r => !profileId || r.profileId === profileId).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)));
    },

    async preview(profileId) {
      const p = find(profileId);
      if (!p) return err('NOT_FOUND');
      const [entries, schedules] = [await waitingEntries(p), await deps.schedules()];
      const { items } = await deps.source.itemsFor(entries);
      const now = deps.now();
      const last = loadRuns().filter(r => r.profileId === p.id).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0]?.generatedAt ?? null;
      const plan = planRun(items.map(i => ({ ref: i.ref, facilityId: i.facilityId, signedOutAt: i.signedOutAt })), schedules, p.registryKey, now, last);
      const dueItems = items.filter(i => plan.due.includes(i.ref));
      const next = plan.waiting.map(w => w.nextDueAt).filter((x): x is string => !!x).sort()[0] ?? null;
      const out: RunPreview = {
        waiting: entries.length, dueNow: plan.due.length, wouldBeHeldBack: partitionRecords(p, dueItems).held.length,
        overdue: deadlineCount(items, schedules, p.registryKey, now), nextDueAt: next, scheduleIsBatch: scheduleIsBatch(schedules, p.registryKey),
      };
      return ok(out);
    },

    async buildRun(profileId, options) {
      if (!(await deps.enforce('registry:batch-file:generate'))) return err('NOT_PERMITTED');
      const p = find(profileId);
      if (!p) return err('NOT_FOUND');
      if (!p.enabled) return err('PROFILE_DISABLED');
      const now = deps.now();
      const entries = await waitingEntries(p);
      const { items } = await deps.source.itemsFor(entries);
      const runs = loadRuns().filter(r => r.profileId === p.id);
      const last = runs.map(r => r.generatedAt).sort().pop() ?? null;
      const manual = options?.manual === true;
      const plan = planRun(items.map(i => ({ ref: i.ref, facilityId: i.facilityId, signedOutAt: i.signedOutAt })), await deps.schedules(), p.registryKey, now, last, manual);
      const { ready, held } = partitionRecords(p, items.filter(i => plan.due.includes(i.ref)));
      const sequence = runs.reduce((m, r) => Math.max(m, r.sequence), 0) + 1;
      const built = buildBatchFile(p, ready.map(i => i.record), { now, sequence });
      if (built.ok === false) return err(built.error);
      for (const h of held) {
        await deps.queue.markFailed(h.ref, { errorCode: 'REGISTRY_NOT_READY', errorMessage: `Held out of the batch file: missing ${h.missing.join(', ')}.`, maxRetriesExceeded: false });
      }
      for (const i of ready) await deps.queue.markSent(i.ref);
      const run: BatchRunManifest = {
        id: newId('batch-run'), profileId: p.id, registryKey: p.registryKey, fileName: built.file.fileName, format: built.file.format, recordCount: built.file.recordCount,
        sha256: built.file.sha256, sequence, generatedAt: built.file.generatedAt, manual, refs: ready.map(i => i.ref), heldBack: held, status: 'awaitingAck',
      };
      storageSet(BATCH_RUNS_KEY, [...loadRuns(), run]);
      deps.audit('Registry batch file built', `${p.name}: ${run.fileName}, ${run.recordCount} records, ${held.length} held back, sha256 ${run.sha256}${manual ? ', requested ahead of the schedule' : ''}.`);
      return ok({ run, content: built.file.content });
    },

    async recordFileAcknowledgement(runId, ack: FileAcknowledgement) {
      const runs = loadRuns();
      const run = runs.find(r => r.id === runId);
      if (!run) return err('NOT_FOUND');
      if (run.status !== 'awaitingAck') return err('ALREADY_ANSWERED');
      const answers = fileAckToEntryAcks(run.refs, run.sha256, ack);
      if (!answers) return err('CHECKSUM_MISMATCH');
      const all = await deps.queue.getAll();
      const byId = new Map((all && isServiceOk(all) ? all.data : []).map(e => [e.id, e] as const));
      for (const a of answers) {
        const guid = byId.get(a.ref)?.submission?.submissionGuid;
        if (!guid) continue;
        const body = JSON.stringify({
          submissionGuid: guid, status: a.status === 'REJECTED_RECOVERABLE' ? 'REJECTED_RECOVERABLE' : a.status,
          findings: a.codes.map(code => ({ severity: 'CRITICAL_REJECT', code, message: code })),
        });
        await deps.recordAck({ format: 'statusJson', body, submissionGuid: guid });
      }
      const updated: BatchRunManifest = { ...run, status: runStatusFor(ack.status) };
      storageSet(BATCH_RUNS_KEY, runs.map(r => (r.id === run.id ? updated : r)));
      deps.audit('Registry batch file answered', `${run.fileName}: ${ack.status}, ${answers.filter(a => a.status === 'REJECTED_RECOVERABLE').length} of ${answers.length} records refused.`);
      return ok(updated);
    },
  };
}

const guarded = (deps: BatchFeedDeps): IBatchRegistryFeedService => guardConfigWrites(createBatchRegistryFeedUnchecked(deps), [
  ['config:batch-registry-feed:manage', ['saveProfile', 'removeProfile']],
]);

export const createMockBatchRegistryFeedService = guarded;

/** The app's version: the cytology registry queue, the cases, the delivery schedules, the authorization and audit services; each loads on first use. */
export const mockBatchRegistryFeedService: IBatchRegistryFeedService = createMockBatchRegistryFeedService({
  queue: {
    getAll: async () => (await import('../cytology/cytologyRegistryOutboundQueueServiceInstance')).cytologyRegistryOutboundQueueService.getAll(),
    markSent: async id => (await import('../cytology/cytologyRegistryOutboundQueueServiceInstance')).cytologyRegistryOutboundQueueService.markSent(id),
    markFailed: async (id, f) => (await import('../cytology/cytologyRegistryOutboundQueueServiceInstance')).cytologyRegistryOutboundQueueService.markFailed(id, f),
  },
  source: createMockBatchRecordSource(),
  schedules: async () => {
    const { deliveryScheduleService } = await import('../deliverySchedules/deliveryScheduleServiceInstance');
    const r = await deliveryScheduleService.getAll();
    return r.ok ? r.data : [];
  },
  recordAck: async input => {
    const [{ recordRegistryAcknowledgement }, { registryAckDeps }] = await Promise.all([
      import('../registrySubmission/recordRegistryAcknowledgement'), import('../registrySubmission/recordRegistryAcknowledgementDeps'),
    ]);
    return recordRegistryAcknowledgement(input, registryAckDeps);
  },
  enforce: async capability => {
    const { authorizationService } = await import('../authorization/defaultAuthorizationService');
    return (await authorizationService.enforce(capability as never)).allowed;
  },
  audit: async (event, detail) => {
    const { auditService } = await import('../auditlog/auditServiceInstance');
    return auditService.logEvent({ type: 'user', event, detail, user: 'system', caseId: null, confidence: null });
  },
  now: () => new Date(),
});
