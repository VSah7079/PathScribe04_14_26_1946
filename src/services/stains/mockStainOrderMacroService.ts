// src/services/stains/mockStainOrderMacroService.ts
// ─────────────────────────────────────────────────────────────
// Composes ONE StainType + ONE SectioningProtocol into a single-click
// ordering preset — "H&E x 3" as one macro, backed by two orthogonal
// dictionary entries underneath. A macro is a convenience pointer, not
// a third independent concept: deleting a macro never deletes the
// StainType/SectioningProtocol it points to, and the same StainType can
// appear in multiple macros with different sectioning (e.g. "H&E" for a
// single level and "H&E x 3" for three levels are two macros, one
// underlying stain).
// ─────────────────────────────────────────────────────────────

import type { ServiceResult, ID } from '../types';
import type { IStainOrderMacroService, StainOrderMacro } from './IStainService';

let MACROS: StainOrderMacro[] = [
  { id: 'macro-he',       label: 'H&E',              stainTypeId: 'st-he',    sectioningProtocolId: 'sp-single', sortOrder: 1, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'macro-he-x3',    label: 'H&E x 3',          stainTypeId: 'st-he',    sectioningProtocolId: 'sp-x3',      sortOrder: 2, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'macro-pas',      label: 'PAS',              stainTypeId: 'st-pas',   sectioningProtocolId: 'sp-single', sortOrder: 3, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'macro-gms',      label: 'GMS',              stainTypeId: 'st-gms',   sectioningProtocolId: 'sp-single', sortOrder: 4, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'macro-p63-ck56', label: 'p63/CK5/6 Dual Stain', stainTypeId: 'st-p63-ck56', sectioningProtocolId: 'sp-single', sortOrder: 5, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
  { id: 'macro-ki67',     label: 'Ki-67 IHC',        stainTypeId: 'st-ki67',  sectioningProtocolId: 'sp-single', sortOrder: 6, version: 1, updatedBy: 'system', updatedAt: new Date().toISOString(), active: true },
];

const ok = <T>(data: T): ServiceResult<T> => ({ ok: true, data });

export const mockStainOrderMacroService: IStainOrderMacroService = {
  async getAll() {
    return ok([...MACROS].sort((a, b) => a.sortOrder - b.sortOrder));
  },
  async add(entry) {
    const created: StainOrderMacro = {
      ...entry,
      id: `macro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version: 1, updatedBy: 'admin', updatedAt: new Date().toISOString(),
    };
    MACROS = [...MACROS, created];
    return ok(created);
  },
  async update(id: ID, changes) {
    let updated: StainOrderMacro | undefined;
    MACROS = MACROS.map(m => {
      if (m.id !== id) return m;
      updated = { ...m, ...changes, version: m.version + 1, updatedBy: 'admin', updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) return { ok: false, error: 'Not found' } as ServiceResult<StainOrderMacro>;
    return ok(updated);
  },
};
