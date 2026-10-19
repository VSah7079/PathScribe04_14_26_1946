// @vitest-environment happy-dom
// Batch 609 (#38): the Final Diagnosis rule where templates are published.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));

import {
  countFinalDiagnosisFields, finalDiagnosisCheck, checkTemplateFinalDiagnosis, finalTemplatesBrokenByPart, FINAL_DIAGNOSIS_DESIGNATION_ERROR,
} from './finalDiagnosisPublishCheck';
import { mockReportPartService } from '../reportParts/mockReportPartService';
import { mockReportTemplateService } from './mockReportTemplateService';
import type { TemplateNode } from '@/types/template';
import type { AssemblySlot, ReportPart } from '@/types/reportPart';

const field = (id: string, designated = false) => ({ id, type: 'paragraph', label: id, ...(designated ? { isFinalDiagnosisField: true } : {}) }) as unknown as TemplateNode;
const section = (id: string, children: TemplateNode[]) => ({ id, type: 'section', label: id, children }) as unknown as TemplateNode;
const slot = (partId: string, enabled = true): AssemblySlot => ({ slotId: `s-${partId}`, partId, partName: partId, partType: 'body', role: 'body', order: 0, enabled }) as AssemblySlot;

describe('counting (pure)', () => {
  it('counts marked fields at any depth', () => {
    expect(countFinalDiagnosisFields(undefined)).toBe(0);
    expect(countFinalDiagnosisFields([field('a'), field('b')])).toBe(0);
    expect(countFinalDiagnosisFields([field('a', true), section('s', [field('b', true), section('t', [field('c', true)])])])).toBe(3);
  });
  it('a Final template passes with none or one, fails with two or more; a Preliminary one is exempt', () => {
    expect(finalDiagnosisCheck('tmpl-1', [[field('a')]])).toEqual({ ok: true, count: 0 });
    expect(finalDiagnosisCheck('tmpl-1', [[field('a', true)], [field('b')]])).toEqual({ ok: true, count: 1 });
    expect(finalDiagnosisCheck('tmpl-1', [[field('a', true)], [field('b', true)]])).toEqual({ ok: false, count: 2 });
    expect(finalDiagnosisCheck('tmpl-prelim-x', [[field('a', true), field('b', true)]])).toEqual({ ok: true, count: 0, exempt: true });
  });
});

describe('against parts and templates', () => {
  let n = 0;
  const makePart = async (nodes: TemplateNode[]): Promise<ReportPart> => {
    const r = await mockReportPartService.create({ name: `Part ${++n}`, type: 'body', status: 'published', nodes } as never);
    if (!r.ok) throw new Error('part');
    return r.data;
  };
  beforeEach(() => { localStorage.clear(); });

  it('reads the template as designed now, ignoring disabled slots', async () => {
    const p1 = await makePart([field('a', true)]);
    const p2 = await makePart([field('b', true)]);
    expect(await checkTemplateFinalDiagnosis({ id: 'tmpl-a', assembly: [slot(p1.id), slot(p2.id)] })).toEqual({ ok: false, count: 2 });
    expect(await checkTemplateFinalDiagnosis({ id: 'tmpl-a', assembly: [slot(p1.id), slot(p2.id, false)] })).toEqual({ ok: true, count: 1 });
    expect(await checkTemplateFinalDiagnosis({ id: 'tmpl-a', assembly: [] })).toEqual({ ok: true, count: 0 });
  });

  it('publishing is refused for two marked fields and goes through once one is unmarked or a slot removed', async () => {
    const p1 = await makePart([field('a', true)]);
    const p2 = await makePart([field('b', true)]);
    const created = await mockReportTemplateService.create({ name: 'Two Dx', specialty: 'x', status: 'draft', assembly: [slot(p1.id), slot(p2.id)], orchestrationEnabled: false } as never);
    if (!created.ok) throw new Error('template');
    const refused = await mockReportTemplateService.publish(created.data.id);
    expect(refused).toEqual({ ok: false, error: FINAL_DIAGNOSIS_DESIGNATION_ERROR });
    const after = await mockReportTemplateService.getById(created.data.id);
    expect(after.ok && after.data.status).toBe('draft');
    await mockReportTemplateService.save({ ...created.data, assembly: [slot(p1.id)] });
    const ok = await mockReportTemplateService.publish(created.data.id);
    expect(ok.ok && ok.data.status).toBe('published');
  });

  it('saving a draft with two marked fields is allowed (it may be mid-edit); only publishing is stopped', async () => {
    const p1 = await makePart([field('a', true)]);
    const p2 = await makePart([field('b', true)]);
    const created = await mockReportTemplateService.create({ name: 'Draft Dx', specialty: 'x', status: 'draft', assembly: [slot(p1.id)], orchestrationEnabled: false } as never);
    if (!created.ok) throw new Error('template');
    const saved = await mockReportTemplateService.save({ ...created.data, assembly: [slot(p1.id), slot(p2.id)] });
    expect(saved.ok).toBe(true);
  });

  it('a Preliminary template publishes whatever it marks', async () => {
    const p1 = await makePart([field('a', true), field('b', true)]);
    const seeded = await mockReportTemplateService.getById('tmpl-prelim-surgpath');
    if (!seeded.ok) throw new Error('seed');
    const saved = await mockReportTemplateService.save({ ...seeded.data, assembly: [slot(p1.id)], status: 'draft' });
    expect(saved.ok).toBe(true);
    const r = await mockReportTemplateService.publish('tmpl-prelim-surgpath');
    expect(r.ok).toBe(true);
  });

  it('a change to a shared part finds the Final templates it breaks, and not Preliminary ones or ones that do not use it', async () => {
    const shared = await makePart([field('a', true), field('b', true)]);
    const other = await makePart([field('c', true)]);
    const templates = [
      { id: 'tmpl-1', name: 'Uses shared', assembly: [slot(shared.id), slot(other.id)] },
      { id: 'tmpl-2', name: 'Uses other', assembly: [slot(other.id)] },
      { id: 'tmpl-prelim-3', name: 'Prelim shared', assembly: [slot(shared.id)] },
      { id: 'tmpl-4', name: 'Disabled slot', assembly: [slot(shared.id, false)] },
    ];
    expect(await finalTemplatesBrokenByPart(shared.id, templates)).toEqual([{ id: 'tmpl-1', name: 'Uses shared', count: 3 }]);
    expect(await finalTemplatesBrokenByPart(other.id, templates)).toEqual([{ id: 'tmpl-1', name: 'Uses shared', count: 3 }]);
  });

  it('a part that cannot be read does not block', async () => {
    expect(await checkTemplateFinalDiagnosis({ id: 'tmpl-q', assembly: [slot('no-such-part')] })).toEqual({ ok: true, count: 0 });
  });
});

it('the app\'s own seeded Final templates all pass the rule', async () => {
  localStorage.clear();
  const all = await mockReportTemplateService.getAll();
  if (!all.ok) throw new Error('templates');
  // (templates the tests above created have a timestamp id; the others are the app's own)
  const seeded = all.data.filter(t => !/^tmpl-\d{10,}$/.test(t.id));
  expect(seeded.length).toBeGreaterThan(0);
  for (const t of seeded) expect((await checkTemplateFinalDiagnosis(t)).ok, t.id).toBe(true);
});
