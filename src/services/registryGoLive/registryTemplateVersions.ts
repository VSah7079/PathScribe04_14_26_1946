// src/services/registryGoLive/registryTemplateVersions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 423 (Registry Engine SRS v2.1, step 7). Every registry definition,
// screening and cancer, is a versioned template: vYYYY.Q.X (year, quarter,
// release in that quarter). ForMedrixAI publishes a new version in a
// PathScribe release when a registry's specification changes; each version
// says how much changed and from when:
//
//   initial    the first version of the definition
//   editorial  wording or documentation only: a live lab carries on
//   minor      new optional content: a live lab carries on, but must
//              re-approve go-live within REGISTRY_MINOR_GRACE_DAYS of the
//              effective date; after that its live submissions are held
//   breaking   the registry won't accept the old content from the effective
//              date: live submissions are held from then until the lab
//              re-approves go-live against the new version
//
// Batch 424 (baseline vs overlay, Pete Oct 1 2026): each version lists what
// it changed (its change list, `changes`), by template element. A site's
// local customisations (code mappings, the engine adapter's local rules) are
// an overlay stamped with the version they were made against
// (registryOverlay.ts). So:
//   • a breaking change always needs re-approval (what PathScribe sends
//     changes for every site);
//   • a minor change needs it only when it touches an element the site has
//     customised (a minor version with no change list counts as touching
//     everything: unknown means check);
//   • an editorial change never does.
//
// Held, never dropped back to test (Pete, Oct 1 2026): a result is never sent
// to the test system by accident, and nothing is lost; held submissions show
// on the Registry Exceptions worklist and resend once go-live is re-approved.
//
// A lab may re-approve early, any time after a version is published.
// Pure.
// ─────────────────────────────────────────────────────────────────────────────

import { SCREENING_REGISTRY_DEFINITIONS } from '../screeningRegistry/screeningRegistryDefinitions';
import { CANCER_REGISTRY_DEFINITIONS } from '../cancerRegistry/cancerRegistryDefinitions';

export type RegistryDomain = 'screening' | 'cancer';
export type RegistryTemplateChangeClass = 'initial' | 'editorial' | 'minor' | 'breaking';

/** The parts of a registry template a version can change and a site can customise. */
export type RegistryTemplateElement =
  | 'codes:adequacy' | 'codes:primaryInterpretation' | 'codes:additionalInterpretation' | 'codes:recommendation'
  | 'identifier' | 'demographics' | 'diagnosis' | 'segments' | 'transport' | 'eligibility';
export const REGISTRY_TEMPLATE_ELEMENTS: readonly RegistryTemplateElement[] = [
  'codes:adequacy', 'codes:primaryInterpretation', 'codes:additionalInterpretation', 'codes:recommendation',
  'identifier', 'demographics', 'diagnosis', 'segments', 'transport', 'eligibility',
];

export interface RegistryTemplateChange {
  element: RegistryTemplateElement;
  changeClass: Exclude<RegistryTemplateChangeClass, 'initial'>;
  /** What changed, for the interface team (literal English: release notes, not screen text). */
  note: string;
}

export interface RegistryTemplateVersion {
  /** vYYYY.Q.X */
  version: string;
  changeClass: RegistryTemplateChangeClass;
  /** Batch 424: the change list. Absent on the first version. */
  changes?: RegistryTemplateChange[];
  /** When ForMedrixAI released it (YYYY-MM-DD). */
  publishedOn: string;
  /** When the registry starts expecting it (YYYY-MM-DD). */
  effectiveOn: string;
}

export const REGISTRY_TEMPLATE_VERSION_PATTERN = /^v(\d{4})\.([1-4])\.([1-9]\d*)$/;
export const REGISTRY_MINOR_GRACE_DAYS = 30;

export function parseRegistryTemplateVersion(version: string): { year: number; quarter: number; release: number } | null {
  const m = REGISTRY_TEMPLATE_VERSION_PATTERN.exec(version);
  return m ? { year: Number(m[1]), quarter: Number(m[2]), release: Number(m[3]) } : null;
}

/** Negative when a is older than b. Unparseable versions sort first. */
export function compareRegistryTemplateVersions(a: string, b: string): number {
  const pa = parseRegistryTemplateVersion(a);
  const pb = parseRegistryTemplateVersion(b);
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  return pa.year - pb.year || pa.quarter - pb.quarter || pa.release - pb.release;
}

/** Every definition starts at the version this batch introduced. */
const INITIAL_VERSION: RegistryTemplateVersion = { version: 'v2026.4.1', changeClass: 'initial', publishedOn: '2026-10-01', effectiveOn: '2026-10-01' };

