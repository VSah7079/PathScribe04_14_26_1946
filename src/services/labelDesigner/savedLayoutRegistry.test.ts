import { beforeEach, describe, expect, it, vi } from 'vitest';
// These tests are about layouts, not who may save them (guardConfigWrites has its own tests).
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
import { applySavedLayout, applySavedLayoutHtml, getSavedLayout, labelValues, renderSavedLayoutZpl } from './savedLayoutRegistry';
import { mockLabelLayoutService } from './mockLabelLayoutService';
import { buildLabelLayoutPrinterCode } from './buildLabelLayoutPrinterCode';
import { isFieldVisible } from './labelFieldVisibility';
import { storageSet } from '../mockStorage';
import type { LabelLayout, LabelLayoutField } from './ILabelLayoutService';

const field = (over: Partial<LabelLayoutField>): LabelLayoutField => ({ id: 'f', fieldKey: 'patientName', xMm: 1, yMm: 1, widthMm: 20, heightMm: 4, fontSizeMm: 2, ...over });

async function saveLayout(labelType: LabelLayout['labelType'], fields: LabelLayoutField[], facilityId?: string, savedBy?: string) {
  const res = await mockLabelLayoutService.save({ labelType, facilityId, widthMm: 50, heightMm: 25, fields }, savedBy);
  expect(res.ok).toBe(true);
}

describe('saved label layouts drive the output (Batch 606, PS-26 / PS-153)', () => {
  beforeEach(() => { storageSet('label_designer_layouts', []); storageSet('label_designer_layout_versions', []); });

  it('uses the built-in output when nothing is saved', () => {
    expect(getSavedLayout('specimen')).toBeUndefined();
    expect(applySavedLayout('specimen', { patientName: 'X' }, 203, 'BUILT-IN')).toBe('BUILT-IN');
    expect(applySavedLayoutHtml('specimen', { patientName: 'X' }, '<b>built-in</b>')).toBe('<b>built-in</b>');
  });

  it('a saved layout replaces the built-in ZPL and HTML', async () => {
    await saveLayout('specimen', [field({ fieldKey: 'patientName' }), field({ id: 'g', fieldKey: 'barcode', yMm: 8, heightMm: 8 })]);
    const zpl = applySavedLayout('specimen', { patientName: 'DOE, JANE', barcode: 'PS26-1' }, 203, 'BUILT-IN');
    expect(zpl).not.toBe('BUILT-IN');
    expect(zpl).toContain('^FDDOE, JANE^FS');
    expect(zpl).toContain('PS26-1');
    const html = applySavedLayoutHtml('specimen', { patientName: 'DOE <JANE>', barcode: 'PS26-1' }, '<b>built-in</b>');
    expect(html).toContain('ps-label--saved');
    expect(html).toContain('DOE &lt;JANE&gt;');
  });

  it('a facility override wins where allowed; locked types use the enterprise default only', async () => {
    await saveLayout('specimen', [field({ fieldKey: 'mrn' })]);
    await saveLayout('specimen', [field({ fieldKey: 'patientName' })], 'fac-1');
    expect(renderSavedLayoutZpl('specimen', { patientName: 'A', mrn: 'M' }, 203, 'fac-1')).toContain('^FDA^FS');
    expect(renderSavedLayoutZpl('specimen', { patientName: 'A', mrn: 'M' }, 203)).toContain('^FDM^FS');
    const locked = await mockLabelLayoutService.save({ labelType: 'block', facilityId: 'fac-1', widthMm: 25, heightMm: 12, fields: [field({ fieldKey: 'blockId' })] });
    expect(locked.ok).toBe(false);
  });

  it('hides a field whose show rule is not met', async () => {
    await saveLayout('specimen', [
      field({ fieldKey: 'patientName' }),
      field({ id: 'g', fieldKey: 'mrn', yMm: 6, showWhen: { fieldKey: 'mrn', op: 'present' } }),
    ]);
    expect(renderSavedLayoutZpl('specimen', { patientName: 'A', mrn: '' }, 203)).not.toContain('^FD^FS');
    expect(renderSavedLayoutZpl('specimen', { patientName: 'A', mrn: 'M1' }, 203)).toContain('^FDM1^FS');
  });

  it('adds ^FH for a GS1 payload so FNC1 prints', async () => {
    await saveLayout('slide', [field({ fieldKey: 'barcode', heightMm: 8 })]);
    expect(renderSavedLayoutZpl('slide', { barcode: '0108_110PS' }, 300)).toContain('^FH^FD0108_110PS');
  });

  it('labelValues keeps strings and numbers and adds the barcode', () => {
    expect(labelValues({ a: 'x', n: 3, o: { z: 1 } }, 'BC')).toEqual({ barcode: 'BC', a: 'x', n: '3' });
  });
});

