// src/services/encounters/IEncounterService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real Encounter entity - the second genuinely missing piece of Phase 0,
// confirmed multiple times during scoping: zero references to an
// encounter concept existed anywhere in this codebase. The closest
// thing was IncomingOrder.encounterNumber (services/orderIntake/) - a
// bare, unstructured string captured at order intake that went
// nowhere structured. This is the real entity that field should have
// been resolving into.
//
// A real Encounter is the transient visit/interaction context a case
// happens within - genuinely different from Patient identity itself.
// The same real patient can have many encounters over time (this
// admission, that outpatient visit); a given case's specimens were
// collected during exactly one of them. Per the original spec's own
// framing: "Ephemeral visit context," distinct from the Patient's own
// persistent identity.
//
// Same real, established pattern as services/patients/: standard
// interface/mock pattern, scoped by organisationId for the same
// reason patient identity is - an encounter at one lab organisation
// is never a valid match for a different, unrelated organisation's
// encounter, regardless of how well anything else lines up.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceResult } from '../types';

export type EncounterClass = 'Inpatient' | 'Outpatient' | 'Emergency' | 'Ambulatory' | 'Virtual';

export type EncounterStatus = 'Planned' | 'Arrived' | 'In-Progress' | 'Discharged' | 'Cancelled';

export interface Encounter {
  id: string;
  organisationId: string;
  /** The real, persistent MPI identity this encounter belongs to - see
   *  services/patients/IPatientIndexService.ts's own MasterPatientRecord.
   *  Every real encounter belongs to exactly one real patient identity. */
  patientId: string;
  /** Visit or account identifier (HL7's FIN - Financial/Facility
   *  Identification Number) - the real, external identifier for this
   *  specific visit, distinct from the patient's own MRN. */
  encounterNumber: string;
  encounterClass: EncounterClass;
  status: EncounterStatus;
  admitTime?: string;
  dischargeTime?: string;
  /** Real feature, per direct confirmation: working through the full
   *  list of ADT trigger events. PV1-36 (HL7 Table 0112) — real for
   *  A03. Same "guided free text" posture as locationStatus above;
   *  Table 0112 is genuinely site-extensible in the real standard. */
  dischargeDisposition?: string;
  facility?: string;
  department?: string;
  ward?: string;
  room?: string;
  bed?: string;
  /** Real feature, per direct confirmation: "we will need to accept
   *  PV1 HL7 data, but I don't believe we have Location / Rooms
   *  defined in config. They would naturally be associated to the
   *  Facility." The real, resolved Location (services/locations/)
   *  this encounter's PV1-3 crosswalked to — kept alongside the raw
   *  facility/ward/room/bed strings above (which stay as-is, the
   *  honest record of what the inbound message actually said) rather
   *  than replacing them. Undefined for an encounter with no PV1-3,
   *  or resolved before Location existed. */
  locationId?: string;
  /** Real feature, per direct confirmation: working through the full
   *  list of ADT trigger events. Captured automatically by
   *  updateLocation() every time a real transfer (A02/A09/A10)
   *  changes locationId — the location this encounter was AT
   *  immediately before the most recent move. Exists specifically so
   *  a real A12 (Cancel Transfer) can restore it reliably, rather
   *  than trusting the cancel message's own PV1-3/PV1-6 to carry the
   *  correct value (real-world A12 messages don't always populate it
   *  completely). Undefined for an encounter that has never been
   *  transferred. */
  previousLocationId?: string;
  attendingProvider?: string;
  /** Real feature, per direct confirmation: working through the full
   *  list of ADT trigger events — A08's real, previously-missing
   *  metadata fields. PV1-10 (HL7 Table 0069). */
  hospitalService?: string;
  /** PV1-14 (HL7 Table 0023). */
  admitSource?: string;
  /** PV1-20 (HL7 Table 0064). */
  financialClass?: string;
  /** The accession number of a case created during this encounter, if
   *  any - same real, non-PHI reasoning as MasterPatientRecord's own
   *  sourceAccession field. */
  sourceAccession?: string;
  createdAt: string;
  updatedAt: string;
  /** Real fix, Phase 4: the real, source-system event timestamp
   *  (EVN-2) of the most recent ADT event that actually updated this
   *  encounter's status - same real reasoning as
   *  MasterPatientRecord.lastEventAt (services/patients/): distinct
   *  from updatedAt, which only tracks when THIS system last wrote.
   *  A real, later-arriving ADT event carrying an earlier real
   *  timestamp must never revert a genuinely newer status (e.g. a
   *  stale, delayed "in progress" update arriving after a real,
   *  newer discharge). Optional: an encounter never updated via a
   *  real ADT status event genuinely has none yet.
   *
   *  Real bug found and fixed, per direct confirmation while working
   *  through the full list of ADT trigger events: this used to only
   *  ever be set by updateStatus()/updateLocation()/etc, never at
   *  creation time — meaning a brand-new encounter's very first
   *  follow-up event, even a genuinely stale/out-of-order one, was
   *  silently ALWAYS accepted, since every sequence-control check
   *  below only fires once this field is already set.
   *  resolveOrCreateEncounter() now accepts a real, optional
   *  eventTimestamp (the creating A01/A04/A05's own real EVN-2) and
   *  stamps this baseline immediately, closing that gap. */
  lastEventAt?: string;
}

export interface IEncounterService {
  getById(encounterId: string): Promise<ServiceResult<Encounter | null>>;

