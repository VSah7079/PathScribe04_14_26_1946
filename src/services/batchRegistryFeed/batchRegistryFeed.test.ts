// Batch 620 part S (PS-800): the pure part of the batch file feed: profiles, the CSV and XML writers, the file and its checksum,
// the run plan under a delivery schedule, and the registry's answer to a file.
import { describe, it, expect } from 'vitest';
import { sha256Hex } from '../registrySubmission/sha256';
import type { DeliveryScheduleEntry, DeliverySchedule } from '../deliverySchedules/deliverySchedule';
import { IMMEDIATE_SCHEDULE } from '../deliverySchedules/deliverySchedule';
import {
  AVAILABLE_BATCH_FORMATS, batchFileName, buildBatchFile, deadlineCount, emptyRecord, exampleProfile, fileAckToEntryAcks, missingRequired, naaccrXmlProfile,
  partitionRecords, planRun, runStatusFor, scheduleIsBatch, seedProfiles, validateProfile, type BatchProgramProfile, type BatchRecord,
} from './batchRegistryFeed';
import { csvCell, writeCsv, writeXml, xmlEscape } from './batchFileWriters';

const NOW = new Date('2026-10-19T12:00:00.000Z');
const example = exampleProfile('2026-10-19T00:00:00.000Z');
const rec = (over: Partial<BatchRecord> = {}): BatchRecord => ({
  ...emptyRecord(), patientIdentifier: 'P1', dateOfBirth: '1980-02-03', accessionNumber: 'A1', screeningDate: '2026-10-01', specimenAdequacy: 'S',
  primaryInterpretation: 'NILM', submissionKind: 'NEW', ...over,
});
const asInput = (p: BatchProgramProfile, over: Partial<BatchProgramProfile> = {}) => ({ ...p, ...over });

describe('profiles', () => {
  it('ships exactly the example layout and the NAACCR XML placeholder, both off', () => {
    const [a, b] = seedProfiles('');
    expect([a.isExample, a.enabled, a.format]).toEqual([true, false, 'csv']);
    expect([b.isExample, b.enabled, b.format]).toEqual([false, false, 'naaccr_xml']);
    expect(seedProfiles('')).toHaveLength(2);
  });
  it('the example is valid, also when turned on; it is not any programme\'s specification', () => {
    expect(validateProfile(asInput(example))).toEqual([]);
    expect(validateProfile(asInput(example, { enabled: true }))).toEqual([]);
  });
  it('NAACCR XML is listed but cannot be turned on', () => {
    expect(AVAILABLE_BATCH_FORMATS).toEqual(['csv', 'xml']);
    expect(validateProfile(asInput(naaccrXmlProfile(''), { enabled: true }))).toEqual(['formatNotAvailable']);
    expect(validateProfile(asInput(naaccrXmlProfile('')))).toEqual([]);
  });
  it('names every reason a profile is refused', () => {
    const bad = asInput(example, { name: ' ', registryKey: '', fileCode: 'a b', fileNamePattern: '{program}', columns: [] });
    expect(validateProfile(bad).sort()).toEqual(['columnsRequired', 'filePatternInvalid', 'fileCodeInvalid', 'nameRequired', 'registryRequired'].sort());
  });
  it('columns: one field per column, a heading each, XML headings are element names', () => {
    const dup = asInput(example, { columns: [{ field: 'patientName', header: 'A', required: true }, { field: 'patientName', header: 'B', required: false }] });
    expect(validateProfile(dup)).toContain('fieldDuplicate');
    expect(validateProfile(asInput(example, { columns: [{ field: 'patientName', header: '', required: true }] }))).toContain('headerRequired');
    const xml = asInput(example, { format: 'xml', columns: [{ field: 'patientName', header: '1 bad name', required: true }] });
    expect(validateProfile(xml)).toContain('headerNotElementName');
    expect(validateProfile(asInput(example, { format: 'xml', xmlRecordElement: 'Results' }))).toContain('xmlElementInvalid');
  });
  it('a file name pattern needs {date} or {seq} and nothing unknown', () => {
    for (const bad of ['{program}', '{program}_{what}_{seq}', 'a b {seq}', '']) expect(validateProfile(asInput(example, { fileNamePattern: bad }))).toContain('filePatternInvalid');
    expect(validateProfile(asInput(example, { fileNamePattern: '{program}-{seq}' }))).toEqual([]);
  });
});

