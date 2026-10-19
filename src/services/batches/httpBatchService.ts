// src/services/batches/httpBatchService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 617 (PS-514): the API server's version of IBatchService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/CASE_WORKFLOWS_API.md.
// A refusal is a fixed code (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and
// never carries server text. Nothing that names a person or carries a token
// goes in a URL: those calls are POSTs.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, required, result } from '../apiServer/httpServiceKit';
import type { IBatchService } from './IBatchService';

type P<K extends keyof IBatchService> = Parameters<IBatchService[K]>;
const BASE = '/api/batches/batch';

export const createHttpBatchService = (client: ApiHttpClient): IBatchService =>
  buildHttpService<IBatchService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    getByMasterBarcode: result('GET', (barcode: P<'getByMasterBarcode'>[0]) => `${BASE}/get-by-master-barcode${queryString({ barcode })}`),
    create: result('POST', () => `${BASE}/create`, { body: (draft: P<'create'>[0]) => (draft) }),
    addItemByScan: required('POST', () => `${BASE}/add-item-by-scan`, { body: (batchId: P<'addItemByScan'>[0], scannedValue: P<'addItemByScan'>[1], byUserId: P<'addItemByScan'>[2], byUserName: P<'addItemByScan'>[3], fovCount: P<'addItemByScan'>[4]) => ({ batchId, scannedValue, byUserId, byUserName, fovCount }) }),
    removeItem: result('POST', () => `${BASE}/remove-item`, { body: (batchId: P<'removeItem'>[0], itemId: P<'removeItem'>[1], byUserId: P<'removeItem'>[2], byUserName: P<'removeItem'>[3]) => ({ batchId, itemId, byUserId, byUserName }) }),
    moveItem: result('POST', () => `${BASE}/move-item`, { body: (fromBatchId: P<'moveItem'>[0], itemId: P<'moveItem'>[1], toBatchId: P<'moveItem'>[2], byUserId: P<'moveItem'>[3], byUserName: P<'moveItem'>[4]) => ({ fromBatchId, itemId, toBatchId, byUserId, byUserName }) }),
    startReconciliation: result('POST', () => `${BASE}/start-reconciliation`, { body: (batchId: P<'startReconciliation'>[0], byUserId: P<'startReconciliation'>[1], byUserName: P<'startReconciliation'>[2]) => ({ batchId, byUserId, byUserName }) }),
    scanItemOut: result('POST', () => `${BASE}/scan-item-out`, { body: (batchId: P<'scanItemOut'>[0], scannedValue: P<'scanItemOut'>[1], byUserId: P<'scanItemOut'>[2], byUserName: P<'scanItemOut'>[3]) => ({ batchId, scannedValue, byUserId, byUserName }) }),
    completeReconciliation: result('POST', () => `${BASE}/complete-reconciliation`, { body: (batchId: P<'completeReconciliation'>[0]) => ({ batchId }) }),
    overrideAndComplete: result('POST', () => `${BASE}/override-and-complete`, { body: (batchId: P<'overrideAndComplete'>[0], byUserId: P<'overrideAndComplete'>[1], byUserName: P<'overrideAndComplete'>[2], reason: P<'overrideAndComplete'>[3]) => ({ batchId, byUserId, byUserName, reason }) }),
    setColdChainExcursion: result('POST', () => `${BASE}/set-cold-chain-excursion`, { body: (batchId: P<'setColdChainExcursion'>[0], readingId: P<'setColdChainExcursion'>[1], temperatureCelsius: P<'setColdChainExcursion'>[2], detectedAt: P<'setColdChainExcursion'>[3]) => ({ batchId, readingId, temperatureCelsius, detectedAt }) }),
    acknowledgeColdChainExcursion: result('POST', () => `${BASE}/acknowledge-cold-chain-excursion`, { body: (batchId: P<'acknowledgeColdChainExcursion'>[0], byUserId: P<'acknowledgeColdChainExcursion'>[1], byUserName: P<'acknowledgeColdChainExcursion'>[2], note: P<'acknowledgeColdChainExcursion'>[3]) => ({ batchId, byUserId, byUserName, note }) }),
    setCytologyInstrumentStatus: result('POST', () => `${BASE}/set-cytology-instrument-status`, { body: (batchId: P<'setCytologyInstrumentStatus'>[0], status: P<'setCytologyInstrumentStatus'>[1]) => ({ batchId, status }) }),
    setStainingInstrumentStatus: result('POST', () => `${BASE}/set-staining-instrument-status`, { body: (batchId: P<'setStainingInstrumentStatus'>[0], status: P<'setStainingInstrumentStatus'>[1]) => ({ batchId, status }) }),
    confirmQcVisualRead: result('POST', () => `${BASE}/confirm-qc-visual-read`, { body: (batchId: P<'confirmQcVisualRead'>[0], userId: P<'confirmQcVisualRead'>[1], userName: P<'confirmQcVisualRead'>[2]) => ({ batchId, userId, userName }) }),
    abort: result('POST', () => `${BASE}/abort`, { body: (batchId: P<'abort'>[0], byUserId: P<'abort'>[1], byUserName: P<'abort'>[2], reason: P<'abort'>[3]) => ({ batchId, byUserId, byUserName, reason }) }),
    releaseRack: result('POST', () => `${BASE}/release-rack`, { body: (batchId: P<'releaseRack'>[0], byUserId: P<'releaseRack'>[1], byUserName: P<'releaseRack'>[2]) => ({ batchId, byUserId, byUserName }) }),
    transferToProcessing: result('POST', () => `${BASE}/transfer-to-processing`, { body: (batchId: P<'transferToProcessing'>[0], byUserId: P<'transferToProcessing'>[1], byUserName: P<'transferToProcessing'>[2]) => ({ batchId, byUserId, byUserName }) }),
  });
