// src/services/batchRegistryFeed/batchRegistryFeed.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 620 part S (PS-800, Pete Oct 19): the batch file feed for registries and screening
// programmes that take a file, not a message. PathScribe owns WHAT goes in the file and WHEN
// (the program profile and the registry's delivery schedule); the interface engine owns HOW the
// file travels (transport, retries, the receiver's acknowledgement). Everything here is pure:
// no storage, no clock (callers pass `now`), no services. Patient data exists only inside the
// records handed to the writers; profiles, manifests and problems carry none.
//
// A profile describes ONE program's file: the format, the columns (which PathScribe field goes
// in which column, which are required), the file name pattern and the validation rules. There
// is ONE profile shipped, and it is an EXAMPLE layout, not any programme's published file
// specification: each real programme's layout is entered from that programme's own specification.
// NAACCR XML (an abstract-level cancer registry feed) is a listed but unavailable format: it is
// disabled by default and its contract is a later batch.
// Contract: docs/architecture/BATCH_REGISTRY_FEED_API.md
// ─────────────────────────────────────────────────────────────────────────────
import type { ID } from '../types';
import { sha256Hex } from '../registrySubmission/sha256';
import { deadlineStatus, evaluateSchedule, resolveDeliverySchedule, type DeliverySchedule, type DeliveryScheduleEntry, type ScheduleDecision } from '../deliverySchedules/deliverySchedule';
import { writeCsv, writeXml } from './batchFileWriters';

/** The fields of a registry record a column can carry. */
export const BATCH_FIELDS = [
  'patientIdentifier', 'patientName', 'dateOfBirth', 'accessionNumber', 'screeningDate', 'specimenAdequacy', 'generalCategorization',
  'primaryInterpretation', 'additionalInterpretations', 'hpvResult', 'recommendations', 'facilityId', 'facilityName', 'submissionKind', 'signedOutAt',
] as const;
export type BatchField = (typeof BATCH_FIELDS)[number];

/** One record as the writers take it: every field a string ('' when the case has none). */
export type BatchRecord = Record<BatchField, string>;

export const BATCH_FORMATS = ['csv', 'xml', 'naaccr_xml'] as const;
export type BatchFileFormat = (typeof BATCH_FORMATS)[number];
/** The formats a file can be written in today. NAACCR XML is later (docs/architecture/BATCH_REGISTRY_FEED_API.md §Later). */
export const AVAILABLE_BATCH_FORMATS: readonly BatchFileFormat[] = ['csv', 'xml'];
export const isFormatAvailable = (f: BatchFileFormat): boolean => AVAILABLE_BATCH_FORMATS.includes(f);

export const DELIMITERS = [',', ';', '\t'] as const;
export type Delimiter = (typeof DELIMITERS)[number];

export interface BatchColumn { field: BatchField; header: string; required: boolean }

export interface BatchProgramProfile {
  id: ID;
  /** The program's name as the lab calls it (data, not translated). */
  name: string;
  /** Which registry or programme this file goes to, as the go-live configuration keys it ("screening:<id>" or "cancer:<id>"). Its delivery schedule is the registry's own. */
  registryKey: string;
  format: BatchFileFormat;
  /** Off by default; a profile with an unavailable format cannot be turned on. */
  enabled: boolean;
  /** The shipped example layout: not any programme's specification. */
  isExample: boolean;
  /** csv only. */
  delimiter: Delimiter;
  includeHeaderRow: boolean;
  /** csv: a cell starting with = + - @ gets a leading apostrophe so a spreadsheet never runs it. */
  neutraliseFormulas: boolean;
  /** xml only: the element names. */
  xmlRootElement: string;
  xmlRecordElement: string;
  /** In the file name, in place of {program}: letters, digits, - and _ only. */
  fileCode: string;
  /** Tokens {program} {date} {time} {seq}; the extension follows from the format. */
  fileNamePattern: string;
  columns: BatchColumn[];
  updatedAt: string;
}

export type BatchProfileInput = Omit<BatchProgramProfile, 'updatedAt' | 'isExample' | 'id'> & { id?: ID };

export type ProfileProblem =
  | 'nameRequired' | 'registryRequired' | 'formatInvalid' | 'formatNotAvailable' | 'delimiterInvalid' | 'fileCodeInvalid' | 'filePatternInvalid'
  | 'columnsRequired' | 'fieldDuplicate' | 'fieldInvalid' | 'headerRequired' | 'headerNotElementName' | 'xmlElementInvalid';