describe('CSV writer', () => {
  it('writes the header row and one line per record, CRLF, the delimiter of the profile', () => {
    const csv = writeCsv(example, [rec(), rec({ patientIdentifier: 'P2' })]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('PatientId;DateOfBirth;Accession;ScreeningDate;Adequacy;Result;OtherFindings;Hpv;Recommendation;Kind');
    expect(lines[1]).toBe('P1;1980-02-03;A1;2026-10-01;S;NILM;;;;NEW');
    expect(lines).toHaveLength(4);
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it('can leave the header row out', () => {
    expect(writeCsv({ ...example, includeHeaderRow: false }, [rec()]).split('\r\n')).toHaveLength(2);
  });
  it('quotes a cell with the delimiter, a quote or a line break, and doubles its quotes', () => {
    expect(csvCell('a;b', ';', true)).toBe('"a;b"');
    expect(csvCell('say "hi"', ';', true)).toBe('"say ""hi"""');
    expect(csvCell('two\nlines', ',', true)).toBe('"two\nlines"');
    expect(csvCell('a,b', ';', true)).toBe('a,b');
    expect(csvCell(' padded ', ',', true)).toBe('" padded "');
  });
  it('puts an apostrophe before anything a spreadsheet would run, unless turned off', () => {
    expect(csvCell('=SUM(A1)', ',', true)).toBe("'=SUM(A1)");
    expect(csvCell('@cmd', ',', true)).toBe("'@cmd");
    expect(csvCell('-1+1', ',', true)).toBe("'-1+1");
    expect(csvCell('=SUM(A1)', ',', false)).toBe('=SUM(A1)');
    expect(csvCell('2026-01-01', ',', true)).toBe('2026-01-01');
  });
});

describe('XML writer', () => {
  const xmlProfile: BatchProgramProfile = { ...example, format: 'xml', xmlRootElement: 'Results', xmlRecordElement: 'Result', columns: [{ field: 'patientIdentifier', header: 'PatientId', required: true }, { field: 'recommendations', header: 'Rec', required: false }] };
  it('writes a root with the count and time, a record element per record, a child per column', () => {
    const xml = writeXml(xmlProfile, [rec({ recommendations: 'a & b <c>' })], '2026-10-19T12:00:00.000Z');
    expect(xml).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<Results generatedAt="2026-10-19T12:00:00.000Z" recordCount="1">\n  <Result>\n    <PatientId>P1</PatientId>\n    <Rec>a &amp; b &lt;c&gt;</Rec>\n  </Result>\n</Results>\n');
  });
  it('escapes quotes and drops characters XML 1.0 cannot carry', () => {
    expect(xmlEscape('"x" \'y\'')).toBe('&quot;x&quot; &apos;y&apos;');
    expect(xmlEscape('a\u0000b\u000Bc\ud800d')).toBe('abcd');
    expect(xmlEscape('tab\tand\nnewline')).toBe('tab\tand\nnewline');
  });
});

describe('the file', () => {
  it('names it from the pattern, in UTC, with the extension of the format', () => {
    expect(batchFileName(example, { now: NOW, sequence: 7 })).toBe('EXAMPLE_20261019_0007.csv');
    expect(batchFileName({ fileNamePattern: '{program}_{date}{time}', fileCode: 'AB', format: 'xml' }, { now: NOW, sequence: 1 })).toBe('AB_20261019120000.xml');
  });
  it('carries the SHA-256 of exactly what it holds, so the registry can check the bytes it received', () => {
    const r = buildBatchFile(example, [rec(), rec({ patientIdentifier: 'P2' })], { now: NOW, sequence: 1 });
    expect(r.ok).toBe(true);
    if (r.ok === true) {
      expect(r.file.sha256).toBe(sha256Hex(r.file.content));
      expect(r.file.recordCount).toBe(2);
      expect(r.file.generatedAt).toBe(NOW.toISOString());
    }
  });
  it('refuses a format that cannot be written, an invalid profile, and an empty run', () => {
    expect(buildBatchFile(naaccrXmlProfile(''), [rec()], { now: NOW, sequence: 1 })).toEqual({ ok: false, error: 'FORMAT_NOT_AVAILABLE' });
    expect(buildBatchFile({ ...example, columns: [] }, [rec()], { now: NOW, sequence: 1 })).toEqual({ ok: false, error: 'PROFILE_INVALID' });
    expect(buildBatchFile(example, [], { now: NOW, sequence: 1 })).toEqual({ ok: false, error: 'NO_RECORDS' });
  });
  it('an amended record carries its kind in the file', () => {
    const r = buildBatchFile(example, [rec({ submissionKind: 'AMENDMENT' })], { now: NOW, sequence: 1 });
    expect(r.ok === true && r.file.content.split('\r\n')[1].endsWith(';AMENDMENT')).toBe(true);
  });
});

describe('required fields', () => {
  it('names the missing fields, never the values', () => {
    expect(missingRequired(example, rec({ patientIdentifier: ' ', accessionNumber: '' }))).toEqual(['patientIdentifier', 'accessionNumber']);
    expect(missingRequired(example, rec())).toEqual([]);
  });
  it('splits records into those that go and those held back, by ref', () => {
    const { ready, held } = partitionRecords(example, [{ ref: 'a', record: rec() }, { ref: 'b', record: rec({ dateOfBirth: '' }) }]);
    expect(ready.map(r => r.ref)).toEqual(['a']);
    expect(held).toEqual([{ ref: 'b', missing: ['dateOfBirth'] }]);
  });
});

describe('which items go in a run', () => {
  const batch = (over: Partial<DeliverySchedule> = {}): DeliverySchedule => ({
    ...IMMEDIATE_SCHEDULE, kind: 'batch', batchFrequency: 'daily', batchTimes: ['06:00'], timeZone: 'UTC', reportingDeadlineDays: 2, ...over,
  });
  const entry = (schedule: DeliverySchedule, facilityId: string | null = null): DeliveryScheduleEntry => ({ id: `s-${facilityId}`, feed: 'registry', facilityId, registryKey: 'screening:x', schedule, updatedAt: '' });
  const KEY = 'screening:x';
  const signed = '2026-10-18T10:00:00.000Z';

  it('an item signed out before today\'s run goes in it; one signed out after waits for the next', () => {
    const plan = planRun([{ ref: 'a', facilityId: null, signedOutAt: signed }, { ref: 'b', facilityId: null, signedOutAt: '2026-10-19T09:00:00.000Z' }], [entry(batch())], KEY, NOW, null);
    expect(plan.due).toEqual(['a']);
    expect(plan.waiting).toEqual([{ ref: 'b', nextDueAt: '2026-10-20T06:00:00.000Z' }]);
    expect(plan.scheduleKind).toBe('batch');
  });
  it('a run already made after the run time leaves nothing due', () => {
    expect(planRun([{ ref: 'a', facilityId: null, signedOutAt: signed }], [entry(batch())], KEY, NOW, '2026-10-19T06:30:00.000Z').due).toEqual([]);
  });
  it('a performing facility\'s own schedule beats the enterprise\'s', () => {
    const own = entry(batch({ batchTimes: ['18:00'] }), 'fac-a');
    const early = '2026-10-19T05:00:00.000Z';
    const plan = planRun([{ ref: 'a', facilityId: 'fac-a', signedOutAt: early }, { ref: 'b', facilityId: 'fac-b', signedOutAt: early }], [entry(batch()), own], KEY, NOW, null);
    expect(plan.due).toEqual(['b']);
    expect(plan.waiting[0]).toEqual({ ref: 'a', nextDueAt: '2026-10-19T18:00:00.000Z' });
  });
  it('a manual run takes everything waiting', () => {
    expect(planRun([{ ref: 'b', facilityId: null, signedOutAt: '2026-10-19T09:00:00.000Z' }], [entry(batch())], KEY, NOW, null, true).due).toEqual(['b']);
  });
  it('says whether the registry\'s schedule is a batch schedule', () => {
    expect(scheduleIsBatch([entry(batch())], KEY)).toBe(true);
    expect(scheduleIsBatch([], KEY)).toBe(false);
  });
  it('counts the items past the reporting deadline, per facility schedule', () => {
    const items = [{ facilityId: null, signedOutAt: '2026-10-15T00:00:00.000Z' }, { facilityId: null, signedOutAt: '2026-10-19T00:00:00.000Z' }];
    expect(deadlineCount(items, [entry(batch())], KEY, NOW)).toBe(1);
    expect(deadlineCount(items, [entry(batch({ reportingDeadlineDays: null }))], KEY, NOW)).toBe(0);
  });
});

describe('the registry\'s answer to a file', () => {
  const sha = 'abc123';
  it('an accepted file accepts every record in it', () => {
    expect(fileAckToEntryAcks(['a', 'b'], sha, { status: 'ACCEPTED' })).toEqual([{ ref: 'a', status: 'ACCEPTED', codes: [] }, { ref: 'b', status: 'ACCEPTED', codes: [] }]);
    expect(fileAckToEntryAcks(['a'], sha, { status: 'ACCEPTED_WITH_WARNINGS' })?.[0].status).toBe('ACCEPTED_WITH_WARNINGS');
  });
  it('a partly refused file refuses only the named records, with their codes (recoverable: fix and resubmit)', () => {
    const r = fileAckToEntryAcks(['a', 'b'], sha, { status: 'PARTIAL', rejections: [{ ref: 'b', errorCodes: ['E12'] }] });
    expect(r).toEqual([{ ref: 'a', status: 'ACCEPTED', codes: [] }, { ref: 'b', status: 'REJECTED_RECOVERABLE', codes: ['E12'] }]);
    expect(fileAckToEntryAcks(['b'], sha, { status: 'PARTIAL', rejections: [{ ref: 'b', errorCodes: [] }] })?.[0].codes).toEqual(['RECORD_REJECTED']);
  });
  it('a refused file refuses every record in it', () => {
    expect(fileAckToEntryAcks(['a', 'b'], sha, { status: 'REJECTED_FILE', fileErrorCodes: ['BAD_HEADER'] })?.map(a => [a.status, a.codes])).toEqual([['REJECTED_RECOVERABLE', ['BAD_HEADER']], ['REJECTED_RECOVERABLE', ['BAD_HEADER']]]);
    expect(fileAckToEntryAcks(['a'], sha, { status: 'REJECTED_FILE' })?.[0].codes).toEqual(['FILE_REJECTED']);
  });
  it('a checksum the registry saw that is not the file\'s is not taken in', () => {
    expect(fileAckToEntryAcks(['a'], sha, { status: 'ACCEPTED', fileSha256: 'ffff' })).toBeNull();
    expect(fileAckToEntryAcks(['a'], sha, { status: 'ACCEPTED', fileSha256: 'ABC123' })).not.toBeNull();
  });
  it('the run\'s status follows the answer', () => {
    expect(['ACCEPTED', 'ACCEPTED_WITH_WARNINGS', 'PARTIAL', 'REJECTED_FILE'].map(s => runStatusFor(s as never))).toEqual(['accepted', 'accepted', 'partlyRejected', 'rejected']);
  });
});
