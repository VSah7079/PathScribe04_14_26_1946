// src/services/billing/ICodeImportService.ts
// Batch 617 (PS-514): the interface of the bulk code import service (the
// mock's own shape, written down so the API server's version can match it).
// The planners are pure and live in codeEngine/; the server runs the same
// rules. Refusals carry a `code` (CodeImportRefusal) and, for rows, the list
// of problems.
import type { ServiceResult } from '../types';
import type { CodeImportJob } from '@/types/billing/CodeImportJob';
import type { CodeImportRequest } from './codeEngine/planCodeImport';
import type { CodeImportActorOptions, CodeImportDecisionResult, CodeImportPreviewResult, CodeImportResult } from './mockCodeImportService';

export interface ICodeImportService {
  listJobs(): Promise<ServiceResult<CodeImportJob[]>>;
  getJob(jobId: string): Promise<ServiceResult<CodeImportJob>>;
  /** The import plan for these rows, without saving anything. */
  previewImport(rows: Record<string, string>[], request: Omit<CodeImportRequest, 'jobId' | 'timestamp'>): Promise<CodeImportPreviewResult>;
  /** Plans and saves an import (one pending-approval job). */
  importRows(
    rows: Record<string, string>[],
    request: Omit<CodeImportRequest, 'jobId' | 'timestamp'> & { jobId?: string; timestamp?: string },
    options?: { skipRefusedRows?: boolean },
  ): Promise<CodeImportResult>;
  approveJob(jobId: string, reviewedBy: string, options?: CodeImportActorOptions): Promise<CodeImportDecisionResult>;
  rejectJob(jobId: string, reviewedBy: string, reason: string, options?: CodeImportActorOptions): Promise<CodeImportDecisionResult>;
  rollbackJob(jobId: string, rolledBackBy: string, reason: string, options?: CodeImportActorOptions): Promise<CodeImportDecisionResult>;
}
