// Batch 738 (Demo Seed Data S1): the sign-out-ready colon case answers every required, shown question of the colon
// template, with no placeholder wording left in the template.
import { describe, it, expect } from 'vitest';
import colon from '../../data/templates/generic/colon_resection.json';
import { DEMO_SIGN_OUT_READY_CASE } from './demoSignOutReadyCase';
import { DEMO_BASELINE_CASE_IDS } from './demoBaselineCases';
import { synopticFieldProblemsFor } from '../signoutGates/signOutReviewGates';

type Field = { id: string; label: string; options?: { id: string; label: string }[] };
const sections = (colon as unknown as { sections: { id: string; title: string; fields: Field[] }[] }).sections;

describe('sign-out-ready colon case S26-4680 (Batch 738)', () => {
  const report = DEMO_SIGN_OUT_READY_CASE.synopticReports![0] as { instanceId: string; answers: Record<string, string | string[]> };

  it('is in the demo baseline, unsigned, with an active attending', () => {
    expect(DEMO_BASELINE_CASE_IDS).toContain('S26-4680');
    expect(DEMO_SIGN_OUT_READY_CASE.status).toBe('in-progress');
    expect((DEMO_SIGN_OUT_READY_CASE as { participants?: { status: string }[] }).participants?.[0].status).toBe('active');
  });
  it('leaves no required question unanswered and no unverified AI answer', () => {
    expect(synopticFieldProblemsFor(report, sections as never)).toEqual({ missing: [], unverifiedAi: [] });
  });
  it('answers only with options the template has', () => {
    const options = new Map(sections.flatMap(s => s.fields).map(f => [f.id, new Set((f.options ?? []).map(o => o.id))]));
    for (const [k, v] of Object.entries(report.answers)) {
      const opts = options.get(k);
      expect(opts, k).toBeDefined();
      if (opts!.size > 0) for (const id of [v].flat()) expect(opts!.has(id), `${k}=${id}`).toBe(true);
    }
  });
  it('the colon template has no placeholder wording', () => {
    const labels = sections.flatMap(s => [s.title, ...s.fields.flatMap(f => [f.label, ...(f.options ?? []).map(o => o.label)])]);
    expect(labels.filter(l => /^Option \d+$|^(Category|Margin Status) [A-D]$/.test(l))).toEqual([]);
  });
});
