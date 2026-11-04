// src/services/patients/httpPatientIndexService.ts
// Batch 616 (PS-503): the API server's master patient index (matching, merge, links, identifiers,
// demographics). Contract: docs/architecture/PATIENTS_API.md sections 1 to 3.
// Rules this file keeps:
//  - Anything that identifies a person (a search term, an identifier value, a name) goes in a POST BODY, never a
//    URL, so it is not left in server access logs or browser history.
//  - Matching, merging and moving a case are decided by the SERVER (it holds the full index); the browser
//    sends the candidate and gets the outcome. A refusal throws a fixed code (ApiCallError), because these
//    methods return records, not results, and a silent default would hide a refused merge.
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, done, list, methodPath, queryString, required, value } from '../apiServer/httpServiceKit';
import { itemsOf, type ItemsReply } from '../apiServer/replyShapes';
import type { NationalPatientIdentifier } from '@/types/patient/NationalPatientIdentifier';
import type { IPatientIndexService, MasterPatientRecord, PatientIdentifier, PatientLink, PatientLinkRelationshipType } from './IPatientIndexService';

type Args<K extends keyof IPatientIndexService> = Parameters<IPatientIndexService[K]>;
const BASE = '/api/patients/patient-index';
const route = (method: string): string => methodPath(BASE, method);

export const createHttpPatientIndexService = (client: ApiHttpClient): IPatientIndexService =>
  buildHttpService<IPatientIndexService>(client, {
    resolveOrCreatePatient: required('POST', () => route('resolveOrCreatePatient'), { body: (candidate: unknown) => candidate }),
    resolvePatientWithoutMatching: required('POST', () => route('resolvePatientWithoutMatching'), { body: (candidate: unknown) => candidate }),
    getById: value('GET', (patientId: Args<'getById'>[0]) => `${route('getById')}${queryString({ patientId })}`, { missing: null }),
    listPendingReview: list('GET', (organisationId: Args<'listPendingReview'>[0]) => `${route('listPendingReview')}${queryString({ organisationId })}`, { pick: (d: ItemsReply<MasterPatientRecord>) => itemsOf(d) }),
    listDowntimeRecords: list('GET', (organisationId: Args<'listDowntimeRecords'>[0]) => `${route('listDowntimeRecords')}${queryString({ organisationId })}`, { pick: (d: ItemsReply<MasterPatientRecord>) => itemsOf(d) }),
    searchPatients: list('POST', () => route('searchPatients'), { body: (organisationId: string, query: string) => ({ organisationId, query }), pick: (d: ItemsReply<MasterPatientRecord>) => itemsOf(d) }),
    confirmAsNewPatient: done('POST', () => route('confirmAsNewPatient'), { body: (patientId: Args<'confirmAsNewPatient'>[0]) => ({ patientId }) }),
    flagForReview: done('POST', () => route('flagForReview'), { body: (patientId: string, reason: string) => ({ patientId, reason }) }),
    mergeIntoExistingPatient: required('POST', () => route('mergeIntoExistingPatient'), { body: (provisionalPatientId: string, confirmedPatientId: string, suppressAdtEnqueue?: boolean) => ({ provisionalPatientId, confirmedPatientId, suppressAdtEnqueue: suppressAdtEnqueue === true }) }),
    moveCaseToPatient: required('POST', () => route('moveCaseToPatient'), { body: (caseId: string, sourcePatientId: string, targetPatientId: string, eventTimestamp: string) => ({ caseId, sourcePatientId, targetPatientId, eventTimestamp }) }),
    breakGlassRebind: required('POST', () => route('breakGlassRebind'), { body: (input: unknown) => input }),
    linkPatients: required('POST', () => route('linkPatients'), { body: (patientIdA: string, patientIdB: string, relationshipType: PatientLinkRelationshipType, linkedBy: string, reason?: string) => ({ patientIdA, patientIdB, relationshipType, linkedBy, reason }) }),
    getLinkedPatientIds: list('GET', (patientId: Args<'getLinkedPatientIds'>[0], relationshipType: Args<'getLinkedPatientIds'>[1]) => `${route('getLinkedPatientIds')}${queryString({ patientId, relationshipType })}`, { pick: (d: ItemsReply<string>) => itemsOf(d) }),
    listLinks: list('GET', (organisationId: Args<'listLinks'>[0]) => `${route('listLinks')}${queryString({ organisationId })}`, { pick: (d: ItemsReply<PatientLink>) => itemsOf(d) }),
    resolveByIdentifier: value('POST', () => route('resolveByIdentifier'), { body: (assigningAuthority: string, identifierValue: string) => ({ assigningAuthority, identifierValue }), pick: (d: { patientId?: string | null }) => d?.patientId ?? null, missing: null }),
    listIdentifiersForPatient: list('GET', (patientId: Args<'listIdentifiersForPatient'>[0]) => `${route('listIdentifiersForPatient')}${queryString({ patientId })}`, { pick: (d: ItemsReply<PatientIdentifier>) => itemsOf(d) }),
    getNationalIdentifierStatusCode: value('POST', () => route('getNationalIdentifierStatusCode'), { body: (system: string, identifierValue: string) => ({ system, value: identifierValue }), pick: (d: { statusCode?: string | null }) => d?.statusCode ?? null, missing: null }),
    addIdentifier: required('POST', () => route('addIdentifier'), { body: (patientId: string, assigningAuthority: string, identifierValue: string, source?: 'resolution' | 'manual') => ({ patientId, assigningAuthority, identifierValue, source: source ?? 'resolution' }) }),
    recordNationalIdentifier: required('POST', () => route('recordNationalIdentifier'), { body: (patientId: string, identifier: NationalPatientIdentifier) => ({ patientId, identifier }) }),
    listNationalIdentifiers: list('GET', (patientId: Args<'listNationalIdentifiers'>[0]) => `${route('listNationalIdentifiers')}${queryString({ patientId })}`, { pick: (d: ItemsReply<NationalPatientIdentifier>) => itemsOf(d) }),
    removeNationalIdentifier: done('POST', () => route('removeNationalIdentifier'), { body: (patientId: Args<'removeNationalIdentifier'>[0], system: Args<'removeNationalIdentifier'>[1]) => ({ patientId, system }) }),
    setRegistryConsent: done('POST', () => route('setRegistryConsent'), { body: (patientId: string, consent: unknown) => ({ patientId, consent: consent ?? null }) }),
    updateDemographics: required('POST', () => route('updateDemographics'), { body: (patientId: string, demographics: unknown, eventTimestamp: string) => ({ patientId, demographics, eventTimestamp }) }),
  });
