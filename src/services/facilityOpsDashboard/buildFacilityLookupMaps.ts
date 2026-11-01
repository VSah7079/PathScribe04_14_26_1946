// src/services/facilityOpsDashboard/buildFacilityLookupMaps.ts
// Real, shared helper — every one of PS-288's five summary functions
// needs the same two real join maps (case accession -> performing
// facility, scan station -> facility) to resolve a Batch's real
// facility (see resolveBatchFacilityId.ts's own header for why a
// Batch has no direct facilityId). Built once per real call here
// rather than five separate, independent case/station fetches.

import { caseRouter } from '@/services/cases/CaseRouter';
import { scanStationService as mockScanStationService } from '@/services/scanStations/scanStationServiceInstance';
import type { PathologyCase } from '@/services/cases/ICaseService';
import { facilityService } from '@/services/facilities/facilityServiceInstance';
import { caseFacilityId } from './caseFacility';

export interface FacilityLookupMaps {
  accessionToFacilityId: Map<string, string>;
  stationToFacilityId: Map<string, string>;
  /** Real, keyed by Case.id — the same case list every summary
   *  function that also needs case-level data (priority, specimens)
   *  reuses, rather than a second, separate fetch. */
  casesById: Map<string, PathologyCase>;
  /** Batch 747: Case.id → the facility id it belongs to (a legacy tenant id resolved, caseFacility.ts). */
  caseFacilityById: Map<string, string>;
}

export async function buildFacilityLookupMaps(): Promise<FacilityLookupMaps> {
  const [casesRes, stationsRes, facilitiesRes] = await Promise.all([
    caseRouter.getAll(undefined, { bypassAccessControl: true, includeOrchestration: true }),
    mockScanStationService.getAll(),
    facilityService.getAll(),
  ]);
  const facilities = facilitiesRes.ok ? facilitiesRes.data : [];

  const accessionToFacilityId = new Map<string, string>();
  const casesById = new Map<string, PathologyCase>();
  const caseFacilityById = new Map<string, string>();
  if (casesRes.ok) {
    for (const c of casesRes.data) {
      casesById.set(c.id, c);
      const fullAccession = c.accession?.fullAccession ?? c.id;
      const facilityId = caseFacilityId(c.originHospitalId, facilities);
      if (facilityId) { accessionToFacilityId.set(fullAccession, facilityId); caseFacilityById.set(c.id, facilityId); }
    }
  }

  const stationToFacilityId = new Map<string, string>();
  if (stationsRes.ok) {
    for (const s of stationsRes.data) stationToFacilityId.set(s.id, s.facilityId);
  }

  return { accessionToFacilityId, stationToFacilityId, casesById, caseFacilityById };
}
