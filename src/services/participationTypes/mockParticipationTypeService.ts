// src/services/participationTypes/mockParticipationTypeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mock implementation of IParticipationTypeService.
// Reads/writes from localStorage so the Config screen and CaseTeamModal
// share the same data source.
//
// In production this is replaced by FirestoreParticipationTypeService,
// which reads the customer's participation_types collection seeded during
// tenant provisioning.
// ─────────────────────────────────────────────────────────────────────────────

import type { IParticipationTypeService, ParticipationTypeRecord, NewParticipationType } from './IParticipationTypeService';
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

// ─── Seed data (mirrors BUILT_IN_PARTICIPATION_TYPES in ParticipationTypesSection) ──

const SEED: ParticipationTypeRecord[] = [
  { id: 'primary',          label: 'Primary Pathologist',    description: 'Responsible pathologist — signs out the case',                       color: '#8AB4F8', icon: '🔬', allowsMultiple: false, requiresNote: false, active: true,  isSystem: true, sortOrder: 1, abbreviation: 'PATH',  requiresCountersign: false, canFinalize: true  },
  { id: 'resident',         label: 'Resident / Fellow',      description: 'Trainee assigned for supervised reporting',                           color: '#60a5fa', icon: '🎓', allowsMultiple: true,  requiresNote: false, active: true,  isSystem: true, sortOrder: 2, abbreviation: 'RES',   requiresCountersign: true,  canFinalize: false },
  { id: 'attending',        label: 'Attending / Supervisor',  description: 'Supervising pathologist for trainee cases',                           color: '#818cf8', icon: '👨‍⚕️', allowsMultiple: false, requiresNote: false, active: true,  isSystem: true, sortOrder: 3, abbreviation: 'ATT',   requiresCountersign: false, canFinalize: true  },
  { id: 'consultant',       label: 'Consultant',              description: 'Second opinion or specialist review — does not sign out',             color: '#38bdf8', icon: '💬', allowsMultiple: true,  requiresNote: true,  active: true,  isSystem: true, sortOrder: 4, abbreviation: 'CONS',  requiresCountersign: false, canFinalize: false },
  { id: 'grossing',         label: 'Grossing Pathologist',    description: 'Performed gross examination and dictation',                           color: '#81C995', icon: '✂️', allowsMultiple: false, requiresNote: false, active: true,  isSystem: true, sortOrder: 5, abbreviation: 'GROSS', requiresCountersign: false, canFinalize: false },
  { id: 'frozen',           label: 'Frozen Section',          description: 'Issued intraoperative frozen section report',                         color: '#4ade80', icon: '🧊', allowsMultiple: false, requiresNote: false, active: true,  isSystem: true, sortOrder: 6, abbreviation: 'FS',    requiresCountersign: false, canFinalize: false },
  { id: 'transcriptionist', label: 'Transcriptionist',        description: 'Transcribed dictated report',                                         color: '#6b7280', icon: '⌨️', allowsMultiple: false, requiresNote: false, active: true,  isSystem: true, sortOrder: 7, abbreviation: 'TRANS', requiresCountersign: false, canFinalize: false },
  { id: 'clinician',        label: 'Requesting Clinician',    description: 'Clinician who submitted the specimen — for notification tracking',    color: '#f59e0b', icon: '🏥', allowsMultiple: true,  requiresNote: false, active: true,  isSystem: true, sortOrder: 8, abbreviation: 'CLIN',  requiresCountersign: false, canFinalize: false },
  { id: 'external',         label: 'External Reviewer',       description: 'Outside institution or specialist — formal referral',                 color: '#8b5cf6', icon: '🌐', allowsMultiple: false, requiresNote: true,  active: true,  isSystem: true, sortOrder: 9, abbreviation: 'EXT',   requiresCountersign: false, canFinalize: false },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORE_KEY = 'pathscribe_participation_types_v2';

const load    = () => storageGet<ParticipationTypeRecord[]>(STORE_KEY, SEED);
const persist = (data: ParticipationTypeRecord[]) => storageSet(STORE_KEY, data);

let _cache: ParticipationTypeRecord[] = load();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok    = <T>(data: T): ServiceResult<T>    => ({ ok: true,  data });
const err   = <T>(msg: string): ServiceResult<T> => ({ ok: false, error: msg });
const delay = () => new Promise(r => setTimeout(r, 60));
const sorted = (list: ParticipationTypeRecord[]) =>
  [...list].sort((a, b) => a.sortOrder - b.sortOrder);

// ─── Service ──────────────────────────────────────────────────────────────────

export const mockParticipationTypeService: IParticipationTypeService = {

  async getAll() {
    await delay();
    return ok(sorted(_cache).map(t => ({ ...t })));
  },

  async getActive() {
    await delay();
    return ok(sorted(_cache).filter(t => t.active).map(t => ({ ...t })));
  },

  async getById(id: ID) {
    await delay();
    const found = _cache.find(t => t.id === id);
    return found ? ok({ ...found }) : err(`ParticipationType ${id} not found`);
  },

  async add(type: NewParticipationType) {
    await delay();
    const maxOrder = _cache.reduce((m, t) => Math.max(m, t.sortOrder), 0);
    const created: ParticipationTypeRecord = {
      ...type,
      id:        'CUSTOM_' + Date.now(),
      isSystem:  false,
      sortOrder: maxOrder + 1,
    };
    _cache = [..._cache, created];
    persist(_cache);
    return ok({ ...created });
  },

  async update(id: ID, changes: Partial<ParticipationTypeRecord>) {
    await delay();
    const idx = _cache.findIndex(t => t.id === id);
    if (idx === -1) return err(`ParticipationType ${id} not found`);
    const { isSystem: _ignored, ...safeChanges } = changes as any;
    _cache = _cache.map(t => t.id === id ? { ...t, ...safeChanges } : t);
    persist(_cache);
    return ok({ ..._cache.find(t => t.id === id)! });
  },

  async deactivate(id: ID) {
    return mockParticipationTypeService.update(id, { active: false });
  },

  async reactivate(id: ID) {
    return mockParticipationTypeService.update(id, { active: true });
  },

  async remove(id: ID) {
    await delay();
    const target = _cache.find(t => t.id === id);
    if (!target)         return err(`ParticipationType ${id} not found`);
    if (target.isSystem) return err(`Cannot delete system type "${id}"`);
    _cache = _cache.filter(t => t.id !== id);
    persist(_cache);
    return ok(undefined);
  },
};
