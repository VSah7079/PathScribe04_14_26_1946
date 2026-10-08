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
