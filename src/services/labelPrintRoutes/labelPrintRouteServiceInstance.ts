// src/services/labelPrintRoutes/labelPrintRouteServiceInstance.ts
// Batch 730: the mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpLabelPrintRouteService } from './httpLabelPrintRouteService';
import { mockLabelPrintRouteService } from './mockLabelPrintRouteService';
import type { ILabelPrintRouteService } from './ILabelPrintRouteService';

export const labelPrintRouteService: ILabelPrintRouteService = chooseService<ILabelPrintRouteService>('labelPrintRoutes', mockLabelPrintRouteService, createHttpLabelPrintRouteService);
