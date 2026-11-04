// Batch 406: the Molecular Order Queue page's decisions.
import { describe, it, expect } from 'vitest';
import { queueEntriesNewestFirst, isMolecularOrderPayload, hasReflexOrder, simulatedResultMessage } from './orderQueueView';
import type { MolecularOrderOutboundQueueEntry } from '@/types/case/MolecularOrderOutboundQueueEntry';

describe('orderQueueView', () => {
  it('newest first; a payload with an assay code is a molecular order', () => {
    const entries = [{ id: 'a', queuedAt: '2026-09-01' }, { id: 'b', queuedAt: '2026-09-03' }] as MolecularOrderOutboundQueueEntry[];
    expect(queueEntriesNewestFirst(entries).map(e => e.id)).toEqual(['b', 'a']);
    expect(isMolecularOrderPayload({ assayCode: 'x' } as never)).toBe(true);
    expect(isMolecularOrderPayload({ masterBarcode: 'm' } as never)).toBe(false);
  });
});

describe('Batch 669 (mol-3): reflex orders are idempotent and the outcome line is translated', () => {
  const reflex = (over: Record<string, unknown> = {}) => ({ id: 'r', eventType: 'order.molecular', status: 'QUEUED', queuedAt: '', payload: { accessionNumber: 'S1', specimenLetter: 'A', assayCode: 'st-hpv-genotyping', orderReason: 'hpv_reflex_genotyping', ...over } }) as unknown as MolecularOrderOutboundQueueEntry;

  it('finds a reflex order for the same accession, specimen and assay, in any status', () => {
    expect(hasReflexOrder([reflex()], 'S1', 'A', 'st-hpv-genotyping')).toBe(true);
    expect(hasReflexOrder([{ ...reflex(), status: 'FAILED' } as MolecularOrderOutboundQueueEntry], 'S1', 'A', 'st-hpv-genotyping')).toBe(true);
  });

  it('another specimen, another accession, an accession-time order or an instrument order does not count', () => {
    expect(hasReflexOrder([reflex()], 'S1', 'B', 'st-hpv-genotyping')).toBe(false);
    expect(hasReflexOrder([reflex()], 'S2', 'A', 'st-hpv-genotyping')).toBe(false);
    expect(hasReflexOrder([reflex({ orderReason: 'protocol_configured' })], 'S1', 'A', 'st-hpv-genotyping')).toBe(false);
    expect(hasReflexOrder([{ ...reflex(), eventType: 'order.instrument', payload: { masterBarcode: 'm', instrumentVendor: 'Hologic' } } as unknown as MolecularOrderOutboundQueueEntry], 'S1', 'A', 'st-hpv-genotyping')).toBe(false);
  });

  it('every processor code reads through a locale key, and an unknown one reads as unknown', () => {
    expect(simulatedResultMessage({ outcome: 'applied', reflex: 'queued' }).key).toBe('molecularOrderQueue.resultAppliedWithReflex');
    expect(simulatedResultMessage({ outcome: 'applied', reflex: 'already-queued' }).key).toBe('molecularOrderQueue.resultAppliedReflexExists');
    expect(simulatedResultMessage({ outcome: 'applied' }).key).toBe('molecularOrderQueue.resultApplied');
    for (const code of ['already-applied', 'case-not-found', 'specimen-not-found', 'invalid-payload']) {
      expect(simulatedResultMessage({ outcome: code })).toEqual({ key: 'molecularOrderQueue.resultOutcome', outcomeKey: `molecularOrderQueue.outcome.${code}` });
    }
    expect(simulatedResultMessage({ outcome: 'x' }).outcomeKey).toBe('molecularOrderQueue.outcome.unknown');
  });
});
