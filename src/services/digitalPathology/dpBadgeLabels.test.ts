// Batch 624: PathScribe's own worklist wording is translatable; scanner and AI wording is shown as received.
import { describe, expect, it } from 'vitest';
import fr from '@/i18n/locales/fr.json';
import { dpLabelText, resolveDigitalReadinessBadge, resolveDpTriageBadge } from './resolveWorklistDpBadges';
import type { WsiScanSlide } from './IWsiScanBatchService';
import type { AiScreeningResult } from '@/types/digitalPathology/AiScreeningResult';

const lookup = (key: string, params?: Record<string, string | number>): string => {
  const raw = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], fr) as string | undefined
    ?? key.split('.').slice(0, -1).reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], fr as unknown) as never;
  const text = typeof raw === 'string' ? raw : (fr as any).worklistDp.triage[`${key.split('.').pop()}_${params && Number(params.count) === 1 ? 'one' : 'other'}`];
  return text.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => String(params?.[k]));
};
const slide = (over: Partial<WsiScanSlide>): WsiScanSlide =>
  ({ slidePosition: '1', caseId: 'c', specimenId: 's', scanStatus: 'completed', qcPassed: true, scanCompletedAt: '2026-01-01T00:00:00Z', acquisitionMode: 'single_plane', ...over } as WsiScanSlide);

describe('digital readiness line', () => {
  it('is translated when PathScribe wrote it', () => {
    const b = resolveDigitalReadinessBadge([slide({}), slide({})])!;
    expect(b.summaryText).toBe('2/2 Ready (QC Passed)');
    expect(dpLabelText(b.summaryLabel, b.summaryText, lookup)).toBe('2/2 Prêt (CQ réussi)');
  });
  it('inserts the scanner\'s failure reason exactly as received, untranslated', () => {
    const b = resolveDigitalReadinessBadge([slide({ scanStatus: 'failed', qcPassed: false, failureReason: 'Out-of-focus' }), slide({})])!;
    expect(dpLabelText(b.summaryLabel, b.summaryText, lookup)).toBe('1/2 Erreur (Out-of-focus)');
  });
});

describe('AI line', () => {
  const result = (over: Partial<AiScreeningResult>): AiScreeningResult =>
    ({ status: 'completed', findings: [], ...over } as AiScreeningResult);
  it('the vendor\'s headline is never translated and has no label', () => {
    const b = resolveDpTriageBadge(result({ slideTriage: { reviewRecommended: true, triageLevel: 'high_risk', primaryFinding: 'Malignancy Detected' } as never }))!;
    expect(b.primaryLabel).toBeUndefined();
    expect(dpLabelText(b.primaryLabel, b.primaryText, lookup)).toBe('Malignancy Detected');
  });
  it('biomarker wording is passed through as received', () => {
    const b = resolveDpTriageBadge(result({ biomarkers: [{ name: 'Ki-67', value: '18%' }] as never }))!;
    expect(b.biomarkerSummary).toBe('Ki-67: 18%');
  });
  it('PathScribe\'s own count line is translated and keeps the singular and plural', () => {
    const one = resolveDpTriageBadge(result({ findings: [{ label: 'x' }] as never }))!;
    const two = resolveDpTriageBadge(result({ findings: [{ label: 'x' }, { label: 'y' }] as never }))!;
    expect(dpLabelText(one.primaryLabel, one.primaryText, lookup)).toBe('1 résultat signalé par l\'IA');
    expect(dpLabelText(two.primaryLabel, two.primaryText, lookup)).toBe('2 résultats signalés par l\'IA');
  });
  it('a vendor with no headline falls back to PathScribe\'s own wording, translated', () => {
    const b = resolveDpTriageBadge(result({ slideTriage: { triageLevel: 'equivocal_review' } as never }))!;
    expect(b.primaryLabel?.key).toBe('worklistDp.triage.resultAvailable');
  });
});