const FILE_CODE = /^[A-Za-z0-9_-]{1,20}$/;
const ELEMENT_NAME = /^[A-Za-z_][A-Za-z0-9_.-]{0,63}$/;
const PATTERN_TOKEN = /\{(program|date|time|seq)\}/g;
const PATTERN_CHARS = /^[A-Za-z0-9_\-{}.]{1,80}$/;

/** Every reason a profile can't be saved (empty when it can). Turning on a format that can't be written yet is one of them. */
export function validateProfile(p: BatchProfileInput): ProfileProblem[] {
  const out = new Set<ProfileProblem>();
  if (!p.name.trim()) out.add('nameRequired');
  if (!p.registryKey.trim()) out.add('registryRequired');
  if (!BATCH_FORMATS.includes(p.format)) out.add('formatInvalid');
  else if (p.enabled && !isFormatAvailable(p.format)) out.add('formatNotAvailable');
  if (!DELIMITERS.includes(p.delimiter)) out.add('delimiterInvalid');
  if (!FILE_CODE.test(p.fileCode)) out.add('fileCodeInvalid');
  const tokens = [...p.fileNamePattern.matchAll(PATTERN_TOKEN)].map(m => m[1]);
  const stripped = p.fileNamePattern.replace(PATTERN_TOKEN, '');
  if (!PATTERN_CHARS.test(p.fileNamePattern) || /[{}]/.test(stripped) || !(tokens.includes('seq') || tokens.includes('date'))) out.add('filePatternInvalid');
  if (isFormatAvailable(p.format)) {
    if (p.columns.length === 0) out.add('columnsRequired');
    const seen = new Set<string>();
    for (const c of p.columns) {
      if (!BATCH_FIELDS.includes(c.field)) out.add('fieldInvalid');
      if (seen.has(c.field)) out.add('fieldDuplicate');
      seen.add(c.field);
      if (!c.header.trim()) out.add('headerRequired');
      else if (p.format === 'xml' && !ELEMENT_NAME.test(c.header)) out.add('headerNotElementName');
    }
    if (p.format === 'xml' && !(ELEMENT_NAME.test(p.xmlRootElement) && ELEMENT_NAME.test(p.xmlRecordElement) && p.xmlRootElement !== p.xmlRecordElement)) out.add('xmlElementInvalid');
  }
  return [...out];
}

const col = (field: BatchField, header: string, required: boolean): BatchColumn => ({ field, header, required });

/** The shipped example layout. It is NOT a programme's published specification; each programme's layout is entered from its own specification. */
export function exampleProfile(updatedAt: string): BatchProgramProfile {
  return {
    id: 'batch-profile-example', name: 'Example batch file layout', registryKey: 'screening:germany_okfe', format: 'csv', enabled: false, isExample: true,
    delimiter: ';', includeHeaderRow: true, neutraliseFormulas: true, xmlRootElement: 'Results', xmlRecordElement: 'Result', fileCode: 'EXAMPLE',
    fileNamePattern: '{program}_{date}_{seq}', updatedAt,
    columns: [
      col('patientIdentifier', 'PatientId', true), col('dateOfBirth', 'DateOfBirth', true), col('accessionNumber', 'Accession', true),
      col('screeningDate', 'ScreeningDate', true), col('specimenAdequacy', 'Adequacy', true), col('primaryInterpretation', 'Result', true),
      col('additionalInterpretations', 'OtherFindings', false), col('hpvResult', 'Hpv', false), col('recommendations', 'Recommendation', false),
      col('submissionKind', 'Kind', true),
    ],
  };
}

/** NAACCR XML is listed so the choice is visible, and is off: its contract is a later batch. */
export function naaccrXmlProfile(updatedAt: string): BatchProgramProfile {
  return {
    id: 'batch-profile-naaccr-xml', name: 'NAACCR XML (abstract-level)', registryKey: 'cancer:naaccr_us', format: 'naaccr_xml', enabled: false, isExample: false,
    delimiter: ',', includeHeaderRow: true, neutraliseFormulas: true, xmlRootElement: 'NaaccrData', xmlRecordElement: 'Patient', fileCode: 'NAACCR',
    fileNamePattern: '{program}_{date}_{seq}', updatedAt, columns: [],
  };
}

/** The two profiles that ship; they can be turned off but not removed. */
export const SHIPPED_PROFILE_IDS: readonly string[] = ['batch-profile-example', 'batch-profile-naaccr-xml'];

export const seedProfiles = (updatedAt: string): BatchProgramProfile[] => [exampleProfile(updatedAt), naaccrXmlProfile(updatedAt)];

// ── Records ─────────────────────────────────────────────────────────────────

