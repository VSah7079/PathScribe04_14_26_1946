// src/services/clinical/openCriticalAlertReference.ts
// Batch 669 (access-12): opening a Critical Alert reference link records the view FIRST and then returns the updated
// record, so the page's "Viewed n times" includes this view. It used to show the count read before the view was recorded
// (one behind). An invalid or expired link records nothing.
import type { ServiceResult } from '../types';
import type { ICriticalAlertReferenceTokenService, CriticalAlertReferenceToken } from './ICriticalAlertReferenceTokenService';

export async function openCriticalAlertReference(
  token: string,
  service: Pick<ICriticalAlertReferenceTokenService, 'resolve' | 'recordAccess'>,
): Promise<ServiceResult<CriticalAlertReferenceToken>> {
  const resolved = await service.resolve(token);
  if (!resolved.ok) return resolved;
  const recorded = await service.recordAccess(resolved.data.id);
  // If recording fails the link still opens; show the last known count plus this view rather than hiding the record.
  return recorded.ok ? recorded : { ok: true, data: { ...resolved.data, accessCount: resolved.data.accessCount + 1 } };
}
