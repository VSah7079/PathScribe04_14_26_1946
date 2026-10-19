// src/services/internalNotes/httpInternalNoteService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IInternalNoteService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/DELEGATIONS_NOTES_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never
// carries server text; a plain-list method answers empty, a void method throws the code.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, result } from '../apiServer/httpServiceKit';

import type { IInternalNoteService } from './IInternalNoteService';

type P<K extends keyof IInternalNoteService> = Parameters<IInternalNoteService[K]>;
const BASE = '/api/internal-notes/internal-note';

export const createHttpInternalNoteService = (client: ApiHttpClient): IInternalNoteService =>
  buildHttpService<IInternalNoteService>(client, {
    getForCase: result('POST', () => `${BASE}/get-for-case`, { body: (accession: P<'getForCase'>[0], userId: P<'getForCase'>[1]) => ({ accession, userId }) }),
    add: result('POST', () => `${BASE}/add`, { body: (note: P<'add'>[0]) => (note) }),
    update: result('POST', () => `${BASE}/update`, { body: (id: P<'update'>[0], authorId: P<'update'>[1], changes: P<'update'>[2]) => ({ id, authorId, changes }) }),
    remove: result('POST', () => `${BASE}/remove`, { body: (id: P<'remove'>[0], authorId: P<'remove'>[1]) => ({ id, authorId }) }),
  });