export const emptyRecord = (): BatchRecord => Object.fromEntries(BATCH_FIELDS.map(f => [f, ''])) as BatchRecord;

/** The required fields a record lacks, by field id (never the values). */
export function missingRequired(profile: BatchProgramProfile, record: BatchRecord): BatchField[] {
  return profile.columns.filter(c => c.required && !(record[c.field] ?? '').trim()).map(c => c.field);
}

/** Splits records into those that can go in the file and those held back for missing data. `ref` names a record without naming the patient. */
export function partitionRecords<T extends { ref: string; record: BatchRecord }>(profile: BatchProgramProfile, items: readonly T[]): { ready: T[]; held: { ref: string; missing: BatchField[] }[] } {
  const ready: T[] = [];
  const held: { ref: string; missing: BatchField[] }[] = [];
  for (const it of items) {
    const missing = missingRequired(profile, it.record);
    if (missing.length) held.push({ ref: it.ref, missing }); else ready.push(it);
  }
  return { ready, held };
}

// ── The file ────────────────────────────────────────────────────────────────

export interface BatchFileContext { now: Date; sequence: number }
export interface BatchFile { fileName: string; content: string; recordCount: number; sha256: string; generatedAt: string; sequence: number; format: BatchFileFormat }

const pad = (n: number, w: number) => String(n).padStart(w, '0');

