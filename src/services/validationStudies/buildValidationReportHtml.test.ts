// src/services/validationStudies/buildValidationReportHtml.test.ts
import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import { buildValidationReportHtml } from './buildValidationReportHtml';
import { computeValidationStudyGrade } from './computeValidationStudyGrade';
import type { ValidationStudy } from './IValidationStudyService';
import type { NarrativeSignalStats } from '@/services/narrativeSignals/INarrativeSignalService';
import en from '@/i18n/locales/en.json';
import fr from '@/i18n/locales/fr.json';
import ko from '@/i18n/locales/ko.json';

const study = {
  id: 'vs-1', name: 'Breast <pilot> & co', startDate: '2026-03-01T12:00:00.000Z', endDate: '2026-06-30T12:00:00.000Z',
  targetAcceptanceRate: 0.85, targetMaxEditRatio: 0.15, committeeApproval: { irbReference: 'IRB-2026-14' },
} as unknown as ValidationStudy;
const stats = {
  totalSignals: 120, acceptanceRate: 0.9,
  bySection: { gross_description: { total: 60, accepted: 54, avgEditRatio: 0.1 }, microscopic_description: { total: 60, accepted: 54, avgEditRatio: 0.12 } },
} as unknown as NarrativeSignalStats;

async function build(lng: string) {
  const i18n = i18next.createInstance();
  await i18n.init({ lng, interpolation: { escapeValue: false }, resources: { en: { translation: en }, fr: { translation: fr }, ko: { translation: ko } } });
  return buildValidationReportHtml(
    { study, stats, caseCount: 42, grade: computeValidationStudyGrade(0.9, 0.85, 0.11, 0.15), avgEditRatio: 0.11 },
    { t: (k, o) => i18n.t(k, o) as string, language: lng, appVersion: '9.9.9', now: '2026-10-10T12:00:00.000Z' },
  );
}

describe('buildValidationReportHtml (Batch 514)', () => {
  it('prints in French when the reader works in French', async () => {
    const html = await build('fr');
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('Rapport de validation de l&#39;IA PathScribe');   // apostrophe escaped like all report text
    expect(html).toContain('CONFORME');
    expect(html).toContain('10 octobre 2026');                 // generated date, French long form
    expect(html).toContain('01/03/2026 — 30/06/2026');        // study period, French short form
    expect(html.replace(/[\u00a0\u202f]/g, ' ')).toContain('90 %');
    expect(html).not.toContain('Executive Summary');
    expect(html).not.toContain('Governance Statement');
  });

  it('prints in Korean', async () => {
    const html = await build('ko');
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('PathScribe AI 검증 보고서');
    expect(html).toContain('적합');
  });

  it('English matches the report as it was before', async () => {
    const html = await build('en');
    expect(html).toContain('<h1>PathScribe AI Validation Report</h1>');
    expect(html).toContain('<div class="grade">PASS</div>');
    expect(html).toContain('Performance meets study targets');
    expect(html).toContain('PathScribe v9.9.9 · ForMedrixAI · Confidential validation report');
  });

  it('keeps recorded data as recorded, escaped', async () => {
    const html = await build('fr');
    expect(html).toContain('Breast &lt;pilot&gt; &amp; co');
    expect(html).not.toContain('Breast <pilot>');
    expect(html).toContain('IRB-2026-14');
    expect(html).toContain('gross description');
  });

  it('has no inline style attributes', async () => {
    expect(await build('en')).not.toMatch(/\sstyle="/);
  });
});
