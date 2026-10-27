// src/services/flags/shippedFlagNames.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 624: the flags PathScribe ships (the standard flag dictionary) show their name in the user's
// language on the worklist. A flag is data, so the stored name is never changed: this only looks the
// stored name up. A flag an admin created or renamed has a different name, so it shows as typed, and
// so do names that carry a result or a gene (BRAF V600E, PD-L1 CPS 15, VHL Mutation, ER / PR / HER2).
// Wording that comes from a scanner or an AI vendor is not translated at all (see
// digitalPathology/resolveWorklistDpBadges.ts).
// ─────────────────────────────────────────────────────────────────────────────

const SHIPPED_FLAG_NAME_KEYS: Record<string, string> = {
  "STAT — Rush Processing": 'flagNames.statRush',
  "Malignant": 'flagNames.malignant',
  "Second Opinion Requested": 'flagNames.secondOpinionRequested',
  "Clinical Correlation": 'flagNames.clinicalCorrelation',
  "Tumor Board Scheduled": 'flagNames.tumorBoardScheduled',
  "Amended": 'flagNames.amended',
  "QC Review": 'flagNames.qcReview',
  "Hold — Pending Info": 'flagNames.holdPendingInfo',
  "Discordant": 'flagNames.discordant',
  "Neuro-Oncology Consult": 'flagNames.neuroOncologyConsult',
  "Heme Oncology Notified": 'flagNames.hemeOncologyNotified',
  "Sarcoma Protocol": 'flagNames.sarcomaProtocol',
  "Pending Clinical Correlation": 'flagNames.pendingClinicalCorrelation',
  "Confidential — Restricted Printing": 'flagNames.confidentialRestrictedPrinting',
  "Intraoperative Consult": 'flagNames.intraoperativeConsult',
  "Legacy Urgent": 'flagNames.legacyUrgent',
  "Margins Involved": 'flagNames.marginsInvolved',
  "Insufficient Specimen": 'flagNames.insufficientSpecimen',
  "Frozen Section Correlation": 'flagNames.frozenSectionCorrelation',
  "Additional Levels Requested": 'flagNames.additionalLevelsRequested',
  "Decal in Progress": 'flagNames.decalInProgress',
  "Rejection Rule-Out": 'flagNames.rejectionRuleOut',
  "Trichrome Pending": 'flagNames.trichromePending',
  "Calcifications Noted": 'flagNames.calcificationsNoted',
  "Tumour Markers Ordered": 'flagNames.tumourMarkersOrdered',
  "IHC Panel": 'flagNames.ihcPanel',
  "Molecular Panel": 'flagNames.molecularPanel',
  "Molecular Profiling": 'flagNames.molecularProfiling',
  "Flow Cytometry": 'flagNames.flowCytometry',
  "Cytogenetics / FISH": 'flagNames.cytogeneticsFish',
  "Thyroid MDT": 'flagNames.thyroidMdt',
  "Gynaecology Oncology": 'flagNames.gynaecologyOncology',
  "Urology MDT": 'flagNames.urologyMdt',
  "Melanoma MDT": 'flagNames.melanomaMdt',
};

/** The flag's name for the screen: translated when it is a shipped name, as stored otherwise; undefined when there is no name. */
export function flagDisplayName(name: string | undefined, t: (key: string) => string): string | undefined {
  if (!name) return undefined;
  const key = SHIPPED_FLAG_NAME_KEYS[name.trim()];
  return key ? t(key) : name;
}

/** Every shipped flag name (for the test that each has its text). */
export const SHIPPED_FLAG_NAMES: readonly string[] = Object.keys(SHIPPED_FLAG_NAME_KEYS);
export const SHIPPED_FLAG_KEYS: readonly string[] = Object.values(SHIPPED_FLAG_NAME_KEYS);
