// src/services/caseReports/savedCaseReports.ts
// ─────────────────────────────────────────────────
// Batch 613: saved report definitions, kept by the saved-search service under the 'caseReport'
// context (the same private-to-the-owner list as saved searches). A definition that cannot be
// read back is normalised, never dropped.
// ─────────────────────────────────────────────────
import type { ServiceResult } from '../types';
import type { ISavedSearchService, SavedSearch } from '../savedSearches/ISavedSearchService';
import { isCaseReportDefinition, normalizeCaseReportDefinition, type CaseReportDefinition } from './caseReportDefinition';

export interface SavedCaseReport { id: string; name: string; definition: CaseReportDefinition; createdAt: string; lastUsedAt?: string; useCount: number }

const toSaved = (s: SavedSearch): SavedCaseReport => ({
  id: s.id, name: s.name, definition: isCaseReportDefinition(s.filters) ? normalizeCaseReportDefinition(s.filters) : normalizeCaseReportDefinition(undefined),
  createdAt: s.createdAt, lastUsedAt: s.lastUsedAt, useCount: s.useCount,
});

export function createSavedCaseReports(store: ISavedSearchService, userId: () => string | undefined) {
  return {
    async list(): Promise<ServiceResult<SavedCaseReport[]>> {
      const id = userId(); if (!id) return { ok: true, data: [] };
      const res = await store.getForUserByContext(id, 'caseReport');
      return res.ok ? { ok: true, data: res.data.map(toSaved).sort((a, b) => a.name.localeCompare(b.name)) } : res;
    },
    async save(name: string, definition: CaseReportDefinition): Promise<ServiceResult<SavedCaseReport>> {
      const id = userId(); if (!id) return { ok: false, error: 'NOT_SIGNED_IN' };
      const clean = name.trim();
      if (!clean) return { ok: false, error: 'NAME_REQUIRED' };
      const res = await store.save({ userId: id, name: clean, context: 'caseReport', filters: definition, useCount: 0 } as Omit<SavedSearch, 'id' | 'createdAt' | 'useCount'>);
      return res.ok ? { ok: true, data: toSaved(res.data) } : res;
    },
    async rename(savedId: string, name: string): Promise<ServiceResult<SavedCaseReport>> {
      const clean = name.trim();
      if (!clean) return { ok: false, error: 'NAME_REQUIRED' };
      const res = await store.rename(savedId, clean);
      return res.ok ? { ok: true, data: toSaved(res.data) } : res;
    },
    delete: (savedId: string) => store.delete(savedId),
    async recordUse(savedId: string): Promise<ServiceResult<SavedCaseReport>> {
      const res = await store.recordUse(savedId);
      return res.ok ? { ok: true, data: toSaved(res.data) } : res;
    },
  };
}