  /** Every real encounter recorded for a given patient, across their
   *  full history at this organisation - most-recent-first, matching
   *  how a real clinician reviewing a patient's visit history would
   *  want it ordered. */
  listForPatient(patientId: string): Promise<ServiceResult<Encounter[]>>;

  /** Real, direct lookup by the encounter's own external identifier
   *  (FIN/visit number) - the natural key an inbound ADT or order
   *  message actually carries, before any internal Encounter.id
   *  exists yet. */
  getByEncounterNumber(organisationId: string, encounterNumber: string): Promise<ServiceResult<Encounter | null>>;

  /** Real fix: creates a new encounter, or returns the existing real
   *  one if this exact (organisationId, encounterNumber) pair has
   *  already been recorded - never creates a silent duplicate for a
   *  repeat reference to the same real visit (e.g. two different
   *  specimens from the same admission, or a later order correcting
   *  an earlier one).
   *
   *  Real bug found and fixed, per direct confirmation while working
   *  through the full list of ADT trigger events: `eventTimestamp`
   *  (the real, source-system EVN-2 of the creating A01/A04/A05)
   *  establishes this encounter's real sequence-control baseline
   *  (Encounter.lastEventAt) at creation — see that field's own doc
   *  comment for the real gap this closes. Optional: `AccessionPage.tsx`'s
   *  manual accessioning call has no real ADT event timestamp to
   *  provide, and genuinely doesn't need one — the out-of-order-
   *  network-message risk this guards against is specific to real
   *  inbound ADT ingestion. */
  resolveOrCreateEncounter(input: {
    organisationId: string;
    patientId: string;
    encounterNumber: string;
    encounterClass: EncounterClass;
    status?: EncounterStatus;
    admitTime?: string;
    facility?: string;
    department?: string;
    ward?: string;
    room?: string;
    bed?: string;
    locationId?: string;
    attendingProvider?: string;
    sourceAccession?: string;
    eventTimestamp?: string;
  }): Promise<ServiceResult<Encounter>>;

  /** Real status transition - e.g. a real ADT^A03 (discharge) event
   *  updating a previously 'In-Progress' encounter. Deliberately
   *  narrow (status + optional dischargeTime/dischargeDisposition
   *  only) rather than a general update, since an encounter's other
   *  fields (class, identifiers) shouldn't silently change after the
   *  fact.
   *
   *  Real fix, Phase 4: eventTimestamp enforces the same real
   *  sequence-control discipline as
   *  IPatientIndexService.updateDemographics - a genuinely stale,
   *  out-of-order event (older than the encounter's current
   *  lastEventAt) is honestly rejected, never silently applied over
   *  newer state. `applied` in the real result tells a caller
   *  "changed" from "correctly ignored" apart. */
  updateStatus(
    encounterId: string,
    status: EncounterStatus,
    eventTimestamp: string,
    dischargeTime?: string,
    dischargeDisposition?: string
  ): Promise<ServiceResult<{ encounter: Encounter; applied: boolean }>>;

  /**
   * Real feature, per direct confirmation: working through the full
   * list of ADT trigger events — A02 (Transfer), A09/A10 (Patient
   * Tracking). Real, standard sequence-control discipline, same as
   * updateStatus: a genuinely stale, out-of-order event is honestly
   * rejected, never silently applied over newer state. Automatically
   * captures the encounter's current locationId as previousLocationId
   * before applying the new one — see Encounter.previousLocationId's
   * own doc comment for why (A12's real restore path).
   */
  updateLocation(
    encounterId: string,
    locationId: string,
    eventTimestamp: string
  ): Promise<ServiceResult<{ encounter: Encounter; applied: boolean }>>;

  /**
   * Real feature, per direct confirmation — A06 (Outpatient →
   * Inpatient), A07 (Inpatient → Outpatient). Same real
   * sequence-control discipline as updateStatus/updateLocation.
   * Deliberately narrow (class only) — an encounter's identifiers
   * shouldn't change via this path.
   */
  updateClass(
    encounterId: string,
    encounterClass: EncounterClass,
    eventTimestamp: string
  ): Promise<ServiceResult<{ encounter: Encounter; applied: boolean }>>;

  /**
   * Real feature, per direct confirmation — A08 (Update Patient/Visit
   * Information)'s real, non-movement metadata fields: attending
   * physician (PV1-7), hospital service (PV1-10), admit source
   * (PV1-14), financial class (PV1-20). Previously parsed but never
   * actually applied to the Encounter — this is the real, previously-
   * missing effect of an A08 beyond MPI demographics. Same
   * sequence-control discipline; only the fields genuinely present in
   * the update are changed, undefined fields are left as-is (an A08
   * carrying only a new attending shouldn't blank out an existing
   * hospital service).
   */
  updateMetadata(
    encounterId: string,
    changes: { attendingProvider?: string; hospitalService?: string; admitSource?: string; financialClass?: string },
    eventTimestamp: string
  ): Promise<ServiceResult<{ encounter: Encounter; applied: boolean }>>;

  /**
   * Real feature, per direct confirmation — A12 (Cancel Transfer):
   * restores Encounter.locationId from the real, captured
   * previousLocationId (see that field's own doc comment for why this
   * is more reliable than trusting the cancel message's own PV1-3/
   * PV1-6). Genuinely a no-op — `applied: false`, not an error — when
   * the encounter has no previousLocationId to restore (never
   * transferred, or already restored once).
   */
  cancelTransfer(
    encounterId: string,
    eventTimestamp: string
  ): Promise<ServiceResult<{ encounter: Encounter; applied: boolean }>>;
}
