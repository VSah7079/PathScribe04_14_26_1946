// Batch 406: the Molecular Order Queue page's decisions.
import { describe, it, expect } from 'vitest';
import { queueEntriesNewestFirst, isMolecularOrderPayload } from './orderQueueView';
import type { MolecularOrderOutboundQueueEntry } from '@/types/case/MolecularOrderOutboundQueueEntry';

describe('orderQueueView', () => {
  it('newest first; a payload with an assay code is a molecular order', () => {
    const entries = [{ id: 'a', queuedAt: '2026-09-01' }, { id: 'b', queuedAt: '2026-09-03' }] as MolecularOrderOutboundQueueEntry[];
    expect(queueEntriesNewestFirst(entries).map(e => e.id)).toEqual(['b', 'a']);
    expect(isMolecularOrderPayload({ assayCode: 'x' } as never)).toBe(true);
    expect(isMolecularOrderPayload({ masterBarcode: 'm' } as never)).toBe(false);
  });
});
