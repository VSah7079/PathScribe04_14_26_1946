// src/pages/SynopticReportPage/components/AutopsyCaseTimeline.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 476 (PS-261 follow-up, Module 4) — renders the real, unified
// timeline buildAutopsyCaseTimeline.ts assembles from the case's own
// existing autopsy records. Per-kind rendering, same reasoning as
// DispatchHistoryTimeline.tsx: the kinds carry genuinely different
// fields, so each gets its own real label/detail line rather than a
// generic, lowest-common-denominator row.
//
// No data-phi tagging here: every name this shows (orderedByName,
// releasedByName, signedBy.name, consentingRelativeName) is a staff
// or next-of-kin name already shown untagged elsewhere on this same
// autopsy section (custody log, toxicology orders,
// AutopsyAuthorizationCompletionForm.tsx's own "on file" line) —
// never a patient identifier. Consistent with the existing pattern,
// not introducing a new one.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatDateTime } from '@/utils/formatDate';
import type { AutopsyTimelineEntry } from '@/services/autopsy/buildAutopsyCaseTimeline';
import { AUTOPSY_ORGAN_LABEL_KEY } from '@/pages/AccessionPage/autopsyOrganLabelKeys';

interface Props {
  entries: AutopsyTimelineEntry[];
}

const AutopsyCaseTimeline: React.FC<Props> = ({ entries }) => {
  const { t, i18n } = useTranslation();

  if (entries.length === 0) {
    return <p className="ps-conf-section-subtitle">{t('synopticReportPage.autopsy.timeline.empty')}</p>;
  }

  return (
    <div className="ps-autopsy-timeline">
      {entries.map(entry => (
        <div className="ps-autopsy-timeline-entry" key={entry.id}>
          <div className="ps-autopsy-timeline-entry__line">{renderEntryLine(entry, t)}</div>
          <div className="ps-autopsy-timeline-entry__meta">{formatDateTime(entry.occurredAt, i18n.language)}</div>
        </div>
      ))}
    </div>
  );
};

function renderEntryLine(entry: AutopsyTimelineEntry, t: (key: string, opts?: Record<string, unknown>) => string): string {
  switch (entry.kind) {
    case 'forensic_verbal_order':
      return t('synopticReportPage.autopsy.timeline.entries.forensicVerbalOrder', { name: entry.actorName ?? t('synopticReportPage.autopsy.timeline.unknownActor') });
    case 'forensic_written_order':
      return t('synopticReportPage.autopsy.timeline.entries.forensicWrittenOrder', { reference: entry.itemDescription });
    case 'hospital_consent_given':
      return t('synopticReportPage.autopsy.timeline.entries.hospitalConsentGiven', { name: entry.actorName ?? t('synopticReportPage.autopsy.timeline.unknownActor') });
    case 'hospital_consent_status_change':
      return t('synopticReportPage.autopsy.timeline.entries.hospitalConsentStatusChange', {
        status: entry.consentStatus ? t(`synopticReportPage.autopsy.consent.status.${entry.consentStatus}`) : '',
      });
    case 'custody_transfer':
      return t('synopticReportPage.autopsy.timeline.entries.custodyTransfer', {
        item: entry.itemDescription,
        from: entry.fromCustodianName,
        to: entry.toCustodianName,
      });
    case 'toxicology_ordered':
      return t('synopticReportPage.autopsy.timeline.entries.toxicologyOrdered', { barcode: entry.itemDescription });
    case 'toxicology_resulted':
      return t('synopticReportPage.autopsy.timeline.entries.toxicologyResulted', { barcode: entry.itemDescription });
    case 'toxicology_cancelled':
      return t('synopticReportPage.autopsy.timeline.entries.toxicologyCancelled', { barcode: entry.itemDescription });
    case 'organ_retention_detail_recorded':
      return t('synopticReportPage.autopsy.timeline.entries.organRetentionDetailRecorded', { recipient: entry.itemDescription, location: entry.note });
    case 'organ_retention_disposal':
      return t('synopticReportPage.autopsy.timeline.entries.organRetentionDisposal', {
        method: entry.disposalMethod ? t(`synopticReportPage.autopsy.disposal.methods.${entry.disposalMethod}`) : '',
      });
    case 'ancillary_hold_started':
      return t('synopticReportPage.autopsy.timeline.entries.ancillaryHoldStarted');
    case 'ancillary_hold_ended':
      return t('synopticReportPage.autopsy.timeline.entries.ancillaryHoldEnded');
    case 'report_signed':
      return t('synopticReportPage.autopsy.timeline.entries.reportSigned', { tier: entry.reportTier, name: entry.actorName });
    case 'organ_tag_recorded':
      return t('synopticReportPage.autopsy.timeline.entries.organTagRecorded', {
        organ: entry.organCode ? t(AUTOPSY_ORGAN_LABEL_KEY[entry.organCode]) : '',
        status: entry.organTagStatus ? t(`synopticReportPage.autopsy.organTag.status.${entry.organTagStatus}`) : '',
      });
    case 'gate_overridden':
      return t('synopticReportPage.autopsy.timeline.entries.gateOverridden', { tier: entry.reportTier, name: entry.actorName, reason: entry.reason });
    case 'addendum_added':
      return t('synopticReportPage.autopsy.timeline.entries.addendumAdded', { name: entry.actorName });
    default:
      return '';
  }
}

export default AutopsyCaseTimeline;
