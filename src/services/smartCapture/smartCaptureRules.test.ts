// Batch 611 (#189): the Smart Capture prototype's suggestion rules (pure, deterministic, PHI-free).
import { describe, it, expect } from 'vitest';
import type { Specimen } from '@/types/case/Specimen';
import {
  SMART_CAPTURE_RULE_VERSION, levelFor, classifyStain, toSmartCaptureInput, suggestSmartCaptureLines, smartCaptureSignature,
} from './smartCaptureRules';

const specimen = (over: Record<string, unknown> = {}) => ({
  id: 'sp1', label: 'A', description: 'Colon, sigmoid colectomy',
  blocks: [{ id: 'b1', stains: [{ stainName: 'H&E', status: 'Ordered' }, { stainName: 'PAS', status: 'Ordered' }, { stainName: 'CK7', status: 'Ordered' }, { stainName: 'CK20', status: 'Ordered' }] }, { id: 'b2', requiresDecal: true, stains: [] }],
  ...over,
}) as unknown as Specimen;

describe('Smart Capture rules', () => {
  it('chooses the level from the specimen words, with the word as evidence', () => {
    expect(levelFor('Right colectomy')).toEqual({ cpt: '88309', keyword: 'colectomy' });
    expect(levelFor('Appendectomy')).toEqual({ cpt: '88307', keyword: 'appendectomy' });
    expect(levelFor('Gastric biopsy')).toEqual({ cpt: '88305', keyword: 'biopsy' });
    expect(levelFor('Something else')).toEqual({ cpt: '88304', keyword: null });
  });

  it('classifies stains from a fixed list', () => {
    expect(classifyStain('H&E')).toBe('he');
    expect(classifyStain('PAS with diastase')).toBe('special');
    expect(classifyStain('CK7')).toBe('ihc');
  });

  it('counts blocks and stains, skipping cancelled ones', () => {
    const sp = specimen();
    (sp as unknown as { blocks: { status?: string }[] }).blocks.push({ status: 'Cancelled' });
    const [i] = toSmartCaptureInput([sp]);
    expect(i).toMatchObject({ blockCount: 2, decalBlockCount: 1, specialStainCount: 1, ihcStainCount: 2 });
  });

  it('suggests level, special stain, first and additional IHC and decal lines, each with its rule and version', () => {
    const lines = suggestSmartCaptureLines(toSmartCaptureInput([specimen()]));
    expect(lines.map(l => [l.ruleId, l.cpt, l.units])).toEqual([
      ['SC-LEVEL', '88309', 1], ['SC-SPECIAL', '88312', 1], ['SC-IHC-FIRST', '88342', 1], ['SC-IHC-ADDL', '88341', 1], ['SC-DECAL', '88311', 1],
    ]);
    expect(lines.every(l => l.ruleVersion === SMART_CAPTURE_RULE_VERSION && l.evidence.length > 0)).toBe(true);
  });

  it('is deterministic and suggests nothing for a specimen with no blocks', () => {
    const a = suggestSmartCaptureLines(toSmartCaptureInput([specimen()]));
    expect(suggestSmartCaptureLines(toSmartCaptureInput([specimen()]))).toEqual(a);
    expect(suggestSmartCaptureLines(toSmartCaptureInput([specimen({ blocks: [] })]))).toEqual([]);
  });

  it('changes the signature when the work changes, and never copies the description into a suggestion', () => {
    const base = smartCaptureSignature(toSmartCaptureInput([specimen()]));
    expect(smartCaptureSignature(toSmartCaptureInput([specimen({ description: 'Appendectomy' })]))).not.toBe(base);
    expect(JSON.stringify(suggestSmartCaptureLines(toSmartCaptureInput([specimen({ description: 'Smith John colon biopsy' })])))).not.toMatch(/Smith/);
  });
});
