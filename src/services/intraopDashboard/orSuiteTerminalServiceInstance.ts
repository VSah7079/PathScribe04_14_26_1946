// src/services/intraopDashboard/orSuiteTerminalServiceInstance.ts
// Batch 616: the app's or suite terminals, exported from `@/services` as `orSuiteTerminalService`. The mock in the demo;
// the API server's version when a server address is configured (HTTP_SERVICES_PATTERN.md).
import { chooseService } from '../apiServer/serviceSelection';
import { createHttpOrSuiteTerminalService } from './httpOrSuiteTerminalService';
import { mockOrSuiteTerminalService } from './mockOrSuiteTerminalService';
import type { IOrSuiteTerminalService } from './IOrSuiteTerminalService';

export const orSuiteTerminalService: IOrSuiteTerminalService = chooseService<IOrSuiteTerminalService>('intraop', mockOrSuiteTerminalService, createHttpOrSuiteTerminalService);
