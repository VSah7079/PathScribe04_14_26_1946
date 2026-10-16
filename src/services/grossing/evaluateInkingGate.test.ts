import { describe, it, expect } from 'vitest';
import { evaluateInkingGate, type GateSpecimen } from './evaluateInkingGate';
import type { Margin } from '@/types/case/Margin';

const examinedInked: Margin = {
  id: 'm1', name: 'Lateral', examinationStatus: 'examined',
  inkApplications: [{ id: 'i1', colorCode: '#0000FF', colorName: 'Blue', appliedAt: '2026-10-01T00:00:00Z', appliedByName: 'Tech A' }],
};
const pendingNoInk: Margin = { id: 'm2', name: 'Deep', examinationStatus: 'pending', inkApplications: [] };

const clean: GateSpecimen[] = [{ id: 'sp-1', label: 'A', margins: [examinedInked] }];
const severity2: GateSpecimen[] = [{ id: 'sp-1', label: 'A', margins: [pendingNoInk] }];
const severity3: GateSpecimen[] = [{ id: 'sp-1', label: 'A', margins: [examinedInked] }]; // colour unmapped, below

const BASE = { caseId: 'S26-001', facilityId: 'fac-1', jurisdiction: 'US' as const };

describe('evaluateInkingGate — fail-closed PALETTE_UNAVAILABLE', () => {
  it('blocks both gates when the palette failed to load', () => {
    for (const actionContext of ['GROSSING_COMPLETE', 'SIGN_OUT'] as const) {
      const result = evaluateInkingGate({
        ...BASE, actionContext, specimens: clean, mode: 'WARN_ONLY',
        activeInkColorCodes: new Set(['#0000FF']), paletteAvailable: false,
      });
      expect(result).toMatchObject({ canProceed: false, mode: 'PALETTE_UNAVAILABLE', issues: [] });
    }
  });

  it('blocks both gates when activeInkColorCodes is undefined, even if paletteAvailable is left true', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'SIGN_OUT', specimens: clean, mode: 'WARN_ONLY', activeInkColorCodes: undefined });
    expect(result.mode).toBe('PALETTE_UNAVAILABLE');
    expect(result.canProceed).toBe(false);
  });
});

describe('evaluateInkingGate — Gate A (GROSSING_COMPLETE)', () => {
  it('a clean case can proceed with no issues', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'GROSSING_COMPLETE', specimens: clean, mode: 'STRICT_ENFORCE', activeInkColorCodes: new Set(['#0000FF']) });
    expect(result).toMatchObject({ canProceed: true, mode: 'WARN', highestSeverity: null, issues: [] });
  });

  it('severity 2 issues never hard-block Gate A, even in STRICT_ENFORCE — soft advisory only', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'GROSSING_COMPLETE', specimens: severity2, mode: 'STRICT_ENFORCE', activeInkColorCodes: new Set(['#0000FF']) });
    expect(result.canProceed).toBe(true);
    expect(result.mode).toBe('WARN');
    expect(result.highestSeverity).toBe(2);
    expect(result.issues).toHaveLength(2);
  });

  it('severity 3 (unmapped colour) hard-blocks Gate A with no bypass — overrideEligible always false', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'GROSSING_COMPLETE', specimens: severity3, mode: 'WARN_ONLY', activeInkColorCodes: new Set(['#FFFFFF']), userRoles: ['admin'] });
    expect(result).toMatchObject({ canProceed: false, mode: 'BLOCK', highestSeverity: 3, overrideEligible: false });
  });

  it('issues carry the specimen display label and a literal-English message', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'GROSSING_COMPLETE', specimens: severity2, mode: 'STRICT_ENFORCE', activeInkColorCodes: new Set(['#0000FF']) });
    expect(result.issues[0].specimenDisplayName).toBe('A');
    expect(result.issues[0].message).toContain('Deep');
    expect(typeof result.issues[0].message).toBe('string');
  });
});

describe('evaluateInkingGate — Gate B (SIGN_OUT)', () => {
  it('a clean case can proceed', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'SIGN_OUT', specimens: clean, mode: 'STRICT_ENFORCE', activeInkColorCodes: new Set(['#0000FF']) });
    expect(result).toMatchObject({ canProceed: true, mode: 'WARN', highestSeverity: null });
  });

  it('severity 2 issues never block Gate B, in either mode — advisory only', () => {
    for (const mode of ['WARN_ONLY', 'STRICT_ENFORCE'] as const) {
      const result = evaluateInkingGate({ ...BASE, actionContext: 'SIGN_OUT', specimens: severity2, mode, activeInkColorCodes: new Set(['#0000FF']) });
      expect(result.canProceed).toBe(true);
      expect(result.mode).toBe('WARN');
    }
  });

  it('severity 3 hard-blocks a standard pathologist (not override-eligible)', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'SIGN_OUT', specimens: severity3, mode: 'WARN_ONLY', activeInkColorCodes: new Set(['#FFFFFF']), userRoles: ['pathologist'] });
    expect(result).toMatchObject({ canProceed: false, mode: 'BLOCK', overrideEligible: false });
  });

  it('severity 3 offers OVERRIDE_REQUIRED to an admin or lab-director', () => {
    for (const role of ['admin', 'lab-director']) {
      const result = evaluateInkingGate({ ...BASE, actionContext: 'SIGN_OUT', specimens: severity3, mode: 'WARN_ONLY', activeInkColorCodes: new Set(['#FFFFFF']), userRoles: [role] });
      expect(result).toMatchObject({ canProceed: false, mode: 'OVERRIDE_REQUIRED', overrideEligible: true });
    }
  });

  it('severity 3 with no userRoles supplied defaults to a hard BLOCK, never OVERRIDE_REQUIRED', () => {
    const result = evaluateInkingGate({ ...BASE, actionContext: 'SIGN_OUT', specimens: severity3, mode: 'WARN_ONLY', activeInkColorCodes: new Set(['#FFFFFF']) });
    expect(result.mode).toBe('BLOCK');
  });
});

describe('evaluateInkingGate — jurisdiction profile mapping', () => {
  it.each([
    ['US', 'US_CAP'], ['CA', 'CA_IQMH'], ['GB_EW', 'UK_RCPATH'], ['GB_SCT', 'UK_RCPATH'], ['GB_NIR', 'UK_RCPATH'],
    ['AU', 'ANZ_RCPA'], ['NZ', 'ANZ_RCPA'], ['KR', 'KR_MFDS'],
    ['IE', 'EU_IVDR'], ['BE', 'EU_IVDR'], ['NL', 'EU_IVDR'], ['DE', 'EU_IVDR'], ['FR', 'EU_IVDR'],
  ] as const)('%s resolves to %s', (jurisdiction, profile) => {
    const result = evaluateInkingGate({ ...BASE, jurisdiction, actionContext: 'SIGN_OUT', specimens: clean, mode: 'WARN_ONLY', activeInkColorCodes: new Set(['#0000FF']) });
    expect(result.jurisdictionCode).toBe(profile);
  });

  it('defaults to US_CAP when no jurisdiction is supplied', () => {
    const result = evaluateInkingGate({ caseId: 'S26-001', facilityId: 'fac-1', actionContext: 'SIGN_OUT', specimens: clean, mode: 'WARN_ONLY', activeInkColorCodes: new Set(['#0000FF']) });
    expect(result.jurisdictionCode).toBe('US_CAP');
  });
});
