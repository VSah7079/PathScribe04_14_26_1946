// Batch 536 (PS-554; Pete, Oct 11, 2026): changing the mismatch rules and
// approving the AI instructions are separate duties; Superadmin doesn't hold the approval.
import { describe, it, expect, vi } from 'vitest';
import { SEPARATION_OF_DUTIES, separationOfDutiesConflicts } from './capabilityCatalog';
import { CAPABILITY_SEEDS, SUPERADMIN_CAPABILITY_KEYS } from './capabilitySeeds';
import { personSeparationOfDutiesConflicts, roleCapabilityProblem } from './roleCapabilityRules';
import { saveRole } from '../roles/roleAdministration';
import { saveStaffMember } from '../staff/staffAdministration';

const MANAGE = 'config:clinical-mismatch-rules:manage';
const APPROVE = 'config:ai-prompt:approve';
const both = ['config:clinical-mismatch-rules:view', MANAGE, 'config:ai-prompt:view', APPROVE];

describe('separation of duties', () => {
  it('the pair is in the catalog', () => {
    expect(SEPARATION_OF_DUTIES).toContainEqual([MANAGE, APPROVE]);
    expect(separationOfDutiesConflicts(both)).toHaveLength(1);
    expect(separationOfDutiesConflicts([MANAGE])).toEqual([]);
  });

  it('no role may hold both, Superadmin included (SEPARATION_OF_DUTIES)', () => {
    expect(roleCapabilityProblem(both)).toMatch(/^SEPARATION_OF_DUTIES: /);
    expect(roleCapabilityProblem(both, { assignable: false })).toMatch(/^SEPARATION_OF_DUTIES/);
    expect(roleCapabilityProblem(['config:ai-prompt:view', APPROVE])).toBeNull();
  });

  it('built-in grants: Lab Director approves; Admin and Superadmin don\'t; nobody starts with editing', () => {
    expect(CAPABILITY_SEEDS['lab-director']).toEqual(expect.arrayContaining(['config:ai-prompt:view', APPROVE]));
    expect(CAPABILITY_SEEDS['lab-director']).not.toContain('config:ai-prompt:edit');
    expect(CAPABILITY_SEEDS.admin).not.toContain(APPROVE);
    expect(SUPERADMIN_CAPABILITY_KEYS).not.toContain(APPROVE);
    expect(SUPERADMIN_CAPABILITY_KEYS).toEqual(expect.arrayContaining([MANAGE, 'config:ai-prompt:edit', 'config:ai-prompt:view']));
    for (const [role, caps] of Object.entries(CAPABILITY_SEEDS)) expect(separationOfDutiesConflicts(caps), role).toEqual([]);
  });

  it('a person can\'t hold both through two roles (matched by id or name)', () => {
    const roles = [{ id: 'r-rules', name: 'Pathologist Administrator', capabilities: [MANAGE] }, { id: 'lab-director', name: 'Lab Director', capabilities: [APPROVE] }];
    expect(personSeparationOfDutiesConflicts(['Pathologist Administrator', 'lab-director'], roles)).toHaveLength(1);
    expect(personSeparationOfDutiesConflicts(['lab-director'], roles)).toEqual([]);
  });

  const roles = [
    { id: 'r-rules', name: 'Pathologist Administrator', capabilities: ['config:clinical-mismatch-rules:view', MANAGE, 'config:roles:manage'], builtIn: false },
    { id: 'lab-director', name: 'Lab Director', capabilities: ['config:ai-prompt:view'], builtIn: true },
  ];
  const deps = (users: { id: string; firstName: string; lastName: string; roles: string[] }[]) => ({
    roleService: { getAll: vi.fn(async () => ({ ok: true as const, data: roles as never })), add: vi.fn(), update: vi.fn(async (_id: string, d: object) => ({ ok: true as const, data: d as never })) },
    userService: { getAll: vi.fn(async () => ({ ok: true as const, data: users as never })), add: vi.fn(async (d: object) => ({ ok: true as const, data: d as never })), update: vi.fn(async (_id: string, d: object) => ({ ok: true as const, data: d as never })) },
    authorization: { enforce: vi.fn(async () => ({ allowed: true })) as never },
    auditService: { logEvent: vi.fn(async () => undefined) as never },
    actorName: 'Admin',
  });

  it('saving a role refuses both on it (separationOfDuties)', async () => {
    const d = deps([]);
    const res = await saveRole({ mode: 'edit', id: 'r-rules', draft: { ...roles[0], capabilities: [...roles[0].capabilities, 'config:ai-prompt:view', APPROVE] } as never }, d);
    expect(res).toMatchObject({ ok: false, reason: 'separationOfDuties' });
    expect(d.roleService.update).not.toHaveBeenCalled();
  });

  it('saving a role refuses a change that gives someone holding it and another role both (separationOfDutiesStaff)', async () => {
    const d = deps([{ id: 'U1', firstName: 'Pat', lastName: 'Lee', roles: ['Pathologist Administrator', 'Lab Director'] }]);
    const res = await saveRole({ mode: 'edit', id: 'lab-director', draft: { ...roles[1], capabilities: ['config:ai-prompt:view', APPROVE] } as never }, d);
    expect(res).toEqual({ ok: false, reason: 'separationOfDutiesStaff', detail: 'Pat Lee' });
    const ok = await saveRole({ mode: 'edit', id: 'lab-director', draft: { ...roles[1], capabilities: ['config:ai-prompt:view', APPROVE] } as never }, deps([{ id: 'U2', firstName: 'Kim', lastName: 'Ng', roles: ['Lab Director'] }]));
    expect(ok.ok).toBe(true);
  });

  it('assigning a person roles that together carry both is refused; nothing saved', async () => {
    const withApprove = [roles[0], { ...roles[1], capabilities: ['config:ai-prompt:view', APPROVE] }];
    const d = { ...deps([]), roleService: { getAll: vi.fn(async () => ({ ok: true as const, data: withApprove as never })) } };
    const before = { id: 'U1', firstName: 'Pat', lastName: 'Lee', roles: ['Lab Director'] } as never;
    const res = await saveStaffMember({ mode: 'edit', before, draft: { firstName: 'Pat', lastName: 'Lee', roles: ['Lab Director', 'Pathologist Administrator'] } as never }, d as never);
    expect(res).toEqual({ ok: false, reason: 'separationOfDuties', pairs: [`${MANAGE} + ${APPROVE}`] });
    expect(d.userService.update).not.toHaveBeenCalled();
    const fine = await saveStaffMember({ mode: 'edit', before, draft: { firstName: 'Pat', lastName: 'Lee', roles: ['Lab Director'], email: 'x' } as never }, d as never);
    expect(fine.ok).toBe(true);
  });
});
