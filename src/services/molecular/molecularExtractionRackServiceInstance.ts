// src/services/molecular/molecularExtractionRackServiceInstance.ts
// Batch 616 (PS-500): the app's molecularExtractionRack service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpMolecularExtractionRackService } from './httpMolecularExtractionRackService';
import { mockMolecularExtractionRackService } from './mockMolecularExtractionRackService';
import type { IMolecularExtractionRackService } from './IMolecularExtractionRackService';

export const molecularExtractionRackService: IMolecularExtractionRackService = chooseService<IMolecularExtractionRackService>('molecular', mockMolecularExtractionRackService, createHttpMolecularExtractionRackService);
