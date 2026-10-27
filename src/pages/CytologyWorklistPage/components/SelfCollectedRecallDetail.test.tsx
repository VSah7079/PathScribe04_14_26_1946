// @vitest-environment happy-dom
// Batch 631: the recall detail under a Recall needed row.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { selfCollectedRecallFor } from '@/services/cytology/selfCollectedRecall';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { language: 'en' }, t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));
import SelfCollectedRecallDetail from './SelfCollectedRecallDetail';

afterEach(cleanup);
const G = (over = {}) => ({ hpv16: false, hpv18Or45: false, otherHighRisk: false, ...over });

describe('SelfCollectedRecallDetail', () => {
  it('shows Urgent, the window and the Australian wording with the colposcopy step for 16/18', () => {
    const r = selfCollectedRecallFor('AU', 'Positive', G({ hpv16: true }))!;
    const { container } = render(<SelfCollectedRecallDetail recall={r} />);
    expect(screen.getByText('cytologyWorklist.recall.priority.urgent')).toBeTruthy();
    expect(screen.getByText(/cytologyWorklist\.recall\.target.*"min":2,"max":4/)).toBeTruthy();
    expect(screen.getByText(/recall\.wording\.AU\.clinician_lbc.*recall\.type\.hpv16_18.*recall\.next\.colposcopy/)).toBeTruthy();
    expect(container.querySelector('[data-recommendation-codes="AU_REFER_COLPOSCOPY AU_RECALL_CLINICIAN_LBC"]')).toBeTruthy();
  });
  it('shows Routine and the New Zealand wording for another type', () => {
    render(<SelfCollectedRecallDetail recall={selfCollectedRecallFor('NZ', 'Positive', G({ otherHighRisk: true }))!} />);
    expect(screen.getByText('cytologyWorklist.recall.priority.routine')).toBeTruthy();
    expect(screen.getByText(/recall\.wording\.NZ\.clinician_lbc.*recall\.type\.other_oncogenic.*recall\.next\.management/)).toBeTruthy();
  });
  it('an Invalid result shows the repeat-collection wording', () => {
    render(<SelfCollectedRecallDetail recall={selfCollectedRecallFor('AU', 'Invalid', undefined)!} />);
    expect(screen.getByText('cytologyWorklist.recall.wording.AU.repeat_collection')).toBeTruthy();
  });
  it('Batch 640: the administrator\'s wording replaces the built-in text for that country and language, with {{type}} and {{next}} filled', () => {
    const r = selfCollectedRecallFor('AU', 'Positive', G({ hpv16: true }))!;
    render(<SelfCollectedRecallDetail recall={r} wording={{ AU: { clinician_lbc: { en: 'Our text: {{type}}, then {{next}}.' } } }} />);
    expect(screen.getByText('Our text: cytologyWorklist.recall.type.hpv16_18, then cytologyWorklist.recall.next.colposcopy.')).toBeTruthy();
    expect(screen.queryByText(/recall\.wording\.AU/)).toBeNull();
  });
  it('wording saved for the other country is ignored', () => {
    render(<SelfCollectedRecallDetail recall={selfCollectedRecallFor('NZ', 'Invalid', undefined)!} wording={{ AU: { repeat_collection: { en: 'AU only' } } }} />);
    expect(screen.getByText('cytologyWorklist.recall.wording.NZ.repeat_collection')).toBeTruthy();
  });
});