export const registryTemplateKey = (domain: RegistryDomain, registryId: string) => `${domain}:${registryId}`;

/** Each registry's published versions, oldest first. A new version is appended here in a release. */
export const REGISTRY_TEMPLATE_HISTORY: Readonly<Record<string, readonly RegistryTemplateVersion[]>> = Object.fromEntries([
  ...SCREENING_REGISTRY_DEFINITIONS.map(d => [registryTemplateKey('screening', d.id), [INITIAL_VERSION]] as const),
  ...CANCER_REGISTRY_DEFINITIONS.map(d => [registryTemplateKey('cancer', d.id), [INITIAL_VERSION]] as const),
]);

export function registryTemplateHistory(domain: RegistryDomain, registryId: string): readonly RegistryTemplateVersion[] {
  return REGISTRY_TEMPLATE_HISTORY[registryTemplateKey(domain, registryId)] ?? [];
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (day: string, days: number) => isoDay(new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000));

/** The newest version published on or before today; the first version always counts (it shipped with the definition). */
export function latestRegistryTemplateVersion(history: readonly RegistryTemplateVersion[], today: Date): RegistryTemplateVersion | undefined {
  const day = isoDay(today);
  return [...history].filter((v, i) => i === 0 || v.publishedOn <= day).sort((a, b) => compareRegistryTemplateVersions(a.version, b.version)).pop();
}

/** The day from which live submissions on an older version are held because of this version; none for editorial changes. */
export function registryTemplateHoldsFrom(v: RegistryTemplateVersion): string | null {
  if (v.changeClass === 'breaking') return v.effectiveOn;
  if (v.changeClass === 'minor') return addDays(v.effectiveOn, REGISTRY_MINOR_GRACE_DAYS);
  return null;
}

export type RegistryLiveState = 'notApproved' | 'current' | 'reapprovalDue' | 'expired';

export interface RegistryLiveStatus {
  state: RegistryLiveState;
  approvedVersion?: string;
  latest?: RegistryTemplateVersion;
  /** The version that makes re-approval due, or that holds submissions. */
  blockingVersion?: RegistryTemplateVersion;
  /** The day live submissions are held from (due) or have been held since (expired). */
  holdsFrom?: string;
}

/** Batch 424: does a version need re-approval for a site with these customised elements? */
export function versionNeedsReapproval(v: RegistryTemplateVersion, customised: readonly RegistryTemplateElement[]): boolean {
  if (v.changeClass === 'breaking') return true;
  if (v.changeClass !== 'minor') return false;
  if (!v.changes?.length) return true;
  return v.changes.some(c => c.changeClass !== 'editorial' && customised.includes(c.element));
}

/** The versions after `fromVersion`, published by today. */
export function versionsSince(fromVersion: string, history: readonly RegistryTemplateVersion[], today: Date): RegistryTemplateVersion[] {
  const day = isoDay(today);
  return history.filter(v => v.publishedOn <= day && compareRegistryTemplateVersions(v.version, fromVersion) > 0);
}

/**
 * Whether a live go-live approval for a template version still lets results
 * go to the live register today. Only versions newer than the approved one
 * and already published count; the earliest hold date among them decides.
 * Batch 424: a minor version counts only when it touches what the site
 * customised (`customised`; omitted = assume everything).
 */
export function registryLiveStatus(approvedVersion: string | undefined, history: readonly RegistryTemplateVersion[], today: Date, customised: readonly RegistryTemplateElement[] = REGISTRY_TEMPLATE_ELEMENTS): RegistryLiveStatus {
  const latest = latestRegistryTemplateVersion(history, today);
  if (!approvedVersion) return { state: 'notApproved', latest };
  const day = isoDay(today);
  let blocking: { version: RegistryTemplateVersion; holdsFrom: string } | undefined;
  for (const v of history) {
    if (v.publishedOn > day || compareRegistryTemplateVersions(v.version, approvedVersion) <= 0) continue;
    const holdsFrom = versionNeedsReapproval(v, customised) ? registryTemplateHoldsFrom(v) : null;
    if (holdsFrom && (!blocking || holdsFrom < blocking.holdsFrom)) blocking = { version: v, holdsFrom };
  }
  if (!blocking) return { state: 'current', approvedVersion, latest };
  return {
    state: day >= blocking.holdsFrom ? 'expired' : 'reapprovalDue',
    approvedVersion, latest, blockingVersion: blocking.version, holdsFrom: blocking.holdsFrom,
  };
}
