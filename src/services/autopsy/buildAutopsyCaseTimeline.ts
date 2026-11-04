// src/services/autopsy/buildAutopsyCaseTimeline.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 476 (PS-261 follow-up, Module 4 of the FE feature-complete
// plan) — a single, unified, chronological view of everything that
// has actually happened on an autopsy case, pulled from the real,
// existing per-topic records this module already keeps
// (ForensicAuthorization, HospitalConsentRecord, custodyLog,
// toxicologyOrders, organRetentionDetail/Disposal, AncillaryHoldState,
// padSnapshot/fadSnapshot, addenda) rather than a new, parallel event
// log. This module has no case-wide clinical event store to feed off
// of — the system-wide auditlog (services/auditlog/) is a compliance
// log of system/user ACTIONS, not a clinical timeline, and the
// case/dispatch-history timeline pattern (DispatchHistoryTimeline.tsx)
// is fed by a Firestore-backed notifications collection this module
// has no reason to write into (CLAUDE.md: production is SQL Server;
// don't extend the firestore* stubs). So this is a pure, synchronous
// read-model built directly off the AutopsyCaseDetails already in
// memory on the page — same "pure selector, service-file-owns-its-
// data-shape" pattern as custodyEventsForToxicologyOrder.ts
// (recordAutopsyCustodyTransfer.ts) — never a second, persisted
// timeline record that could drift from the real, underlying fields.
//
// Deliberately read-only and additive-free: nothing here writes
// anything. Every entry is derived, every time, from whatever is
// currently on the case, so there is nothing to keep in sync.
//
// Known, disclosed limitation (not fixed here — no write site exists
// for it today): HospitalConsentRecord keeps only the CURRENT
// status/statusChangedAt, not a history of every narrowing/revocation/
// reinstatement in order (same limitation recordAutopsyConsentStatusChange.ts
// and recordAutopsyConsentReinstatement.ts already have — see their own
// header comments). This timeline can therefore only ever show the
// single most recent consent status change, not the full sequence of
// changes, until those write sites themselves grow an append-only log.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AutopsyCaseDetails,
  AutopsyReportTier,
  HospitalConsentStatus,
  AutopsyOrganTagStatus,
} from '@/types/autopsy/AutopsyCaseDetails';
import type { AutopsyOrganCode } from '@/types/autopsy/AutopsyOrganCode';

export type AutopsyTimelineEntryKind =
  | 'forensic_verbal_order'
  | 'forensic_written_order'
  | 'hospital_consent_given'
  | 'hospital_consent_status_change'
  | 'custody_transfer'
  | 'toxicology_ordered'
  | 'toxicology_resulted'
  | 'toxicology_cancelled'
  | 'organ_retention_detail_recorded'
  | 'organ_retention_disposal'
  | 'ancillary_hold_started'
  | 'ancillary_hold_ended'
  | 'report_signed'
  /** Batch 478 (PS-261 follow-up). */
  | 'organ_tag_recorded'
  /** Batch 478 — resolveAutopsyGrossExaminationGate.ts's audited
   *  override, never silent. */
  | 'gate_overridden'
  | 'addendum_added';

export interface AutopsyTimelineEntry {
  /** Stable within one build of the timeline — derived from the
   *  source record's own id where one exists, otherwise a fixed
   *  per-kind id (there's only ever one of that kind on a case). Not
   *  a real persisted id of its own — this entry is a read-model, not
   *  a stored record. */
  id: string;
  occurredAt: string;
  kind: AutopsyTimelineEntryKind;
  actorName?: string;
  itemDescription?: string;
  fromCustodianName?: string;
  toCustodianName?: string;
  consentStatus?: HospitalConsentStatus;
  reportTier?: AutopsyReportTier;
  disposalMethod?: string;
  reason?: string;
  note?: string;
  /** organ_tag_recorded only. */
  organCode?: AutopsyOrganCode;
  organTagStatus?: AutopsyOrganTagStatus;
}

/**
 * Real, unified case timeline — every dated event already recorded
 * anywhere on `details`, merged into one list and sorted newest-first
 * (same convention fetchDispatchHistoryForCase.ts already uses for a
 * case-level history view). Entries with no real timestamp on file
 * (e.g. a toxicology order never resulted) are simply never added —
 * never a placeholder "unknown date" row.
 */
