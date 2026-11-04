import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpEncounterService } from './httpEncounterService';

const cases: CallCase[] = [
  ['getById', ['e 1'], 'GET', '/api/encounters/encounter/get-by-id?encounterId=e%201'],
  ['listForPatient', ['p1'], 'GET', '/api/encounters/encounter/list-for-patient?patientId=p1'],
  ['getByEncounterNumber', ['o1', 'V-99'], 'POST', '/api/encounters/encounter/get-by-encounter-number', {"organisationId": "o1", "encounterNumber": "V-99"}],
  ['resolveOrCreateEncounter', [{ organisationId: 'o1', patientId: 'p1', encounterNumber: 'V-1', encounterClass: 'I' }], 'POST', '/api/encounters/encounter/resolve-or-create-encounter', {"organisationId": "o1", "patientId": "p1", "encounterNumber": "V-1", "encounterClass": "I"}],
  ['updateStatus', ['e1', 'discharged', 't', 'd', 'home'], 'POST', '/api/encounters/encounter/update-status', {"encounterId": "e1", "status": "discharged", "eventTimestamp": "t", "dischargeTime": "d", "dischargeDisposition": "home"}],
  ['updateLocation', ['e1', 'l1', 't'], 'POST', '/api/encounters/encounter/update-location', {"encounterId": "e1", "locationId": "l1", "eventTimestamp": "t"}],
  ['updateClass', ['e1', 'O', 't'], 'POST', '/api/encounters/encounter/update-class', {"encounterId": "e1", "encounterClass": "O", "eventTimestamp": "t"}],
  ['updateMetadata', ['e1', { hospitalService: 'S' }, 't'], 'POST', '/api/encounters/encounter/update-metadata', {"encounterId": "e1", "changes": {"hospitalService": "S"}, "eventTimestamp": "t"}],
  ['updateDiagnoses', ['e1', [{ code: 'C' }], 't'], 'POST', '/api/encounters/encounter/update-diagnoses', {"encounterId": "e1", "diagnoses": [{"code": "C"}], "eventTimestamp": "t"}],
  ['cancelTransfer', ['e1', 't'], 'POST', '/api/encounters/encounter/cancel-transfer', {"encounterId": "e1", "eventTimestamp": "t"}],
  ['reassignPatient', ['e1', 'p1', 'p2', 't'], 'POST', '/api/encounters/encounter/reassign-patient', {"encounterId": "e1", "sourcePatientId": "p1", "targetPatientId": "p2", "eventTimestamp": "t"}],
  ['changeEncounterNumber', ['e1', 'V-2', 't'], 'POST', '/api/encounters/encounter/change-encounter-number', {"encounterId": "e1", "newEncounterNumber": "V-2", "eventTimestamp": "t"}],
];
describe('createHttpEncounterService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpEncounterService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('an encounter the server does not have is { ok: true, data: null }', async () => {
    const s = createHttpEncounterService(fakeApi(404).client);
    expect(await s.getById('zz')).toEqual({ ok: true, data: null });
    expect(await s.getByEncounterNumber('o', 'V')).toEqual({ ok: true, data: null });
  });
  it('other refusals stay refusals, and an update that was stale says applied: false', async () => {
    expect(await createHttpEncounterService(fakeApi(403).client).getById('e')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const stale = { encounter: { id: 'e1' }, applied: false };
    expect(await createHttpEncounterService(fakeApi(200, stale).client).updateLocation('e1', 'l', 't')).toEqual({ ok: true, data: stale });
  });
  it('the encounter number is never in a URL', async () => {
    const { client, fetch } = fakeApi(200, {});
    await createHttpEncounterService(client).getByEncounterNumber('o1', 'V-SECRET-77');
    expect(String(fetch.mock.calls[0][0])).not.toContain('SECRET');
  });
});
