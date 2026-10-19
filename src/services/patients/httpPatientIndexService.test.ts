import { describe, expect, it } from 'vitest';
import { expectCalls, expectEveryMethod, fakeApi, type CallCase } from '../apiServer/httpTestHelpers';
import { createHttpPatientIndexService } from './httpPatientIndexService';

const cand = { firstName: 'A', lastName: 'B' };
const natId = { system: 'NHS', value: '123' };
const cases: CallCase[] = [
  ['resolveOrCreatePatient', [cand], 'POST', '/api/patients/patient-index/resolve-or-create-patient', cand],
  ['resolvePatientWithoutMatching', [cand], 'POST', '/api/patients/patient-index/resolve-patient-without-matching', cand],
  ['getById', ['p 1'], 'GET', '/api/patients/patient-index/get-by-id?patientId=p%201'],
  ['listPendingReview', ['o1'], 'GET', '/api/patients/patient-index/list-pending-review?organisationId=o1'],
  ['listDowntimeRecords', ['o1'], 'GET', '/api/patients/patient-index/list-downtime-records?organisationId=o1'],
  ['searchPatients', ['o1', 'Smith, J'], 'POST', '/api/patients/patient-index/search-patients', {"organisationId": "o1", "query": "Smith, J"}],
  ['confirmAsNewPatient', ['p1'], 'POST', '/api/patients/patient-index/confirm-as-new-patient', {"patientId": "p1"}],
  ['flagForReview', ['p1', 'why'], 'POST', '/api/patients/patient-index/flag-for-review', {"patientId": "p1", "reason": "why"}],
  ['mergeIntoExistingPatient', ['p1', 'p2', true], 'POST', '/api/patients/patient-index/merge-into-existing-patient', {"provisionalPatientId": "p1", "confirmedPatientId": "p2", "suppressAdtEnqueue": true}],
  ['moveCaseToPatient', ['c1', 'p1', 'p2', 't'], 'POST', '/api/patients/patient-index/move-case-to-patient', {"caseId": "c1", "sourcePatientId": "p1", "targetPatientId": "p2", "eventTimestamp": "t"}],
  ['breakGlassRebind', [{ downtimePatientId: 'd' }], 'POST', '/api/patients/patient-index/break-glass-rebind', {"downtimePatientId": "d"}],
  ['linkPatients', ['a', 'b', 'same_person', 'u', 'r'], 'POST', '/api/patients/patient-index/link-patients', {"patientIdA": "a", "patientIdB": "b", "relationshipType": "same_person", "linkedBy": "u", "reason": "r"}],
  ['getLinkedPatientIds', ['p1', 'family_relation'], 'GET', '/api/patients/patient-index/get-linked-patient-ids?patientId=p1&relationshipType=family_relation'],
  ['listLinks', ['o1'], 'GET', '/api/patients/patient-index/list-links?organisationId=o1'],
  ['resolveByIdentifier', ['MRN-A', '99'], 'POST', '/api/patients/patient-index/resolve-by-identifier', {"assigningAuthority": "MRN-A", "identifierValue": "99"}],
  ['listIdentifiersForPatient', ['p1'], 'GET', '/api/patients/patient-index/list-identifiers-for-patient?patientId=p1'],
  ['getNationalIdentifierStatusCode', ['NHS', '123'], 'POST', '/api/patients/patient-index/get-national-identifier-status-code', {"system": "NHS", "value": "123"}],
  ['addIdentifier', ['p1', 'MRN-A', '99'], 'POST', '/api/patients/patient-index/add-identifier', {"patientId": "p1", "assigningAuthority": "MRN-A", "identifierValue": "99", "source": "resolution"}],
  ['recordNationalIdentifier', ['p1', natId], 'POST', '/api/patients/patient-index/record-national-identifier', { patientId: 'p1', identifier: natId }],
  ['listNationalIdentifiers', ['p1'], 'GET', '/api/patients/patient-index/list-national-identifiers?patientId=p1'],
  ['removeNationalIdentifier', ['p1', 'N HS'], 'POST', '/api/patients/patient-index/remove-national-identifier', {"patientId": "p1", "system": "N HS"}],
  ['setRegistryConsent', ['p1', undefined], 'POST', '/api/patients/patient-index/set-registry-consent', {"patientId": "p1", "consent": null}],
  ['updateDemographics', ['p1', { phone: '1' }, 't'], 'POST', '/api/patients/patient-index/update-demographics', {"patientId": "p1", "demographics": {"phone": "1"}, "eventTimestamp": "t"}],
];
describe('createHttpPatientIndexService', () => {
  it('sends the contract calls', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpPatientIndexService(client);
    expectEveryMethod(s, cases); await expectCalls(s, fetch, cases);
  });
  it('nothing that identifies a person is ever in a URL', async () => {
    const { client, fetch } = fakeApi(200, {});
    const s = createHttpPatientIndexService(client);
    await s.searchPatients('o1', 'Smith, John 1960-01-01');
    await s.resolveByIdentifier('MRN-A', 'MRN12345');
    await s.getNationalIdentifierStatusCode('NHS', '4857773456');
    const urls = fetch.mock.calls.map(c => String(c[0]));
    expect(urls.join(' ')).not.toMatch(/Smith|MRN12345|4857773456/);
  });
  it('reads: a missing patient is null, lists come from { items }, a failed list is empty', async () => {
    expect(await createHttpPatientIndexService(fakeApi(404).client).getById('zz')).toBeNull();
    expect(await createHttpPatientIndexService(fakeApi(200, { items: [{ id: 'p1' }] }).client).listLinks('o')).toEqual([{ id: 'p1' }]);
    expect(await createHttpPatientIndexService(fakeApi(500).client).listLinks('o')).toEqual([]);
  });
  it('an identifier lookup gives the patient id, or null when none', async () => {
    expect(await createHttpPatientIndexService(fakeApi(200, { patientId: 'p9' }).client).resolveByIdentifier('A', '1')).toBe('p9');
    expect(await createHttpPatientIndexService(fakeApi(200, {}).client).resolveByIdentifier('A', '1')).toBeNull();
    expect(await createHttpPatientIndexService(fakeApi(404).client).resolveByIdentifier('A', '1')).toBeNull();
  });
  it('a refused merge or move throws a code and never answers with a made-up outcome', async () => {
    const s = createHttpPatientIndexService(fakeApi(403, { message: 'Smith' }).client);
    await expect(s.mergeIntoExistingPatient('p1', 'p2')).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
    await expect(s.moveCaseToPatient('c', 'p1', 'p2', 't')).rejects.toMatchObject({ code: 'NOT_PERMITTED' });
    await expect(s.resolveOrCreatePatient(cand as never)).rejects.not.toHaveProperty('message', expect.stringContaining('Smith'));
  });
  it('a merge gives the counts the server returns', async () => {
    const out = { casesRepointed: 2, caseIds: ['a', 'b'], encountersRepointed: 1 };
    expect(await createHttpPatientIndexService(fakeApi(200, out).client).mergeIntoExistingPatient('p1', 'p2')).toEqual(out);
  });
  it('a refused one-way write (flag, consent) throws a code', async () => {
    await expect(createHttpPatientIndexService(fakeApi(409).client).flagForReview('p1', 'r')).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
