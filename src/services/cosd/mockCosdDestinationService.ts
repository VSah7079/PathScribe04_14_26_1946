// src/services/cosd/mockCosdDestinationService.ts
// Batch 620 (part C, PS-800): browser-storage backed UK cancer registry destinations. Every change needs
// config:cosd-destination:manage (guardConfigWrites, audited). Nothing here holds patient data, credentials or endpoints.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { ICosdDestinationService } from './ICosdDestinationService';
import { validateDestination, type CosdDestination } from './cosdDestination';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const COSD_DESTINATION_KEY = 'cosd_destinations_v1';

const load = () => storageGet<CosdDestination[]>(COSD_DESTINATION_KEY, []);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

const unchecked: ICosdDestinationService = {
  async getAll() { return ok(load()); },
  async getForFacility(facilityId) { return ok(load().find(d => d.facilityId === facilityId) ?? null); },
  async set(input) {
    const problems = validateDestination(input);
    if (problems.length) return err(`Destination refused: ${problems.join(', ')}`);
    const all = load();
    const existing = all.find(d => d.facilityId === input.facilityId);
    const saved: CosdDestination = {
      id: existing?.id ?? `cosd-${input.facilityId ?? 'enterprise'}`, facilityId: input.facilityId, transport: input.transport,
      correctionWorkingDays: input.correctionWorkingDays, nonWorkingDates: [...new Set(input.nonWorkingDates)].sort(), updatedAt: new Date().toISOString(),
    };
    storageSet(COSD_DESTINATION_KEY, existing ? all.map(d => (d.id === saved.id ? saved : d)) : [...all, saved]);
    return ok(saved);
  },
  async remove(facilityId) {
    const all = load();
    if (!all.some(d => d.facilityId === facilityId)) return err('NOT_FOUND');
    storageSet(COSD_DESTINATION_KEY, all.filter(d => d.facilityId !== facilityId));
    return ok(undefined as void);
  },
};

export const mockCosdDestinationService: ICosdDestinationService = guardConfigWrites(unchecked, [
  ['config:cosd-destination:manage', ['set', 'remove']],
]);
