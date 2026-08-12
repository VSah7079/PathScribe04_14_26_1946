// src/services/hl7/dftBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { buildDftP03ForCase } from './dftBuilder';
import type { HL7MessageContext } from './types';

const ctx: HL7MessageContext = {
  sendingApplication: 'PATHSCRIBE', sendingFacility: 'FORMEDRIX',
  receivingApplication: 'RCM', receivingFacility: 'RCM_FAC',
  processingId: 'T',
};

describe('buildDftP03ForCase — Phase 3: real, verified DFT^P03 message assembly', () => {
  it('builds a real message with the correct message type in MSH-9', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: { mrn: '12345', firstName: 'Jane', lastName: 'Doe' } as any },
      [{ id: 'sp-1', label: 'A', coding: { cpt: ['88305'] } }],
      {},
      'America/Phoenix',
    );
    expect(result.message).toContain('DFT^P03');
    expect(result.message.split('\r')[0]).toMatch(/^MSH/);
  });

  it('emits one real FT1 per specimen-level base code', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: {} as any },
      [{ id: 'sp-1', label: 'A', coding: { cpt: ['88305'] } }],
      {},
      'America/Phoenix',
    );
    expect(result.chargeCount).toBe(1);
    expect(result.message).toContain('FT1|1');
    expect(result.message).toContain('88305');
  });

  it('emits real FT1 segments for both specimen-level and block-level codes', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: {} as any },
      [{ id: 'sp-1', label: 'A', coding: { cpt: ['88305'] } }],
      { 'sp-1': [{ id: 'blk-1', label: 'A1', coding: { cpt: ['88342'] } }] },
      'America/Phoenix',
    );
    expect(result.chargeCount).toBe(2);
    expect(result.message).toContain('88305');
    expect(result.message).toContain('88342');
  });

  it('never emits a fabricated charge for a specimen with no real, assigned code - honest, not the rule-based default', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: {} as any },
      [{ id: 'sp-1', label: 'A' }], // no real coding.cpt at all
      {},
      'America/Phoenix',
    );
    expect(result.chargeCount).toBe(0);
  });

  it('emits a real DG1 per real ICD-10 diagnosis, with the first marked principal', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: {} as any, coding: { icd10: [{ code: 'C50.911', display: 'Malignant neoplasm of breast' }, { code: 'Z12.31', display: 'Screening mammogram' }] } },
      [{ id: 'sp-1', label: 'A', coding: { cpt: ['88305'] } }],
      {},
      'America/Phoenix',
    );
    expect(result.message).toContain('DG1|1');
    expect(result.message).toContain('C50.911');
    expect(result.message).toContain('DG1|2');
    expect(result.message.split('\r').find(s => s.startsWith('DG1|1'))).toMatch(/\|F$/); // principal
  });

  it('links each real charge to the real primary diagnosis via FT1-19', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: {} as any, coding: { icd10: [{ code: 'C50.911', display: 'Malignant neoplasm of breast' }] } },
      [{ id: 'sp-1', label: 'A', coding: { cpt: ['88305'] } }],
      {},
      'America/Phoenix',
    );
    const ft1Line = result.message.split('\r').find(s => s.startsWith('FT1'));
    expect(ft1Line).toContain('C50.911');
  });

  it('uses \\r as the real segment terminator, not \\n', () => {
    const result = buildDftP03ForCase(
      ctx,
      { id: 'S26-1', patient: {} as any },
      [{ id: 'sp-1', label: 'A', coding: { cpt: ['88305'] } }],
      {},
      'America/Phoenix',
    );
    expect(result.message).toContain('\r');
    expect(result.message.split('\r').length).toBeGreaterThan(1);
  });
});
