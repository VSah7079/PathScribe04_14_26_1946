// src/services/diagnosisCodes/diagnosisCodesServiceInstance.ts
// Batch 617 (PS-514): the app's diagnosisCodes service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpDiagnosisCodesService } from './httpDiagnosisCodesService';
import { mockDiagnosisCodesService } from './mockDiagnosisCodesService';
import type { IDiagnosisCodesService } from './IDiagnosisCodesService';

export const diagnosisCodesService: IDiagnosisCodesService = chooseService<IDiagnosisCodesService>('diagnosisCodes', mockDiagnosisCodesService, createHttpDiagnosisCodesService);
