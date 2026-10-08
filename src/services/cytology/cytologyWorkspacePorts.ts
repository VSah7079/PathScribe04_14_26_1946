// src/services/cytology/cytologyWorkspacePorts.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 410 (PS-359). Everything the Cytology Workspace's services use, passed
// in so they can be tested without module mocks: loadCytologyWorkspace,
// saveCytologyReview and cytologyCaseActions. The real wiring is
// cytologyWorkspaceDeps.ts. Typed loosely where the page's existing calls were.
// ─────────────────────────────────────────────────────────────────────────────

import type { Case } from '@/types/case/Case';
import type { CytologyReviewRecord } from '@/types/cytology/CytologyReviewRecord';
import type { CytologySignOutRecord } from '@/types/cytology/CytologySignOutRecord';
import type { CytologyCategoryEntry, CytologyNomenclatureSystem } from './ICytologyCategoryService';
import type { DecantType } from '@/types/case/Material';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type PortResult<T> = { ok: true; data: T } | { ok: false; error?: string };

export interface CytologyWorkspaceDeps {
  enforce: (capability: string, context?: Record<string, unknown>) => Promise<{ allowed: boolean }>;
  now: () => Date;
  random: () => number;
  /** A unique suffix for new decant and ROSE ids. */
  newId: () => string;
  /** Batch 453: decant changes through the same atomic, versioned save as the
   *  report page (services/material/caseMaterialService.ts), announced as
   *  material events. Optional: without it, decants are saved as before. */
  saveDecantChange?: (caseId: string, change: import('../material/materialTree').DecantChange, expectedVersion: number) => Promise<import('../material/caseMaterialService').DecantSaveResult>;
  publishMaterialEvent?: (event: import('../material/materialEvents').MaterialEvent) => void;

  // Cases
  getCase: (caseId: string, userId: string) => Promise<Case | undefined>;
  getAllCases: (filter?: { patientId?: string }) => Promise<PortResult<Case[]>>;
  /** PS-71 (Batch 458): every save carries the version the change was built from. */
  updateCase: (caseId: string, patch: Record<string, unknown>, expectedVersion: number) => Promise<unknown>;
  listCasesForUser: (userId: string) => Promise<Case[]>;
  /** Put a case back in the cytology pool, unassigned (workload reassignment). */
  returnToCytologyPool: (caseData: Case) => Promise<unknown>;

  // Dictionaries and settings
  getSpecimenDictionary: () => Promise<PortResult<any[]>>;
  getAllCategories: () => Promise<PortResult<CytologyCategoryEntry[]>>;
  getCategoriesFor: (system: CytologyNomenclatureSystem) => Promise<PortResult<CytologyCategoryEntry[]>>;
  getNomenclatureSettings: (facilityId: string | undefined) => Promise<{ enterprise: any; facility: any }>;
  getInstrumentationSettings: (facilityId: string | undefined) => Promise<{ enterprise: any; facility: any }>;
  getFacilityJurisdiction: (facilityId: string) => Promise<string | undefined>;
  getProviderCredentials: (userId: string) => Promise<any[] | undefined>;
  getPathologyLexicon: () => Promise<PortResult<any[]>>;
  getQcSettings: (facilityId: string, userId: string) => Promise<{ enterprise: any; facility: any; staff: any } | null>;
  getWorkloadCaps: (facilityId: string | undefined, userId: string) => Promise<{ enterprise: any; facility: any; staff: any } | null>;
  /** Batch 415: the CLIA workload cap and CAP 5-year lookback feature settings (enterprise, facility). */
  getComplianceSettings: (facilityId: string | undefined) => Promise<{ enterprise: any; facility: any }>;
  getSnomedSeverityMapping: () => Promise<PortResult<any[]>>;

  // Reviews, sign-outs, AI
  getReviewsForSpecimen: (specimenId: string) => Promise<PortResult<CytologyReviewRecord[]>>;
  getAllReviews: () => Promise<PortResult<CytologyReviewRecord[]>>;
  createReview: (input: any) => Promise<PortResult<CytologyReviewRecord>>;
  updateReview: (reviewId: string, userId: string, patch: any) => Promise<PortResult<CytologyReviewRecord>>;
  getSignOutRecords: (specimenId: string) => Promise<PortResult<CytologySignOutRecord[]>>;
  /** Batch 411: every sign-out record on the case (which specimens are signed out). */
  getCaseSignOutRecords: (caseId: string) => Promise<PortResult<CytologySignOutRecord[]>>;
  getAiResults: (caseId: string) => Promise<PortResult<any[]>>;

  // Workload, QA, audit
  getLedgerInWindow: (userId: string, start: string, end: string) => Promise<PortResult<{ scuWeight: number; activeDurationSeconds: number }[]>>;
  recordLedgerEntry: (entry: any) => Promise<unknown>;
  listEncounters: (patientId: string) => Promise<PortResult<any[]>>;
  createQaActivity: (record: any) => Promise<PortResult<{ id: string }>>;
  logAudit: (event: any) => unknown;

  // Material and printing
  resolveDecantCassetteColor: (decantType: DecantType, context: { priority?: string }) => Promise<string | undefined>;
  resolveReportLocale: (facilityId?: string) => Promise<any>;
  /** Render report content to a PDF document in its own language (the page opens it). */
  renderReportPdf: (content: any) => Promise<{ output: (kind: 'dataurlnewwindow') => unknown }>;
}
