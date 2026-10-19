// src/services/patientHistory/patientHistoryInstance.ts
// Batch 616 (PS-503): the patient history cache and LIS lookup as the app uses them. Mock in the demo; the API server's with an address.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPatientHistoryCacheService, createHttpPatientHistoryLisService } from './httpPatientHistoryServices';
import { mockPatientHistoryCacheService } from './mockPatientHistoryCacheService';
import { mockPatientHistoryLisService } from './mockPatientHistoryLisService';
import type { IPatientHistoryCacheService } from './IPatientHistoryCacheService';
import type { IPatientHistoryLisService } from './IPatientHistoryLisService';

export const patientHistoryCacheService: IPatientHistoryCacheService = chooseService<IPatientHistoryCacheService>('patient history', mockPatientHistoryCacheService, createHttpPatientHistoryCacheService);
export const patientHistoryLisService: IPatientHistoryLisService = chooseService<IPatientHistoryLisService>('patient history', mockPatientHistoryLisService, createHttpPatientHistoryLisService);