/** The file name for a run: the pattern's tokens filled (date and time in UTC), the extension from the format. */
export function batchFileName(profile: Pick<BatchProgramProfile, 'fileNamePattern' | 'fileCode' | 'format'>, ctx: BatchFileContext): string {
  const d = ctx.now;
  const date = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1, 2)}${pad(d.getUTCDate(), 2)}`;
  const time = `${pad(d.getUTCHours(), 2)}${pad(d.getUTCMinutes(), 2)}${pad(d.getUTCSeconds(), 2)}`;
  const base = profile.fileNamePattern.replace(PATTERN_TOKEN, (_m, t: string) => t === 'program' ? profile.fileCode : t === 'date' ? date : t === 'time' ? time : pad(ctx.sequence, 4));
  return `${base}.${profile.format === 'csv' ? 'csv' : 'xml'}`;
}

export type BuildFileRefusal = 'FORMAT_NOT_AVAILABLE' | 'PROFILE_INVALID' | 'NO_RECORDS';

/** Writes the file for a run, with its checksum. Records are written in the order given. Refuses a format that can't be written yet, an invalid profile, or an empty run. */
export function buildBatchFile(profile: BatchProgramProfile, records: readonly BatchRecord[], ctx: BatchFileContext): { ok: true; file: BatchFile } | { ok: false; error: BuildFileRefusal } {
  if (!isFormatAvailable(profile.format)) return { ok: false, error: 'FORMAT_NOT_AVAILABLE' };
  if (validateProfile({ ...profile, enabled: false }).length) return { ok: false, error: 'PROFILE_INVALID' };
  if (records.length === 0) return { ok: false, error: 'NO_RECORDS' };
  const generatedAt = ctx.now.toISOString();
  const content = profile.format === 'csv' ? writeCsv(profile, records) : writeXml(profile, records, generatedAt);
  return { ok: true, file: { fileName: batchFileName(profile, ctx), content, recordCount: records.length, sha256: sha256Hex(content), generatedAt, sequence: ctx.sequence, format: profile.format } };
}

// ── The schedule ────────────────────────────────────────────────────────────

export interface BatchCandidate { ref: string; facilityId: ID | null; signedOutAt: string }
export interface BatchPlan { due: string[]; waiting: { ref: string; nextDueAt: string | null }[]; scheduleKind: DeliverySchedule['kind'] }

/**
 * Which waiting items go in a run made at `now`. Each item follows its performing facility's own schedule for this registry,
 * else the enterprise's (resolveDeliverySchedule); `lastRunAt` is the program's last run. A manual run (`force`) takes everything.
 */
export function planRun(candidates: readonly BatchCandidate[], schedules: DeliveryScheduleEntry[], registryKey: string, now: Date, lastRunAt: string | null, force = false): BatchPlan {
  const due: string[] = [];
  const waiting: BatchPlan['waiting'] = [];
  let kind: DeliverySchedule['kind'] = resolveDeliverySchedule(schedules, 'registry', null, registryKey).schedule.kind;
  for (const c of candidates) {
    const s = resolveDeliverySchedule(schedules, 'registry', c.facilityId, registryKey).schedule;
    kind = s.kind;
    const d: ScheduleDecision = evaluateSchedule(s, now, { signedOutAt: c.signedOutAt, lastRunAt });
    if (force || d.canSendNow) due.push(c.ref); else waiting.push({ ref: c.ref, nextDueAt: d.nextDueAt });
  }
  return { due, waiting, scheduleKind: kind };
}

/** How many items are past the registry's reporting deadline (reportingDeadlineDays from sign-out, under each item's own facility schedule). */
export function deadlineCount(items: readonly Pick<BatchCandidate, 'facilityId' | 'signedOutAt'>[], schedules: DeliveryScheduleEntry[], registryKey: string, now: Date): number {
  return items.filter(i => deadlineStatus(resolveDeliverySchedule(schedules, 'registry', i.facilityId, registryKey).schedule, new Date(i.signedOutAt), now).state === 'overdue').length;
}

/** A batch program whose registry's schedule is not a batch schedule still runs by what that schedule allows; the screen says so. */
export const scheduleIsBatch = (schedules: DeliveryScheduleEntry[], registryKey: string): boolean =>
  resolveDeliverySchedule(schedules, 'registry', null, registryKey).schedule.kind === 'batch';

// ── The registry's answer to a file ─────────────────────────────────────────

export const FILE_ACK_STATUSES = ['ACCEPTED', 'ACCEPTED_WITH_WARNINGS', 'REJECTED_FILE', 'PARTIAL'] as const;
export type FileAckStatus = (typeof FILE_ACK_STATUSES)[number];
/** What the interface engine reports for a file. Only fixed codes: the registry's message text can quote patient data and stays out. */
export interface FileAcknowledgement {
  status: FileAckStatus;
  /** The checksum the receiver computed over the file it received; when present it must match the run's. */
  fileSha256?: string;
  /** PARTIAL: the records the registry refused, by the entry ref the run recorded, with the registry's error codes. */
  rejections?: { ref: string; errorCodes: string[] }[];
  /** REJECTED_FILE: the file-level error codes (e.g. a bad header or a failed schema check). */
  fileErrorCodes?: string[];
}

export type RunStatus = 'awaitingAck' | 'accepted' | 'partlyRejected' | 'rejected';
export const runStatusFor = (s: FileAckStatus): RunStatus => s === 'REJECTED_FILE' ? 'rejected' : s === 'PARTIAL' ? 'partlyRejected' : 'accepted';

export interface EntryAck { ref: string; status: 'ACCEPTED' | 'ACCEPTED_WITH_WARNINGS' | 'REJECTED_RECOVERABLE'; codes: string[] }

/**
 * The file's answer as one answer per record in it: that is what the existing acknowledgement path (recordRegistryAcknowledgement)
 * takes, and what makes a refused record show as "rejected" on the Outbound Queue screen with its correction due date.
 * A refused record is recoverable (fix the data, resubmit it; it goes in a later file). A refused file refuses every record in it.
 * Returns null when the checksum the registry saw is not the file's (the receiver read different bytes).
 */
export function fileAckToEntryAcks(refs: readonly string[], runSha256: string, ack: FileAcknowledgement): EntryAck[] | null {
  if (ack.fileSha256 && ack.fileSha256.toLowerCase() !== runSha256.toLowerCase()) return null;
  if (ack.status === 'REJECTED_FILE') {
    const codes = ack.fileErrorCodes?.length ? ack.fileErrorCodes : ['FILE_REJECTED'];
    return refs.map(ref => ({ ref, status: 'REJECTED_RECOVERABLE' as const, codes }));
  }
  const refused = new Map((ack.rejections ?? []).map(r => [r.ref, r.errorCodes] as const));
  const okStatus = ack.status === 'ACCEPTED_WITH_WARNINGS' ? 'ACCEPTED_WITH_WARNINGS' : 'ACCEPTED';
  return refs.map(ref => refused.has(ref)
    ? { ref, status: 'REJECTED_RECOVERABLE' as const, codes: refused.get(ref)!.length ? refused.get(ref)! : ['RECORD_REJECTED'] }
    : { ref, status: okStatus, codes: [] });
}

// ── What is stored about a run (no file, no patient data) ───────────────────

export interface BatchRunManifest {
  id: ID;
  profileId: ID;
  registryKey: string;
  fileName: string;
  format: BatchFileFormat;
  recordCount: number;
  sha256: string;
  sequence: number;
  generatedAt: string;
  /** A person asked for it now, ahead of the schedule. */
  manual: boolean;
  /** The queue entries in the file. */
  refs: string[];
  /** Entries left out for missing required fields (field ids only). */
  heldBack: { ref: string; missing: BatchField[] }[];
  status: RunStatus;
}
