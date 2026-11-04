// src/services/tumorBoard/tumorBoardDemoSeed.test.ts
import { describe, it, expect } from 'vitest';
import { demoTumorBoardListings, DEMO_TUMOR_BOARD_CASE_IDS } from './tumorBoardDemoSeed';
import { DEMO_BASELINE_CASE_IDS } from '../cases/demoBaselineCases';
import { TUMOR_BOARD_NAMES } from './ITumorBoardService';

const NOW = Date.parse('2026-10-10T18:00:00Z');

describe('Tumor Board / MDT demo agenda (Batch 516)', () => {
  const listings = demoTumorBoardListings(NOW);

  it('every listing is on a baseline case, so a Full Reset brings both back', () => {
    for (const id of DEMO_TUMOR_BOARD_CASE_IDS) expect(DEMO_BASELINE_CASE_IDS, id).toContain(id);
  });

  it('covers every board, and one active listing per case', () => {
    expect(new Set(listings.map(l => l.board))).toEqual(new Set(TUMOR_BOARD_NAMES));
    expect(new Set(listings.map(l => l.caseId)).size).toBe(listings.length);
  });

  it('shows the situations the demo walks through', () => {
    const by = (id: string) => listings.find(l => l.caseId === id)!;
    expect(by('S26-4670')).toMatchObject({ status: 'Pending Presentation', meetingDate: '2026-10-12', meetingTime: '07:30', presenterUserId: 'PATH-001' });
    expect(by('S26-4671')).toMatchObject({ status: 'Pending Presentation', source: 'Rule', presenterUserId: undefined });
    expect(by('S26-4671').triggerReason).toMatch(/0\.6 mm/);
    expect(by('S26-4672')).toMatchObject({ status: 'Pending Presentation', meetingDate: undefined });
    expect(by('S26-4673').status).toBe('Presented');
    expect(by('S26-4642').status).toBe('Deferred');
    expect(new Set(listings.map(l => l.status))).toEqual(new Set(['Pending Presentation', 'Presented', 'Deferred']));
  });

  it('dates stay relative to today', () => {
    const later = demoTumorBoardListings(NOW + 7 * 86_400_000);
    expect(later.find(l => l.caseId === 'S26-4670')!.meetingDate).toBe('2026-10-19');
  });
});
