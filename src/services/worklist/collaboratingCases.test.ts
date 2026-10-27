// Batch 660 (Pete, Oct 23, 2026): "Collaborating Cases" are the cases whose team roster
// lists the viewer as an active member; finalized and closed cases drop out.

import { describe, it, expect } from 'vitest';
import type { Case } from '@/types/case/Case';
import { isCollaboratingCase } from './worklistTileCounts';

const ME = 'u-me';
const member = (staffId: string, status = 'active') => ({ staffId, status, participationTypeIds: ['consultant'] });
const mk = (status: string, participants?: ReturnType<typeof member>[]) => ({ id: 'c', status, participants }) as unknown as Parameters<typeof isCollaboratingCase>[0] & Case;

describe('isCollaboratingCase', () => {
  it('includes an open case where the viewer is an active team member, in any role', () => {
    expect(isCollaboratingCase(mk('in-progress', [member(ME)]), ME)).toBe(true);
    expect(isCollaboratingCase(mk('pending-release', [member('x'), member(ME)]), ME)).toBe(true);
  });
  it('leaves out a viewer who was removed from the team, or never on it', () => {
    expect(isCollaboratingCase(mk('in-progress', [member(ME, 'removed')]), ME)).toBe(false);
    expect(isCollaboratingCase(mk('in-progress', [member('x')]), ME)).toBe(false);
    expect(isCollaboratingCase(mk('in-progress'), ME)).toBe(false);
  });
  it('drops finalized and closed cases', () => {
    expect(isCollaboratingCase(mk('finalized', [member(ME)]), ME)).toBe(false);
    expect(isCollaboratingCase(mk('closed', [member(ME)]), ME)).toBe(false);
  });
  it('shows nothing when nobody is signed in', () => {
    expect(isCollaboratingCase(mk('in-progress', [member(ME)]), undefined)).toBe(false);
  });
});
