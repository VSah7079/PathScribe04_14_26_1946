import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { waitingToGross, findByAccession } from './grossingQueue';

const mk = (id: string, status: string, priority: string, at: string, specimens = 1): Case => ({
  id, status, order: { priority },
  accession: { fullAccession: id, accessionedAt: at },
  specimens: Array.from({ length: specimens }, (_, i) => ({ label: String.fromCharCode(65 + i) })),
} as unknown as Case);

describe('grossing queue (Batch 720)', () => {
  const cases = [
    mk('S26-0003', 'accessioned', 'Routine', '2026-10-28T09:00:00Z', 2),
    mk('S26-0001', 'accessioned', 'STAT', '2026-10-28T10:00:00Z'),
    mk('S26-0002', 'gross-complete', 'Routine', '2026-10-27T10:00:00Z'),
    mk('S26-0004', 'accessioned', 'Routine', '2026-10-28T08:00:00Z'),
  ];
  it('lists only cases waiting to be grossed, STAT first, then oldest first', () => {
    expect(waitingToGross(cases).map(r => r.accession)).toEqual(['S26-0001', 'S26-0004', 'S26-0003']);
  });
  it('counts specimens', () => {
    expect(waitingToGross(cases).find(r => r.accession === 'S26-0003')?.specimenCount).toBe(2);
  });
  it('finds a case by accession number, ignoring case and spaces', () => {
    expect(findByAccession(cases, ' s26-0004 ')?.id).toBe('S26-0004');
  });
  it('finds nothing for an empty or unknown entry', () => {
    expect(findByAccession(cases, '   ')).toBeNull();
    expect(findByAccession(cases, 'S26-9999')).toBeNull();
  });
});
