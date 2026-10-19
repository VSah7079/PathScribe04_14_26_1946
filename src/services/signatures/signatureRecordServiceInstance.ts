// src/services/signatures/signatureRecordServiceInstance.ts
// Batch 617 (PS-514): the app's signatureRecord service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpSignatureRecordService } from './httpSignatureRecordService';
import { mockSignatureRecordService } from './mockSignatureRecordService';
import type { ISignatureRecordService } from './ISignatureRecordService';

export const signatureRecordService: ISignatureRecordService = chooseService<ISignatureRecordService>('signatures', mockSignatureRecordService, createHttpSignatureRecordService);
