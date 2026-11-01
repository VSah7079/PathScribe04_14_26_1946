// Batch 738 (Demo Seed Data S1): the surgical demo protocols and which dictionary entries use them.
import { describe, it, expect } from 'vitest';
import starter from '../../../scripts/terminology-sources/specimens-starter.json';
import { SURGICAL_DEMO_PROTOCOLS, SURGICAL_DEMO_PROTOCOL_BY_ENTRY, applySurgicalDemoProtocols } from './surgicalDemoProtocols';

describe('surgical demo protocols (Batch 738)', () => {
  it('maps only starter entries that exist, to protocols that exist', () => {
    const ids = new Set((starter as { specimens: { id: string }[] }).specimens.map(s => s.id));
    const protocols = new Set(SURGICAL_DEMO_PROTOCOLS.map(p => p.id));
    for (const [entry, protocol] of Object.entries(SURGICAL_DEMO_PROTOCOL_BY_ENTRY)) {
      expect(ids.has(entry), entry).toBe(true);
      expect(protocols.has(protocol), protocol).toBe(true);
    }
  });
  it('every track makes formalin-fixed blocks with an H&E, and the colon tumor protocol lays out 12 blocks', () => {
    for (const p of SURGICAL_DEMO_PROTOCOLS) for (const t of p.pathways) {
      expect(t.materialKind).toBe('block');
      expect(t.tasks.some(k => k.stainTypeIds.includes('st-he'))).toBe(true);
    }
    const colon = SURGICAL_DEMO_PROTOCOLS.find(p => p.id === 'proto-colon-resection-tumor')!;
    expect(colon.pathways.reduce((n, t) => n + (t.defaultCount ?? 1), 0)).toBe(12);
  });
  it('gives an entry its protocol but never replaces one it already has', () => {
    expect(applySurgicalDemoProtocols([{ id: 'sp014' }, { id: 'sp028', protocolId: 'mine' }, { id: 'sp999' }]))
      .toEqual([{ id: 'sp014', protocolId: 'proto-colon-resection-tumor' }, { id: 'sp028', protocolId: 'mine' }, { id: 'sp999' }]);
  });
});
