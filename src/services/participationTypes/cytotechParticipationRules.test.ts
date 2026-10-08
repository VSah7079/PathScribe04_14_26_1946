// Batch 441 (Pete: "Cytotechs can not be selected for Pathologist roles").
import { describe, it, expect } from 'vitest';
import {
  cytotechInPathologistSlot, cytotechRoleProblem, isCytotechOnly, isPathologistParticipationType,
  mayHoldParticipationType, roleMayListParticipationType,
} from './cytotechParticipationRules';
import { resolveClaimParticipationType, resolveEligibleParticipationTypeIds } from '../cases/resolveClaimParticipationType';
import { withCytotechParticipationType } from '../roles/systemRoles';

const roles = [
  { id: 'pathologist', name: 'Pathologist', participationTypeIds: ['primary', 'attending', 'consultant'] },
  { id: 'resident', name: 'Resident', participationTypeIds: ['resident'] },
  { id: 'cytotechnologist', name: 'Cytotechnologist', participationTypeIds: ['cytotechnologist', 'primary'] },
] as never[];
const types = [
  { id: 'primary', canFinalize: true, sortOrder: 1 }, { id: 'attending', canFinalize: true, sortOrder: 2 },
  { id: 'cytotechnologist', canFinalize: false, sortOrder: 5 }, { id: 'consultant', canFinalize: false, sortOrder: 6 },
  { id: 'custom_signer', canFinalize: true, sortOrder: 9 },
] as never[];

describe('who counts as a cytotech', () => {
  it('holds Cytotechnologist and no pathologist-track role (names matched without regard to case)', () => {
    expect(isCytotechOnly(['Cytotechnologist'], roles)).toBe(true);
    expect(isCytotechOnly([' cytotechnologist '], roles)).toBe(true);
    expect(isCytotechOnly(['Cytotechnologist', 'Pathologist'], roles)).toBe(false);
    expect(isCytotechOnly(['Pathologist'], roles)).toBe(false);
    expect(isCytotechOnly(undefined, roles)).toBe(false);
  });
});

describe('pathologist participation types', () => {
  it('the built-in pathologist slots, and any custom type that can finalize', () => {
    for (const id of ['primary', 'attending', 'resident', 'frozen', 'second_opinion', 'consultant', 'provisional_hire']) expect(isPathologistParticipationType(id)).toBe(true);
    expect(isPathologistParticipationType('cytotechnologist')).toBe(false);
    expect(isPathologistParticipationType('custom_signer', types)).toBe(true);
  });

  it('a cytotech may hold none of them, whatever the Role Dictionary lists; anyone else is unaffected', () => {
    expect(mayHoldParticipationType(['Cytotechnologist'], roles, 'primary')).toBe(false);
    expect(mayHoldParticipationType(['Cytotechnologist'], roles, 'custom_signer', types)).toBe(false);
    expect(mayHoldParticipationType(['Cytotechnologist'], roles, 'cytotechnologist')).toBe(true);
    expect(mayHoldParticipationType(['Pathologist'], roles, 'primary')).toBe(true);
    expect([...resolveEligibleParticipationTypeIds(['Cytotechnologist'], roles)]).toEqual(['cytotechnologist']);
  });
});

describe('pool claims', () => {
  it('a cytotech claiming a pool case is the cytotechnologist, even with no types configured (before Batch 441: primary)', () => {
    expect(resolveClaimParticipationType(['Cytotechnologist'], roles, types)).toBe('cytotechnologist');
    const unconfigured = [{ id: 'cytotechnologist', name: 'Cytotechnologist', participationTypeIds: [] }] as never[];
    expect(resolveClaimParticipationType(['Cytotechnologist'], unconfigured, types)).toBe('cytotechnologist');
  });
  it('a pathologist with no types configured still falls back to primary, as before', () => {
    const unconfigured = [{ id: 'pathologist', name: 'Pathologist', participationTypeIds: [] }] as never[];
    expect(resolveClaimParticipationType(['Pathologist'], unconfigured, types)).toBe('primary');
  });
});

describe('the Cytotechnologist role', () => {
  it('may not list a pathologist type; other roles may', () => {
    expect(cytotechRoleProblem({ id: 'cytotechnologist', participationTypeIds: ['cytotechnologist', 'primary'] })).toEqual(['primary']);
    expect(cytotechRoleProblem({ id: 'cytotechnologist', participationTypeIds: ['cytotechnologist'] })).toEqual([]);
    expect(cytotechRoleProblem({ id: 'pathologist', participationTypeIds: ['primary'] })).toEqual([]);
    expect(roleMayListParticipationType('cytotechnologist', { id: 'attending' })).toBe(false);
    expect(roleMayListParticipationType('pathologist', { id: 'attending' })).toBe(true);
  });
  it('a stored copy with no types (the seed before Batch 441) gets cytotechnologist; an administrator\'s list is kept', () => {
    const r = (ids: string[]) => ({ id: 'cytotechnologist', name: 'Cytotechnologist', participationTypeIds: ids });
    expect(withCytotechParticipationType([r([])])).toEqual({ roles: [r(['cytotechnologist'])], filled: true });
    const kept = [r(['grossing'])];
    expect(withCytotechParticipationType(kept)).toEqual({ roles: kept, filled: false });
  });
});

describe('a team with a cytotech in a pathologist slot', () => {
  const staff = [{ id: 'CT1', roles: ['Cytotechnologist'] }, { id: 'P1', roles: ['Pathologist'] }];
  const p = (staffId: string, t: string[], status: 'active' | 'removed' = 'active') => ({ staffId, staffName: staffId, participationTypeIds: t, status });
  it('is found; a removed one, or a cytotech as cytotechnologist, is not', () => {
    expect(cytotechInPathologistSlot([p('P1', ['primary']), p('CT1', ['cytotechnologist', 'attending'])], staff, roles)).toEqual({ staffId: 'CT1', staffName: 'CT1', typeId: 'attending' });
    expect(cytotechInPathologistSlot([p('P1', ['primary']), p('CT1', ['cytotechnologist'])], staff, roles)).toBeNull();
    expect(cytotechInPathologistSlot([p('CT1', ['primary'], 'removed')], staff, roles)).toBeNull();
  });
});
