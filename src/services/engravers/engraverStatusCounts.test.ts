// src/services/engravers/engraverStatusCounts.test.ts (Batch 560)
import { describe, it, expect } from 'vitest';
import { engraverStatusCounts } from './engraverStatusCounts';

describe('engraverStatusCounts', () => {
  it('counts each status, zero for the rest, and ignores an unknown one', () => {
    expect(engraverStatusCounts([{ status: 'online' }, { status: 'fault' }, { status: 'online' }, { status: 'melted' as never }]))
      .toEqual({ online: 2, engraving: 0, warning: 0, fault: 1, offline: 0 });
  });
});
