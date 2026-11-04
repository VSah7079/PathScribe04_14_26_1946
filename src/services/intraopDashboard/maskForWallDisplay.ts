// src/services/intraopDashboard/maskForWallDisplay.ts
// ─────────────────────────────────────────────────
// Batch 603 (dev decision: strict payload masking on wall displays). The OR
// Suite board is a shared screen in a hallway or a suite. It never receives a
// patient name or a full MRN: each row is identified by the surgical case ID
// (the OR/case number) and the room. Applied at the point the board reads its
// rows, so a name or MRN is not held in the page's state at all.
// ─────────────────────────────────────────────────
import type { ActiveIntraopRequest } from './resolveActiveIntraopRequestsForLocations';

/** The language-neutral label a masked row carries in place of the patient's name. */
export function wallDisplayCaseLabel(r: Pick<ActiveIntraopRequest, 'orNumber' | 'locationDisplay'>): string {
  return r.locationDisplay && r.locationDisplay !== r.orNumber ? `${r.orNumber} · ${r.locationDisplay}` : r.orNumber;
}

export function maskForWallDisplay(r: ActiveIntraopRequest): ActiveIntraopRequest {
  return { ...r, patientName: wallDisplayCaseLabel(r), mrn: '' };
}
