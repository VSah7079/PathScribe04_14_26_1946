// src/services/scanStations/scanStationServiceInstance.ts
// Batch 616: the app's scan stations, exported from `@/services` as `scanStationService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpScanStationService } from './httpScanStationService';
import { mockScanStationService } from './mockScanStationService';
import type { IScanStationService } from './IScanStationService';

export const scanStationService: IScanStationService = chooseService<IScanStationService>('grossing', mockScanStationService, createHttpScanStationService);
