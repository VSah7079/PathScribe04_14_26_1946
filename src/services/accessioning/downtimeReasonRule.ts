// src/services/accessioning/downtimeReasonRule.ts
// Batch 658: a downtime accession must say why the system was down (the field is marked required on the screen).
export function isDowntimeReasonMissing(isDowntimeAccession: boolean, reasonCode: string | null | undefined): boolean {
  return isDowntimeAccession && !(reasonCode ?? '').trim();
}
