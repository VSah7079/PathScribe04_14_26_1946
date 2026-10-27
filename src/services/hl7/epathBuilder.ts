// src/services/hl7/epathBuilder.ts
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800): the base US electronic pathology (ePath) message, HL7 v2.5.1 ORU^R01, the
// NPCR ePath shape: MSH, PID, PV1, ORC, OBR, SPM (one per specimen) and OBX (final diagnosis, ICD-O-3 and
// SNOMED codes), with the report status and the performing laboratory on every result. A STATE PROFILE
// (services/usEpath/epathProfile.ts) then sets the state's own values in named fields. Pure; no clock, no storage.
//
// Scope, stated plainly: this builds the message PathScribe checks a case against before it is released (a field
// the state requires that is empty is found here) and shows in the preview. The interface engine owns the wire:
// its translation and transport are the real send (docs/architecture/US_EPATH_API.md). The OBX identifiers below
// are DEFAULTS, written from the NPCR implementation guide's structure; every one is replaceable by a profile
// extension and must be confirmed against the guide and each state's specification before a real send.
// Patient address is message content (PID-11); it never decides which state receives the report (usEpath/epathRouting.ts).
// ─────────────────────────────────────────────────────────────────────
import { HL7_FIELD_SEP, type HL7MessageContext } from './types';
import { buildMSH, buildPV1, buildSPM, toHL7Date, toHL7Timestamp } from './segmentBuilders';
import type { EpathExtension } from '../usEpath/epathProfile';

export type EpathReportStatus = 'final' | 'corrected' | 'preliminary';
export interface EpathAddress { street?: string; city?: string; state?: string; zip?: string }
export interface EpathCode { code: string; description?: string }

export interface EpathSpecimenFacts {
  id: string;
  type?: string;
  site?: string;
  collectedAt?: string;
  icdO: EpathCode[];
  snomed: EpathCode[];
}

/** Everything the message is made from, read from the case by prepareEpathSubmission. */
export interface EpathFacts {
  messageControlId?: string;
  patient: { mrn?: string; firstName: string; lastName: string; dateOfBirth?: string; sex?: 'M' | 'F' | 'U' | 'I'; address?: EpathAddress };
  accessionNumber: string;
  reportStatus: EpathReportStatus;
  signedOutAt?: string;
  finalDiagnosis: string;
  orderingProvider?: { npi?: string; lastName?: string; firstName?: string };
  /** The laboratory the message names as the performer (OBX-15, OBX-23, OBX-24). */
  performingFacility: { id: string; name: string; clia?: string; address?: EpathAddress };
  specimens: EpathSpecimenFacts[];
}

/** The defaults. Replaceable per state through a profile extension; to confirm against the implementation guide. */
export const EPATH_DEFAULTS = {
  messageType: 'ORU^R01^ORU_R01',
  serviceId: '11529-5^Surgical pathology study^LN',
  finalDiagnosisId: '22637-3^Pathology report final diagnosis^LN',
  icdOId: 'ICDO3^ICD-O-3 code^L',
  snomedId: 'SNOMED^SNOMED CT code^L',
  icdOSystem: 'ICDO3',
  snomedSystem: 'SCT',
} as const;

export const EPATH_RESULT_STATUS: Record<EpathReportStatus, string> = { final: 'F', corrected: 'C', preliminary: 'P' };

/** One segment as numbered fields: fields[n] is field n (MSH is built whole and never edited by a profile). */
interface Seg { id: string; fields: string[] }

/** HL7 escaping for free text and for each component of a coded value. */
export const escapeHl7 = (s: string): string =>
  s.replace(/\\/g, '\\E\\').replace(/\|/g, '\\F\\').replace(/\^/g, '\\S\\').replace(/~/g, '\\R\\').replace(/&/g, '\\T\\').replace(/[\r\n]+/g, ' ');

const xad = (a?: EpathAddress): string =>
  a ? [a.street, '', a.city, a.state, a.zip, 'USA'].map(x => escapeHl7(x ?? '')).join('^') : '';
/** A date of birth is a calendar date, not an instant: a plain YYYY-MM-DD is written as it is, never shifted by a time zone. */
const dobField = (tz: string, dob?: string): string => (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob.replace(/-/g, '') : toHL7Date(tz, dob));
const coded = (c: EpathCode, system: string): string => [c.code, c.description ?? '', system].map(escapeHl7).join('^');

const seg = (id: string, fields: Record<number, string>): Seg => {
  const max = Math.max(0, ...Object.keys(fields).map(Number));
  return { id, fields: Array.from({ length: max + 1 }, (_, i) => (i === 0 ? id : fields[i] ?? '')) };
};
const fromLine = (line: string): Seg => { const parts = line.split(HL7_FIELD_SEP); return { id: parts[0], fields: parts }; };
const render = (s: Seg): string => s.fields.join(HL7_FIELD_SEP);