describe('field show rules', () => {
  it('present, absent and equals', () => {
    const f = (showWhen: LabelLayoutField['showWhen']) => field({ showWhen });
    expect(isFieldVisible(f(undefined), {})).toBe(true);
    expect(isFieldVisible(f({ fieldKey: 'a', op: 'present' }), { a: ' x ' })).toBe(true);
    expect(isFieldVisible(f({ fieldKey: 'a', op: 'present' }), { a: ' ' })).toBe(false);
    expect(isFieldVisible(f({ fieldKey: 'a', op: 'absent' }), {})).toBe(true);
    expect(isFieldVisible(f({ fieldKey: 'a', op: 'equals', value: 'STAT' }), { a: 'stat' })).toBe(true);
    expect(isFieldVisible(f({ fieldKey: 'a', op: 'equals', value: 'STAT' }), { a: 'routine' })).toBe(false);
  });
});

describe('layout version history (PS-153)', () => {
  beforeEach(() => { storageSet('label_designer_layouts', []); storageSet('label_designer_layout_versions', []); });

  it('records a version per save, newest first, with who saved it', async () => {
    await saveLayout('specimen', [field({ fieldKey: 'mrn' })], undefined, 'dr.a');
    await saveLayout('specimen', [field({ fieldKey: 'patientName' })], undefined, 'dr.b');
    const res = await mockLabelLayoutService.listVersions('specimen');
    expect(res.ok && res.data.map(v => [v.version, v.savedBy])).toEqual([[2, 'dr.b'], [1, 'dr.a']]);
  });

  it('restoring an old version makes it current and saves it as a new version', async () => {
    await saveLayout('specimen', [field({ fieldKey: 'mrn' })], undefined, 'dr.a');
    await saveLayout('specimen', [field({ fieldKey: 'patientName' })], undefined, 'dr.b');
    const versions = await mockLabelLayoutService.listVersions('specimen');
    const first = versions.ok ? versions.data.find(v => v.version === 1)! : null;
    const restored = await mockLabelLayoutService.restoreVersion(first!.versionId, 'dr.c');
    expect(restored.ok).toBe(true);
    expect(getSavedLayout('specimen')!.fields[0].fieldKey).toBe('mrn');
    const after = await mockLabelLayoutService.listVersions('specimen');
    expect(after.ok && after.data[0]).toMatchObject({ version: 3, savedBy: 'dr.c' });
  });

  it('refuses an unknown version', async () => {
    expect((await mockLabelLayoutService.restoreVersion('nope')).ok).toBe(false);
  });
});

describe('one layout, three printer languages (PS-27)', () => {
  const layout: LabelLayout = {
    id: 'l', labelType: 'specimen', widthMm: 50, heightMm: 25, updatedAt: '',
    fields: [field({ fieldKey: 'patientName' }), field({ id: 'b', fieldKey: 'barcode', yMm: 8, heightMm: 8 })],
  };
  const values = { patientName: 'DOE', barcode: 'PS26-1' };
  it('ZPL', () => expect(buildLabelLayoutPrinterCode(layout, 'specimen', values, 203, 'zpl')).toMatch(/^\^XA[\s\S]*\^XZ$/));
  it('EPL', () => {
    const epl = buildLabelLayoutPrinterCode(layout, 'specimen', values, 203, 'epl');
    expect(epl.startsWith('N\n')).toBe(true);
    expect(epl).toContain('"DOE"');
    expect(epl).toContain('b8,64,D,"PS26-1"');
    expect(epl.endsWith('P1')).toBe(true);
  });
  it('DPL', () => {
    const dpl = buildLabelLayoutPrinterCode(layout, 'specimen', values, 203, 'dpl');
    expect(dpl).toContain('\u0002L');
    expect(dpl).toContain('DOE');
    expect(dpl).toContain('PS26-1');
    expect(dpl.endsWith('E')).toBe(true);
  });
  it('leaves out a hidden field in every language', () => {
    const hidden = { ...layout, fields: [field({ fieldKey: 'patientName', showWhen: { fieldKey: 'mrn', op: 'present' } })] };
    for (const lang of ['zpl', 'epl', 'dpl'] as const) {
      expect(buildLabelLayoutPrinterCode(hidden, 'specimen', { patientName: 'DOE' }, 203, lang)).not.toContain('DOE');
    }
  });
});
