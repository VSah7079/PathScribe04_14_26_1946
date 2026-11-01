import { describe, it, expect } from 'vitest';
import { batchDemoSeeds, BATCH_DEMO_IDS } from './batchDemoSeeds';

describe('demo batches (Batch 404)', () => {
  const [recon, referral, processing] = batchDemoSeeds(Date.parse('2026-09-30T12:00:00Z'));
  it('one for each override: a reconciliation that needs forcing, an unacknowledged excursion, a running batch', () => {
    expect(recon.id).toBe(BATCH_DEMO_IDS.reconciling);
    expect(recon.status).toBe('reconciling');
    expect(recon.items.some(i => i.reconciliationStatus === 'missing')).toBe(true);
    expect(recon.unexpectedScans).toHaveLength(1);
    expect(referral.coldChainExcursion?.acknowledgedAt).toBeUndefined();
    expect(referral.referralDestinationFacilityId).toBe('ref-summit-molecular');
    expect(processing.status).toBe('active');
  });
  it('Batch 726: a sealed processor basket routed to the Embedding station, ready for the hand-off', () => {
    const toEmbed = batchDemoSeeds(Date.parse('2026-09-30T12:00:00Z')).find(b => b.id === BATCH_DEMO_IDS.toEmbedding)!;
    expect(toEmbed.processingNode).toBe('Processing');
    expect(toEmbed.sealedAt).toBeTruthy();
    expect(toEmbed.stationId).toBe('station-embed-1');
    expect(toEmbed.items.map(i => i.displayId)).toEqual(['S26-4403-A1', 'S26-4403-A2']);
  });
});
