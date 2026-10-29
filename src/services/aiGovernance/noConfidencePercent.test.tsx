// @vitest-environment happy-dom
// Batch 706 (Pete, Oct 28 2026): "Remove every single on-screen percentage" of AI confidence.
// Provenance Over Confidence: no raw confidence number or percentage on a clinical screen, in any regulatory profile.
// Numbers stay in code, data, audit/telemetry and internal thresholds. The only allowed on-screen percentages are the
// ADMIN Confidence Threshold settings under Configuration (a setting, not a display of an AI result).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import i18n from '@/i18n/config';
import en from '@/i18n/locales/en.json';
import { AiSuggestionMeta } from '@/pages/Synoptic/Codes/AiSuggestionMeta';
import { AiReviewModal } from '@/pages/SynopticReportPage/modals/AiReviewModal';
import { ProtocolChangeModal } from '@/pages/SynopticReportPage/modals/ProtocolChangeModal';
import { NarrativeProvenanceNote } from '@/pages/SynopticReportPage/components/NarrativeProvenanceNote';
import { ClinicalMismatchSummary } from '@/components/ClinicalMismatch/ClinicalMismatchSummary';

/** Admin settings (a threshold the administrator types), not displays of an AI result. */
const ADMIN_SETTING_KEYS = new Set(['modelsTab.overrides.confidence.label', 'aiTab.confidenceThreshold.ariaLabel', 'clinicalMismatchRulesSection.percent']);
/** Intra-op merge candidates carry the words high / medium (time closeness), not a number. */
const WORD_ONLY_KEYS = new Set(['accessionPage.intraopMergeModal.fuzzyMatch', 'intraopQueue.mergeModal.fuzzyMatchBadge']);

function flatten(o: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  return Object.entries(o).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? [[key, v] as [string, string]] : v && typeof v === 'object' ? flatten(v as Record<string, unknown>, key) : [];
  });
}

describe('no confidence percentage in any English UI string', () => {
  const rows = flatten(en as unknown as Record<string, unknown>);
  it('no string pairs the word confidence (or a matching label) with a percent sign or placeholder', () => {
    const bad = rows.filter(([k, v]) => !ADMIN_SETTING_KEYS.has(k) && !WORD_ONLY_KEYS.has(k) && /confiden/i.test(v) && (/%|\bpercent\b/i.test(v) || /\{\{\s*(conf|confidence|pct|percent|score)\s*\}\}/.test(v)));
    expect(bad).toEqual([]);
  });
  it('no match-score string shows a percentage or a score placeholder', () => {
    const bad = rows.filter(([k, v]) => !ADMIN_SETTING_KEYS.has(k) && !WORD_ONLY_KEYS.has(k) && /match|suggested/i.test(k) && (/%/.test(v) || /\{\{\s*(conf|confidence|pct|percent|score)\s*\}\}/.test(v)));
    expect(bad).toEqual([]);
  });
});

