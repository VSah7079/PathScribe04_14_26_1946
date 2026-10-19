// src/services/interfaceDictionary/scopeGuard.ts
// ─────────────────────────────────────────────────
// Batch 612: what a mapping may reach, and what needs a code release. Pure.
//
// A vendor profile can add fields next to a case (`ext.<name>`). It cannot write
// into the case's own structure: the patient, the order and accession, the
// specimens and material, the diagnosis and report, signatures, billing. Those
// carry rules (sign-out, release, amendment, retention, privacy) that a field
// mapping would bypass, so changing them is a development task, not a
// configuration one. The guard refuses such a target at the moment it is typed,
// and again at test and publish time, and says why.
// ─────────────────────────────────────────────────

/** The start of every extension target. */
export const EXTENSION_PREFIX = 'ext.';

const EXTENSION_NAME = /^[a-z][A-Za-z0-9]{0,39}$/;

/** The first part of a target that names the case's own structure. Case-insensitive; plural forms count. */
export const CORE_STRUCTURE_ROOTS: readonly string[] = [
  'case', 'patient', 'order', 'accession', 'specimen', 'material', 'block', 'cassette', 'slide', 'container',
  'diagnostic', 'diagnosis', 'synoptic', 'microscopic', 'gross', 'report', 'result', 'signature', 'signout',
  'amendment', 'addendum', 'correction', 'billing', 'charge', 'cpt', 'icd', 'snomed', 'status', 'workflow',
  'facility', 'physician', 'pathologist', 'audit', 'hold', 'retention', 'consent', 'flag',
];

export type TargetRefusal = 'EMPTY' | 'CORE_STRUCTURE' | 'NOT_AN_EXTENSION' | 'BAD_NAME';

/** Whether a target may be written by a mapping (null) or why it may not. */
export function targetRefusal(target: string): TargetRefusal | null {
  const text = (target ?? '').trim();
  if (!text) return 'EMPTY';
  const root = text.split('.')[0].replace(/\[.*$/, '').toLowerCase();
  const plain = root.replace(/s$/, '');
  if (CORE_STRUCTURE_ROOTS.includes(root) || CORE_STRUCTURE_ROOTS.includes(plain)) return 'CORE_STRUCTURE';
  if (!text.startsWith(EXTENSION_PREFIX)) return 'NOT_AN_EXTENSION';
  return EXTENSION_NAME.test(text.slice(EXTENSION_PREFIX.length)) ? null : 'BAD_NAME';
}

/** What the mapping tool handles by configuration (ids for the screen's translated list). */
export const SCOPE_HANDLED_BY_MAPPER = [
  'zSegmentFields', 'extraJsonFields', 'codeTranslation', 'dateFormats', 'displayLabels', 'requiredChecks', 'versioning',
] as const;

/** What still needs a code release (ids for the screen's translated list). */
export const SCOPE_NEEDS_CODE_RELEASE = [
  'patientIdentity', 'orderAndAccession', 'specimenAndMaterial', 'diagnosisAndReport', 'signatureAndRelease',
  'billingRules', 'newMessageTypes', 'newWorkflowRules',
] as const;

export type ScopeHandledId = (typeof SCOPE_HANDLED_BY_MAPPER)[number];
export type ScopeReleaseId = (typeof SCOPE_NEEDS_CODE_RELEASE)[number];
