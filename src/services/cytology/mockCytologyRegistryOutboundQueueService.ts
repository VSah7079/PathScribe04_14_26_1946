// src/services/cytology/mockCytologyRegistryOutboundQueueService.ts
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import { retryRegistrySubmissionHeader } from '../registrySubmission/registrySubmissionHeader';
import type { ICytologyRegistryOutboundQueueService } from './ICytologyRegistryOutboundQueueService';
import type { CytologyRegistryOutboundQueueEntry } from '@/types/case/CytologyRegistryOutboundQueueEntry';
import { mockAuditService as auditService } from '@/services/auditlog/mockAuditService';

const KEY = 'cytology_registry_outbound_queue_v1';

const load    = (): CytologyRegistryOutboundQueueEntry[] => storageGet<CytologyRegistryOutboundQueueEntry[]>(KEY, []);
const persist = (data: CytologyRegistryOutboundQueueEntry[]) => storageSet(KEY, data);

const delay = () => new Promise(r => setTimeout(r, 80));
const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

export const mockCytologyRegistryOutboundQueueService: ICytologyRegistryOutboundQueueService = {
  async getAll() {
    await delay();
    return ok(load());
  },

  async getByCaseId(caseId) {
    await delay();
    return ok(load().filter(e => e.caseId === caseId));
  },

  async enqueue(entry) {
    await delay();
    const newEntry: CytologyRegistryOutboundQueueEntry = {
      ...entry,
      id: crypto.randomUUID(),
      status: 'QUEUED',
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetriesExceeded: false,
    };
    persist([...load(), newEntry]);
    return ok(newEntry);
  },

  async getFailed() {
    await delay();
    return ok(load().filter(e => e.status === 'FAILED'));
  },

  async markFailed(id, failure) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Cytology registry outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: CytologyRegistryOutboundQueueEntry = {
      ...prior, status: 'FAILED', errorCode: failure.errorCode, errorMessage: failure.errorMessage,
      maxRetriesExceeded: failure.maxRetriesExceeded, lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all]; next[idx] = updated; persist(next);
    auditService.logEvent({
      type: 'system', event: 'Cytology registry report dispatch failed',
      detail: `Cytology registry (${prior.registryId}) queue entry ${id} dispatch failed: ${failure.errorCode} — ${failure.errorMessage}`,
      user: 'system', caseId: prior.caseId, confidence: null,
    });
    return ok(updated);
  },

  async retryDispatch(id) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Cytology registry outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: CytologyRegistryOutboundQueueEntry = {
      ...prior, status: 'QUEUED', errorCode: undefined, errorMessage: undefined,
      maxRetriesExceeded: false, retryCount: prior.retryCount + 1, lastAttemptAt: new Date().toISOString(),
      // Batch 419 (SRS v2.1 FR-008.5): a resend of the same submission keeps its id and says it is a duplicate.
      ...(prior.submission ? { submission: retryRegistrySubmissionHeader(prior.submission) } : {}),
      registryStatus: undefined,
    };
    const next = [...all]; next[idx] = updated; persist(next);
    auditService.logEvent({
      type: 'user', event: 'Cytology registry report re-queued',
      detail: `Cytology registry (${prior.registryId}) queue entry ${id} re-queued for dispatch (attempt ${updated.retryCount}).`,
      user: 'system', caseId: prior.caseId, confidence: null,
    });
    return ok(updated);
  },

  async markSent(id) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Cytology registry outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: CytologyRegistryOutboundQueueEntry = {
      ...prior, status: 'SENT', errorCode: undefined, errorMessage: undefined, lastAttemptAt: new Date().toISOString(),
      // Batch 420: delivered to the interface engine; now waiting for the registry's acknowledgement.
      registryStatus: 'awaitingAck', sentAt: new Date().toISOString(),
    };
    const next = [...all]; next[idx] = updated; persist(next);
    auditService.logEvent({
      type: 'system', event: 'Cytology registry report dispatched',
      detail: `Cytology registry (${prior.registryId}) queue entry ${id} delivered to the interface engine; awaiting the registry's acknowledgement.`,
      user: 'system', caseId: prior.caseId, confidence: null,
    });
    return ok(updated);
  },
  async setRegistryRevisions(id, registryRevisions) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Cytology registry outbound queue entry ${id} not found`);
    const updated: CytologyRegistryOutboundQueueEntry = { ...all[idx], registryRevisions };
    const next = [...all]; next[idx] = updated; persist(next);
    return ok(updated);
  },
  async setRegistryStatus(id, registryStatus, acknowledgement) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Cytology registry outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: CytologyRegistryOutboundQueueEntry = {
      ...prior, registryStatus,
      ...(acknowledgement ? { acknowledgements: [...(prior.acknowledgements ?? []), acknowledgement] } : {}),
    };
    const next = [...all]; next[idx] = updated; persist(next);
    return ok(updated);
  },
};
