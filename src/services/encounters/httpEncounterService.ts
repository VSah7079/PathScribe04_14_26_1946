// src/services/encounters/httpEncounterService.ts
// Batch 616 (PS-503): the API server's encounters (visits). Contract: PATIENTS_API.md section 3.
// Updates carry the event time of the message that caused them; the SERVER decides whether an older
// event is stale (`applied: false`), the same rule the mock applies.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, result } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { Encounter, IEncounterService } from './IEncounterService';

type Args<K extends keyof IEncounterService> = Parameters<IEncounterService[K]>;
const BASE = '/api/encounters/encounter';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpEncounterService(client: ApiHttpClient): IEncounterService {
  const routes = buildHttpService<IEncounterService>(client, {
    getById: result('GET', (encounterId: Args<'getById'>[0]) => `${route('getById')}${queryString({ encounterId })}`),
    listForPatient: result('GET', (patientId: Args<'listForPatient'>[0]) => `${route('listForPatient')}${queryString({ patientId })}`, { pick: (d: ItemsReply<Encounter>) => itemsOf(d) }),
    // The encounter number is an identifier, so it goes in the body.
    getByEncounterNumber: result('POST', () => route('getByEncounterNumber'), { body: (organisationId: string, encounterNumber: string) => ({ organisationId, encounterNumber }) }),
    resolveOrCreateEncounter: result('POST', () => route('resolveOrCreateEncounter'), { body: (input: unknown) => input }),
    updateStatus: result('POST', () => route('updateStatus'), { body: (encounterId: string, status: string, eventTimestamp: string, dischargeTime?: string, dischargeDisposition?: string) => ({ encounterId, status, eventTimestamp, dischargeTime, dischargeDisposition }) }),
    updateLocation: result('POST', () => route('updateLocation'), { body: (encounterId: string, locationId: string, eventTimestamp: string) => ({ encounterId, locationId, eventTimestamp }) }),
    updateClass: result('POST', () => route('updateClass'), { body: (encounterId: string, encounterClass: string, eventTimestamp: string) => ({ encounterId, encounterClass, eventTimestamp }) }),
    updateMetadata: result('POST', () => route('updateMetadata'), { body: (encounterId: string, changes: unknown, eventTimestamp: string) => ({ encounterId, changes, eventTimestamp }) }),
    updateDiagnoses: result('POST', () => route('updateDiagnoses'), { body: (encounterId: string, diagnoses: unknown, eventTimestamp: string) => ({ encounterId, diagnoses, eventTimestamp }) }),
    cancelTransfer: result('POST', () => route('cancelTransfer'), { body: (encounterId: string, eventTimestamp: string) => ({ encounterId, eventTimestamp }) }),
    reassignPatient: result('POST', () => route('reassignPatient'), { body: (encounterId: string, sourcePatientId: string, targetPatientId: string, eventTimestamp: string) => ({ encounterId, sourcePatientId, targetPatientId, eventTimestamp }) }),
    changeEncounterNumber: result('POST', () => route('changeEncounterNumber'), { body: (encounterId: string, newEncounterNumber: string, eventTimestamp: string) => ({ encounterId, newEncounterNumber, eventTimestamp }) }),
  });
  // An encounter the server does not have is a normal answer ({ ok: true, data: null }), as in the mock.
  const orNull = <A extends unknown[]>(call: (...a: A) => Promise<{ ok: boolean; error?: string }>) =>
    (async (...a: A) => {
      const r = await call(...a);
      return r.ok === false && r.error === 'NOT_FOUND' ? { ok: true, data: null } : r;
    });
  return {
    ...routes,
    getById: orNull(routes.getById) as IEncounterService['getById'],
    getByEncounterNumber: orNull(routes.getByEncounterNumber) as IEncounterService['getByEncounterNumber'],
  };
}
