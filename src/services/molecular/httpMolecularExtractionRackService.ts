// src/services/molecular/httpMolecularExtractionRackService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-500): the API server's version of IMolecularExtractionRackService, built from the
// shared HTTP kit (docs/architecture/HTTP_SERVICES_PATTERN.md §7). One route
// per interface method; the calls are listed in docs/architecture/MOLECULAR_API.md.
// Every method answers with a ServiceResult, so a refusal is a fixed code
// (NOT_PERMITTED, NOT_FOUND, CONFLICT, ...) and never carries server text.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, queryString, result } from '../apiServer/httpServiceKit';
import type { IMolecularExtractionRackService } from './IMolecularExtractionRackService';

type P<K extends keyof IMolecularExtractionRackService> = Parameters<IMolecularExtractionRackService[K]>;
const BASE = '/api/molecular/molecular-extraction-rack';

export const createHttpMolecularExtractionRackService = (client: ApiHttpClient): IMolecularExtractionRackService =>
  buildHttpService<IMolecularExtractionRackService>(client, {
    getAll: result('GET', () => `${BASE}/get-all`),
    getById: result('GET', (id: P<'getById'>[0]) => `${BASE}/get-by-id${queryString({ id })}`),
    create: result('POST', () => `${BASE}/create`, { body: (rack: P<'create'>[0]) => (rack) }),
    loadSpecimenIntoPosition: result('POST', () => `${BASE}/load-specimen-into-position`, { body: (rackId: P<'loadSpecimenIntoPosition'>[0], positionLabel: P<'loadSpecimenIntoPosition'>[1], specimen: P<'loadSpecimenIntoPosition'>[2], movement: P<'loadSpecimenIntoPosition'>[3]) => ({ rackId, positionLabel, specimen, movement }) }),
    setPositionAccession: result('POST', () => `${BASE}/set-position-accession`, { body: (rackId: P<'setPositionAccession'>[0], positionLabel: P<'setPositionAccession'>[1], accessionNumber: P<'setPositionAccession'>[2]) => ({ rackId, positionLabel, accessionNumber }) }),
    placeOnDeck: result('POST', () => `${BASE}/place-on-deck`, { body: (rackId: P<'placeOnDeck'>[0], placement: P<'placeOnDeck'>[1], requirements: P<'placeOnDeck'>[2]) => ({ rackId, placement, requirements }) }),
    findPositionByContainerBarcode: result('GET', (containerBarcode: P<'findPositionByContainerBarcode'>[0]) => `${BASE}/find-position-by-container-barcode${queryString({ containerBarcode })}`),
  });
