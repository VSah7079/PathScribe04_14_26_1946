// Batch 611 (#10): matrix block comments.
import { describe, it, expect } from 'vitest';
import { buildMaterialComment, appendMaterialComment, newMaterialComments } from './materialComments';

const NOW = new Date('2026-10-18T10:00:00Z');
const input = { authorId: 'u1', authorName: 'Dr. Reed', text: '  recut level 3  ' };

describe('materialComments', () => {
  it('makes a trimmed comment with author, time and id', () => {
    const c = buildMaterialComment(input, NOW, 'abc');
    expect(c).toEqual({ id: `cmt-${NOW.getTime()}-abc`, authorId: 'u1', authorName: 'Dr. Reed', text: 'recut level 3', createdAt: '2026-10-18T10:00:00.000Z' });
  });
  it('makes nothing from empty or blank text', () => {
    expect(buildMaterialComment({ ...input, text: '' })).toBeNull();
    expect(buildMaterialComment({ ...input, text: '   ' })).toBeNull();
  });
  it('appends at the end without changing the list passed in', () => {
    const a = buildMaterialComment(input, NOW, 'a')!;
    const b = buildMaterialComment({ ...input, text: 'two' }, NOW, 'b')!;
    const before = [a];
    expect(appendMaterialComment(before, b)).toEqual([a, b]);
    expect(before).toEqual([a]);
    expect(appendMaterialComment(undefined, a)).toEqual([a]);
  });
  it('finds only the comments that were not there before', () => {
    const a = buildMaterialComment(input, NOW, 'a')!;
    const b = buildMaterialComment({ ...input, text: 'two' }, NOW, 'b')!;
    expect(newMaterialComments([a], [a, b])).toEqual([b]);
    expect(newMaterialComments(undefined, [a])).toEqual([a]);
    expect(newMaterialComments([a], undefined)).toEqual([]);
    expect(newMaterialComments([a], [a])).toEqual([]);
  });
});
