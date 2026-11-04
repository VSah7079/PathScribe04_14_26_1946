// src/services/stainQc/stainQcServiceInstance.ts
// Batch 763: the app's QC checkpoint service, exported from `@/services`: the mock in the demo, the API server's version
// when an address is configured. `stainQcSystem` is the part the batch and scanner workflows call (open a run's QC,
// the stainer's own sign-off, images waiting at unload): in the demo the browser does it; with an API server the server
// does it when the rack moves or the scan batch unloads, so here it does nothing.
import { chooseService, usesApiServer } from '../apiServer/serviceSelection';
import { createHttpStainQcService } from './httpStainQcService';
import { mockStainQcService } from './mockStainQcService';
import type { IStainQcService } from './IStainQcService';
import type { StainQcService } from './stainQcService';

export const stainQcService: IStainQcService = chooseService<IStainQcService>('stainQc', mockStainQcService, createHttpStainQcService);

type System = Pick<StainQcService, 'openRun' | 'runQc' | 'vendorRunResult' | 'queueImages' | 'scannerMode'>;
const serverDoesIt: System = {
  openRun: async r => ({ batchId: r.batchId, masterBarcode: r.masterBarcode, stainerEquipmentId: null, mode: 'autoAccept', status: 'passed', slides: r.slides, openedAt: new Date().toISOString() }),
  runQc: async () => null,
  vendorRunResult: async () => ({ ok: false, error: 'NOT_FOUND' }),
  queueImages: async () => undefined,
  scannerMode: async () => 'autoAccept',
};
export const stainQcSystem: System = usesApiServer('stainQc') ? serverDoesIt : mockStainQcService;
