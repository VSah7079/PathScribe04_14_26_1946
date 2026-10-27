// src/services/usEpath/mockUsEpathService.ts
// Batch 620 (part E, PS-800): browser-storage backed ePath profiles and assignments. Every change needs
// config:us-epath:manage (guardConfigWrites, audited). Nothing here holds patient data.
import { storageGet, storageSet } from '../mockStorage';
import type { ServiceResult } from '../types';
import type { IUsEpathService } from './IUsEpathService';
import { EXAMPLE_PROFILE_ID, normalizeFieldList, seedProfiles, validateProfile, type EpathProfileAssignment, type EpathStateProfile } from './epathProfile';
import { guardConfigWrites } from '../authorization/guardConfigWrites';

export const US_EPATH_PROFILES_KEY = 'us_epath_profiles_v1';
export const US_EPATH_ASSIGNMENTS_KEY = 'us_epath_assignments_v1';

const loadProfiles = () => storageGet<EpathStateProfile[]>(US_EPATH_PROFILES_KEY, seedProfiles('2026-10-19T00:00:00.000Z'));
const loadAssignments = () => storageGet<EpathProfileAssignment[]>(US_EPATH_ASSIGNMENTS_KEY, []);
const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const unchecked: IUsEpathService = {
  async getProfiles() { return ok(loadProfiles()); },
  async saveProfile(input) {
    const all = loadProfiles();
    const existing = input.id ? all.find(p => p.id === input.id) : undefined;
    if (input.id && !existing) return err('NOT_FOUND');
    if (existing?.example) return err('EXAMPLE_READ_ONLY');
    const profile: EpathStateProfile = {
      id: input.id ?? newId('epp'), state: input.state.trim().toUpperCase(), example: false, name: input.name.trim(),
      requiredFields: normalizeFieldList(input.requiredFields), optionalFields: normalizeFieldList(input.optionalFields),
      transport: input.transport, validationRules: input.validationRules, facilityBasis: input.facilityBasis,
      extensions: input.extensions.map(e => ({ ...e, field: e.field.trim().toUpperCase() })), updatedAt: new Date().toISOString(),
    };
    const problems = validateProfile(profile);
    if (problems.length) return err(`Profile refused: ${problems.join(', ')}`);
    storageSet(US_EPATH_PROFILES_KEY, existing ? all.map(p => (p.id === profile.id ? profile : p)) : [...all, profile]);
    return ok(profile);
  },
  async removeProfile(id) {
    const all = loadProfiles();
    if (id === EXAMPLE_PROFILE_ID) return err('EXAMPLE_READ_ONLY');
    if (!all.some(p => p.id === id)) return err('NOT_FOUND');
    if (loadAssignments().some(a => a.profileId === id)) return err('IN_USE');
    storageSet(US_EPATH_PROFILES_KEY, all.filter(p => p.id !== id));
    return ok(undefined as void);
  },
  async getAssignments() { return ok(loadAssignments()); },
  async setAssignment(input) {
    if (!loadProfiles().some(p => p.id === input.profileId)) return err('PROFILE_NOT_FOUND');
    const next: EpathProfileAssignment = { id: newId('epa'), facilityId: input.facilityId, profileId: input.profileId, updatedAt: new Date().toISOString() };
    storageSet(US_EPATH_ASSIGNMENTS_KEY, [...loadAssignments().filter(a => a.facilityId !== input.facilityId), next]);
    return ok(next);
  },
  async removeAssignment(facilityId) {
    const all = loadAssignments();
    if (!all.some(a => a.facilityId === facilityId)) return err('NOT_FOUND');
    storageSet(US_EPATH_ASSIGNMENTS_KEY, all.filter(a => a.facilityId !== facilityId));
    return ok(undefined as void);
  },
};

export const mockUsEpathService: IUsEpathService = guardConfigWrites(unchecked, [
  ['config:us-epath:manage', ['saveProfile', 'removeProfile', 'setAssignment', 'removeAssignment']],
]);
