// src/services/participationTypes/mockParticipationTypeService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Mock implementation of IParticipationTypeService.
// Reads/writes from localStorage so the Config screen and CaseTeamModal
// share the same data source.
//
// July 2026 consolidation: this service is now the ONE canonical source for
// participation types. Previously, ParticipationTypesSection.tsx (the admin
// screen) and RoleDictionary.tsx's Case Participation tab each read/wrote a
// SEPARATE local list (components/Config/System/ParticipationTypesSection.tsx's
// own BUILT_IN_PARTICIPATION_TYPES + a different localStorage key with no
// _v2 suffix) that had drifted to contain different types entirely from
// what this service (and therefore CaseTeamModal, the actual feature) used.
// Both files have been updated to use this service directly -- see their
// own file headers for what changed.
//
// The final 8-type list below was defined directly by Pete (July 2026),
// reconciling both of the previously-separate lists. Dropped entirely
// (existed in one of the two old lists, not in the final list): Transcriptionist,
// Requesting Clinician, External Reviewer, Preliminary Report, Observer,
// Tumour Board.
//
// INTERNATIONAL NAMING REFERENCE (not yet implemented as real localization
// -- captured here so it isn't lost, for whenever jurisdiction-aware
// labels become a real feature):
//   Standard Role              | UK & Ireland                          | Canada                          | Australia & NZ                | EU
//   Attending/Primary Path.    | Consultant Pathologist                | Attending/Staff Pathologist     | Consultant Pathologist        | Pathologist/Specialist Doctor (e.g. Facharzt, Germany)
//   Resident/Fellow            | Specialty Registrar (StR)/Fellow      | Resident/Clinical Fellow        | Pathology Registrar/Fellow    | Resident/Trainee Specialist
//   Co-Signer/Supervisor       | Educational Supervisor/Sr. Consultant | Co-Signer/Supervising Pathologist| Supervising Consultant       | Supervising Pathologist
//   Grossing/PA                | Pathology Associate/BMS               | Pathologists' Assistant (PA)    | Anatomic Path. Tech/BMS       | Dissection Technician/PA
//   Cytotechnologist           | Cytotechnologist/BMS Cytology         | Cytotechnologist                | Cytotechnologist              | Cytotechnologist
//
// In production this is replaced by FirestoreParticipationTypeService,
// which reads the customer's participation_types collection seeded during
// tenant provisioning.
// ─────────────────────────────────────────────────────────────────────────────

import type { IParticipationTypeService, ParticipationTypeRecord, NewParticipationType } from './IParticipationTypeService';
import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';

// ─── Seed data — the ONE canonical list, per Pete's final refined role list ──

const SEED: ParticipationTypeRecord[] = [
  { id: 'primary',          label: 'Attending / Primary Pathologist', description: 'The credentialed pathologist responsible for final sign-out and diagnosis.',                                                                                              color: '#8AB4F8', icon: '🔬',   allowsMultiple: false, requiresNote: false, active: true, isSystem: true, sortOrder: 1, abbreviation: 'PATH',  requiresCountersign: false, canFinalize: true,  canBeAssignedTemplate: true,  canViewWholeCase: true  },
  { id: 'resident',         label: 'Resident / Fellow',               description: 'Trainee drafting the report; requires Attending co-signature.',                                                                                                              color: '#60a5fa', icon: '🎓',   allowsMultiple: true,  requiresNote: false, active: true, isSystem: true, sortOrder: 2, abbreviation: 'RES',   requiresCountersign: true,  canFinalize: false, canBeAssignedTemplate: true,  canViewWholeCase: true  },
  { id: 'attending',        label: 'Co-Signer / Supervisor',          description: 'Supervising/co-signing pathologist — covers resident and fellow oversight (CLIA/CAP/ACGME), FPPE proctoring for onboarding attendings, PA gross-description sign-off, and mandatory QA double-reads.', color: '#818cf8', icon: '👨‍⚕️', allowsMultiple: false, requiresNote: false, active: true, isSystem: true, sortOrder: 3, abbreviation: 'ATT',   requiresCountersign: false, canFinalize: true,  canBeAssignedTemplate: true,  canViewWholeCase: true  },
  { id: 'grossing',         label: 'Grossing / PA',                   description: 'Pathologist Assistant, Resident, or Histotech who performed the gross examination and dissection.',                                                                          color: '#81C995', icon: '✂️',   allowsMultiple: true,  requiresNote: false, active: true, isSystem: true, sortOrder: 4, abbreviation: 'GROSS', requiresCountersign: true,  canFinalize: false, canBeAssignedTemplate: false, canViewWholeCase: true  },
  { id: 'cytotechnologist', label: 'Cytotechnologist',                description: 'Screened cytology slides and provided initial diagnostic triage/assessment.',                                                                                              color: '#f59e0b', icon: '🧫',   allowsMultiple: true,  requiresNote: false, active: true, isSystem: true, sortOrder: 5, abbreviation: 'CYTO',  requiresCountersign: true,  canFinalize: false, canBeAssignedTemplate: true,  canViewWholeCase: false },
  { id: 'consultant',       label: 'Consultant / Subspecialist',      description: 'Internal expert or subspecialist reviewing slides for internal consultation.',                                                                                             color: '#38bdf8', icon: '💬',   allowsMultiple: true,  requiresNote: true,  active: true, isSystem: true, sortOrder: 6, abbreviation: 'CONS',  requiresCountersign: false, canFinalize: false, canBeAssignedTemplate: true,  canViewWholeCase: false },
  { id: 'frozen',           label: 'Frozen Section Pathologist',      description: 'Pathologist who performed/interpreted the intraoperative frozen section diagnosis.',                                                                                       color: '#4ade80', icon: '🧊',   allowsMultiple: false, requiresNote: false, active: true, isSystem: true, sortOrder: 7, abbreviation: 'FS',    requiresCountersign: true,  canFinalize: false, canBeAssignedTemplate: true,  canViewWholeCase: false },
  { id: 'second_opinion',   label: 'Second Opinion',                  description: 'Secondary attending performing a mandatory QA double-read (e.g. breast/prostate core QA).',                                                                               color: '#818cf8', icon: '🔎',   allowsMultiple: true,  requiresNote: false, active: true, isSystem: true, sortOrder: 8, abbreviation: '2nd Op', requiresCountersign: false, canFinalize: false, canBeAssignedTemplate: true,  canViewWholeCase: true  },
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
