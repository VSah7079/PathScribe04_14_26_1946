// src/services/coldChain/telemetryReadingServiceInstance.ts
// Batch 616: the app's telemetry readings, exported from `@/services` as `telemetryReadingService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpTelemetryReadingService } from './httpTelemetryReadingService';
import { mockTelemetryReadingService } from './mockTelemetryReadingService';
import type { ITelemetryReadingService } from './ITelemetryReadingService';

export const telemetryReadingService: ITelemetryReadingService = chooseService<ITelemetryReadingService>('cold-chain', mockTelemetryReadingService, createHttpTelemetryReadingService);
