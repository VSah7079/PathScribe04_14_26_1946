// src/services/molecularOrders/mockMolecularOrderOutboundQueueService.ts
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IMolecularOrderOutboundQueueService } from './IMolecularOrderOutboundQueueService';
import type { MolecularOrderOutboundQueueEntry } from '@/types/case/MolecularOrderOutboundQueueEntry';
import { mockAuditService as auditService } from '@/services/auditlog/mockAuditService';
import { molecularOrderDemoEntries } from './molecularOrderDemoSeed';

const KEY = 'molecular_order_outbound_queue_v1';

// Batch 457: the demo orders (molecularOrderDemoSeed.ts) are the starting
// queue, so they come back after a Full Reset. They're made on first read and
// stored, so their times don't move after that.
const load = (): MolecularOrderOutboundQueueEntry[] => {
  const stored = storageGet<MolecularOrderOutboundQueueEntry[] | null>(KEY, null);
  if (stored) return stored;
  const seeded = molecularOrderDemoEntries();
  storageSet(KEY, seeded);
  return seeded;
};
const persist = (data: MolecularOrderOutboundQueueEntry[]) => storageSet(KEY, data);

const delay = () => new Promise(r => setTimeout(r, 80));
const ok  = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

export const mockMolecularOrderOutboundQueueService: IMolecularOrderOutboundQueueService = {
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
    const newEntry: MolecularOrderOutboundQueueEntry = {
      ...entry,
      id: crypto.randomUUID(),
      status: 'QUEUED',
      queuedAt: new Date().toISOString(),
      retryCount: 0,
      maxRetriesExceeded: false,
    };
    persist([...load(), newEntry]);
    auditService.logEvent({
      type: 'system', event: 'Molecular Order Queued',
      detail: `${newEntry.eventType} queued for dispatch${newEntry.caseId ? ` (case ${newEntry.caseId})` : ''}.`,
      user: 'system', caseId: newEntry.caseId ?? null, confidence: null,
    }).catch(() => {});
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
    if (idx === -1) return err(`Molecular order outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: MolecularOrderOutboundQueueEntry = {
      ...prior, status: 'FAILED', errorCode: failure.errorCode, errorMessage: failure.errorMessage,
      maxRetriesExceeded: failure.maxRetriesExceeded, lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all]; next[idx] = updated; persist(next);
    auditService.logEvent({
      type: 'system', event: 'Molecular Order Dispatch Failed',
      detail: `Molecular order queue entry ${id} dispatch failed: ${failure.errorCode} — ${failure.errorMessage}`,
      user: 'system', caseId: prior.caseId ?? null, confidence: null,
    }).catch(() => {});
    return ok(updated);
  },

  async retryDispatch(id) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Molecular order outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: MolecularOrderOutboundQueueEntry = {
      ...prior, status: 'QUEUED', errorCode: undefined, errorMessage: undefined,
      maxRetriesExceeded: false, retryCount: prior.retryCount + 1, lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all]; next[idx] = updated; persist(next);
    auditService.logEvent({
      type: 'user', event: 'Molecular Order Re-queued',
      detail: `Molecular order queue entry ${id} re-queued for dispatch (attempt ${updated.retryCount}).`,
      user: 'system', caseId: prior.caseId ?? null, confidence: null,
    }).catch(() => {});
    return ok(updated);
  },

  async markSent(id) {
    await delay();
    const all = load();
    const idx = all.findIndex(e => e.id === id);
    if (idx === -1) return err(`Molecular order outbound queue entry ${id} not found`);
    const prior = all[idx];
    const updated: MolecularOrderOutboundQueueEntry = {
      ...prior, status: 'SENT', errorCode: undefined, errorMessage: undefined, lastAttemptAt: new Date().toISOString(),
    };
    const next = [...all]; next[idx] = updated; persist(next);
    auditService.logEvent({
      type: 'system', event: 'Molecular Order Dispatched',
      detail: `Molecular order queue entry ${id} genuinely dispatched and accepted.`,
      user: 'system', caseId: prior.caseId ?? null, confidence: null,
    }).catch(() => {});
    return ok(updated);
  },
};
