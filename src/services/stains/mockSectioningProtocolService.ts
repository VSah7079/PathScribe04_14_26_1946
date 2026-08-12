// src/services/stains/mockSectioningProtocolService.ts

import type { ServiceResult, ID } from '../types';
import type { ISectioningProtocolService, SectioningProtocol } from './IStainService';

let PROTOCOLS: SectioningProtocol[] = [
  { id: 'sp-single',  name: 'Single Level',    description: 'One section, standard depth.',                         version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'sp-x3',      name: 'Level x 3',       description: 'Three levels through the block.',                      version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'sp-serial',  name: 'Serial Sections', description: 'Consecutive sections, no gaps — for margin/mapping work.', version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'sp-deep',    name: 'Deep Cuts',       description: 'Additional levels well into the block, past the initial face.', version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
];

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const mockSectioningProtocolService: ISectioningProtocolService = {
  async getAll() {
    return ok([...PROTOCOLS]);
  },
  async add(entry) {
    const created: SectioningProtocol = {
      ...entry,
      id: `sp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version: 1, updatedBy: 'admin', updatedAt: new Date().toISOString(),
    };
    PROTOCOLS = [...PROTOCOLS, created];
    return ok(created);
  },
  async update(id: ID, changes) {
    let updated: SectioningProtocol | undefined;
    PROTOCOLS = PROTOCOLS.map(p => {
      if (p.id !== id) return p;
      updated = { ...p, ...changes, version: p.version + 1, updatedBy: 'admin', updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) return { ok: false, error: 'Not found' } as ServiceResult<SectioningProtocol>;
    return ok(updated);
  },
};
