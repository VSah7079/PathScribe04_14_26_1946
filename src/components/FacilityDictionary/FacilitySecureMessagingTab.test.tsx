// @vitest-environment happy-dom
// src/components/FacilityDictionary/FacilitySecureMessagingTab.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const svc = vi.hoisted(() => ({ getForFacility: vi.fn(), save: vi.fn() }));
vi.mock('@/services', () => ({ secureMessagingConfigService: svc }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) =>
    <button disabled={disabled} onClick={onClick}>{children}</button>,
}));

import { FacilitySecureMessagingTab } from './FacilitySecureMessagingTab';
import type { Facility } from '@/services/facilities/IFacilityService';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const K = 'facilitySecureMessagingTab';
const lab = { id: 'c-au-sydney-cyto', name: 'Sydney Cytology', jurisdiction: 'AU' } as Facility;

describe('FacilitySecureMessagingTab (Batch 517, PS-143)', () => {
  it('a lab with none adds its local network first, records the agreement, and saves', async () => {
    svc.getForFacility.mockResolvedValue({ ok: true, data: null });
    svc.save.mockImplementation(async (c: unknown) => ({ ok: true, data: c }));
    render(<FacilitySecureMessagingTab facility={lab} />);
    await waitFor(() => expect(svc.getForFacility).toHaveBeenCalledWith('c-au-sydney-cyto'));
    expect(screen.getByText(`${K}.none`)).toBeTruthy();
    const options = Array.from((screen.getByLabelText(`${K}.addLabel`) as HTMLSelectElement).options).map(o => o.value);
    expect(options.slice(1, 4)).toEqual(['HEALTHLINK', 'MEDICAL_OBJECTS', 'REFERRALNET']);
    fireEvent.change(screen.getByLabelText(`${K}.addLabel`), { target: { value: 'HEALTHLINK' } });
    fireEvent.click(screen.getByText(`${K}.add`));
    expect(screen.getByText(`${K}.noAgreement`)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(`${K}.agreementOnFile`));
    expect(screen.getByRole('alert').textContent).toBe(`${K}.problems.agreementReferenceRequired`);
    fireEvent.change(screen.getByLabelText(`${K}.agreementReference`), { target: { value: 'HL-2025' } });
    fireEvent.click(screen.getByText(`${K}.save`));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(`${K}.saved`));
    expect(svc.save).toHaveBeenCalledWith(expect.objectContaining({
      facilityId: 'c-au-sydney-cyto', defaultGatewayId: 'HEALTHLINK',
      gateways: [expect.objectContaining({ gatewayId: 'HEALTHLINK', enabled: true, agreement: expect.objectContaining({ kind: 'DPA', reference: 'HL-2025' }) })],
    }), { userId: 'admin' });
  });
});
