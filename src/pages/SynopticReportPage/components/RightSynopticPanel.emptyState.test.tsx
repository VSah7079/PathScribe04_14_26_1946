// @vitest-environment happy-dom
//
// src/pages/SynopticReportPage/components/RightSynopticPanel.emptyState.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-310): when the selected specimen has no synoptic report, the
// synoptic panel's empty state names that specimen and tells the pathologist
// to pick a template below to add one. Rendered with the real English locale
// so the wording itself is checked, not just the key.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import type { Case } from '@/types/case/Case';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'PATH-001', name: 'Test Pathologist' } }) }));

const templates = [
  { id: 'tpl-thyroid', name: 'Thyroid Resection', source: 'CAP', version: '4.1', category: 'THYROID' },
  { id: 'tpl-lung', name: 'Lung Resection', source: 'CAP', version: '4.2', category: 'LUNG' },
];
vi.mock('@/services/templates/templateService', () => ({
  listTemplatesCached: vi.fn(async () => templates),
  getTemplateCached: vi.fn(async () => null),
}));

import RightSynopticPanel from './RightSynopticPanel';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const caseWithoutReport = {
  id: 'CASE-310',
  status: 'in-progress',
  // Specimen descriptions that match no template category, so nothing is auto-attached.
  specimens: [
    { id: 'sp-a', label: 'A', description: 'Skin, left forearm, shave' },
    { id: 'sp-b', label: 'B', description: 'Fine needle aspiration, lymph node' },
  ],
  synopticReports: [],
} as unknown as Case;

describe('RightSynopticPanel empty state (PS-310)', () => {
  it('names the selected specimen with no synoptic report and says to pick a template below to add one', async () => {
    render(<RightSynopticPanel caseData={caseWithoutReport} activeTab="synoptic" activeSpecimenId="sp-b" />);
    expect(await screen.findByText('No synoptic report is associated with specimen B yet — pick a template below to add one.')).toBeTruthy();
    // The templates to pick from are listed right under it.
    await waitFor(() => expect(screen.getByText('Lung Resection')).toBeTruthy());
    expect(screen.getByText('Thyroid Resection')).toBeTruthy();
  });

  it('follows the selection: another specimen is named when it is the one selected', async () => {
    render(<RightSynopticPanel caseData={caseWithoutReport} activeTab="synoptic" activeSpecimenId="sp-a" />);
    expect(await screen.findByText('No synoptic report is associated with specimen A yet — pick a template below to add one.')).toBeTruthy();
  });

  it('with no specimen selected, says "this specimen" rather than "this case"', async () => {
    render(<RightSynopticPanel caseData={caseWithoutReport} activeTab="synoptic" />);
    expect(await screen.findByText('No synoptic report is associated with this specimen yet — pick a template below to add one.')).toBeTruthy();
  });
});
