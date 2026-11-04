import { describe, it, expect } from 'vitest';
import { resolveInkingValidationSeverity } from './resolveInkingValidationSeverity';
import type { Margin } from '@/types/case/Margin';

const examinedInked: Margin = {
  id: 'm1', name: 'Lateral', examinationStatus: 'examined',
  inkApplications: [{ id: 'i1', colorCode: '#00AEEF', colorName: 'Blue', appliedAt: '2026-10-01T00:00:00Z', appliedByName: 'Tech A' }],
};
const pendingNoInk: Margin = { id: 'm2', name: 'Deep', examinationStatus: 'pending', inkApplications: [] };

describe('resolveInkingValidationSeverity', () => {
  it('a fully examined, inked margin raises no issues and never blocks, in either mode', () => {
    const specimens = [{ id: 'sp-1', margins: [examinedInked] }];
    expect(resolveInkingValidationSeverity(specimens, 'WARN_ONLY')).toEqual({ issues: [], blocked: false });
    expect(resolveInkingValidationSeverity(specimens, 'STRICT_ENFORCE')).toEqual({ issues: [], blocked: false });
  });

  it('a pending, un-inked margin raises two severity-2 issues', () => {
    const specimens = [{ id: 'sp-1', margins: [pendingNoInk] }];
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY');
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'margin_not_examined', severity: 2, marginId: 'm2' }),
      expect.objectContaining({ code: 'margin_no_ink_applied', severity: 2, marginId: 'm2' }),
    ]));
    expect(result.issues).toHaveLength(2);
  });

  it('WARN_ONLY (the default) never blocks on severity-2 issues', () => {
    const specimens = [{ id: 'sp-1', margins: [pendingNoInk] }];
    expect(resolveInkingValidationSeverity(specimens, 'WARN_ONLY').blocked).toBe(false);
  });

  it('STRICT_ENFORCE blocks on the same severity-2 issues', () => {
    const specimens = [{ id: 'sp-1', margins: [pendingNoInk] }];
    expect(resolveInkingValidationSeverity(specimens, 'STRICT_ENFORCE').blocked).toBe(true);
  });

  it('checks margins on blocks as well as on the specimen directly, tagging which one', () => {
    const specimens = [{ id: 'sp-1', margins: [], blocks: [{ id: 'blk-1', margins: [pendingNoInk] }] }] as any;
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY');
    expect(result.issues[0]).toEqual(expect.objectContaining({ specimenId: 'sp-1', blockId: 'blk-1', marginId: 'm2' }));
  });

  it('a specimen/block with no margins at all raises nothing', () => {
    const specimens = [{ id: 'sp-1' }, { id: 'sp-2', margins: [], blocks: [{ id: 'blk-1' }] }] as any;
    expect(resolveInkingValidationSeverity(specimens, 'STRICT_ENFORCE')).toEqual({ issues: [], blocked: false });
  });

  it('several specimens and margins are all checked, not just the first', () => {
    const specimens = [{ id: 'sp-1', margins: [examinedInked] }, { id: 'sp-2', margins: [pendingNoInk] }];
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY');
    expect(result.issues.every(i => i.specimenId === 'sp-2')).toBe(true);
    expect(result.issues).toHaveLength(2);
  });
});

// Structured Inking, Module 3 (PS-359 follow-up): the additive Severity 3
// check, now that a real ink-colour palette exists (services/inkColors/).
describe('resolveInkingValidationSeverity — margin_ink_color_unmapped (Structured Inking Module 3)', () => {
  it('without activeInkColorCodes, behaves exactly as Batch 480 shipped it — never checks colour codes', () => {
    const specimens = [{ id: 'sp-1', margins: [examinedInked] }];
    expect(resolveInkingValidationSeverity(specimens, 'STRICT_ENFORCE')).toEqual({ issues: [], blocked: false });
  });

  it('a margin whose ink application colorCode is in the active palette raises nothing', () => {
    const specimens = [{ id: 'sp-1', margins: [examinedInked] }];
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY', { activeInkColorCodes: new Set(['#00AEEF']) });
    expect(result).toEqual({ issues: [], blocked: false });
  });

  it('a margin whose ink application colorCode matches nothing in the active palette raises a severity-3 issue and always blocks, even in WARN_ONLY', () => {
    const specimens = [{ id: 'sp-1', margins: [examinedInked] }];
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY', { activeInkColorCodes: new Set(['#FFFFFF']) });
    expect(result.issues).toEqual([
      expect.objectContaining({
        severity: 3, code: 'margin_ink_color_unmapped', specimenId: 'sp-1', marginId: 'm1',
        inkApplicationId: 'i1', colorCode: '#00AEEF',
      }),
    ]);
    expect(result.blocked).toBe(true);
  });

  it('compares the recorded colour code case-insensitively and trimmed against the (caller-normalized) active set', () => {
    const mixedCaseInked: Margin = {
      id: 'm3', name: 'Lateral', examinationStatus: 'examined',
      inkApplications: [{ id: 'i3', colorCode: ' #00aeef ', colorName: 'Blue', appliedAt: '2026-10-01T00:00:00Z', appliedByName: 'Tech A' }],
    };
    const specimens = [{ id: 'sp-1', margins: [mixedCaseInked] }];
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY', { activeInkColorCodes: new Set(['#00AEEF']) });
    expect(result.issues).toEqual([]);
  });

  it('a margin with no ink applications at all raises no margin_ink_color_unmapped issue, even with the check enabled', () => {
    const specimens = [{ id: 'sp-1', margins: [pendingNoInk] }];
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY', { activeInkColorCodes: new Set(['#00AEEF']) });
    expect(result.issues.some(i => i.code === 'margin_ink_color_unmapped')).toBe(false);
  });

  it('checks margins on blocks too, tagging blockId and inkApplicationId', () => {
    const specimens = [{ id: 'sp-1', margins: [], blocks: [{ id: 'blk-1', margins: [examinedInked] }] }] as any;
    const result = resolveInkingValidationSeverity(specimens, 'WARN_ONLY', { activeInkColorCodes: new Set(['#FFFFFF']) });
    expect(result.issues).toEqual([
      expect.objectContaining({ specimenId: 'sp-1', blockId: 'blk-1', marginId: 'm1', inkApplicationId: 'i1' }),
    ]);
  });
});
