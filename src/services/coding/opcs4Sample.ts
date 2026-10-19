// src/services/coding/opcs4Sample.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 607 (#139, #183): OPCS-4 is licensed by NHS Digital (TRUD) and is not bundled. Until a licence and the server
// feed are in place, the OPCS-4 tab shows a notice and this short reference list. The list is a SAMPLE for orientation,
// labelled Simulated, and cannot be applied to a case.
// ─────────────────────────────────────────────────────────────────────────────

export const OPCS4_SAMPLE: readonly { code: string; display: string }[] = [
  { code: 'H07', display: 'Right hemicolectomy' },
  { code: 'J18', display: 'Cholecystectomy' },
  { code: 'M61', display: 'Total excision of prostate' },
  { code: 'Q07', display: 'Abdominal excision of uterus' },
  { code: 'T20', display: 'Primary repair of inguinal hernia' },
];
