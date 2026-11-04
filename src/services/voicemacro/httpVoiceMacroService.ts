// src/services/voicemacro/httpVoiceMacroService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-498 to PS-515): the API server's version of IVoiceMacroService, built from the shared HTTP
// kit (docs/architecture/HTTP_SERVICES_PATTERN.md). The calls are the ones in docs/architecture/MACROS_API.md.
// The server decides permission; no message text from the server is ever shown (apiHttpClient).
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list, methodPath, value } from '../apiServer/httpServiceKit';
import type { IVoiceMacroService } from './IVoiceMacroService';

type Args<K extends keyof IVoiceMacroService> = Parameters<IVoiceMacroService[K]>;
const BASE = '/api/voicemacro/voice-macro';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpVoiceMacroService = (client: ApiHttpClient): IVoiceMacroService =>
  buildHttpService<IVoiceMacroService>(client, {
    getMacros: list('GET', () => route('getMacros')),
    addMacro: value('POST', () => route('addMacro'), { body: (macro: object) => macro, pick: (d: { id: string }) => d.id, missing: '', fallback: '' }),
    updateMacro: done('POST', () => route('updateMacro'), { body: (id: string, updates: object) => ({ id, updates }) }),
    deleteMacro: done('POST', () => route('deleteMacro'), { body: (id: Args<'deleteMacro'>[0]) => ({ id }) }),
    bulkImport: done('POST', () => route('bulkImport'), { body: (macros: object[]) => ({ macros }) }),
    getMacrosForCurrentUser: list('GET', () => route('getMacrosForCurrentUser')),
    addPersonalMacro: value('POST', () => route('addPersonalMacro'), { body: (macro: object) => macro, pick: (d: { id: string }) => d.id, missing: '', fallback: '' }),
    importPersonalMacros: done('POST', () => route('importPersonalMacros'), { body: (macros: object[]) => ({ macros }) }),
  });
