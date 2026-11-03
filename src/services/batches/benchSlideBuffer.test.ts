// Batch 758 (Scan-Last): slides on a Microtome station's bench, kept per station.
import { describe, it, expect } from 'vitest';
import { MemoryStorage } from '@/services/browserData/dataStorage';
import { createBenchSlideBuffer } from './benchSlideBuffer';

const slide = (slideId: string) => ({ slideId, confirmedAt: '2026-11-01T10:00:00Z', userId: 'u1' });

describe('benchSlideBuffer (Batch 758)', () => {
  it('keeps each station\'s bench apart, and a slide only once', () => {
    const b = createBenchSlideBuffer(new MemoryStorage());
    b.add('st-1', slide('S26-0001-A1-L1'));
    b.add('st-1', slide('s26-0001-a1-l1'));
    b.add('st-1', slide('S26-0001-A1-L2'));
    b.add('st-2', slide('S26-0002-A1-L1'));
    expect(b.list('st-1').map(s => s.slideId)).toEqual(['S26-0001-A1-L1', 'S26-0001-A1-L2']);
    expect(b.list('st-2')).toHaveLength(1);
    expect(b.list('')).toEqual([]);
  });

  it('takes slides off the bench when they go into a rack; the rest stay', () => {
    const storage = new MemoryStorage();
    const b = createBenchSlideBuffer(storage);
    b.add('st-1', slide('S26-0001-A1-L1'));
    b.add('st-1', slide('S26-0001-A1-L2'));
    expect(b.remove('st-1', ['S26-0001-A1-L1']).map(s => s.slideId)).toEqual(['S26-0001-A1-L2']);
    // Kept in storage, so a reload finds it.
    expect(createBenchSlideBuffer(storage).list('st-1')).toHaveLength(1);
    b.remove('st-1', ['S26-0001-A1-L2']);
    expect(storage.length).toBe(0);
  });

  it('reads damaged storage as an empty bench', () => {
    const storage = new MemoryStorage();
    storage.setItem('pathscribe.benchSlides.st-1', '{not json');
    expect(createBenchSlideBuffer(storage).list('st-1')).toEqual([]);
  });
});
