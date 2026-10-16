import { describe, it, expect } from 'vitest';
import { checkFacilityForm, facilityFormValues } from './facilityFormChecks';
import { resolveFieldRequirements } from '../fieldRequirements/fieldRequirementRules';

const form = {
  name: 'North Clinic', assigningAuthority: 'NCL', email: 'lab@north.org', phone: '', fax: '', address: '', city: '', state: '', zip: '',
  contactFamilyNames: '', contactName: '', isEnterprise: false, interfaceEngineConnection: null, lisRouting: null,
} as unknown as Parameters<typeof checkFacilityForm>[0];
const others = [{ id: 'f1', name: 'South Clinic', assigningAuthority: 'SCL' }];

describe('Facility editor requirements (PS-359)', () => {
  it('by default: name, assigning authority and email, as before', () => {
    const r = resolveFieldRequirements('facility');
    expect(r.filter(f => f.required).map(f => f.id)).toEqual(['name', 'assigningAuthority', 'email', 'interfaceEndpoint', 'sendingFacilityId']);
    expect(checkFacilityForm(form, r, others)).toEqual({ problems: {}, collision: undefined, missing: [] });
    const c = checkFacilityForm({ ...form, name: ' ', assigningAuthority: '', email: '' }, r, others);
    expect(c.problems).toEqual({ name: 'required', assigningAuthority: 'required', email: 'required' });
  });
  it('the assigning authority is unique, ignoring case; the facility being edited is not a collision with itself', () => {
    const r = resolveFieldRequirements('facility');
    const c = checkFacilityForm({ ...form, assigningAuthority: 'scl' }, r, others);
    expect(c.problems.assigningAuthority).toBe('assigningAuthorityCollision');
    expect(c.collision).toEqual({ name: 'South Clinic', assigningAuthority: 'SCL' });
    expect(checkFacilityForm({ ...form, assigningAuthority: 'SCL' }, r, others, 'f1').problems).toEqual({});
  });
  it('an organisation can make email optional, or require phone, address and a contact', () => {
    const r = resolveFieldRequirements('facility', { email: false, phone: true, address: true, contactPerson: true });
    expect(checkFacilityForm({ ...form, email: '' }, r, others).missing.map(f => f.id)).toEqual(['phone', 'address', 'contactPerson']);
    expect(checkFacilityForm({ ...form, email: 'nope' }, r, others).problems.email).toBe('invalidEmail');
    expect(checkFacilityForm({ ...form, phone: '1', address: '2', contactName: 'Dr Old' } as typeof form, r, others).missing).toEqual([]);
  });
  it('interface fields are needed only once that interface is set up', () => {
    const r = resolveFieldRequirements('facility');
    const withLis = { ...form, lisRouting: { sendingFacilityId: '' } } as unknown as typeof form;
    expect(checkFacilityForm(withLis, r, others).problems).toEqual({ sendingFacilityId: 'required' });
    const withEngine = { ...form, isEnterprise: true, interfaceEngineConnection: { endpoint: ' ' } } as unknown as typeof form;
    expect(checkFacilityForm(withEngine, r, others).problems).toEqual({ interfaceEndpoint: 'required' });
    expect(facilityFormValues(form)).toMatchObject({ interfaceEndpoint: 'notSetUp', sendingFacilityId: 'notSetUp' });
  });
  it('Batch 530 (Pete): fax, city, region and postal code can be required too', () => {
    const r = resolveFieldRequirements('facility', { fax: true, city: true, region: true, postalCode: true });
    expect(checkFacilityForm(form, r, others).missing.map(f => f.id)).toEqual(['fax', 'city', 'region', 'postalCode']);
    expect(checkFacilityForm({ ...form, fax: '1', city: 'Tucson', state: 'AZ', zip: '85701' } as typeof form, r, others).missing).toEqual([]);
  });
});

describe('Batch 549 (carried over from Batch 544): the letterhead logo is an https link', () => {
  const r = resolveFieldRequirements('facility');
  it('an http, data: or malformed logo address is refused; an https link or no logo is fine', () => {
    for (const bad of ['http://x.example/logo.png', 'data:image/png;base64,AAAA', 'logo.png', 'https://user:pw@x.example/l.png', 'https://intranet/logo.png']) {
      expect(checkFacilityForm({ ...form, headerLogoUrl: bad }, r, others).problems.headerLogoUrl).toBe('invalidLink');
    }
    expect(checkFacilityForm({ ...form, headerLogoUrl: 'https://images.hospital.example/logo.png' }, r, others).problems).toEqual({});
    expect(checkFacilityForm({ ...form, headerLogoUrl: '  ' }, r, others).problems).toEqual({});
  });
});
