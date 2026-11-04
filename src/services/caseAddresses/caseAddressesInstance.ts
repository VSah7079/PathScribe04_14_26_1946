// src/services/caseAddresses/caseAddressesInstance.ts — Batch 446.
// The app's one case-address instance, on this build's support references.
// Production: the API server issues and resolves the references.
import { supportReferenceService } from '../supportReferences/supportReferenceServiceInstance';
import { createCaseAddresses } from './caseAddresses';

export const caseAddresses = createCaseAddresses(supportReferenceService);
