// src/services/auth/institutionService.ts
// Returns the institution (Organisation) ID for the current session.
//
// Fixed June 2026 — this previously read a separate localStorage key,
// 'ps_institution_id', that was NEVER SET anywhere in the entire
// codebase (only ever read, here), always silently falling back to the
// hardcoded 'HOSP-001' default. Since this function backs a real
// (non-mock) Firestore path — firestoreBiometricService.ts's biometric
// security policy — every institution's policy was reading/writing the
// same 'HOSP-001' Firestore document regardless of which institution the
// logged-in user actually belonged to. Found while building
// caseAccessControl.ts in this same folder, which had independently
// built its own separate session-resolution logic without knowing this
// file (and its TODO — "derive from authenticated user's JWT claims when
// multi-tenancy is live") already existed. Now delegates to the same
// session resolution caseAccessControl.ts uses, so there's one source of
// truth for "what tenant is this session in," not two.
//
// TODO (unchanged): once real auth exists, resolve this from the
// authenticated JWT's claims server-side, not from a client-readable
// localStorage session object — same production caveat documented in
// caseAccessControl.ts.

import { getSessionUser } from './caseAccessControl';
import { getHospitalIdForOrganisation } from '../organisation/organisationService';

export async function getInstitutionId(): Promise<string> {
  const session = getSessionUser();
  const hospitalId = session?.organisationId
    ? getHospitalIdForOrganisation(session.organisationId)
    : null;
  return hospitalId ?? 'HOSP-001';
}