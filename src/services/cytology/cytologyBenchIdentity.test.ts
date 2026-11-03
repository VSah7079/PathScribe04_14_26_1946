// Batch 760 (Cytology spec §2.1): the non-PHI identity of a cytology case.
import { describe, it, expect } from 'vitest';
import { cytologyCaseIdentity, MAX_SLIDE_IDS } from './cytologyBenchIdentity';

describe('cytologyCaseIdentity (Batch 760)', () => {
  it('accession, vial type and slide ids, never the patient', () => {
    const id = cytologyCaseIdentity({
      id: 'O26-0042', accession: { fullAccession: 'CY26-0042' },
      specimens: [{ label: 'A', description: 'Cervical', cytologyScreening: { liquidBasedPlatform: 'ThinPrep' }, decants: [{ stains: [{ displayId: 'CY26-0042-AD1-L1' }, { displayId: 'CY26-0042-AD1-L1' }] }] }],
      patient: { givenNames: 'Jane', familyNames: 'Doe', mrn: 'M1' },
    } as never);
    expect(id).toEqual({ accession: 'CY26-0042', vials: [{ label: 'A', platform: 'ThinPrep', description: 'Cervical' }], slideIds: ['CY26-0042-AD1-L1'] });
    expect(JSON.stringify(id)).not.toMatch(/Jane|Doe|M1/);
  });
  it('falls back to the case id; no platform for "other"; at most a few slide ids', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ displayId: `S-${i}` }));
    const id = cytologyCaseIdentity({ id: 'C-1', specimens: [{ label: 'A', cytologyScreening: { liquidBasedPlatform: 'other' }, blocks: [{ stains: many }] }] });
    expect(id.accession).toBe('C-1');
    expect(id.vials).toEqual([{ label: 'A', description: '—' }]);
    expect(id.slideIds).toHaveLength(MAX_SLIDE_IDS);
  });
});
