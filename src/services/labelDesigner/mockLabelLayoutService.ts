// src/services/labelDesigner/mockLabelLayoutService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Real, per direct follow-up (PS-245) — see ILabelLayoutService.ts's
// own header for the full architectural account. Real resolution
// logic (Enterprise default vs. facility override) lives in that same
// file's own resolveLabelLayoutForFacility() — a real, separate, pure
// function — not duplicated here.
// ─────────────────────────────────────────────────────────────────────────────

import { storageGet, storageSet } from '../mockStorage';
import { LABEL_TYPE_ALLOWS_FACILITY_OVERRIDE, resolveLabelLayoutForFacility } from './ILabelLayoutService';
import type { ILabelLayoutService, LabelLayout, LabelType } from './ILabelLayoutService';
import { guardConfigWrites } from '../authorization/guardConfigWrites';
import { fieldsOutOfBounds, LABEL_LAYOUT_OUT_OF_BOUNDS } from './labelFieldGeometry';

const STORE_KEY = 'label_designer_layouts';
const ok = <T>(data: T) => ({ ok: true as const, data });
const err = (message: string) => ({ ok: false as const, error: message });
const delay = () => new Promise(res => setTimeout(res, 30));

const load = (): LabelLayout[] => storageGet(STORE_KEY, []);
const persist = (data: LabelLayout[]) => storageSet(STORE_KEY, data);

const labelLayoutServiceUnchecked: ILabelLayoutService = {
  async getByLabelType(labelType: LabelType, facilityId?: string) {
    await delay();
    return ok(resolveLabelLayoutForFacility(labelType, facilityId, load()) ?? null);
  },

  async save(layout) {
    await delay();
    // Real, honest refusal, per this file's own header — never a
    // silent downgrade to "save as Enterprise default instead."
    if (layout.facilityId && !LABEL_TYPE_ALLOWS_FACILITY_OVERRIDE[layout.labelType]) {
      return err(`"${layout.labelType}" is a real, locked Enterprise-standard label type — facility-level overrides are not allowed for it.`);
    }
    // Batch 460 (PS-245): a field past the label's physical edge would print off the label.
    if (fieldsOutOfBounds(layout.fields ?? [], layout).length > 0) return err(LABEL_LAYOUT_OUT_OF_BOUNDS);
    const all = load();
    const idx = all.findIndex(l => l.labelType === layout.labelType && l.facilityId === layout.facilityId);
    const saved: LabelLayout = {
      ...layout,
      id: layout.id ?? (idx >= 0 ? all[idx].id : 'layout-' + Date.now()),
      updatedAt: new Date().toISOString(),
    };
    const next = [...all];
    if (idx >= 0) next[idx] = saved;
    else next.push(saved);
    persist(next);
    return ok(saved);
  },

  async reset(labelType: LabelType, facilityId?: string) {
    await delay();
    const all = load();
    if (!all.some(l => l.labelType === labelType && l.facilityId === facilityId)) {
      return err(`No saved layout exists for "${labelType}"${facilityId ? ` (facility override)` : ' (Enterprise default)'} to reset.`);
    }
    persist(all.filter(l => !(l.labelType === labelType && l.facilityId === facilityId)));
    return ok(undefined);
  },
};

/** Batch 428: every change needs its Configuration capability (guardConfigWrites). */
export const mockLabelLayoutService: ILabelLayoutService = guardConfigWrites(labelLayoutServiceUnchecked, [
  ['config:label-layouts:manage', ['save', 'reset']],
]);
