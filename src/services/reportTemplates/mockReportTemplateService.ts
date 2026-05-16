/**
 * services/reportTemplates/mockReportTemplateService.ts  (v2 — Assembly model)
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeded with the PathScribe Standard Surgical Pathology Template,
 * built from the Standard Part Library.
 *
 * The "5-Minute Histo Report" assembly:
 *   header-p1     → PathScribe Standard Header — Page 1
 *   header-p2plus → PathScribe Compact Header — Pages 2+
 *   body[0]       → Patient & Order Demographics
 *   body[1]       → Clinical Information
 *   body[2]       → Specimens Submitted
 *   body[3]       → Diagnosis              (AI-generated draft)
 *   body[4]       → Synoptic Summary       (auto-table)
 *   body[5]       → Gross Description      (AI-generated)
 *   body[6]       → Microscopic Description (AI-generated)
 *   body[7]       → Ancillary Studies      (conditional)
 *   body[8]       → Comment               (optional)
 *   body[9]       → Sign-off
 *   footer-p2plus → PathScribe Compact Footer — Pages 2+
 *   footer-p1     → PathScribe Standard Footer — Page 1
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { ServiceResult, ID } from '../types';
import type { ReportTemplate, AssemblySlot } from '../../types/reportPart';
import type { IReportTemplateService } from './IReportTemplateService';
import { PART_IDS } from '../reportParts/mockReportPartService';

// ── Helpers ────────────────────────────────────────────────────

const delay = (ms = 300) => new Promise(res => setTimeout(res, ms));
const now   = () => new Date().toISOString();
const uid   = () => crypto.randomUUID();
const ok    = <T>(d: T): ServiceResult<T> => ({ ok: true, data: d });
const err   = <T>(m: string, _c = 'ERROR'): ServiceResult<T> => ({ ok: false, error: m });

const CHANGE_EVENT = 'PATHSCRIBE_REPORT_TEMPLATES_CHANGED';
const notifyChanged = () => window.dispatchEvent(new Event(CHANGE_EVENT));

export function onReportTemplatesChanged(h: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, h);
  return () => window.removeEventListener(CHANGE_EVENT, h);
}

const LS = 'ps_rtpl2_';
const lsLoad  = (id: string): ReportTemplate | null => { try { const r = localStorage.getItem(LS+id); return r ? JSON.parse(r) : null; } catch { return null; } };
const lsSave  = (t: ReportTemplate) => localStorage.setItem(LS+t.id, JSON.stringify(t));
const lsDel   = (id: string) => localStorage.removeItem(LS+id);
const lsAllIds = () => Object.keys(localStorage).filter(k => k.startsWith(LS)).map(k => k.slice(LS.length));

const store = new Map<string, ReportTemplate>();
const storeGet = (id: string): ReportTemplate | undefined => {
  const p = lsLoad(id); if (p) { store.set(id, p); return p; }
  return store.get(id);
};
const storeAll = (): ReportTemplate[] => {
  const ids = new Set([...store.keys(), ...lsAllIds()]);
  return Array.from(ids).map(storeGet).filter(Boolean) as ReportTemplate[];
};

// ── Assembly slot builder ──────────────────────────────────────

function slot(partId: string, partName: string, partType: 'header'|'footer'|'body', role: AssemblySlot['role'], order: number): AssemblySlot {
  return { slotId: uid(), partId, partName, partType, role, order, enabled: true };
}

// ── Standard 5-Minute Template ─────────────────────────────────

const STD_ID = 'std_surgical_pathology_v2';

function buildStandardTemplate(): ReportTemplate {
  const t = now();
  return {
    id: STD_ID,
    name: 'Standard Surgical Pathology — 5 Min',
    specialty: 'General',
    standard: 'CAP',
    status: 'published',
    orchestrationEnabled: true,
    institutionId: '',
    createdBy: 'PathScribe',
    createdAt: t, updatedAt: t,
    version: '2.0.0',
    assembly: [
      slot(PART_IDS.HDR_P1,       'Standard Header — Page 1',    'header', 'header-p1',     0),
      slot(PART_IDS.HDR_P2,       'Compact Header — Pages 2+',   'header', 'header-p2plus', 0),
      slot(PART_IDS.DEMOGRAPHICS,  'Patient & Demographics',      'body',   'body',           0),
      slot(PART_IDS.CLINICAL,      'Clinical Information',        'body',   'body',           1),
      slot(PART_IDS.SPECIMENS,     'Specimens Submitted',         'body',   'body',           2),
      slot(PART_IDS.DIAGNOSIS,     'Diagnosis',                   'body',   'body',           3),
      slot(PART_IDS.SYNOPTIC,      'Synoptic Summary',            'body',   'body',           4),
      slot(PART_IDS.GROSS,         'Gross Description',           'body',   'body',           5),
      slot(PART_IDS.MICROSCOPIC,   'Microscopic Description',     'body',   'body',           6),
      slot(PART_IDS.ANCILLARY,     'Ancillary Studies',           'body',   'body',           7),
      slot(PART_IDS.COMMENT,       'Comment',                     'body',   'body',           8),
      slot(PART_IDS.SIGNOFF,       'Sign-off',                    'body',   'body',           9),
      slot(PART_IDS.FTR_P2,       'Compact Footer — Pages 2+',   'footer', 'footer-p2plus', 0),
      slot(PART_IDS.FTR_P1,       'Standard Footer — Page 1',    'footer', 'footer-p1',     0),
    ],
  };
}

store.set(STD_ID, buildStandardTemplate());

// ── Service ────────────────────────────────────────────────────

class MockReportTemplateService implements IReportTemplateService {

  async getAll(status?: ReportTemplate['status'] | ReportTemplate['status'][]): Promise<ServiceResult<ReportTemplate[]>> {
    await delay(250);
    const all = storeAll();
    const ss = status ? (Array.isArray(status) ? status : [status]) : null;
    return ok(ss ? all.filter(t => ss.includes(t.status)) : all);
  }

  async getById(id: ID): Promise<ServiceResult<ReportTemplate>> {
    await delay(200);
    const t = storeGet(id);
    if (!t) return err(`Template '${id}' not found`, 'NOT_FOUND');
    return ok(t);
  }

  async create(partial: Partial<Omit<ReportTemplate,'id'|'createdAt'|'updatedAt'>> = {}): Promise<ServiceResult<ReportTemplate>> {
    await delay(350);
    const created: ReportTemplate = {
      id: uid(), name: 'New Template', specialty: '', status: 'draft',
      assembly: [], orchestrationEnabled: true, institutionId: '',
      createdBy: 'current-user', createdAt: now(), updatedAt: now(), version: '1.0.0',
      ...partial,
    };
    store.set(created.id, created); lsSave(created); notifyChanged();
    return ok(created);
  }

  async save(template: ReportTemplate): Promise<ServiceResult<ReportTemplate>> {
    await delay(350);
    const updated = { ...template, updatedAt: now() };
    store.set(updated.id, updated); lsSave(updated); notifyChanged();
    return ok(updated);
  }

  async clone(id: ID, newName?: string): Promise<ServiceResult<ReportTemplate>> {
    await delay(400);
    const src = storeGet(id);
    if (!src) return err(`Template '${id}' not found`, 'NOT_FOUND');
    const cloned: ReportTemplate = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid(),
      name: newName ?? `${src.name} (Copy)`,
      status: 'draft',
      createdBy: 'current-user',
      createdAt: now(), updatedAt: now(), version: '1.0.0',
      // Re-ID slots so they're independent
      assembly: src.assembly.map(s => ({ ...s, slotId: uid() })),
    };
    store.set(cloned.id, cloned); lsSave(cloned); notifyChanged();
    return ok(cloned);
  }

  async publish(id: ID): Promise<ServiceResult<ReportTemplate>> {
    await delay(300);
    const t = storeGet(id);
    if (!t) return err(`Template '${id}' not found`, 'NOT_FOUND');
    const updated = { ...t, status: 'published' as const, updatedAt: now() };
    store.set(id, updated); lsSave(updated); notifyChanged();
    return ok(updated);
  }

  async archive(id: ID): Promise<ServiceResult<ReportTemplate>> {
    await delay(300);
    const t = storeGet(id);
    if (!t) return err(`Template '${id}' not found`, 'NOT_FOUND');
    if (id === STD_ID) return err('Built-in template cannot be archived. Duplicate and modify instead.', 'FORBIDDEN');
    const updated = { ...t, status: 'archived' as const, updatedAt: now() };
    store.set(id, updated); lsSave(updated); notifyChanged();
    return ok(updated);
  }

  async remove(id: ID): Promise<ServiceResult<void>> {
    await delay(300);
    if (id === STD_ID) return err('Built-in template cannot be deleted.', 'FORBIDDEN');
    store.delete(id); lsDel(id); notifyChanged();
    return ok(undefined);
  }
}

export const mockReportTemplateService: IReportTemplateService = new MockReportTemplateService();
export const STANDARD_TEMPLATE_ID = STD_ID;
