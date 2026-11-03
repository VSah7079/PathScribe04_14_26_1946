import { describe, expect, it } from 'vitest';
import { ACTION_GROUPS, DEFAULT_ROLE_PERMISSIONS } from '@/constants/systemActions';
import { DEFAULT_ACTION_GRANTS } from '@/constants/defaultActionGrants';
import { SEEDED_ACTION_IDS, actionSeedFor, applyActionSeeds } from './actionSeeds';

import type { PermissionSet } from '@/constants/systemActions';

interface TestRole { id: string; builtIn: boolean; permissions: PermissionSet; seededActions?: string[] }
const role = (id: string, over: Partial<TestRole> = {}): TestRole => ({ id, builtIn: true, permissions: {}, ...over });

describe('Batch 600 default grants', () => {
  it('adds 145 commands in thirteen groups', () => {
    expect(SEEDED_ACTION_IDS).toHaveLength(145);
    expect(new Set(SEEDED_ACTION_IDS).size).toBe(145);
  });
  it('every grant names a real command, and no role is granted one twice', () => {
    const all = new Set(ACTION_GROUPS.flatMap(g => g.actions.map(a => a.id)));
    for (const [name, ids] of Object.entries(DEFAULT_ACTION_GRANTS)) {
      expect(ids.filter(id => !all.has(id)), name).toEqual([]);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
  });
  it('every new command is granted to at least one built-in role', () => {
    const granted = new Set(Object.values(DEFAULT_ACTION_GRANTS).flat());
    expect(SEEDED_ACTION_IDS.filter(id => !granted.has(id))).toEqual([]);
  });
  it('default permissions carry the grants, and Superadmin has all 145', () => {
    expect(DEFAULT_ROLE_PERMISSIONS['Pathologist']['report.recall']).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS['Resident']['report.recall']).toBeUndefined();
    expect(DEFAULT_ROLE_PERMISSIONS['Histotechnologist']['workstation.slideCheckout']).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS['Physician']['report.saveDraft']).toBeUndefined();
    expect(SEEDED_ACTION_IDS.filter(id => !DEFAULT_ROLE_PERMISSIONS['Superadmin'][id])).toEqual([]);
    // Batch 763 rule: Superadmin starts with every command in the Action list, whatever batch added it.
    expect(ACTION_GROUPS.flatMap(g => g.actions.map(a => a.id)).filter(id => !DEFAULT_ROLE_PERMISSIONS['Superadmin'][id])).toEqual([]);
  });
  it('only Admin may delete a worklist row, and only Admin and Lab Director dispatch', () => {
    const holders = (id: string) => Object.entries(DEFAULT_ACTION_GRANTS).filter(([, ids]) => ids.includes(id as never)).map(([n]) => n).sort();
    expect(holders('table.deleteRow')).toEqual(['Admin']);
    expect(holders('dispatch.sendNow')).toEqual(['Admin', 'Lab Director']);
  });
  it('open/filter/move commands go to every case-screen role, and the basics to Admin, Lab Director and QA Reviewer', () => {
    const holders = (id: string) => Object.entries(DEFAULT_ACTION_GRANTS).filter(([, ids]) => ids.includes(id as never)).map(([n]) => n);
    expect(holders('view.openHome')).toContain('QA Reviewer');
    expect(holders('view.tableFilterDp')).not.toContain('QA Reviewer');
    expect(holders('view.openHome')).not.toContain('Physician');
  });
});

describe('applyActionSeeds', () => {
  it('offers a stored built-in role the new commands once', () => {
    const { roles, changed } = applyActionSeeds([role('histotechnologist')]);
    expect(changed).toBe(true);
    expect(roles[0].permissions['workstation.embeddingConfirm']).toBe(true);
    expect(roles[0].seededActions).toEqual([...actionSeedFor('histotechnologist')]);
  });
  it('keeps a command an administrator removed after it was offered', () => {
    const offered = [...actionSeedFor('histotechnologist')];
    const { roles, changed } = applyActionSeeds([role('histotechnologist', { seededActions: offered, permissions: {} })]);
    expect(changed).toBe(false);
    expect(roles[0].permissions['workstation.embeddingConfirm']).toBeUndefined();
  });
  it('keeps the administrator’s other settings', () => {
    const { roles } = applyActionSeeds([role('accessioner', { permissions: { 'system.openMessages': true, 'print.cassette': false } as PermissionSet })]);
    expect(roles[0].permissions['system.openMessages']).toBe(true);
  });
  it('never touches a hospital’s own role, including a copy of a built-in one', () => {
    const custom = role('custom-1', { builtIn: false });
    const { roles, changed } = applyActionSeeds([custom]);
    expect(changed).toBe(false);
    expect(roles[0]).toBe(custom);
  });
  it('offers Superadmin every command in the Action list (Batch 763 rule) and roles with no grants nothing', () => {
    const offered = applyActionSeeds([role('superadmin')]).roles[0].seededActions ?? [];
    expect(offered).toEqual(ACTION_GROUPS.flatMap(g => g.actions.map(a => a.id)));
    expect(offered).toEqual(expect.arrayContaining(['requisition.runNow', 'lockbox.open', 'grossing.printCassettes']));
    expect(applyActionSeeds([role('physician')]).changed).toBe(false);
  });
});
