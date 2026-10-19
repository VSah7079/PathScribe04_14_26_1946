// Batch 390 (PS-340): the correction/addendum screen keeps the standing rules at
// source level: text through t(), no inline CSS, no decisions in the components
// or the hook, no mock service imports, and both release services check their
// permission and the reason before writing anything. Copy of the pattern in
// MicrotomyWorkstationPage.i18n.guard.test.ts.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = (rel: string) => fs.readFileSync(path.join(__dirname, '../..', rel), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n');

const COMPONENTS = ['pages/CytologyWorklistPage/components/CytologyRevisionActions.tsx', 'pages/CytologyWorklistPage/components/CytologyRevisionPanel.tsx'];
const UI = [...COMPONENTS, 'pages/CytologyWorklistPage/hooks/useCytologyRevision.ts'];

describe('Correction / addendum screen (Batch 390)', () => {
  it.each(COMPONENTS)('%s has no inline style and uses t()', f => {
    const code = src(f);
    expect(code).not.toMatch(/style=\{/);
    expect(code).toContain('useTranslation');
  });
  it.each(UI)('%s imports no mock service and touches no browser storage', f => {
    const code = src(f);
    expect(code).not.toMatch(/from '[^']*mock[A-Z][^']*'/);
    expect(code).not.toMatch(/localStorage|sessionStorage/);
  });
  it('dates follow the user\'s locale', () => {
    expect(src(COMPONENTS[0])).not.toMatch(/toLocale(Date|Time)?String\(/);
    expect(src(COMPONENTS[0])).toContain('formatDateTime(');
  });
  it('the required-field lists are joined by formatList', () => {
    expect(src(COMPONENTS[1])).toContain('formatList(');
    expect(src(COMPONENTS[1])).not.toContain(".join(', ')");
  });
  it('the buttons are the two capabilities, each its own', () => {
    const code = src(COMPONENTS[0]);
    expect(code).toContain('capability="cytology:report:correct"');
    expect(code).toContain('capability="cytology:report:addend"');
  });
  it('the hook decides nothing: findings, context and requirements come from services', () => {
    const hook = src('pages/CytologyWorklistPage/hooks/useCytologyRevision.ts');
    expect(hook).toContain('buildCorrectedFindings');
    expect(hook).toContain('resolveCytologyReleaseContext');
    expect(hook).not.toMatch(/resolveCytologyReviewRequirement|\.trim\(\)/);
  });
  it('the two release services check their permission and the reason before any write', () => {
    for (const [file, cap, write] of [
      ['services/cytology/releaseCytologyCorrection.ts', 'cytology:report:correct', 'cytologyReviewRecordService.create'],
      ['services/cytology/releaseCytologyAddendum.ts', 'cytology:report:addend', 'cytologySignOutRecordService.create'],
    ]) {
      const code = src(file);
      const enforce = code.indexOf(`authorizationService.enforce('${cap}'`);
      const reason = code.indexOf('revisionReason ===');
      expect(enforce, file).toBeGreaterThan(-1);
      expect(reason, file).toBeGreaterThan(enforce);
      expect(code.indexOf(write), file).toBeGreaterThan(reason);
    }
  });
  it('the page mounts the panel only for a signed-out case', () => {
    const page = src('pages/CytologyWorklistPage/CytologyScreeningPage.tsx');
    const at = page.indexOf('<CytologyRevisionActions');
    expect(at).toBeGreaterThan(page.indexOf('signOutRecords.length > 0 ? ('));
    expect(at).toBeLessThan(page.indexOf('<CytologyRevisionPanel'));
  });
});
