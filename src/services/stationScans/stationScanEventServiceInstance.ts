// src/services/stationScans/stationScanEventServiceInstance.ts
// Batch 726: the app's station scan event service, exported from `@/services`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpStationScanEventService } from './httpStationScanEventService';
import { mockStationScanEventService } from './mockStationScanEventService';
import type { IStationScanEventService } from './IStationScanEventService';

export const stationScanEventService: IStationScanEventService = chooseService<IStationScanEventService>('stationScans', mockStationScanEventService, createHttpStationScanEventService);
