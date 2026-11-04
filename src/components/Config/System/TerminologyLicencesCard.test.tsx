// @vitest-environment happy-dom
// Batch 623 (PS-130): Configuration → System → Code Systems → Licensed terminologies.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { EnterpriseConfig } from '@app-types/config/EnterpriseConfig';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button type="button" onClick={onClick}>{children}</button>,
}));

const ctx = vi.hoisted(() => ({
  enterpriseConfig: { id: 'e', name: 'E', features: { reportingPlusEnabled: false, abnormalDetectionEnabled: true } } as unknown,
  update: vi.fn(async (_p: unknown) => true),
}));
vi.mock('@/contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({ enterpriseConfig: ctx.enterpriseConfig as EnterpriseConfig, updateEnterpriseConfig: ctx.update }),
}));

import TerminologyLicencesCard from './TerminologyLicencesCard';

afterEach(() => { cleanup(); ctx.update.mockClear(); ctx.update.mockImplementation(async () => true); });

const fill = (label: string, value: string, which = 0) =>
  fireEvent.change(screen.getAllByLabelText(label)[which], { target: { value } });

describe('TerminologyLicencesCard', () => {
  it('shows "no licence recorded" for both systems to start', () => {
    render(<TerminologyLicencesCard />);
    expect(screen.getAllByText(/terminologyLicences\.status\.none/)).toHaveLength(2);
  });

  it('turning one on without the holder, edition and reference saves nothing and says why', async () => {
    render(<TerminologyLicencesCard />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByText('terminologyLicences.save'));
    expect(await screen.findByText('terminologyLicences.problems.holderRequired')).toBeTruthy();
    expect(screen.getByText('terminologyLicences.problems.editionRequired')).toBeTruthy();
    expect(screen.getByText('terminologyLicences.problems.referenceRequired')).toBeTruthy();
    expect(ctx.update).not.toHaveBeenCalled();
  });

  it('saves a complete SNOMED CT licence through the enterprise settings', async () => {
    render(<TerminologyLicencesCard />);
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fill('terminologyLicences.holderLabel', 'Hospital Clínico');
    fill('terminologyLicences.editionLabel', 'SNOMED CT Spanish Edition');
    fill('terminologyLicences.referenceLabel', 'AGR-1');
    fireEvent.click(screen.getByText('terminologyLicences.save'));
    await waitFor(() => expect(ctx.update).toHaveBeenCalledTimes(1));
    expect(ctx.update).toHaveBeenCalledWith({
      terminologyLicences: { SNOMED_CT: { enabled: true, holder: 'Hospital Clínico', edition: 'SNOMED CT Spanish Edition', reference: 'AGR-1', expiresOn: '' } },
    });
    expect(await screen.findByText(/terminologyLicences\.saved/)).toBeTruthy();
  });

  it('says so when the person lacks the permission', async () => {
    ctx.update.mockImplementation(async () => false);
    render(<TerminologyLicencesCard />);
    fireEvent.click(screen.getByText('terminologyLicences.save'));
    expect(await screen.findByText('terminologyLicences.problems.notPermitted')).toBeTruthy();
  });

  it('shows a licence past its last valid day as expired', () => {
    ctx.enterpriseConfig = {
      id: 'e', name: 'E', features: { reportingPlusEnabled: false, abnormalDetectionEnabled: true },
      terminologyLicences: { ICD_O_3: { enabled: true, holder: 'H', edition: 'E', reference: 'R', expiresOn: '2020-01-01' } },
    };
    render(<TerminologyLicencesCard />);
    expect(screen.getByText(/terminologyLicences\.status\.expired/)).toBeTruthy();
    ctx.enterpriseConfig = { id: 'e', name: 'E', features: { reportingPlusEnabled: false, abnormalDetectionEnabled: true } };
  });
});
