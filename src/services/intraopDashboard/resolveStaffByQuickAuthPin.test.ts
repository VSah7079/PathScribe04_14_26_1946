// src/services/intraopDashboard/resolveStaffByQuickAuthPin.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

describe('resolveStaffByQuickAuthPin — real, per the given design brief\'s "Fast User Context Switching"', () => {
  it('real, a genuine or-staff PIN match authenticates correctly', async () => {
    const { userService } = await import('../index');
    const { resolveStaffByQuickAuthPin } = await import('./resolveStaffByQuickAuthPin');

    const created = await userService.add({
      firstName: 'Jane', lastName: 'Doe', email: 'jdoe@example.org', roles: ['or-staff'],
      npi: '', license: '', phone: '', status: 'Active', quickAuthPin: '4471',
    });
    expect(created.ok).toBe(true);

    const result = await resolveStaffByQuickAuthPin('4471');
    expect(result.outcome).toBe('authenticated');
    expect(result.staff?.firstName).toBe('Jane');
  });

  it('real, a genuinely unknown PIN is honestly not-found', async () => {
    const { resolveStaffByQuickAuthPin } = await import('./resolveStaffByQuickAuthPin');
    const result = await resolveStaffByQuickAuthPin('9999');
    expect(result.outcome).toBe('not-found');
  });

  it('real, a PIN matching a real staff member who is NOT or-staff is refused, never a back door into the lab\'s own login', async () => {
    const { userService } = await import('../index');
    const { resolveStaffByQuickAuthPin } = await import('./resolveStaffByQuickAuthPin');

    await userService.add({
      firstName: 'Dr.', lastName: 'Smith', email: 'smith@example.org', roles: ['pathologist'],
      npi: '', license: '', phone: '', status: 'Active', quickAuthPin: '1234',
    });

    const result = await resolveStaffByQuickAuthPin('1234');
    expect(result.outcome).toBe('invalid-role');
  });

  it('real, an empty PIN is honestly not-found, never matching by accident against an unset field', async () => {
    const { resolveStaffByQuickAuthPin } = await import('./resolveStaffByQuickAuthPin');
    const result = await resolveStaffByQuickAuthPin('');
    expect(result.outcome).toBe('not-found');
  });
});

describe('resolveStaffByQuickAuthPin — role stored by name on the Staff screen (PS-262)', () => {
  it('authenticates a staff member whose role is stored as the name "Or Staff"', async () => {
    const { userService } = await import('../index');
    const { resolveStaffByQuickAuthPin } = await import('./resolveStaffByQuickAuthPin');
    await userService.add({
      firstName: 'Lisa', lastName: 'Hoffman', email: 'lisa@example.org', roles: ['Or Staff'],
      npi: '', license: '', phone: '', status: 'Active', quickAuthPin: '4826',
    });
    const result = await resolveStaffByQuickAuthPin('4826');
    expect(result.outcome).toBe('authenticated');
  });

  it('still refuses a role name that is not OR staff', async () => {
    const { userService } = await import('../index');
    const { resolveStaffByQuickAuthPin } = await import('./resolveStaffByQuickAuthPin');
    await userService.add({
      firstName: 'Pat', lastName: 'Lee', email: 'pat@example.org', roles: ['Pathologist'],
      npi: '', license: '', phone: '', status: 'Active', quickAuthPin: '5521',
    });
    expect((await resolveStaffByQuickAuthPin('5521')).outcome).toBe('invalid-role');
  });

  it('matches the role on id or name', async () => {
    const { staffHasRole } = await import('./resolveStaffByQuickAuthPin');
    expect(staffHasRole(['or-staff'], 'or-staff', 'Or Staff')).toBe(true);
    expect(staffHasRole(['Or Staff'], 'or-staff', 'Or Staff')).toBe(true);
    expect(staffHasRole(['Pathologist'], 'or-staff', 'Or Staff')).toBe(false);
    expect(staffHasRole(['Or Staff'], 'or-staff', undefined)).toBe(false);
  });
});
