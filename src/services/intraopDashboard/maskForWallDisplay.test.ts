import { describe, it, expect } from 'vitest';
import { maskForWallDisplay, wallDisplayCaseLabel } from './maskForWallDisplay';
import type { ActiveIntraopRequest } from './resolveActiveIntraopRequestsForLocations';

const base = {
  sessionId: 's1', locationId: 'l1', locationDisplay: 'Theatre 2', patientName: 'Jane Q Public', mrn: 'MRN-0048213',
  surgeon: 'Dr Lee', orNumber: 'OR-7731', specimenId: 'sp1', specimenLabel: 'A', arrivalTimestamp: '2026-01-01T00:00:00Z', pathologistName: 'Dr Kim',
} as unknown as ActiveIntraopRequest;

describe('maskForWallDisplay', () => {
  it('replaces the name with the case ID and room and empties the MRN', () => {
    const m = maskForWallDisplay(base);
    expect(m.patientName).toBe('OR-7731 · Theatre 2');
    expect(m.mrn).toBe('');
    expect(JSON.stringify(m)).not.toContain('Jane');
    expect(JSON.stringify(m)).not.toContain('0048213');
  });
  it('uses the case ID alone when there is no separate room label', () => {
    expect(wallDisplayCaseLabel({ orNumber: 'OR-1', locationDisplay: undefined })).toBe('OR-1');
    expect(wallDisplayCaseLabel({ orNumber: 'OR-1', locationDisplay: 'OR-1' })).toBe('OR-1');
  });
  it('keeps the clinical fields the board needs', () => {
    const m = maskForWallDisplay(base);
    expect(m.surgeon).toBe('Dr Lee');
    expect(m.specimenLabel).toBe('A');
  });
});
