// @vitest-environment happy-dom
//
// src/components/Worklist/WorklistAbnormalBadge.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-133, PS-130): a case whose abnormal finding was confirmed at
// sign-out shows a small badge on the worklist, coloured by severity and
// static (not pulsing like the STAT dot), in both the table (row) view and
// the card view. Its tooltip names the severity and, for QC, the synthetic
// test code(s) recorded for the finding. Renders the real WorklistTable with
// the real English locale; the colours and the absence of animation are read
// from pathscribe.css, which is where they live.
// ─────────────────────────────────────────────────────────────────────────────
import i18n from '@/i18n/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import type { Case } from '@/types/case/Case';

vi.mock('react-router', async importOriginal => ({ ...(await importOriginal<typeof import('react-router')>()), useNavigate: () => vi.fn() }));
vi.mock('@/hooks/useOpenCase', () => ({ useOpenCase: () => vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'PATH-001', name: 'Dr Test', roles: ['Pathologist'] } }) }));
vi.mock('@/contexts/SystemConfigContext', () => ({ useSystemConfig: () => ({ config: { facilityTimezone: 'UTC' } }) }));
vi.mock('@/contexts/MessagingContext', () => ({ useMessaging: () => ({ reloadInbox: vi.fn(), setPortalOpen: vi.fn() }) }));

import WorklistTable from './WorklistTable';

beforeAll(async () => { await i18n.changeLanguage('en'); });
afterEach(() => cleanup());

const now = new Date().toISOString();
const makeCase = (id: string, extra: Partial<Case> = {}): Case => ({
  id, status: 'in-progress', createdAt: now, updatedAt: now,
  accession: { fullAccession: id, accessionNumber: id },
  patient: { firstName: 'Test', lastName: id, mrn: `MRN-${id}`, dateOfBirth: '1970-01-01' },
  order: { priority: 'Routine', facilityId: 'FAC-1', facilityName: 'Main Lab' },
  specimens: [],
  ...extra,
} as unknown as Case);

const cases = [
  makeCase('S26-0001', {
    abnormalDetectionStatus: { severity: 'Malignant', confirmedAt: now },
    syntheticAbnormalCoding: [
      { system: 'TEST-SNOMED', code: 'TEST-363346000', display: 'Malignant neoplastic disease (test)' },
      { system: 'TEST-ICDO3', code: 'TEST-8500/3', display: 'Infiltrating duct carcinoma (test)' },
    ],
  }),
  makeCase('S26-0002', { abnormalDetectionStatus: { severity: 'Critical', confirmedAt: now } }),
  makeCase('S26-0003', { abnormalDetectionStatus: { severity: 'Abnormal', confirmedAt: now } }),
  makeCase('S26-0004'),
];

const badges = (container: HTMLElement) => Array.from(container.querySelectorAll('[class^="wl-abnormal-dot--"]')) as HTMLElement[];

describe.each([
  ['row (table) view', false],
  ['card view', true],
])('PS-133 / PS-130 worklist abnormal badge — %s', (_view, forceCardView) => {
  it('shows one badge per flagged case, its class naming the severity, and none for an unflagged case', async () => {
    const { container } = render(<WorklistTable cases={cases} activeFilter="all" forceCardView={forceCardView} />);
    await waitFor(() => expect(badges(container)).toHaveLength(3));
    expect(badges(container).map(b => b.className).sort()).toEqual(['wl-abnormal-dot--Abnormal', 'wl-abnormal-dot--Critical', 'wl-abnormal-dot--Malignant']);
    // Each badge sits on its own case, in the view under test.
    for (const b of badges(container)) expect(b.closest(forceCardView ? '.wl-card' : 'tr.wl-tr')).not.toBeNull();
  });

  it('the tooltip names the severity and, for QC, each synthetic test code with its term (PS-130)', async () => {
    const { container } = render(<WorklistTable cases={cases} activeFilter="all" forceCardView={forceCardView} />);
    await waitFor(() => expect(badges(container)).toHaveLength(3));
    const byClass = (sev: string) => badges(container).find(b => b.className === `wl-abnormal-dot--${sev}`)!;
    expect(byClass('Malignant').title).toBe(
      'Malignant finding confirmed at sign-out — TEST-363346000 (Malignant neoplastic disease (test)); TEST-8500/3 (Infiltrating duct carcinoma (test))',
    );
    // No synthetic code recorded: the tooltip just names the severity.
    expect(byClass('Critical').title).toBe('Critical finding confirmed at sign-out');
  });
});

describe('PS-133 the badge is colour-coded and static (pathscribe.css)', () => {
  const css = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../pathscribe.css'), 'utf8');
  const rule = (selector: string) => {
    const m = css.match(new RegExp(`${selector.replace(/[.-]/g, c => `\\${c}`)}\\s*\\{([^}]*)\\}`));
    if (!m) throw new Error(`no CSS rule for ${selector}`);
    return m[1];
  };
  const severities = ['Abnormal', 'Critical', 'Malignant'];

  it('each severity has its own background colour', () => {
    const colours = severities.map(s => rule(`.wl-abnormal-dot--${s}`).match(/background:\s*([^;]+);/)?.[1].trim());
    expect(colours.every(Boolean)).toBe(true);
    expect(new Set(colours).size).toBe(3);
  });

  it('no severity badge is animated, unlike the pulsing STAT dot', () => {
    for (const s of severities) {
      expect(rule(`.wl-abnormal-dot--${s}`)).not.toMatch(/animation/);
      expect(css).not.toMatch(new RegExp(`\\.wl-abnormal-dot--${s}[^{]*\\{[^}]*animation`));
    }
    expect(rule('.wl-urgent-dot')).toMatch(/animation/);
  });
});
