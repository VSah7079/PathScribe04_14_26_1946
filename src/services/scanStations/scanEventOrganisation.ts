// src/services/scanStations/scanEventOrganisation.ts
// Batch 654: the organisation named on a bench scan event. It is the signed-in person's organisation (the tenant
// boundary, StaffUser.organisationId, carried on the session profile), never a value written into the code: scan events
// used to say 'ORG-MFT' for every site. When the session carries no organisation the local location record leaves it
// blank and the outbound dispatch is skipped, rather than naming a laboratory that is not the person's.

export interface ScanEventOrganisation {
  /** The organisation id for the event ('' when unknown; the local location record does not use it). */
  organisationId: string;
  /** Whether an organisation is known; the outbound dispatch is sent only when it is. */
  known: boolean;
}

export function scanEventOrganisation(profile: { organisationId?: string | null } | null | undefined): ScanEventOrganisation {
  const id = profile?.organisationId?.trim();
  return id ? { organisationId: id, known: true } : { organisationId: '', known: false };
}
