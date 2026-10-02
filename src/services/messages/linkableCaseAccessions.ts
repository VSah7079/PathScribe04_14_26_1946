// src/services/messages/linkableCaseAccessions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 396 (Pete's privacy model, rule 4): a message links an accession
// number it mentions only when the reader can open that case. Linking a
// number the reader can't open would confirm that the case exists.
//
// The input is already the reader's accessible list (CaseRouter applies the
// organisation wall and pool rules). This drops the cases the reader still
// can't open from a message:
//   - another organisation's case reached only through PathScribe support
//     access. Support opens those deliberately, under that organisation's
//     policy and audit, never from a link in a message;
//   - an Orchestration case without canViewOrchestration;
//   - a pediatric case the reader isn't authorised for.
// Pure: the caller supplies the session and the lookups.
// ─────────────────────────────────────────────────────────────────────────────

import type { Facility } from '../facilities/IFacilityService';
import {
  isCrossTenantSupportAccess,
  resolveOrchestrationAccess,
  resolvePediatricAccess,
  type CaseAccessFacility,
  type SessionUser,
} from '../auth/caseAccessControl';

export interface LinkableCaseCandidate {
  accession?: { fullAccession?: string | null } | null;
  originHospitalId?: string | null;
  reportingMode?: string | null;
  order?: { facilityId?: string | null } | null;
  patient?: { dateOfBirth?: string | null } | null;
}

export function selectLinkableAccessions(
  session: SessionUser | null,
  accessibleCases: LinkableCaseCandidate[],
  enterpriseFacilities: Facility[],
  facilitiesById: Map<string, CaseAccessFacility>,
): string[] {
  if (!session) return [];
  const out: string[] = [];
  for (const c of accessibleCases) {
    const accession = c.accession?.fullAccession;
    if (!accession) continue;
    if (isCrossTenantSupportAccess(session, c, enterpriseFacilities)) continue;
    if (!resolveOrchestrationAccess(session, c).granted) continue;
    const facilityId = c.order?.facilityId;
    if (facilityId && !resolvePediatricAccess(session, c, facilitiesById.get(facilityId) ?? null).granted) continue;
    out.push(accession);
  }
  return out;
}
