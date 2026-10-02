import { describe, it, expect } from 'vitest';
import { resolveFieldRequirements, FIELD_REQUIREMENT_PAGES, FIELD_GROUP_ORDER } from './fieldRequirementRules';
import {
  embeddingCommentMissing, embeddingConfirmMissing, embeddingReprintMissing, embeddingFieldRequired,
  parseObservedPieceCount, EMBEDDING_DEFAULT_REQUIREMENTS,
} from './embeddingChecks';

const defaults = resolveFieldRequirements('embedding', {});
const strict = resolveFieldRequirements('embedding', { moldSize: true, orientationInstructions: true });

describe('embedding Field Requirements (Batch 401)', () => {
  it('reproduces what the page required before: comment text, an observed count and a reprint reason are locked; mold and orientation optional', () => {
    const byId = Object.fromEntries(FIELD_REQUIREMENT_PAGES.embedding.map(f => [f.id, f.default]));
    expect(byId).toEqual({
      commentText: 'locked', observedPieceCount: 'locked', moldSize: 'optional', orientationInstructions: 'optional', reprintReason: 'locked',
    });
    expect(EMBEDDING_DEFAULT_REQUIREMENTS).toEqual(defaults);
  });
  it('its groups are placed on the Field Requirements screen', () => {
    expect(FIELD_GROUP_ORDER).toContain('embeddingConfirm');
    expect(FIELD_GROUP_ORDER).toContain('cassetteReprint');
  });
  it('a comment needs text, and a blank one does not count', () => {
    expect(embeddingCommentMissing('', defaults)).toEqual(['commentText']);
    expect(embeddingCommentMissing('   ', defaults)).toEqual(['commentText']);
    expect(embeddingCommentMissing('Tissue curled', defaults)).toEqual([]);
  });
  it('the observed count must be a whole number of 0 or more', () => {
    expect(parseObservedPieceCount('3')).toBe(3);
    expect(parseObservedPieceCount(' 0 ')).toBe(0);
    expect(parseObservedPieceCount(4)).toBe(4);
    expect(parseObservedPieceCount('')).toBeNull();
    expect(parseObservedPieceCount('-1')).toBeNull();
    expect(parseObservedPieceCount('2.5')).toBeNull();
    expect(parseObservedPieceCount('two')).toBeNull();
    expect(embeddingConfirmMissing({ observedCount: '' }, defaults)).toEqual(['observedPieceCount']);
    expect(embeddingConfirmMissing({ observedCount: '1.5' }, defaults)).toEqual(['observedPieceCount']);
    expect(embeddingConfirmMissing({ observedCount: '0' }, defaults)).toEqual([]);
  });
  it('mold size and orientation are only asked for when the organisation requires them', () => {
    expect(embeddingConfirmMissing({ observedCount: '2' }, defaults)).toEqual([]);
    expect(embeddingConfirmMissing({ observedCount: '2' }, strict)).toEqual(['moldSize', 'orientationInstructions']);
    expect(embeddingConfirmMissing({ observedCount: '2', moldSize: '15x15mm', orientationInstructions: '  ' }, strict)).toEqual(['orientationInstructions']);
    expect(embeddingConfirmMissing({ observedCount: '2', moldSize: '15x15mm', orientationInstructions: 'On edge' }, strict)).toEqual([]);
    expect(embeddingFieldRequired(defaults, 'moldSize')).toBe(false);
    expect(embeddingFieldRequired(strict, 'moldSize')).toBe(true);
  });
  it('an organisation cannot switch off the locked fields', () => {
    const tried = resolveFieldRequirements('embedding', { observedPieceCount: false, reprintReason: false, commentText: false });
    expect(embeddingConfirmMissing({ observedCount: '' }, tried)).toEqual(['observedPieceCount']);
    expect(embeddingReprintMissing('', tried)).toEqual(['reprintReason']);
    expect(embeddingCommentMissing('', tried)).toEqual(['commentText']);
  });
  it('a reprint needs a reason, and confirming never asks for it', () => {
    expect(embeddingReprintMissing(undefined, defaults)).toEqual(['reprintReason']);
    expect(embeddingReprintMissing('Wax Buildup', defaults)).toEqual([]);
    expect(embeddingConfirmMissing({ observedCount: '' }, defaults)).not.toContain('reprintReason');
  });
});
