import { describe, it, expect } from 'vitest';
import { checkStaffForm, isHttpsLink, signatureLinkOnOpen, signaturePreviewUrl, staffFormValues, type StaffFormValues } from './staffFormChecks';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';

const blank: StaffFormValues = {
  firstName: '', middleName: '', lastName: '', roles: [], subspecialtyIds: [], facilityIds: [],
  email: '', phone: '', credentials: '', npi: '', gmcNumber: '', license: '', signatureUrl: '',
};
const filled: StaffFormValues = { ...blank, firstName: 'Ann', lastName: 'Lee', roles: ['pathologist'] };

describe('Staff editor requirements (PS-359)', () => {
  it('by default: first name, last name and a role, as before; they cannot be switched off', () => {
    const r = resolveFieldRequirements('staff', { firstName: false, roles: false });
    expect(r.filter(f => f.required).map(f => f.id)).toEqual(['firstName', 'lastName', 'roles']);
    const c = checkStaffForm(blank, r);
    expect(c.problems).toEqual({ firstName: 'required', lastName: 'required', roles: 'atLeastOneRole' });
    expect(c.missing.map(f => f.id)).toEqual(['firstName', 'lastName', 'roles']);
    expect(checkStaffForm(filled, r)).toEqual({ problems: {}, missing: [] });
  });
  it('an organisation can require more: email, NPI, facilities, signature', () => {
    const r = resolveFieldRequirements('staff', { email: true, npi: true, facilities: true, signature: true });
    expect(checkStaffForm(filled, r).missing.map(f => f.id)).toEqual(['facilities', 'email', 'npi', 'signature']);
    expect(checkStaffForm({ ...filled, email: 'a@b.org', npi: '1234567890', facilityIds: ['f1'], signatureUrl: 'https://dms.hospital.example/sig/sj.png' }, r).missing).toEqual([]);
  });
  it('an email, when given, must look like one, required or not', () => {
    const r = resolveFieldRequirements('staff');
    expect(checkStaffForm({ ...filled, email: 'ann' }, r).problems).toEqual({ email: 'invalidEmail' });
    expect(checkStaffForm({ ...filled, email: 'ann@lab.org' }, r).problems).toEqual({});
  });
  it('lists count as filled when they have an entry', () => {
    expect(staffFormValues({ ...blank, roles: ['x'] })).toMatchObject({ roles: 'set', facilities: '', subspecialties: '' });
  });
});

describe('Signature is a link, not an image (Batch 544, Pete: links only)', () => {
  const r = resolveFieldRequirements('staff', {});
  it('accepts an https:// link, or nothing', () => {
    expect(checkStaffForm({ ...filled, signatureUrl: 'https://dms.hospital.example/sig/a.png' }, r).problems.signature).toBeUndefined();
    expect(checkStaffForm(filled, r).problems.signature).toBeUndefined();
  });
  it('refuses an image saved as a data: URL (as the old upload did), http:// and plain text', () => {
    for (const bad of ['data:image/png;base64,AAAA', 'http://dms.hospital.example/a.png', 'sig.png', 'https://', 'https://a b/c.png', 'javascript:alert(1)',
      'https://user:pw@dms.hospital.example/a.png', 'https://intranet/a.png', 'https://a']) {
      expect(checkStaffForm({ ...filled, signatureUrl: bad }, r).problems.signature, bad).toBe('invalidLink');
    }
  });
  it('a signature saved as an image opens empty, saying a link is needed, so the record can still be saved', () => {
    expect(signatureLinkOnOpen('data:image/png;base64,AAAA')).toEqual({ value: '', needsLink: true });
    expect(signatureLinkOnOpen('https://dms.hospital.example/s.png')).toEqual({ value: 'https://dms.hospital.example/s.png', needsLink: false });
    expect(signatureLinkOnOpen(undefined)).toEqual({ value: '', needsLink: false });
  });
  it('the preview loads only a valid link', () => {
    expect(isHttpsLink(' https://x.example/s.png ')).toBe(true);
    expect(signaturePreviewUrl(' https://x.example/s.png ')).toBe('https://x.example/s.png');
    expect(signaturePreviewUrl('data:image/png;base64,AAAA')).toBeUndefined();
  });
});
