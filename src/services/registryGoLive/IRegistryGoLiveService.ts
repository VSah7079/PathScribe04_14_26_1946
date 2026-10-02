// src/services/registryGoLive/IRegistryGoLiveService.ts
// Batch 423: go-live records (one per request to switch a registry to its live
// register) and the site's go-live approval settings. A record can only move
// forward: approvals are added while it is in review; once live, the only change
// is ending it (a return to the test system). Nothing is ever deleted: the
// records are the go-live history an inspector reads.
import type { ServiceResult } from '../types';
import type { RegistryDomain } from './registryTemplateVersions';
import type { RegistryGoLiveApproval, RegistryGoLiveGovernance, RegistryGoLiveRecord } from './registryGoLiveRules';
import type { RegistryAdapterRule } from './registryOverlay';
import type { RegistryValidationRecord } from './registryValidationRecord';

/** Batch 424: the data-sharing agreement (BAA, DUA) that lets a registry leave Pending. */
export interface RegistryAgreement {
  domain: RegistryDomain;
  registryId: string;
  reference: string;
  recordedBy: string;
  recordedAt: string;
}

/** Batch 424: a validation record this instance exported (validation) or imported (production). */
export interface StoredValidationRecord {
  direction: 'exported' | 'imported';
  storedAt: string;
  storedBy: string;
  record: RegistryValidationRecord;
}

export interface IRegistryGoLiveService {
  /** A registry's records, newest first. */
  list(domain: RegistryDomain, registryId: string): Promise<ServiceResult<RegistryGoLiveRecord[]>>;
  get(id: string): Promise<ServiceResult<RegistryGoLiveRecord | undefined>>;
  create(record: RegistryGoLiveRecord): Promise<ServiceResult<RegistryGoLiveRecord>>;
  /** In review only. */
  addApproval(id: string, approval: RegistryGoLiveApproval): Promise<ServiceResult<RegistryGoLiveRecord>>;
  /** In review → live. */
  markLive(id: string, live: Required<Pick<RegistryGoLiveRecord, 'liveAt' | 'governanceAtLive' | 'auditStatement'>>): Promise<ServiceResult<RegistryGoLiveRecord>>;
  /** In review → withdrawn, or live → ended. */
  close(id: string, closed: { closedAt: string; closedBy: string }): Promise<ServiceResult<RegistryGoLiveRecord>>;
  getGovernance(): Promise<ServiceResult<RegistryGoLiveGovernance>>;
  // Batch 424
  /** The latest agreement recorded for a registry. */
  getAgreement(domain: RegistryDomain, registryId: string): Promise<ServiceResult<RegistryAgreement | undefined>>;
  recordAgreement(agreement: RegistryAgreement): Promise<ServiceResult<RegistryAgreement>>;
  listAdapterRules(domain: RegistryDomain, registryId: string): Promise<ServiceResult<RegistryAdapterRule[]>>;
  /** Adds or replaces (same id). */
  saveAdapterRule(rule: RegistryAdapterRule): Promise<ServiceResult<RegistryAdapterRule>>;
  removeAdapterRule(id: string): Promise<ServiceResult<void>>;
  /** Newest first. */
  listValidationRecords(domain: RegistryDomain, registryId: string): Promise<ServiceResult<StoredValidationRecord[]>>;
  saveValidationRecord(stored: StoredValidationRecord): Promise<ServiceResult<StoredValidationRecord>>;
  saveGovernance(next: RegistryGoLiveGovernance): Promise<ServiceResult<RegistryGoLiveGovernance>>;
}
