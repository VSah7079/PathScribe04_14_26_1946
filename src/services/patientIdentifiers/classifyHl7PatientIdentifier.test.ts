// src/services/patientIdentifiers/classifyHl7PatientIdentifier.test.ts
import { describe, it, expect } from 'vitest';
import { classifyHl7PatientIdentifier as classify } from './classifyHl7PatientIdentifier';

describe('classifyHl7PatientIdentifier (Batch 417)', () => {
  it('names the system from the assigning authority', () => {
    expect(classify({ identifierValue: '1', assigningAuthority: 'NHS' }, 'GB_EW')).toBe('mrn_nhs');
    expect(classify({ identifierValue: '1', assigningAuthority: 'NHS England' }, undefined)).toBe('mrn_nhs');
    expect(classify({ identifierValue: '1', assigningAuthority: 'CHI' }, 'GB_SCT')).toBe('mrn_chi');
    expect(classify({ identifierValue: '1', assigningAuthority: 'BSN' }, 'NL')).toBe('mrn_bsn');
    expect(classify({ identifierValue: '1', assigningAuthority: 'OHIP' }, 'CA')).toBe('id_ca_phn');
  });
  it('IHI and RRN depend on the jurisdiction', () => {
    expect(classify({ identifierValue: '1', assigningAuthority: 'IHI' }, 'AU')).toBe('mrn_ihi');
    expect(classify({ identifierValue: '1', assigningAuthority: 'IHI' }, 'IE')).toBe('id_ie_ihi');
    expect(classify({ identifierValue: '1', assigningAuthority: 'RRN' }, 'KR')).toBe('mrn_krn');
    expect(classify({ identifierValue: '1', assigningAuthority: 'RRN' }, 'BE')).toBe('mrn_be');
    expect(classify({ identifierValue: '1', assigningAuthority: 'RRN' }, 'US')).toBeNull();
  });
  it("an unnamed 'NH' or 'NI' identifier is the jurisdiction's own", () => {
    expect(classify({ identifierValue: '1', assigningAuthority: 'PDS', identifierTypeCode: 'NH' }, 'GB_EW')).toBe('mrn_nhs');
    expect(classify({ identifierValue: '1', assigningAuthority: 'X', identifierTypeCode: 'NI' }, 'IE')).toBe('id_ie_ihi');
    expect(classify({ identifierValue: '1', assigningAuthority: 'X', identifierTypeCode: 'NH' }, 'US')).toBeNull(); // no national identifier
    expect(classify({ identifierValue: '1', assigningAuthority: 'X', identifierTypeCode: 'NH' }, undefined)).toBeNull();
  });
  it('a medical record number is never a national identifier', () => {
    expect(classify({ identifierValue: '1', assigningAuthority: 'EPIC', identifierTypeCode: 'MR' }, 'GB_EW')).toBeNull();
    expect(classify({ identifierValue: '1', assigningAuthority: 'PAYER_X', identifierTypeCode: 'SS' }, 'US')).toBeNull();
  });
});
