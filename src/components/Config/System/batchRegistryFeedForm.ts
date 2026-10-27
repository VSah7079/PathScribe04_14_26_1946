// src/components/Config/System/batchRegistryFeedForm.ts
// Batch 620 part S (PS-800): the editor's draft of a batch program profile and back. Pure, so it is tested without the screen.
import { BATCH_FIELDS, emptyRecord, type BatchColumn, type BatchField, type BatchProfileInput, type BatchProgramProfile, type BatchRecord } from '@/services/batchRegistryFeed/batchRegistryFeed';
import { writeCsv, writeXml } from '@/services/batchRegistryFeed/batchFileWriters';

export type ProfileDraft = BatchProfileInput;

/** The draft to start from: a copy of the profile, or a new one with the example's starting layout. */
export function draftFromProfile(p: BatchProgramProfile | null, registryKey: string): ProfileDraft {
  if (p) { const { id, name, registryKey: key, format, enabled, delimiter, includeHeaderRow, neutraliseFormulas, xmlRootElement, xmlRecordElement, fileCode, fileNamePattern, columns } = p; return { id, name, registryKey: key, format, enabled, delimiter, includeHeaderRow, neutraliseFormulas, xmlRootElement, xmlRecordElement, fileCode, fileNamePattern, columns: columns.map(c => ({ ...c })) }; }
  return {
    name: '', registryKey, format: 'csv', enabled: false, delimiter: ',', includeHeaderRow: true, neutraliseFormulas: true, xmlRootElement: 'Results', xmlRecordElement: 'Result',
    fileCode: '', fileNamePattern: '{program}_{date}_{seq}',
    columns: [{ field: 'patientIdentifier', header: 'PatientId', required: true }, { field: 'accessionNumber', header: 'Accession', required: true }, { field: 'primaryInterpretation', header: 'Result', required: true }],
  };
}

/** The fields no column carries yet. */
export const unusedFields = (columns: readonly BatchColumn[]): BatchField[] => BATCH_FIELDS.filter(f => !columns.some(c => c.field === f));

export function addColumn(columns: readonly BatchColumn[]): BatchColumn[] {
  const next = unusedFields(columns)[0];
  return next ? [...columns, { field: next, header: next.charAt(0).toUpperCase() + next.slice(1), required: false }] : [...columns];
}

export function moveColumn(columns: readonly BatchColumn[], index: number, by: -1 | 1): BatchColumn[] {
  const to = index + by;
  if (to < 0 || to >= columns.length) return [...columns];
  const out = [...columns];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

export const removeColumn = (columns: readonly BatchColumn[], index: number): BatchColumn[] => columns.filter((_c, i) => i !== index);

/** Made-up values for the layout preview: ids and codes only, never a real patient. */
export function sampleRecord(): BatchRecord {
  return { ...emptyRecord(), patientIdentifier: 'EXAMPLE-0001', patientName: 'EXAMPLE', dateOfBirth: '1970-01-01', accessionNumber: 'EX-26-0001', screeningDate: '2026-01-15',
    specimenAdequacy: 'S', generalCategorization: 'N', primaryInterpretation: 'NILM', additionalInterpretations: 'A | B', hpvResult: 'NEG', recommendations: 'R1',
    facilityId: 'EXAMPLE-FAC', facilityName: 'EXAMPLE', submissionKind: 'NEW', signedOutAt: '2026-01-15T12:00:00.000Z' };
}

/** The file the layout would write for one made-up record. */
export function layoutPreview(d: ProfileDraft): string {
  const p = { ...d, id: d.id ?? 'preview', isExample: false, updatedAt: '' } as BatchProgramProfile;
  if (d.format === 'csv') return writeCsv(p, [sampleRecord()]);
  if (d.format === 'xml') return writeXml(p, [sampleRecord()], '2026-01-15T12:00:00.000Z');
  return '';
}
