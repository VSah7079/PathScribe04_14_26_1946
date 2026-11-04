import { describe, it, expect } from 'vitest';
import { scanEventOrganisation } from './scanEventOrganisation';

describe('scanEventOrganisation', () => {
  it("is the signed-in person's organisation, whatever it is", () => {
    expect(scanEventOrganisation({ organisationId: 'ORG-ACME' })).toEqual({ organisationId: 'ORG-ACME', known: true });
    expect(scanEventOrganisation({ organisationId: '  ORG-X ' })).toEqual({ organisationId: 'ORG-X', known: true });
  });
  it('never invents one: unknown when the session carries none', () => {
    for (const p of [null, undefined, {}, { organisationId: '' }, { organisationId: '   ' }, { organisationId: null }]) {
      expect(scanEventOrganisation(p)).toEqual({ organisationId: '', known: false });
    }
  });
});
