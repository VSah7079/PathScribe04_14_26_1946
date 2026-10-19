// src/services/apiServer/notFoundAsNull.ts
// Batch 616 (PS-484, PS-507, PS-512): a few interfaces return ServiceResult<T | null>,
// where "nothing there" is a successful answer (ok, data null), not a NOT_FOUND failure.
// The server answers 404 for those; this turns it back into the interface's own answer.
import type { ServiceResult } from '../types';

export async function notFoundAsNull<T>(call: Promise<ServiceResult<T | null>>): Promise<ServiceResult<T | null>> {
  const r = await call;
  return r.ok === false && r.error === 'NOT_FOUND' ? { ok: true, data: null } : r;
}
