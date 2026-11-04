// src/services/material/httpCaseMaterialService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 618 (PS-482): the API server's version of ICaseMaterialService.
// One route, `POST /api/material/case-material/apply-decant-change`, listed in
// docs/architecture/CASE_MATERIAL_API.md (HTTP_SERVICES_PATTERN.md §7).
// The server checks the case version (a stale one is a 409 with the current
// version), the delete permission and the tree rules, writes nothing on a
// refusal, and answers with the complete tree and the affected billing lines.
// A failure is a fixed code; the server's message text is never used.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { methodPath } from '../apiServer/httpServiceKit';
import type { DecantChangeRefusal } from './materialTree';
import type { DecantSaveResult } from './caseMaterialService';
import type { ICaseMaterialService } from './ICaseMaterialService';

const BASE = '/api/material/case-material';

type Saved = Extract<DecantSaveResult, { ok: true }>;
type SavedBody = Omit<Saved, 'ok' | 'version'> & { rowVersion: number };

/** The server's refusal codes, and the app's own names for them. */
const REFUSALS: Record<string, DecantChangeRefusal> = {
  SPECIMEN_NOT_FOUND: 'specimenNotFound',
  DECANT_NOT_FOUND: 'decantNotFound',
  DUPLICATE_ID: 'duplicateId',
  PARENT_NOT_FOUND: 'parentNotFound',
  HAS_CHILDREN: 'hasChildren',
};

export const createHttpCaseMaterialService = (client: ApiHttpClient): ICaseMaterialService => ({
  async applyDecantChange(caseId, change, expectedVersion): Promise<DecantSaveResult> {
    const r = await client.post<SavedBody>(methodPath(BASE, 'applyDecantChange'), { caseId, change, expectedVersion });
    if (r.ok === true) {
      const { rowVersion, ...rest } = r.data;
      return { ok: true, ...rest, version: rowVersion };
    }
    const failed = r;
    if (failed.error === 'CONFLICT') return { ok: false, error: 'conflict', currentVersion: failed.currentVersion ?? expectedVersion };
    if (failed.error === 'NOT_PERMITTED') return { ok: false, error: 'notPermitted' };
    if (failed.error === 'NOT_FOUND' || failed.error === 'CASE_NOT_FOUND') return { ok: false, error: 'caseNotFound' };
    const refusal = REFUSALS[failed.error];
    if (refusal) return { ok: false, error: refusal };
    return { ok: false, error: 'saveFailed', detail: failed.error };
  },
});
