// src/services/deficiencies/mockResolutionTypeService.ts

import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { ResolutionType, IResolutionTypeService } from './IDeficiencyService';

const SEED_RESOLUTION_TYPES: ResolutionType[] = [
  { id: 'res-matched-existing', name: 'Matched to Existing Dictionary Entry', description: 'Accessioner identified the correct existing Specimen Dictionary entry.', status: 'Active' },
  { id: 'res-confirmed-custom', name: 'Confirmed as Custom Specimen (No Dictionary Match)', description: 'Accessioner confirmed no dictionary entry applies — proceeding as a manually entered specimen.', status: 'Active' },
  { id: 'res-new-dict-entry', name: 'New Dictionary Entry Created', description: 'A new Specimen Dictionary entry was created to cover this specimen type.', status: 'Active' },
  { id: 'res-returned-to-clinician', name: 'Returned to Clinician for Clarification', description: 'Sent back to the submitting client/physician for correction.', status: 'Active' },
  { id: 'res-resolved-accessioner', name: 'Resolved by Accessioner — No Further Action', description: 'Accessioner resolved the issue directly; no escalation needed.', status: 'Active' },
  { id: 'res-relabeled', name: 'Relabeled per Lab Confirmation', description: 'Label corrected after confirming details with the originating lab/facility.', status: 'Active' },
  { id: 'res-value-corrected', name: 'Value Corrected', description: 'The underlying field was updated directly — see the deficiency comment for what changed, from what, to what.', status: 'Active' },
  {
    id: 'res-fixation-documented', name: 'Fixation Time Documented', status: 'Active',
    description: 'The actual fixative-added time was recorded (from the requisition, OR log, or accessioner\u2019s direct observation) and entered.',
  },
  {
    id: 'res-fixation-estimated', name: 'Fixation Time Estimated \u2014 Documentation Unavailable', status: 'Active',
    description: 'The surgical suite did not document the actual time. A professional best estimate was entered instead and permanently flagged as an estimate wherever this time is later shown \u2014 not presented as a verified fact.',
  },
  {
    id: 'res-fixation-unrecoverable', name: 'Confirmed Unavailable \u2014 No Estimate Possible', status: 'Active',
    description: 'Neither a documented time nor a reasonable estimate could be established. Case proceeds to sign-out on this explicit, audited override \u2014 last resort, used only when Fixation Time Estimated genuinely isn\u2019t possible.',
  },
];

const load    = () => storageGet<ResolutionType[]>('pathscribe_resolution_types', SEED_RESOLUTION_TYPES);
const persist = (data: ResolutionType[]) => storageSet('pathscribe_resolution_types', data);
let TYPES: ResolutionType[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockResolutionTypeService: IResolutionTypeService = {
  async getAll() { await delay(); return ok([...TYPES]); },

  async add(type) {
    await delay();
    const newT: ResolutionType = { ...type, id: 'res-' + Date.now() };
    TYPES = [...TYPES, newT];
    persist(TYPES);
    return ok({ ...newT });
  },

  async update(id, changes) {
    await delay();
    const idx = TYPES.findIndex(t => t.id === id);
    if (idx === -1) return err(`Resolution type ${id} not found`);
    TYPES = TYPES.map(t => t.id === id ? { ...t, ...changes } : t);
    return ok({ ...TYPES[idx], ...changes });
  },

  async deactivate(id) { return mockResolutionTypeService.update(id, { status: 'Inactive' }); },
  async reactivate(id) { return mockResolutionTypeService.update(id, { status: 'Active' }); },
};
