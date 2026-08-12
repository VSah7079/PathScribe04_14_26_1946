// src/services/locations/mockLocationService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

const { mockLocationService } = await import('./mockLocationService');

describe('mockLocationService — findOrCreateByPV1', () => {
  beforeEach(() => { store.clear(); });

  it('matches an existing, real seeded location on (facilityId, pointOfCare, room, bed)', async () => {
    const res = await mockLocationService.findOrCreateByPV1({
      facilityId: 'c-fenwick-general',
      pointOfCare: 'Ward 3', room: '101', bed: 'A',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.outcome).toBe('matched');
    expect(res.data.location.id).toBe('loc-fgh-ward3-101');
  });

  it('matches case-insensitively and with surrounding whitespace — PV1-3 is free-typed text from an external system, not a strict key', async () => {
    const res = await mockLocationService.findOrCreateByPV1({
      facilityId: 'c-fenwick-general',
      pointOfCare: '  ward 3  ', room: '101', bed: 'a',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.outcome).toBe('matched');
    expect(res.data.location.id).toBe('loc-fgh-ward3-101');
  });

  it('creates a real, new Unverified location — never silently accepted as Active — when no crosswalk match exists', async () => {
    const res = await mockLocationService.findOrCreateByPV1({
      facilityId: 'c-fenwick-general',
      pointOfCare: 'Ward 7', room: '712', bed: 'B',
      locationStatus: 'O', personLocationType: 'B', building: 'Tower1', floor: '3',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.outcome).toBe('created');
    expect(res.data.location.status).toBe('Unverified');
    expect(res.data.location.autoCreated).toBe(true);
    expect(res.data.location.autoCreatedNote).toContain('Ward 7^712^B');
    expect(res.data.location.locationStatus).toBe('O');
    expect(res.data.location.personLocationType).toBe('B');
    expect(res.data.location.building).toBe('Tower1');
    expect(res.data.location.floor).toBe('3');
  });

  it('never creates a duplicate for a repeat reference to the same real location — resolves to the one, real, existing record', async () => {
    const first = await mockLocationService.findOrCreateByPV1({
      facilityId: 'c-fenwick-general', pointOfCare: 'Ward 9', room: '901',
    });
    const second = await mockLocationService.findOrCreateByPV1({
      facilityId: 'c-fenwick-general', pointOfCare: 'Ward 9', room: '901',
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.data.outcome).toBe('created');
    expect(second.data.outcome).toBe('matched');
    expect(second.data.location.id).toBe(first.data.location.id);
  });

  it('scopes matching to the correct facility — the same pointOfCare/room at a different facility is a genuinely different location', async () => {
    const res = await mockLocationService.findOrCreateByPV1({
      facilityId: 'c-fenwick-womens', // real, different facility — same ward/room string as the Fenwick General seed
      pointOfCare: 'Ward 3', room: '101', bed: 'A',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.outcome).toBe('created'); // no match — this facility has no such location configured
    expect(res.data.location.facilityId).toBe('c-fenwick-womens');
  });
});

describe('mockLocationService — listForFacility', () => {
  beforeEach(() => { store.clear(); });

  it('returns only the real, seeded locations for the requested facility', async () => {
    const res = await mockLocationService.listForFacility('c-fenwick-general');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every(l => l.facilityId === 'c-fenwick-general')).toBe(true);
  });

  it('returns an empty list for a facility with no configured locations', async () => {
    const res = await mockLocationService.listForFacility('c-does-not-exist');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toEqual([]);
  });
});
