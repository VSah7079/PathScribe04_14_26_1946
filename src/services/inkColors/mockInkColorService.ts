// src/services/inkColors/mockInkColorService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Structured Inking, Module 3 (PS-359 follow-up). Same browser-storage +
// guardConfigWrites shape as mockCassetteColorService.ts, simplified per
// IInkColorService.ts's own doc comment (no key/fallback/lab-scope fields).
//
// Seeded with the common histology margin-inking colours — real codes a
// grossing tech would actually reach for, not placeholders.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import type { InkColor, IInkColorService } from './IInkColorService';
import type { ID } from '../types';

const INK_COLORS: InkColor[] = [
  { id: 'ink-black', name: 'Black', code: '#000000', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
  { id: 'ink-blue', name: 'Blue', code: '#0000FF', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
  { id: 'ink-green', name: 'Green', code: '#008000', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
  { id: 'ink-yellow', name: 'Yellow', code: '#FFD700', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
  { id: 'ink-orange', name: 'Orange', code: '#FFA500', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
  { id: 'ink-red', name: 'Red', code: '#FF0000', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
  { id: 'ink-violet', name: 'Violet', code: '#8A2BE2', active: true, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: '2026-10-07T00:00:00.000Z' },
];

const STORAGE_KEY = 'ink_colors';

function load(): InkColor[] {
  return storageGet<InkColor[]>(STORAGE_KEY, INK_COLORS);
}

function save(colors: InkColor[]): void {
  storageSet(STORAGE_KEY, colors);
}

const inkColorServiceUnchecked: IInkColorService = {
  async getAll() {
    return { ok: true, data: load() };
  },

  async getById(id: ID) {
    const found = load().find(c => c.id === id);
    if (!found) return { ok: false, error: `No ink color found for id '${id}'.` };
    return { ok: true, data: found };
  },

  async create(draft) {
    const all = load();
    const now = new Date().toISOString();
    const created: InkColor = { ...draft, id: `ink-${Date.now()}`, createdAt: now, updatedAt: now };
    save([...all, created]);
    return { ok: true, data: created };
  },

  async update(id: ID, changes) {
    const all = load();
    const idx = all.findIndex(c => c.id === id);
    if (idx === -1) return { ok: false, error: `No ink color found for id '${id}'.` };
    const updated: InkColor = { ...all[idx], ...changes, updatedAt: new Date().toISOString() };
    const next = [...all];
    next[idx] = updated;
    save(next);
    return { ok: true, data: updated };
  },

  async deactivate(id: ID) {
    return inkColorServiceUnchecked.update(id, { active: false });
  },

  async reactivate(id: ID) {
    return inkColorServiceUnchecked.update(id, { active: true });
  },
};

/** Every change needs config:ink-color:manage (guardConfigWrites) — same
 *  pattern as every other Configuration dictionary in this app. */
export const mockInkColorService: IInkColorService = guardConfigWrites(inkColorServiceUnchecked, [
  ['config:ink-color:manage', ['create', 'update', 'deactivate', 'reactivate']],
]);
