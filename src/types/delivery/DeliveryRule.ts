// src/types/delivery/DeliveryRule.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct spec ("Decoupled Dispatch & Print Management
// System", Section 3 — "Delivery Configuration Rules Engine"). All
// four of the source spec's own real criteria (Provider ID, Ordering
// Facility, Patient Location, Report Type) already have real,
// resolvable data in this app today — confirmed directly before
// building anything new:
//   - Provider ID      → Case.order.orderingPhysicianId
//   - Ordering Facility → Case.order.facilityId
//   - Patient Location  → Location.pointOfCare (HL7 PV1-3.1 — "OR",
//     "ICU", etc.), reached via Case.order.locationId
//   - Report Type       → ReportReleasedEvent.reportType
// No new Case/order field was needed for this engine at all.
// ─────────────────────────────────────────────────────────────────────────────

/** Real, per the source spec's own "Action Matrix Options" — exactly
 *  these four, no more. */
export type DeliveryAction = 'ELECTRONIC_ONLY' | 'PRINT_ONLY' | 'DUAL' | 'SUPPRESS';

/** Batch 520 (PS-280): the ways a released report can go out.
 *  ELECTRONIC — the result message (with its PDF) to the Interface Engine;
 *  PRINT — the Print Queue; FAX — e-fax through the interface server's
 *  email-to-fax gateway; FILE_DROP — the PDF and its metadata written to a
 *  folder or SFTP target set up on the interface server. */
export type DeliveryChannel = 'ELECTRONIC' | 'PRINT' | 'FAX' | 'FILE_DROP';
export const DELIVERY_CHANNELS: readonly DeliveryChannel[] = ['ELECTRONIC', 'PRINT', 'FAX', 'FILE_DROP'];

/** Batch 520 (PS-280, spec 3.1.3): a client's or physician's delivery preference
 *  (e.g. primary: HL7; secondary: auto-fax; fallback: batch print).
 *  Primary and secondary channels all go at once; fallback channels go only when
 *  a primary channel fails. A channel has at most one role. */
export interface DeliveryChannelPlan {
  primary: DeliveryChannel[];
  secondary: DeliveryChannel[];
  fallback: DeliveryChannel[];
}

export interface DeliveryRule {
  id: string;
  /** Real, per the source spec's own Rule Criteria — every field here
   *  is optional; the resolver's own real "most-specific-wins" logic
   *  (resolveDeliveryAction.ts) scores a rule by how many of these it
   *  actually specifies, same real precedence convention as
   *  RoutingRule.performingLabFacilityId's own Global-vs-scoped
   *  pattern elsewhere in this app. A rule with zero criteria set
   *  would match every case — deliberately still valid (a real,
   *  site-wide default a facility might want), but the lowest-priority
   *  match whenever anything more specific also matches. */
  providerId?: string;
  orderingFacilityId?: string;
  pointOfCare?: string;
  reportType?: 'PRELIMINARY' | 'FINAL' | 'CORRECTED' | 'ADDENDUM';
  action: DeliveryAction;
  /** Batch 520 (PS-280): the channels and their roles. When absent (rules saved
   *  before Batch 520), the plan follows `action`. When present, `action` is kept
   *  in step with it (ELECTRONIC and PRINT) for readers of the older field. */
  channels?: DeliveryChannelPlan;
  /** Batch 520: the fax number for FAX, instead of the ordering physician's
   *  (then the ordering facility's) fax number. */
  faxNumber?: string;
  /** Batch 520: the file-drop target for FILE_DROP, by name — the folder or
   *  SFTP server and its credentials are set up on the interface server
   *  (FILE_DROP_TARGETS), never stored here. */
  fileDropTargetId?: string;
  /** Real, deliberate: a rule this specific to a real, active clinical
   *  workflow (a named provider, a named ward) needs a real, human-
   *  readable reason on file — same real posture RoutingRule.note
   *  already establishes for its own admin overrides. */
  note?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
