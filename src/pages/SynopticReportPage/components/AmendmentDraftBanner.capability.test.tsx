// @vitest-environment happy-dom
// Batch 649: the draft banner's Edit button (it reopens the Amendment window) is greyed out when the person may
// release none of an amendment, a correction or an addendum.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', async importOriginal => ({ ...(await importOriginal<typeof import('react-i18next')>()), useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }) }));
vi.mock('@/services', () => ({ amendmentService: { getByCaseId: vi.fn(async () => ({ ok: true, data: [] })) } }));
const avail = vi.hoisted(() => ({ held: [] as string[] }));
vi.mock('../hooks/useRevisionReleaseAvailability', async () => {
  const m = await import('@/services/reports/revisionReleaseCapability');
  return { useRevisionReleaseAvailability: () => ({ availability: m.revisionReleaseAvailability(c => avail.held.includes(c)), loading: false }) };
});

import { AmendmentDraftBanner } from './AmendmentDraftBanner';
import i18n from '@/i18n/config';

afterEach(() => { cleanup(); avail.held = []; });
const caseData = { id: 'C1', order: { facilityId: 'F1' }, synopticReports: [{ instanceId: 'r1', status: 'draft', pendingAmendmentId: 'a1', previouslyFinalizedForAmendment: true, answers: {} }] };
const edit = () => screen.getByText(/common.edit/).closest('button') as HTMLButtonElement;

describe('AmendmentDraftBanner Edit (Batch 649)', () => {
  it('is greyed out with the explanation when the person holds none of the three', () => {
    render(<AmendmentDraftBanner caseData={caseData} activeReportInstanceId="r1" onEdit={vi.fn()} />);
    expect(edit().disabled).toBe(true);
    expect(edit().title).toBe(i18n.t('caseActionPermissions.revisionNone'));
  });
  it('is available when the person holds any one', () => {
    avail.held = ['surgical:addendum:release'];
    render(<AmendmentDraftBanner caseData={caseData} activeReportInstanceId="r1" onEdit={vi.fn()} />);
    expect(edit().disabled).toBe(false);
  });
});
