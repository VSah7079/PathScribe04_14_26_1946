// @vitest-environment happy-dom
//
// PS-318: manually choosing (Change ▾) a template without a Preliminary
// Diagnosis section on a case that isn't final yet produces a warning.
// Runs the real buildContext against the real routing and the seeded
// report templates; no module mocks.
import { describe, it, expect } from 'vitest';
import '@/i18n/config';
import { buildContext } from './contextBuilder';
import type { Case } from '@/types/case/Case';

function notFinalCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'PS318-CASE',
    status: 'in-progress',
    patient: { firstName: 'Test', lastName: 'Patient' },
    accession: { accessionNumber: 'S26-318' },
    specimens: [{ id: 'sp-1', label: 'A' }],
    ...overrides,
  } as unknown as Case;
}

const titles = (ctx: Awaited<ReturnType<typeof buildContext>>) =>
  (ctx.narrativeTemplate.sections as { title: string }[]).map(s => s.title);

describe('buildContext — PS-318 override warning on a not-yet-final case', () => {
  it('with no override, a not-yet-final case routes to the Preliminary template, which has a Preliminary Diagnosis section, and gives no override warning', async () => {
    const ctx = await buildContext(notFinalCase(), null);
    expect(ctx.narrativeTemplate.templateId).toBe('tmpl-prelim-surgpath');
    expect(titles(ctx)).toContain('Preliminary Diagnosis');
    expect(ctx.warnings.some(w => w.includes('Pathologist override'))).toBe(false);
  });

  it('choosing a template without a Preliminary section warns that the Preliminary Diagnosis will not appear', async () => {
    const ctx = await buildContext(notFinalCase(), null, 'tmpl-gold-standard');
    expect(ctx.narrativeTemplate.templateId).toBe('tmpl-gold-standard');
    expect(titles(ctx)).not.toContain('Preliminary Diagnosis');
    const warning = ctx.warnings.find(w => w.includes('Pathologist override'));
    expect(warning).toBeDefined();
    expect(warning).toContain('no Preliminary Diagnosis section');
    expect(warning).toContain('tmpl-gold-standard');
    expect(warning).toContain('tmpl-prelim-surgpath');
  });

  it('on a final case the same template choice gives no Preliminary Diagnosis warning', async () => {
    const ctx = await buildContext(notFinalCase({ status: 'finalized' } as Partial<Case>), null, 'tmpl-gold-standard');
    expect(ctx.warnings.some(w => w.includes('no Preliminary Diagnosis section'))).toBe(false);
  });
});
