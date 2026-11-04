// src/services/followUp/followUpStore.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 454: where follow-up expectations (surgical cases marked "follow-up
// expected") and the lab's records (dispositions, clinician emails, alerts
// sent) are kept. Plain storage with no permission checks: every change goes
// through followUpActions.ts, which checks the capability first. The server
// (SQL Server) keeps these as two tables; see docs/architecture/FOLLOW_UP_API.md.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import type { FollowUpExpectation, FollowUpRecord } from './followUpTypes';
import { FOLLOW_UP_DEMO_EXPECTATIONS } from './followUpDemoSeed';

export interface IFollowUpStore {
  getExpectations(): Promise<FollowUpExpectation[]>;
  /** Adds or replaces the expectation for its case. */
  saveExpectation(expectation: FollowUpExpectation): Promise<void>;
  getRecords(): Promise<FollowUpRecord[]>;
  /** Adds or replaces the record with its key. */
  saveRecord(record: FollowUpRecord): Promise<void>;
}

const EXPECTATIONS_KEY = 'followUpExpectations';
const RECORDS_KEY = 'followUpRecords';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export const followUpStore: IFollowUpStore = {
  // Batch 455: the demo baseline's expectations until anything is stored.
  async getExpectations() { return clone(storageGet<FollowUpExpectation[]>(EXPECTATIONS_KEY, FOLLOW_UP_DEMO_EXPECTATIONS)); },
  async saveExpectation(expectation) {
    const all = storageGet<FollowUpExpectation[]>(EXPECTATIONS_KEY, FOLLOW_UP_DEMO_EXPECTATIONS);
    storageSet(EXPECTATIONS_KEY, [...all.filter(e => e.caseId !== expectation.caseId), clone(expectation)]);
  },
  async getRecords() { return clone(storageGet<FollowUpRecord[]>(RECORDS_KEY, [])); },
  async saveRecord(record) {
    const all = storageGet<FollowUpRecord[]>(RECORDS_KEY, []);
    storageSet(RECORDS_KEY, [...all.filter(r => r.key !== record.key), clone(record)]);
  },
};

/** An in-memory store, for tests. */
export function createMemoryFollowUpStore(seed: { expectations?: FollowUpExpectation[]; records?: FollowUpRecord[] } = {}): IFollowUpStore {
  let expectations = clone(seed.expectations ?? []);
  let records = clone(seed.records ?? []);
  return {
    async getExpectations() { return clone(expectations); },
    async saveExpectation(e) { expectations = [...expectations.filter(x => x.caseId !== e.caseId), clone(e)]; },
    async getRecords() { return clone(records); },
    async saveRecord(r) { records = [...records.filter(x => x.key !== r.key), clone(r)]; },
  };
}
