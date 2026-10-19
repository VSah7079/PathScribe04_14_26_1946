// src/services/routingRules/routingRuleServiceInstance.ts
// Batch 616: the app's routing rules (facility, physician and protocol maps) service, exported from `@/services` as `routingRuleService`.
// The mock in the demo; the API server's version when an address is configured.
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpRoutingRuleService } from './httpRoutingRuleService';
import { mockRoutingRuleService } from './mockRoutingRuleService';
import type { IRoutingRuleService } from './IRoutingRuleService';

export const routingRuleService: IRoutingRuleService = chooseService<IRoutingRuleService>('routing-rules', mockRoutingRuleService, createHttpRoutingRuleService);
