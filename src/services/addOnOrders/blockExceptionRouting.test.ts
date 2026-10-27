import { describe, it, expect } from 'vitest';
import type { StaffUser } from '../users/IUserService';
import { exceptionDeskEmails, staffDisplayName, deskRecipientsFor, EXCEPTION_DESK_ROLE_IDS } from './blockExceptionRouting';

const user = (id: string, roles: string[], over: Partial<StaffUser> = {}): StaffUser =>
  ({ id, firstName: id.toUpperCase(), lastName: 'Staff', email: `${id}@lab.org`, roles, npi: '', license: '', phone: '', status: 'Active', ...over } as StaffUser);

describe('exceptionDeskEmails (ws-3)', () => {
  it('the Supervisor / Accessioning Desk are the Lab Director and Accessioner roles', () => {
    expect([...EXCEPTION_DESK_ROLE_IDS].sort()).toEqual(['accessioner', 'lab-director']);
  });
  it('lists active holders of those roles, once each, sorted', () => {
    const users = [
      user('b', ['accessioner']), user('a', ['lab-director', 'accessioner']), user('c', ['pathologist']),
      user('d', ['accessioner'], { status: 'Inactive' }), user('e', ['lab-director'], { email: '  ' }),
    ];
    expect(exceptionDeskEmails(users)).toEqual(['a@lab.org', 'b@lab.org']);
  });
  it('limits to the case facility for staff assigned to facilities; staff with none cover every facility', () => {
    const users = [user('a', ['accessioner'], { facilityIds: ['f1'] }), user('b', ['accessioner'], { facilityIds: ['f2'] }), user('c', ['lab-director'])];
    expect(exceptionDeskEmails(users, 'f1')).toEqual(['a@lab.org', 'c@lab.org']);
    expect(exceptionDeskEmails(users)).toEqual(['a@lab.org', 'b@lab.org', 'c@lab.org']);
  });
});

describe('staffDisplayName (ws-20)', () => {
  const users = [user('path-1', ['pathologist'], { firstName: 'Pat', lastName: 'Ho' })];
  it('turns a user id into the name', () => { expect(staffDisplayName('path-1', users)).toBe('Pat Ho'); });
  it('keeps text that is not a known id (it may already be a name)', () => { expect(staffDisplayName('Dr. Chen', users)).toBe('Dr. Chen'); });
  it('falls back to the id for a user with no name, and to nothing for nothing', () => {
    expect(staffDisplayName('x', [user('x', [], { firstName: '', lastName: '' })])).toBe('x');
    expect(staffDisplayName(undefined, users)).toBeUndefined();
  });
});

describe('deskRecipientsFor', () => {
  it('combines the desk addresses for the case facility with the primary pathologist name', () => {
    const users = [user('ld', ['lab-director']), user('path-1', ['pathologist'], { firstName: 'Pat', lastName: 'Ho' })];
    expect(deskRecipientsFor({ order: { facilityId: 'f1', assignedTo: 'path-1' } }, users)).toEqual({ emails: ['ld@lab.org'], primaryPathologistName: 'Pat Ho' });
  });
});
