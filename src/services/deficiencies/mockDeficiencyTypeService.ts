// src/services/deficiencies/mockDeficiencyTypeService.ts

import type { ServiceResult, ID } from '../types';
import { storageGet, storageSet } from '../mockStorage';
import type { DeficiencyType, IDeficiencyTypeService } from './IDeficiencyService';

// Starter set — one concrete type this session actually needs
// ("Could Not Match Specimen to Dictionary"), plus a handful of the more
// common CoPathPlus-equivalent categories so the dictionary isn't empty
// on first use. All admin-editable; none of these are load-bearing code,
// just seed data.
const SEED_DEFICIENCY_TYPES: DeficiencyType[] = [
  { id: 'def-no-dict-match', name: 'Could Not Match Specimen to Dictionary', description: 'Order specimen text did not exactly match any active Specimen Dictionary entry.', status: 'Active' },
  { id: 'def-label-mismatch', name: 'Label Mismatch', description: 'Container/slide label does not match the requisition.', status: 'Active' },
  { id: 'def-container-damaged', name: 'Container Damaged', description: 'Specimen container arrived broken, leaking, or otherwise compromised.', status: 'Active' },
  { id: 'def-insufficient-volume', name: 'Insufficient Volume', description: 'Fluid/tissue quantity received is inadequate for the ordered testing.', status: 'Active' },
  { id: 'def-missing-requisition', name: 'Missing Requisition', description: 'Specimen received without accompanying paperwork or order.', status: 'Active' },
  { id: 'def-order-discrepancy', name: 'Specimen/Order Discrepancy', description: 'Specimen received does not match what the order describes.', status: 'Active' },
  {
    id: 'def-post-hoc-correction', name: 'Post-Hoc Correction', status: 'Active',
    description: 'A value entered at accessioning was corrected later — nobody necessarily did anything wrong at the time; the original entry simply turned out to be incorrect. Always raised and resolved together, since the whole point is to document what changed, not to leave a lingering open item.',
  },
  {
    id: 'def-missing-fixation-time', name: 'Missing Fixation Time', status: 'Active',
    description: 'Specimen type requires cold-ischemia/fixation timing (CAP/ASCO biomarker guidance, e.g. breast ER/PR/HER2) but no fixative-added time has been documented. Blocks case sign-out until resolved — see Resolution Types for the three legitimate ways to resolve it (documented, estimated, or confirmed unrecoverable).',
  },
];

const load    = () => storageGet<DeficiencyType[]>('pathscribe_deficiency_types', SEED_DEFICIENCY_TYPES);
const persist = (data: DeficiencyType[]) => storageSet('pathscribe_deficiency_types', data);
let TYPES: DeficiencyType[] = load();

const ok    = <T>(data: T): ServiceResult<T> => ({ ok: true, data });
const err   = <T>(error: string): ServiceResult<T> => ({ ok: false, error });
const delay = () => new Promise(r => setTimeout(r, 80));

export const mockDeficiencyTypeService: IDeficiencyTypeService = {
  async getAll() { await delay(); return ok([...TYPES]); },

  async add(type) {
    await delay();
    const newT: DeficiencyType = { ...type, id: 'def-' + Date.now() };
    TYPES = [...TYPES, newT];
    persist(TYPES);
    return ok({ ...newT });
  },

  async update(id, changes) {
    await delay();
    const idx = TYPES.findIndex(t => t.id === id);
    if (idx === -1) return err(`Deficiency type ${id} not found`);
    TYPES = TYPES.map(t => t.id === id ? { ...t, ...changes } : t);
    return ok({ ...TYPES[idx], ...changes });
  },

  async deactivate(id) { return mockDeficiencyTypeService.update(id, { status: 'Inactive' }); },
  async reactivate(id) { return mockDeficiencyTypeService.update(id, { status: 'Active' }); },
};
