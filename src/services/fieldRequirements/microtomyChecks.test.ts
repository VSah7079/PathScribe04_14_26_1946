import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES } from './fieldRequirementRules';
import {
  microtomyCommentMissing, microtomyAddStainMissing, microtomyReprintMissing, microtomyCancelMissing, microtomyFieldRequired,
} from './microtomyChecks';

const defaults = resolveFieldRequirements('microtomy', {});
const withDepth = resolveFieldRequirements('microtomy', { levelDepth: true });

describe('microtomy Field Requirements (Batch 388)', () => {
  it('a comment needs text, and a blank one does not count', () => {
    expect(microtomyCommentMissing('', defaults)).toEqual(['commentText']);
    expect(microtomyCommentMissing('   ', defaults)).toEqual(['commentText']);
    expect(microtomyCommentMissing('Fragile edge', defaults)).toEqual([]);
  });
  it('a slide order needs a stain; the level depth is optional until an organisation requires it', () => {
    expect(microtomyAddStainMissing('', '', defaults)).toEqual(['stainType']);
    expect(microtomyAddStainMissing('s1', '', defaults)).toEqual([]);
    expect(microtomyAddStainMissing('s1', '', withDepth)).toEqual(['levelDepth']);
    expect(microtomyAddStainMissing('s1', '4', withDepth)).toEqual([]);
    expect(microtomyAddStainMissing('', '', withDepth)).toEqual(['stainType', 'levelDepth']);
  });
  it('a reprint and the cancelling of a printed slide need a reason', () => {
    expect(microtomyReprintMissing('', defaults)).toEqual(['reprintReason']);
    expect(microtomyReprintMissing('Jam', defaults)).toEqual([]);
    expect(microtomyCancelMissing('', defaults)).toEqual(['cancelReason']);
    expect(microtomyCancelMissing('Ordered in Error', defaults)).toEqual([]);
  });
  it('adding a stain never asks for the reprint or cancel reason', () => {
    expect(microtomyAddStainMissing('s1', '', defaults)).not.toContain('reprintReason');
    expect(microtomyAddStainMissing('s1', '', defaults)).not.toContain('cancelReason');
  });
  it('the locked fields cannot be switched off', () => {
    const off = resolveFieldRequirements('microtomy', { commentText: false, stainType: false, reprintReason: false, cancelReason: false });
    expect(microtomyCommentMissing('', off)).toEqual(['commentText']);
    expect(microtomyAddStainMissing('', '', off)).toEqual(['stainType']);
    expect(microtomyReprintMissing('', off)).toEqual(['reprintReason']);
    expect(microtomyCancelMissing('', off)).toEqual(['cancelReason']);
  });
  it('drives the star', () => {
    expect(microtomyFieldRequired(defaults, 'stainType')).toBe(true);
    expect(microtomyFieldRequired(defaults, 'levelDepth')).toBe(false);
    expect(microtomyFieldRequired(withDepth, 'levelDepth')).toBe(true);
    expect(microtomyFieldRequired(defaults, 'nope')).toBe(false);
  });
  it('the catalog page lists exactly these five fields', () => {
    expect(FIELD_REQUIREMENT_PAGES.microtomy.map(f => f.id)).toEqual(['commentText', 'stainType', 'levelDepth', 'reprintReason', 'cancelReason']);
  });
});
