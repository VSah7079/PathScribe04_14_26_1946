// src/services/reports/synopticResultPayload.test.ts
import { describe, it, expect } from 'vitest';
import { buildSynopticResultPayload, workupStatusFor, workupPdfDocumentId, SYNOPTIC_PAYLOAD_SCHEMA_VERSION, type TemplateLike, type CaseLike, type InstanceLike } from './synopticResultPayload';

const template: TemplateLike = {
  id: 'CAP_COLON_RESECTION', name: 'Colon Resection', version: '4.2.0.0', ajccEdition: 'AJCC 8th',
  sections: [{ fields: [
    { id: 'size', label: 'Tumor Greatest Dimension', type: 'numeric', unit: 'cm', snomed: '371000087103' },
    { id: 'pt', label: 'pT', type: 'dropdown', reportingRole: 'pT', snomed: '385382003', options: [{ id: 'pt3', label: 'pT3', snomed: '1228938002' }, { id: 'pt2', label: 'pT2' }] },
    { id: 'pn', label: 'pN', type: 'dropdown', reportingRole: 'pN', options: [{ id: 'pn1a', label: 'pN1a' }] },
    { id: 'margins', label: 'Margins', type: 'checkboxes', options: [{ id: 'm1', label: 'Proximal', snomed: '111' }, { id: 'm2', label: 'Distal', snomed: '222' }] },
    { id: 'her2blk', label: 'Block used for HER2 IHC', type: 'text', reportingRole: 'block' },
    { id: 'unanswered', label: 'Not answered', type: 'text' },
  ] }],
};
const caseData: CaseLike = {
  id: 'S26-1', encounterId: 'ENC-7', accession: { fullAccession: 'S26-0001' }, patient: { mrn: 'MRN-9' },
  order: { placerOrderNumber: 'ORD-1', fillerOrderNumber: 'LIS-1', externalOrderId: 'EMR-5' },
  specimens: [
    { id: 'sp1', label: 'A', description: 'Sigmoid colon resection', coding: { cpt: ['88309', '88309-26'], snomed: [{ code: '71854001', description: 'Colon' }], icd10: [{ code: 'C18.7', description: 'Sigmoid' }], icdO: [{ code: '8140/3', description: 'Adenocarcinoma' }] } },
    { id: 'sp2', label: 'B', description: 'Lymph nodes' },
  ],
};
const instance: InstanceLike = {
  instanceId: 'i1', specimenId: 'sp1', additionalSpecimenIds: ['sp2'], templateId: 'CAP_COLON_RESECTION',
  answers: { size: '3.5', pt: 'pt3', pn: 'pn1a', margins: ['m1', 'm2'], her2blk: 'A2', unanswered: '' },
  aiSuggestions: { size: { value: '3.5', verification: 'verified' }, pt: { value: 'pt2', verification: 'unverified' }, her2blk: { value: 'A2', verification: 'disputed' } },
};
const base = { caseData, instance, template, workup: { status: 'FINAL' as const, version: 1 }, signer: { id: 'u1', npi: '1234567890', signedAt: '2026-10-01T11:21:00Z' } };

