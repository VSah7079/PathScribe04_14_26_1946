import { describe, it, expect } from 'vitest';
import { caseDisplayNumber } from './caseDisplayNumber';

describe('caseDisplayNumber (Batch 709)', () => {
  it('shows the accession number printed on labels, not the internal id', () => {
    expect(caseDisplayNumber({ id: 'O26-0031', accession: { fullAccession: 'O26-0001' } })).toBe('O26-0001');
  });
  it('falls back to the internal id when there is no accession number', () => {
    expect(caseDisplayNumber({ id: 'S26-4403' })).toBe('S26-4403');
    expect(caseDisplayNumber({ id: 'S26-4403', accession: { fullAccession: '  ' } })).toBe('S26-4403');
  });
});
