// Batch 620 (part E, PS-800): a signed-out case becomes a ready ePath message or a review with fixed codes.
import { describe, it, expect } from 'vitest';
import { prepareEpathSubmission, type EpathPrepareDeps } from './prepareEpathSubmission';
import { exampleProfile, type EpathStateProfile } from './epathProfile';
import type { Case } from '@/types/case/Case';
import type { Facility } from '../facilities/IFacilityService';

const az: EpathStateProfile = { ...exampleProfile('t'), id: 'p-az', state: 'AZ', example: false, name: 'AZ', requiredFields: ['PID-3', 'OBR-3'], extensions: [], validationRules: ['finalReportOnly'] };
const fac = (id: string, state: string): Facility => ({ id, name: `Lab ${id}`, state, roles: ['performing_lab'], status: 'Active', cliaOrIsoNumber: '03D1' } as unknown as Facility);
const deps = (over: Partial<{ profiles: EpathStateProfile[]; facilities: Facility[] }> = {}): EpathPrepareDeps => ({
  profiles: async () => over.profiles ?? [az], assignments: async () => [], facilities: async () => over.facilities ?? [fac('f-az', 'AZ'), fac('f-ca', 'CA')],
  timezone: async () => 'America/Phoenix', now: () => '2026-10-19T19:00:00Z',
});
const theCase = (patientAddress: string, mrn = 'M1'): Case => ({
  patient: { mrn, firstName: 'Ana', lastName: 'Lopez', dateOfBirth: '1960-03-02', sex: 'F', address: patientAddress },
  accession: { fullAccession: 'S26-1' }, diagnostic: { primaryDiagnosis: 'Carcinoma', issuedDate: '2026-10-19T18:00:00Z' }, order: {}, specimens: [],
} as unknown as Case);

describe('prepareEpathSubmission', () => {
  it('is ready for the performing facility\'s state, whichever state the patient lives in', async () => {
    const r = await prepareEpathSubmission(theCase('1 Ocean Dr, Miami, FL'), 'f-az', deps());
    expect(r).toMatchObject({ outcome: 'ready', stateCode: 'AZ', via: 'facilityState', transport: 'phinMs', basisFacilityId: 'f-az' });
    if (r.outcome === 'ready') expect(r.message.split('\r')[0]).toContain('AZ');
  });
  it('goes to review with a routing code when the facility\'s state has no profile', async () => {
    expect(await prepareEpathSubmission(theCase('x'), 'f-ca', deps())).toMatchObject({ outcome: 'review', reviewCodes: ['routing:noProfile'] });
  });
  it('goes to review with a routing code when there is no facility', async () => {
    expect(await prepareEpathSubmission(theCase('x'), '', deps({ facilities: [] }))).toMatchObject({ outcome: 'review', reviewCodes: ['routing:noFacility'] });
  });
  it('goes to review naming the empty required field', async () => {
    const r = await prepareEpathSubmission(theCase('x', ''), 'f-az', deps());
    expect(r).toMatchObject({ outcome: 'review', reviewCodes: ['field:PID-3'] });
  });
});
