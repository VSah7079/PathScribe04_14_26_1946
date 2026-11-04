// src/services/apiServer/httpServiceExtras.ts
// Batch 616 (PS-510): a method that only exists for the demonstration (seeding demo data). A server
// deployment has none, so the server version answers a fixed code and makes no call.
// (An interface whose "none" is a successful null uses notFoundAsNull.ts.)
import type { ServiceResultFailure } from '../types';

export const notOffered = async (): Promise<ServiceResultFailure> => ({ ok: false, error: 'NOT_SUPPORTED' });
