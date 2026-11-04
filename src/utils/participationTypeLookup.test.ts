// src/utils/participationTypeLookup.test.ts — Batch 335: the cache is cleared after a save.
import { describe, it, expect, vi } from 'vitest';
// Batch 428: these tests are about the service, not who may use it, so Configuration
// changes are allowed here (the check itself: authorization/guardConfigWrites.test.ts).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { getParticipationTypeLookup, invalidateParticipationTypeLookup } from './participationTypeLookup';
import { mockParticipationTypeService } from '../services/participationTypes/mockParticipationTypeService';

describe('participationTypeLookup', () => {
  it('shares one fetch until invalidated, then reads the saved data', async () => {
    const first = getParticipationTypeLookup();
    expect(getParticipationTypeLookup()).toBe(first);
    const before = (await first).find(t => t.id === 'resident')!;
    await mockParticipationTypeService.update('resident', { jurisdictionProfiles: { ...before.jurisdictionProfiles, US: { label: 'PGY Resident' } } });
    expect((await getParticipationTypeLookup()).find(t => t.id === 'resident')!.jurisdictionProfiles?.US).toBeUndefined();
    invalidateParticipationTypeLookup();
    expect((await getParticipationTypeLookup()).find(t => t.id === 'resident')!.jurisdictionProfiles?.US).toEqual({ label: 'PGY Resident' });
  });
});
