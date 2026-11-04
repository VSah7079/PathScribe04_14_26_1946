// src/services/facilityOpsDashboard/mockDisplayProfileService.ts
// Same real CRUD/seed/storage pattern as mockOrSuiteTerminalService.ts.
import { addOnAgeLimitValid, staleScanMinutesValid } from './displayProfileRules';
import type { IDisplayProfileService, DisplayProfile, NewDisplayProfile } from './IDisplayProfileService';
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import { withMissingSeedRecords } from '../mockSeedMerge';
import { DEMO_DISPLAY_PROFILE_IDS } from './demoDisplayProfileIds';
export { DEMO_DISPLAY_PROFILE_IDS };
import { guardConfigWrites } from '../authorization/guardConfigWrites';

const STORAGE_KEY = 'displayProfiles';

// One real, seeded profile so the kiosk binding screen and the admin
// registry both have something real to show out of the box — same
// real reasoning as OrSuiteTerminal's own single seed row, and the
// same real Fenwick General facility id every other seed in this app
// resolves against.
const DVMC = 'c-ent-dvmc';
const FIVE_VIEWS: DisplayProfile['assignedViews'] = ['grossing_intake', 'embedding_microtomy', 'staining_ihc', 'sendout_reference', 'diagnostic_signout'];
const demoProfile = (id: string, name: string, assignedViews: DisplayProfile['assignedViews'], facilityId: string = DVMC): DisplayProfile =>
  ({ id, name, facilityId, assignedViews, carouselIntervalSeconds: 20, status: 'Active', createdAt: '2026-10-31T00:00:00.000Z' });
const DEMO_DISPLAY_PROFILES: DisplayProfile[] = [
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.rotating, 'Desert Valley Lab — Main Wall (rotating)', FIVE_VIEWS),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.grossing, 'Desert Valley — Grossing and Intake', ['grossing_intake']),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.embedding, 'Desert Valley — Embedding and Microtome', ['embedding_microtomy']),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.staining, 'Desert Valley — Staining and IHC', ['staining_ihc']),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.sendOut, 'Desert Valley — Send-Out and Reference', ['sendout_reference']),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.signOut, 'Desert Valley — Sign-Out and Scanner', ['diagnostic_signout']),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.spare, 'Desert Valley — Spare Wall Display', FIVE_VIEWS),
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.revoked, 'Desert Valley — Old Break Room Display', FIVE_VIEWS),
  // The second facility, a quieter lab (cases/demoWallVolumeCases.ts).
  demoProfile(DEMO_DISPLAY_PROFILE_IDS.secondSite, 'Midwest Pathology — Histology Wall', ['grossing_intake', 'embedding_microtomy', 'staining_ihc'], 'c-ent-mpa'),
];

const SEED_PROFILES: DisplayProfile[] = [
  {
    id: 'dispprof-seed-histology',
    name: 'Histology Lab — Main Wall Display',
    facilityId: 'c-fenwick-general',
    assignedViews: ['grossing_intake', 'embedding_microtomy', 'staining_ihc'],
    carouselIntervalSeconds: 20,
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  // Batch 747 (Pete's seed row S8, Video 6): Desert Valley, the lab the demo cases belong to. One profile per
  // department view, one that rotates through all five, a spare, and one whose token the demo revokes (to show the
  // Display unavailable screen); and one at Midwest Pathology Associates, the second facility. Tokens are never seeded: Configuration → Demo Reset → Issue demo display tokens issues
  // them after each reset and shows them once (services/demoReset/demoDisplayTokens.ts).
  ...DEMO_DISPLAY_PROFILES,
];

// Batch 747: a seed profile missing from storage is added (profiles are deactivated, never deleted).
const load = (): DisplayProfile[] => {
  const { records, added } = withMissingSeedRecords(storageGet<DisplayProfile[] | null>(STORAGE_KEY, null), SEED_PROFILES);
  if (added > 0) storageSet(STORAGE_KEY, records);
  return records;
};
const persist = (data: DisplayProfile[]) => storageSet(STORAGE_KEY, data);
let _cache: DisplayProfile[] = load();

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err = (message: string): ServiceResult<never> => ({ ok: false, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

const displayProfileServiceUnchecked: IDisplayProfileService = {
  async getAll() {
    await delay();
    return ok([..._cache]);
  },

  async getActive() {
    await delay();
    return ok(_cache.filter(p => p.status === 'Active'));
  },

  async getById(id: ID) {
    await delay();
    const found = _cache.find(p => p.id === id);
    return found ? ok({ ...found }) : err(`DisplayProfile ${id} not found`);
  },

  async add(entry: NewDisplayProfile) {
    await delay();
    if (_cache.some(p => p.name.trim().toUpperCase() === entry.name.trim().toUpperCase())) {
      return err(`A display profile named "${entry.name}" already exists.`);
    }
    if (entry.assignedViews.length === 0) return err('At least one dashboard view must be assigned.');
    // Batch 727: the time X, whole minutes 15 to 1440 (displayProfileRules.ts).
    if (!addOnAgeLimitValid(entry.addOnAgeLimitMinutes)) return err('The time limit must be whole minutes from 15 to 1440.');
    if (!staleScanMinutesValid(entry.staleScanMinutes)) return err('The not-scanned time must be whole minutes from 30 to 10080.');
    const created: DisplayProfile = { ...entry, id: 'dispprof-' + Date.now(), createdAt: new Date().toISOString() };
    _cache = [..._cache, created];
    persist(_cache);
    return ok({ ...created });
  },

  async update(id: ID, changes) {
    await delay();
    const idx = _cache.findIndex(p => p.id === id);
    if (idx === -1) return err(`DisplayProfile ${id} not found`);
    if (changes.assignedViews && changes.assignedViews.length === 0) return err('At least one dashboard view must be assigned.');
    if ('addOnAgeLimitMinutes' in changes && !addOnAgeLimitValid(changes.addOnAgeLimitMinutes)) return err('The time limit must be whole minutes from 15 to 1440.');
    if ('staleScanMinutes' in changes && !staleScanMinutesValid(changes.staleScanMinutes)) return err('The not-scanned time must be whole minutes from 30 to 10080.');
    _cache = _cache.map(p => p.id === id ? { ...p, ...changes } : p);
    persist(_cache);
    return ok({ ..._cache.find(p => p.id === id)! });
  },

  async deactivate(id: ID) {
    return displayProfileServiceUnchecked.update(id, { status: 'Inactive' });
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockDisplayProfileService: IDisplayProfileService = guardConfigWrites(displayProfileServiceUnchecked, [
  ['config:display-profiles:manage', ['add', 'update', 'deactivate']],
]);
