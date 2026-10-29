import { describe, it, expect } from 'vitest';
import { describeNoScreens } from './noScreensDiagnostic';

const role = (id: string, capabilities: string[] = []) => ({ id, name: id, capabilities, assignable: id !== 'superadmin' }) as never;
const subject = (sessionRole: string, staffRoles: string[] = []) => ({ userId: 'PATH-001', userName: 'x', sessionRole, staffRoles, facilityIds: [] }) as never;

describe('describeNoScreens', () => {
  it('says the role list is empty when no role is loaded', () => {
    expect(describeNoScreens({ subject: subject('superadmin'), roles: [] }).verdict).toMatch(/role list is empty/);
  });
  it('says Superadmin is missing from the role list', () => {
    expect(describeNoScreens({ subject: subject('superadmin'), roles: [role('pathologist')] }).verdict).toMatch(/no Superadmin role/);
  });
  it('says nothing matches when the staff record names no known role', () => {
    const d = describeNoScreens({ subject: subject('pathologist', ['Ghost']), roles: [role('pathologist')] });
    expect(d.verdict).toMatch(/None of the roles/);
    expect(d.staffRoles).toEqual(['Ghost']);
  });
  it('says the matching roles carry nothing', () => {
    expect(describeNoScreens({ subject: subject('pathologist', ['pathologist']), roles: [role('pathologist')] }).verdict).toMatch(/carry no capabilities/);
  });
  it('reports no user', () => {
    expect(describeNoScreens({ subject: null, roles: [role('x')] }).signedInAs).toBeNull();
  });
});