describe('main surfaces render no confidence percentage', () => {
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
  const noPercent = () => expect(document.body.textContent ?? '').not.toMatch(/\d\s*%/);

  it.each(['documentation', 'clinical_support'])('%s: code suggestion row shows a label, not 90%%', async profile => {
    vi.stubEnv('VITE_REGULATORY_PROFILE', profile);
    await i18n.changeLanguage('en');
    render(<AiSuggestionMeta sug={{ code: 'C50.9', display: 'x', system: 'ICD10', confidence: 90, rationale: '', model: 'm' } as never} />);
    expect(screen.getByTestId('code-match-strength').textContent).toMatch(/match/i);
    noPercent();
  });

  it.each(['documentation', 'clinical_support'])('%s: AI review modal says whether the source was found, with no number', async profile => {
    vi.stubEnv('VITE_REGULATORY_PROFILE', profile);
    await i18n.changeLanguage('en');
    const field = { fieldId: 'f1', fieldLabel: 'Grade', sectionTitle: 'Tumour', aiValue: 'G2', confidence: 91, source: 'Micro: grade 2', sourceNotFound: false };
    type ReviewProps = ComponentProps<typeof AiReviewModal>;
    const props = { fields: [field], finalizeAndNext: false, onConfirm: vi.fn(), onOverride: vi.fn(), onSkip: vi.fn(), onComplete: vi.fn(), onCancel: vi.fn() } as unknown as ReviewProps;
    const { unmount } = render(<AiReviewModal {...props} />);
    expect(screen.getByText('Source found in report text')).toBeTruthy();
    noPercent();
    unmount();
    render(<AiReviewModal {...props} fields={[{ ...field, sourceNotFound: true }] as unknown as ReviewProps['fields']} />);
    expect(screen.queryByText('Source found in report text')).toBeNull();
    expect(screen.getByText(/Source not found in report text/).textContent).not.toMatch(/confidence/i);
    noPercent();
  });

  it('protocol change modal lists the reason and no confidence figure', async () => {
    await i18n.changeLanguage('en');
    const change = { id: 'c1', specimenId: 'sp', specimenLabel: 'A', specimenDesc: 'Colon biopsy', action: 'replace' as const, currentTemplateName: 'Colon resection', proposedTemplateName: 'Colon biopsy', reason: 'Biopsy, not resection', confidence: 90 };
    render(<ProtocolChangeModal show changes={[change] as never} onCommit={vi.fn()} onCancel={vi.fn()} />);
    noPercent();
  });

  it('narrative provenance note shows the source quote without a confidence figure', async () => {
    vi.stubEnv('VITE_REGULATORY_PROFILE', 'clinical_support');
    await i18n.changeLanguage('en');
    render(<NarrativeProvenanceNote provenance={{ status: 'verified', confidence: 88, quote: 'grade 2 carcinoma' } as never} />);
    expect(screen.getByTestId('narrative-provenance').textContent).toContain('grade 2 carcinoma');
    noPercent();
  });

  it.each(['documentation', 'clinical_support'])('%s: mismatch summary names the source without a confidence or threshold figure', async profile => {
    vi.stubEnv('VITE_REGULATORY_PROFILE', profile);
    await i18n.changeLanguage('en');
    const assessment = {
      suggestion: { kind: 'other', confidence: 82, source: 'ai', explanation: 'Polyp, carcinoma found.' },
      outcome: { holdsSignOut: true, rule: { id: 'r', actionThreshold: 70, minimumDisplayThreshold: 50 } },
    };
    render(<ClinicalMismatchSummary assessment={assessment as never} />);
    expect(screen.getByText(/Holds sign-out/)).toBeTruthy();
    noPercent();
  });
});

describe('the surfaces carry no percentage-rendering code for AI confidence', () => {
  const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');
  it.each([
    'pages/SynopticReportPage/components/RightSynopticPanel.tsx',
    'pages/SynopticReportPage/components/HeaderBar.tsx',
    'pages/SynopticReportPage/components/AddSynopticModal.tsx',
    'pages/SynopticReportPage/components/NarrativeProvenanceNote.tsx',
    'pages/SynopticReportPage/modals/AiReviewModal.tsx',
    'pages/SynopticReportPage/modals/ProtocolChangeModal.tsx',
    'pages/Synoptic/Codes/CaseCodingDisplay.tsx',
    'pages/Synoptic/Codes/AiSuggestionMeta.tsx',
    'pages/AccessionPage/AccessionPage.tsx',
    'pages/SurgicalQaWorklistPage.tsx',
    'components/PatientHistory/PatientHistoryModal.tsx',
    'components/PatientHistory/HistoryExtractionPanel.tsx',
    'components/ClinicalMismatch/ClinicalMismatchAlert.tsx',
    'components/ClinicalMismatch/ClinicalMismatchSummary.tsx',
    'components/Contribution/AIContributionTab.tsx',
  ])('%s does not switch a confidence figure on by profile', file => {
    const src = read(file);
    expect(src).not.toContain('showsConfidence');
    expect(src).not.toContain('showConfidenceScores');
    expect(src).not.toMatch(/\bconfidence\}?\s*%|\$\{conf\}%|matchPct\}%/);
  });
});