export function buildAutopsyCaseTimeline(details: AutopsyCaseDetails | undefined): AutopsyTimelineEntry[] {
  if (!details) return [];
  const entries: AutopsyTimelineEntry[] = [];

  const forensic = details.forensicAuthorization;
  if (forensic?.verbalOrderReceivedAt) {
    entries.push({
      id: 'forensic-verbal-order',
      occurredAt: forensic.verbalOrderReceivedAt,
      kind: 'forensic_verbal_order',
      actorName: forensic.verbalOrderReceivedFrom,
    });
  }
  if (forensic?.orderDate) {
    entries.push({
      id: 'forensic-written-order',
      occurredAt: forensic.orderDate,
      kind: 'forensic_written_order',
      itemDescription: forensic.orderReference,
    });
  }

  const consent = details.hospitalConsent;
  if (consent?.consentGivenAt) {
    entries.push({
      id: 'hospital-consent-given',
      occurredAt: consent.consentGivenAt,
      kind: 'hospital_consent_given',
      actorName: consent.consentingRelativeName,
    });
  }
  if (consent?.statusChangedAt) {
    entries.push({
      id: 'hospital-consent-status-change',
      occurredAt: consent.statusChangedAt,
      kind: 'hospital_consent_status_change',
      consentStatus: consent.status,
      note: consent.revocationNote,
    });
  }

  (details.custodyLog ?? []).forEach(event => {
    entries.push({
      id: `custody-${event.id}`,
      occurredAt: event.occurredAt,
      kind: 'custody_transfer',
      itemDescription: event.itemDescription,
      fromCustodianName: event.fromCustodianName,
      toCustodianName: event.toCustodianName,
      actorName: event.releasedByName,
    });
  });

  (details.toxicologyOrders ?? []).forEach(order => {
    entries.push({
      id: `toxicology-ordered-${order.id}`,
      occurredAt: order.orderedAt,
      kind: 'toxicology_ordered',
      actorName: order.orderedByName,
      itemDescription: order.specimenBarcode,
    });
    if (order.resultedAt) {
      entries.push({
        id: `toxicology-resulted-${order.id}`,
        occurredAt: order.resultedAt,
        kind: 'toxicology_resulted',
        itemDescription: order.specimenBarcode,
        note: order.resultSummary,
      });
    }
    if (order.cancelledAt) {
      entries.push({
        id: `toxicology-cancelled-${order.id}`,
        occurredAt: order.cancelledAt,
        kind: 'toxicology_cancelled',
        itemDescription: order.specimenBarcode,
        reason: order.cancelReason,
      });
    }
  });

  // Batch 611 (#59): every custody move when the history exists; the single
  // current detail for a case recorded before the history was kept.
  const retentionRecords = details.organRetentionHistory?.length
    ? details.organRetentionHistory
    : details.organRetentionDetail ? [details.organRetentionDetail] : [];
  retentionRecords.forEach((retentionDetail, i) => {
    if (!retentionDetail.recordedAt) return;
    entries.push({
      id: i === 0 && !details.organRetentionHistory?.length ? 'organ-retention-detail' : `organ-retention-detail-${i}`,
      occurredAt: retentionDetail.recordedAt,
      kind: 'organ_retention_detail_recorded',
      actorName: retentionDetail.recordedByName,
      itemDescription: retentionDetail.recipientName,
      note: retentionDetail.location,
    });
  });

  const disposal = details.organRetentionDisposal;
  if (disposal?.disposalTimestamp) {
    entries.push({
      id: 'organ-retention-disposal',
      occurredAt: disposal.disposalTimestamp,
      kind: 'organ_retention_disposal',
      actorName: disposal.recordedByName,
      disposalMethod: disposal.disposalMethod,
      itemDescription: disposal.certificateReference,
    });
  }

  const hold = details.ancillaryHold;
  if (hold?.startedAt) {
    entries.push({
      id: 'ancillary-hold-started',
      occurredAt: hold.startedAt,
      kind: 'ancillary_hold_started',
      reason: hold.reason,
    });
  }
  if (hold?.endedAt) {
    entries.push({
      id: 'ancillary-hold-ended',
      occurredAt: hold.endedAt,
      kind: 'ancillary_hold_ended',
    });
  }

  if (details.padSnapshot) {
    entries.push({
      id: 'pad-signed',
      occurredAt: details.padSnapshot.signedAt,
      kind: 'report_signed',
      reportTier: 'PAD',
      actorName: details.padSnapshot.signedBy.name,
    });
  }
  if (details.fadSnapshot) {
    entries.push({
      id: 'fad-signed',
      occurredAt: details.fadSnapshot.signedAt,
      kind: 'report_signed',
      reportTier: 'FAD',
      actorName: details.fadSnapshot.signedBy.name,
    });
  }

  (details.organTags ?? []).forEach(tag => {
    entries.push({
      id: `organ-tag-${tag.id}`,
      occurredAt: tag.recordedAt,
      kind: 'organ_tag_recorded',
      actorName: tag.recordedByName,
      organCode: tag.organCode,
      organTagStatus: tag.status,
      note: tag.finding,
    });
  });

  (details.gateOverrides ?? []).forEach(override => {
    entries.push({
      id: `gate-override-${override.id}`,
      occurredAt: override.occurredAt,
      kind: 'gate_overridden',
      actorName: override.overriddenByName,
      reportTier: override.tier,
      reason: override.reason,
    });
  });

  (details.addenda ?? []).forEach(addendum => {
    entries.push({
      id: `addendum-${addendum.id}`,
      occurredAt: addendum.addedAt,
      kind: 'addendum_added',
      actorName: addendum.addedBy.name,
      reason: addendum.reason,
    });
  });

  return entries.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