describe('synoptic result payload v1.0.0 (Batch 426)', () => {
  it('Assist: header with ids, order numbers, parts, template, signature; patient context without name or birth date', () => {
    const p = buildSynopticResultPayload({ ...base, mode: 'assist', codeVersions: { snomed: '2026-03' } });
    expect(p.$schema_version).toBe(SYNOPTIC_PAYLOAD_SCHEMA_VERSION);
    expect(p.header).toEqual({
      pathscribe_report_id: 'PSR-S26-1-i1', pdf_document_id: 'PSR-S26-1-i1-V1', accession_number: 'S26-0001',
      placer_order_number: 'ORD-1', filler_order_number: 'LIS-1', specimen_ids: ['A', 'B'],
      workup_status: 'FINAL', workup_version: 1,
      template: { id: 'CAP_COLON_RESECTION', name: 'Colon Resection', version: '4.2.0.0' },
      signature: { signer_id: 'u1', npi: '1234567890', signed_timestamp: '2026-10-01T11:21:00Z' },
    });
    expect(p.patient_context).toEqual({ mrn: 'MRN-9', encounter_id: 'ENC-7' });
    expect(JSON.stringify(p)).not.toMatch(/dateOfBirth|firstName/);
  });
  it('specimens: codes as lists with system and version (unset is null); suggested CPT without modifiers, Assist only', () => {
    const p = buildSynopticResultPayload({ ...base, mode: 'assist', codeVersions: { snomed: '2026-03' } });
    expect(p.specimens[0]).toEqual({
      specimen_id: 'A', description: 'Sigmoid colon resection',
      snomed: [{ code: '71854001', display: 'Colon', system: 'SNOMED CT', version: '2026-03' }],
      icd10: [{ code: 'C18.7', display: 'Sigmoid', system: 'ICD-10-CM', version: null }],
      icd_o_3: [{ code: '8140/3', display: 'Adenocarcinoma', system: 'ICD-O-3', version: null }],
      suggested_cpt_codes: [{ code: '88309' }, { code: '88309' }],
    });
    const orch = buildSynopticResultPayload({ ...base, mode: 'orchestrator' });
    expect(orch.specimens[0].suggested_cpt_codes).toBeUndefined();
  });
  it('staging from the tagged fields, coded with the chosen answer; observations with unit, codes, block and override', () => {
    const p = buildSynopticResultPayload({ ...base, mode: 'assist' });
    expect(p.staging).toEqual({ ajcc_edition: 'AJCC 8th', pT: { value: 'pT3', snomed: '1228938002' }, pN: { value: 'pN1a', snomed: null }, pM: null, figo: null });
    const by = Object.fromEntries(p.synoptic_observations.map(o => [o.field_id, o]));
    expect(Object.keys(by)).toEqual(['size', 'pt', 'pn', 'margins', 'her2blk']);
    expect(by.size).toMatchObject({ value: '3.5', unit: 'cm', snomed: { concept_code: '371000087103', value_code: null }, overridden: false, ai_suggested: true });
    expect(by.pt).toMatchObject({ value: 'pT3', snomed: { concept_code: '385382003', value_code: '1228938002' }, overridden: true });
    expect(by.margins).toMatchObject({ value: ['Proximal', 'Distal'], snomed: { concept_code: null, value_code: null, value_codes: ['111', '222'] } });
    expect(by.her2blk).toMatchObject({ block_id: 'A2', snomed: null, overridden: true });
    expect(by.pn).toMatchObject({ snomed: null, ai_suggested: false, overridden: false });
  });
  it('Orchestration: the EMR order is the placer and the accession the filler when the LIS sent none', () => {
    const p = buildSynopticResultPayload({ ...base, mode: 'orchestrator', caseData: { ...caseData, order: { externalOrderId: 'EMR-5' } } });
    expect([p.header.placer_order_number, p.header.filler_order_number]).toEqual(['EMR-5', 'S26-0001']);
    expect(buildSynopticResultPayload({ ...base, mode: 'assist', caseData: { ...caseData, order: {} } }).header.placer_order_number).toBeNull();
  });
  it('status and version', () => {
    expect(['final', 'corrected', 'corrected_with_addition', 'new_instance', 'FINAL', 'CORRECTED', 'ADDENDUM'].map(k => workupStatusFor(k as never)))
      .toEqual(['FINAL', 'CORRECTED', 'CORRECTED', 'ADDENDUM', 'FINAL', 'CORRECTED', 'ADDENDUM']);
    expect(workupPdfDocumentId('S26-1', 'i1', 3)).toBe('PSR-S26-1-i1-V3');
    expect(buildSynopticResultPayload({ ...base, mode: 'assist', template: null }).header.template).toEqual({ id: 'CAP_COLON_RESECTION', name: null, version: null });
  });
});
