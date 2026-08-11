// src/services/locations/mockLocationService.ts
// ─────────────────────────────────────────────────────────────────────────────
// See ILocationService.ts's own header for the full architectural
// rationale. Seeded with a few real, plausible locations at Fenwick
// General Hospital — the same demo facility this app's other seed data
// (Biopsy Array cases, TAT config) already builds around — so the
// findOrCreateByPV1 resolution path has real, matchable data to
// demonstrate against, not an empty dictionary that always auto-creates.
// ─────────────────────────────────────────────────────────────────────────────
import { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { Location, ILocationService } from './ILocationService';

const SEED_LOCATIONS: Location[] = [
  {
    id: 'loc-fgh-ward3-101',
    facilityId: 'c-fenwick-general',
    pointOfCare: 'Ward 3', room: '101', bed: 'A',
    locationStatus: 'Occupied', personLocationType: 'Bed',
    building: 'Main', floor: '1',
    status: 'Active',
  },
  {
    id: 'loc-fgh-ward3-102',
    facilityId: 'c-fenwick-general',
    pointOfCare: 'Ward 3', room: '102', bed: 'A',
    locationStatus: 'Unoccupied', personLocationType: 'Bed',
    building: 'Main', floor: '1',
    status: 'Active',
  },
  {
    id: 'loc-fgh-theatre-2',
    facilityId: 'c-fenwick-general',
    pointOfCare: 'Theatre 2',
    personLocationType: 'Operating Room',
    building: 'Main', floor: '2',
    status: 'Active',
  },
  {
    id: 'loc-fgh-pathology-lab',
    facilityId: 'c-fenwick-general',
    pointOfCare: 'Pathology Lab',
    personLocationType: 'Department',
    building: 'Annex', floor: 'G',
    status: 'Active',
  },
];

const load    = (): Location[] => storageGet<Location[]>('pathscribe_locations', SEED_LOCATIONS);
const persist = (data: Location[]) => storageSet('pathscribe_locations', data);

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockLocationService: ILocationService = {
  async getAll() { await delay(); return ok([...load()]); },

  async listForFacility(facilityId) {
    await delay();
    return ok(load().filter(l => l.facilityId === facilityId));
  },

  async getById(id: ID) {
    await delay();
    const l = load().find(l => l.id === id);
    return l ? ok({ ...l }) : err(`Location ${id} not found`);
  },

  async create(draft) {
    await delay();
    const locations = load();
    const nowIso = new Date().toISOString();
    const newLoc: Location = { ...draft, id: `loc-${Date.now().toString(36)}`, createdAt: nowIso, updatedAt: nowIso };
    persist([...locations, newLoc]);
    return ok({ ...newLoc });
  },

  async update(id, changes) {
    await delay();
    const locations = load();
    const idx = locations.findIndex(l => l.id === id);
    if (idx === -1) return err(`Location ${id} not found`);
    locations[idx] = { ...locations[idx], ...changes, updatedAt: new Date().toISOString() };
    persist(locations);
    return ok({ ...locations[idx] });
  },

  async deactivate(id) { return mockLocationService.update(id, { status: 'Inactive' }); },
  async reactivate(id) { return mockLocationService.update(id, { status: 'Active' }); },
  async verify(id) { return mockLocationService.update(id, { status: 'Active' }); },

  async findOrCreateByPV1(input) {
    await delay();
    const locations = load();
    // Real, direct crosswalk match on (facilityId, pointOfCare, room,
    // bed) — the real, standard identity of a location within one
    // facility. Case-insensitive, trimmed — same reasoning as
    // resolveStainType's own matching: PV1-3 is free-typed text from
    // an external system, not a strict, normalized key.
    const norm = (s?: string) => (s ?? '').trim().toLowerCase();
    const existing = locations.find(l =>
      l.facilityId === input.facilityId &&
      norm(l.pointOfCare) === norm(input.pointOfCare) &&
      norm(l.room) === norm(input.room) &&
      norm(l.bed) === norm(input.bed)
    );
    if (existing) return ok({ location: { ...existing }, outcome: 'matched' as const });

    const nowIso = new Date().toISOString();
    const newLoc: Location = {
      id: `loc-auto-${Date.now().toString(36)}`,
      facilityId: input.facilityId,
      pointOfCare: input.pointOfCare,
      room: input.room,
      bed: input.bed,
      hl7FacilityCode: input.hl7FacilityCode,
      locationStatus: input.locationStatus,
      personLocationType: input.personLocationType,
      building: input.building,
      floor: input.floor,
      status: 'Unverified',
      autoCreated: true,
      autoCreatedAt: nowIso,
      autoCreatedNote: `No crosswalk match for PV1-3 location "${[input.pointOfCare, input.room, input.bed].filter(Boolean).join('^')}" on an incoming ADT/ORM message — created pending admin review.`,
      createdAt: nowIso, updatedAt: nowIso,
    };
    persist([...locations, newLoc]);
    return ok({ location: { ...newLoc }, outcome: 'created' as const });
  },
};
