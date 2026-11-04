// src/services/accessioning/downtimeReasonRule.ts
// Batch 658: a downtime accession must say why the system was down (the field is marked required on the screen).
// Batch 712 (Pete, Oct 28, 2026: "Downtime Reason, if required should block, else is not required. Block accession
// until properly filled"): the reason is a required field like any other. Required only while the intake type is
// Temporary / Downtime; it then holds back Next and Submit Accession and is named in the "Still required" line.
export const DOWNTIME_REASON_FIELD_ID = 'downtimeReason';

export function isDowntimeReasonMissing(isDowntimeAccession: boolean, reasonCode: string | null | undefined): boolean {
  return isDowntimeAccession && !(reasonCode ?? '').trim();
}

/** Ids (locale key `fieldRequirements.fields.accession.<id>`) of the downtime fields still to fill; empty when none. */
export function missingDowntimeReasonFieldIds(isDowntimeAccession: boolean, reasonCode: string | null | undefined): string[] {
  return isDowntimeReasonMissing(isDowntimeAccession, reasonCode) ? [DOWNTIME_REASON_FIELD_ID] : [];
}
