// src/services/printRouting/printRoutingRuleServiceInstance.ts
// Batch 616: the app's print routing rules service, exported from `@/services` as `printRoutingRuleService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpPrintRoutingRuleService } from './httpPrintRoutingRuleService';
import { mockPrintRoutingRuleService } from './mockPrintRoutingRuleService';
import type { IPrintRoutingRuleService } from './IPrintRoutingRuleService';

export const printRoutingRuleService: IPrintRoutingRuleService = chooseService<IPrintRoutingRuleService>('print-routing', mockPrintRoutingRuleService, createHttpPrintRoutingRuleService);
