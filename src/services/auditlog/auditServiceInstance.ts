// src/services/auditlog/auditServiceInstance.ts
// Batch 616 (PS-484): the app's auditService, exported from `@/services`.
// The mock in the demo; the API server's with an address (docs/architecture/HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpAuditService } from './httpAuditService';
import { mockAuditService } from './mockAuditService';
import type { IAuditService } from './IAuditService';

export const auditService: IAuditService = chooseService<IAuditService>('auditlog', mockAuditService, createHttpAuditService);
