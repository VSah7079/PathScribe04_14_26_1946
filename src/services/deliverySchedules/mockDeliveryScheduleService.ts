// src/services/deliverySchedules/mockDeliveryScheduleService.ts
// Batch 619 (PS-800): browser-storage backed delivery schedules. Every change needs
// config:delivery-schedules:manage (guardConfigWrites, audited). Nothing here holds patient data.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IDeliveryScheduleService } from './IDeliveryScheduleService';
import { IMMEDIATE_SCHEDULE, validateSchedule, type DeliveryScheduleEntry } from './deliverySchedule';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const DELIVERY_SCHEDULES_KEY = 'delivery_schedules_v1';

// The demo starts with the report feed held until final sign-out and billing sent in a nightly batch; the rest immediate.
const seed = (): DeliveryScheduleEntry[] => [
  { id: 'dsch-ent-report', feed: 'report_delivery', facilityId: null, registryKey: null, schedule: { ...IMMEDIATE_SCHEDULE, kind: 'hold_until_sign_out' }, updatedAt: '2026-10-19T00:00:00.000Z' },
  { id: 'dsch-ent-billing', feed: 'billing_delivery', facilityId: null, registryKey: null, schedule: { ...IMMEDIATE_SCHEDULE, kind: 'batch', batchFrequency: 'weekly', batchDays: [1, 2, 3, 4, 5], batchTimes: ['22:00'], timeZone: 'America/New_York' }, updatedAt: '2026-10-19T00:00:00.000Z' },
];
const load = () => storageGet<DeliveryScheduleEntry[]>(DELIVERY_SCHEDULES_KEY, seed());
const same = (e: DeliveryScheduleEntry, feed: string, facilityId: string | null, registryKey: string | null) =>
  e.feed === feed && e.facilityId === facilityId && (e.registryKey ?? null) === registryKey;
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });

const unchecked: IDeliveryScheduleService = {
  async getAll() { return ok(load()); },
  async getForFacility(facilityId) { return ok(load().filter(e => e.facilityId === facilityId)); },
  async set(input) {
    const problems = validateSchedule(input.schedule);
    if (problems.length) return err(`Schedule refused: ${problems.join(', ')}`);
    const registryKey = input.registryKey ?? null;
    if ((input.feed === 'registry') !== (registryKey !== null)) return err('Schedule refused: registryRequired');
    const all = load();
    const entry: DeliveryScheduleEntry = {
      id: all.find(e => same(e, input.feed, input.facilityId, registryKey))?.id ?? `dsch-${input.feed}-${input.facilityId ?? 'enterprise'}-${registryKey ?? 'all'}`,
      feed: input.feed, facilityId: input.facilityId, registryKey, schedule: input.schedule, updatedAt: new Date().toISOString(),
    };
    storageSet(DELIVERY_SCHEDULES_KEY, [...all.filter(e => e.id !== entry.id), entry]);
    return ok(entry);
  },
  async remove(feed, facilityId, registryKey = null) {
    const all = load();
    if (!all.some(e => same(e, feed, facilityId, registryKey))) return err('NOT_FOUND');
    storageSet(DELIVERY_SCHEDULES_KEY, all.filter(e => !same(e, feed, facilityId, registryKey)));
    return ok(undefined as void);
  },
};

export const mockDeliveryScheduleService: IDeliveryScheduleService = guardConfigWrites(unchecked, [
  ['config:delivery-schedules:manage', ['set', 'remove']],
]);