const setField = (s: Seg, n: number, value: string) => { while (s.fields.length <= n) s.fields.push(''); s.fields[n] = value; };

/** Where a profile's 'fixed' extensions put their value. A field path is SEG-n; MSH is never edited. */
export function applyExtensions(segments: Seg[], extensions: readonly EpathExtension[]): void {
  for (const e of extensions) {
    if (e.mode !== 'fixed' || e.value === undefined) continue;
    const m = /^([A-Z0-9]{3})-(\d+)$/.exec(e.field);
    if (!m || m[1] === 'MSH') continue;
    for (const s of segments.filter(x => x.id === m[1])) setField(s, Number(m[2]), e.value);
  }
}

export interface EpathBuildOptions {
  ctx: HL7MessageContext;
  /** The performing facility's time zone (HL7 timestamps carry its offset). */
  timezone: string;
  extensions?: readonly EpathExtension[];
  /** The time the message is made, passed in so the builder stays pure. */
  now: string;
}

export interface EpathBuildResult { message: string; messageControlId: string; segmentCount: number }

export function buildEpathOruR01(facts: EpathFacts, o: EpathBuildOptions): EpathBuildResult {
  const tz = o.timezone;
  const status = EPATH_RESULT_STATUS[facts.reportStatus];
  const controlId = facts.messageControlId ?? `EPATH-${facts.accessionNumber}-${status}`;
  const p = facts.patient;
  const perf = facts.performingFacility;
  const provider = facts.orderingProvider;
  const reportedAt = toHL7Timestamp(tz, facts.signedOutAt ?? o.now);

  const segments: Seg[] = [];
  segments.push(seg('PID', {
    1: '1',
    3: p.mrn ? `${escapeHl7(p.mrn)}^^^${escapeHl7(perf.name)}^MR` : '',
    5: p.lastName || p.firstName ? `${escapeHl7(p.lastName)}^${escapeHl7(p.firstName)}` : '',
    7: dobField(tz, p.dateOfBirth),
    8: p.sex ?? 'U',
    11: xad(p.address),
  }));
  segments.push(fromLine(buildPV1('O')));
  const providerField = provider && (provider.npi || provider.lastName)
    ? [provider.npi ?? '', provider.lastName ?? '', provider.firstName ?? '', '', '', '', '', '', provider.npi ? 'NPI' : ''].map(escapeHl7).join('^') : '';
  segments.push(seg('OBR', {
    1: '1', 2: escapeHl7(facts.accessionNumber), 3: escapeHl7(facts.accessionNumber), 4: EPATH_DEFAULTS.serviceId,
    7: toHL7Timestamp(tz, facts.specimens.find(s => s.collectedAt)?.collectedAt ?? facts.signedOutAt ?? o.now),
    16: providerField, 22: reportedAt, 25: status,
  }));
  facts.specimens.forEach((s, i) => segments.push(fromLine(buildSPM({ setId: i + 1, specimenId: s.id, specimenType: s.type, bodySite: s.site }))));

  let obx = 0;
  const addObx = (valueType: string, id: string, value: string, specimenSetId: number | null) => {
    obx += 1;
    segments.push(seg('OBX', {
      1: String(obx), 2: valueType, 3: id, 4: specimenSetId === null ? '' : String(specimenSetId), 5: value, 11: status, 14: reportedAt,
      15: perf.clia ? `${escapeHl7(perf.clia)}^${escapeHl7(perf.name)}^CLIA` : '',
      23: escapeHl7(perf.name), 24: xad(perf.address),
    }));
  };
  if (facts.finalDiagnosis.trim()) addObx('TX', EPATH_DEFAULTS.finalDiagnosisId, escapeHl7(facts.finalDiagnosis.trim()), null);
  facts.specimens.forEach((s, i) => {
    for (const c of s.icdO) addObx('CWE', EPATH_DEFAULTS.icdOId, coded(c, EPATH_DEFAULTS.icdOSystem), i + 1);
    for (const c of s.snomed) addObx('CWE', EPATH_DEFAULTS.snomedId, coded(c, EPATH_DEFAULTS.snomedSystem), i + 1);
  });

  applyExtensions(segments, o.extensions ?? []);
  const msh = buildMSH(o.ctx, controlId, tz, o.now, EPATH_DEFAULTS.messageType);
  return { message: [msh, ...segments.map(render)].join('\r'), messageControlId: controlId, segmentCount: segments.length + 1 };
}
