// src/services/researchCases/researchCaseRules.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 728 (Lab Workflow & Batch spec, Decision 4): the research workaround.
// Until unaccessioned, de-identified research items exist (a later phase), a
// research specimen is accessioned as a case against a dummy research patient.
// The lab sets how those cases are recognised (Configuration → System →
// Research cases): accession prefixes, the dummy patient's MRN prefixes, the
// no-charge financial class sent for them, and how long their material is kept.
//
// A research case is then:
//   • left out of the clinical worklists (worklistTileCounts.ts) and of the
//     TAT, volume and quality figures (Contribution dashboards);
//   • never sent to the EHR as a result, nor delivered by fax or file drop;
//   • never sent to billing as a charge; its financial-class message carries
//     the no-charge class;
//   • kept for its own retention period from accessioning, then listed on the
//     Disposal queue (it has no signed clinical report to count from).
// Pure: the settings are passed in, or read from the lab settings store.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResearchCaseSettings {
  /** Off: no case is treated as a research case. */
  enabled: boolean;
  /** Accession prefixes that mark a research case (matched without regard to case). */
  accessionPrefixes: string[];
  /** MRN prefixes of the dummy research patient(s) (matched without regard to case). */
  mrnPrefixes: string[];
  /** The financial class sent for a research case. */
  noChargeFinancialClass: string;
  /** Days the material of a research case is kept after accessioning before it is listed for disposal. */
  retentionDays: number;
}

export const DEFAULT_RESEARCH_CASE_SETTINGS: ResearchCaseSettings = {
  enabled: true,
  accessionPrefixes: ['RES'],
  mrnPrefixes: ['RSCH-'],
  noChargeFinancialClass: 'Research - No Charge',
  retentionDays: 365,
};

export const RESEARCH_RETENTION_MAX_DAYS = 36500;

export type ResearchSettingsProblem = 'noMarker' | 'financialClassRequired' | 'retentionDaysInvalid' | 'prefixInvalid';

/** Trims, drops empty and repeated prefixes (case-insensitive), keeps the order. */
export function normalisePrefixes(list: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const p = raw.trim();
    if (!p || seen.has(p.toUpperCase())) continue;
    seen.add(p.toUpperCase());
    out.push(p);
  }
  return out;
}

export function normaliseResearchSettings(s: Partial<ResearchCaseSettings> | null | undefined): ResearchCaseSettings {
  const d = DEFAULT_RESEARCH_CASE_SETTINGS;
  return {
    enabled: typeof s?.enabled === 'boolean' ? s.enabled : d.enabled,
    accessionPrefixes: Array.isArray(s?.accessionPrefixes) ? normalisePrefixes(s.accessionPrefixes) : d.accessionPrefixes,
    mrnPrefixes: Array.isArray(s?.mrnPrefixes) ? normalisePrefixes(s.mrnPrefixes) : d.mrnPrefixes,
    noChargeFinancialClass: typeof s?.noChargeFinancialClass === 'string' ? s.noChargeFinancialClass.trim() : d.noChargeFinancialClass,
    retentionDays: typeof s?.retentionDays === 'number' ? s.retentionDays : d.retentionDays,
  };
}

/** What stops the settings from being saved. When on, at least one prefix is needed, or nothing would ever match. */
export function researchSettingsProblems(s: ResearchCaseSettings): ResearchSettingsProblem[] {
  const out: ResearchSettingsProblem[] = [];
  const prefixes = [...s.accessionPrefixes, ...s.mrnPrefixes];
  if (prefixes.some(p => /\s/.test(p.trim()) || p.trim().length > 20)) out.push('prefixInvalid');
  if (s.enabled && normalisePrefixes(prefixes).length === 0) out.push('noMarker');
  if (s.enabled && !s.noChargeFinancialClass.trim()) out.push('financialClassRequired');
  if (!Number.isInteger(s.retentionDays) || s.retentionDays < 0 || s.retentionDays > RESEARCH_RETENTION_MAX_DAYS) out.push('retentionDaysInvalid');
  return out;
}

/** The fields of a case this check reads. */
export interface ResearchCaseLike {
  accession?: { accessionPrefix?: string; fullAccession?: string; accessionNumber?: string; accessionedAt?: string } | null;
  patient?: { mrn?: string } | null;
}

const startsWithAny = (value: string | undefined, prefixes: readonly string[]) => {
  const v = (value ?? '').trim().toUpperCase();
  return v !== '' && prefixes.some(p => p.trim() !== '' && v.startsWith(p.trim().toUpperCase()));
};

/** Whether a case is a research case under the lab's settings. */
export function isResearchCase(c: ResearchCaseLike | null | undefined, s: ResearchCaseSettings): boolean {
  if (!c || !s.enabled) return false;
  const a = c.accession;
  const prefixHit = s.accessionPrefixes.some(p => (a?.accessionPrefix ?? '').trim().toUpperCase() === p.trim().toUpperCase())
    || startsWithAny(a?.fullAccession ?? a?.accessionNumber, s.accessionPrefixes);
  return prefixHit || startsWithAny(c.patient?.mrn, s.mrnPrefixes);
}

/** The cases that are not research cases. */
export function withoutResearchCases<T extends ResearchCaseLike>(cases: readonly T[], s: ResearchCaseSettings): T[] {
  if (!s.enabled) return [...cases];
  return cases.filter(c => !isResearchCase(c, s));
}

/** When a research case's material may be disposed of: accessioning plus the retention days. Undefined without an accessioning date. */
export function researchDisposalEligibleDate(c: ResearchCaseLike, s: ResearchCaseSettings): Date | undefined {
  const at = c.accession?.accessionedAt;
  if (!at) return undefined;
  const t = new Date(at).getTime();
  if (Number.isNaN(t)) return undefined;
  return new Date(t + s.retentionDays * 86_400_000);
}

/** A comma-separated list as typed on the settings screen, as prefixes. */
export const parsePrefixList = (text: string): string[] => normalisePrefixes(text.split(','));

/** Prefixes as shown in the settings field. */
export const formatPrefixList = (list: readonly string[]): string => list.join(', ');
