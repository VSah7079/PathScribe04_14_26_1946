import { describe, it, expect } from 'vitest';
import { mostRecentLocation } from './mostRecentLocation';
import type { MaterialLocation } from '@/types/case/Material';

const loc = (location: string, at: string) => ({ location, at }) as MaterialLocation;

describe('mostRecentLocation (batch-4)', () => {
  it('is undefined for no history', () => {
    expect(mostRecentLocation(undefined)).toBeUndefined();
    expect(mostRecentLocation([])).toBeUndefined();
  });
  it('takes the latest time, not the last array entry, so a late-entered older event does not look current', () => {
    const history = [loc('Lab A', '2026-10-02T10:00:00Z'), loc('Lab B', '2026-10-01T09:00:00Z')];
    expect(mostRecentLocation(history)?.location).toBe('Lab A');
  });
  it('on a tie the later list entry wins; an unreadable time never wins', () => {
    expect(mostRecentLocation([loc('X', '2026-10-01T00:00:00Z'), loc('Y', '2026-10-01T00:00:00Z')])?.location).toBe('Y');
    expect(mostRecentLocation([loc('X', '2026-10-01T00:00:00Z'), loc('Bad', 'not a date')])?.location).toBe('X');
  });
});

describe('the queue, the report and the scan check share the one rule (batch-4)', () => {
  const files = import.meta.glob('./{computeDisposalQueue,computeDisposalReport,disposeItemByScan}.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
  it('each imports mostRecentLocation and none keeps its own copy or takes the last array entry', () => {
    expect(Object.keys(files)).toHaveLength(3);
    for (const [name, src] of Object.entries(files)) {
      expect(src, name).toContain("from './mostRecentLocation'");
      expect(src, name).not.toMatch(/function mostRecentLocation/);
      expect(src, name).not.toMatch(/locationHistory\[[^\]]*length - 1\]/);
    }
  });
});
