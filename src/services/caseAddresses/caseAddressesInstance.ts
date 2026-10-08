// src/services/caseAddresses/caseAddressesInstance.ts — Batch 446.
// The app's one case-address instance, on this build's support references.
// Production: the API server issues and resolves the references.
import { mockSupportReferenceService } from '../supportReferences/mockSupportReferenceService';
import { createCaseAddresses } from './caseAddresses';

export const caseAddresses = createCaseAddresses(mockSupportReferenceService);
