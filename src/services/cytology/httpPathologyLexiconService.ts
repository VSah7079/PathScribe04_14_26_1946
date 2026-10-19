// src/services/cytology/httpPathologyLexiconService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IPathologyLexiconService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CYTOLOGY_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';
import type { IPathologyLexiconService } from './IPathologyLexiconService';

const BASE = '/api/cytology/pathology-lexicon';

export const createHttpPathologyLexiconService = (client: ApiHttpClient): IPathologyLexiconService =>
  buildHttpService<IPathologyLexiconService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
  });
