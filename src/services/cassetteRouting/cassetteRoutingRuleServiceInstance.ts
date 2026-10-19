// src/services/cassetteRouting/cassetteRoutingRuleServiceInstance.ts
// Batch 616: the app's cassette routing rules, exported from `@/services` as `cassetteRoutingRuleService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpCassetteRoutingRuleService } from './httpCassetteRoutingRuleService';
import { mockCassetteRoutingRuleService } from './mockCassetteRoutingRuleService';
import type { ICassetteRoutingRuleService } from './ICassetteRoutingRuleService';

export const cassetteRoutingRuleService: ICassetteRoutingRuleService = chooseService<ICassetteRoutingRuleService>('routing', mockCassetteRoutingRuleService, createHttpCassetteRoutingRuleService);
