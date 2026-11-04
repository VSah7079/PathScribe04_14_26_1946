// src/services/cytology/resolveCytologyDispatchOrganisation.ts
// Batch 633 (PS-171), generalised in Batch 634: the cytology dispatchers' view of the shared lookup in
// services/interfaceDispatch/resolveDispatchOrganisation.ts (live patient index, audit entry on a skip).
import { resolveDispatchOrganisation, type DispatchKind } from '../interfaceDispatch/resolveDispatchOrganisation';

export type { DispatchKind };

export function resolveCytologyDispatchOrganisation(caseData: { id?: string; patient?: { id?: string } | null }, kind: DispatchKind): Promise<string | null> {
  return resolveDispatchOrganisation(caseData, 'Cytology', kind);
}
