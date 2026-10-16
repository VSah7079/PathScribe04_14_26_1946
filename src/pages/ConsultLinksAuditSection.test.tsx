// @vitest-environment happy-dom
// Batch 522 (PS-290): Audit Log → Consult links.
import '@/i18n/config';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { ConsultToken } from '@/services/consultAccess/IConsultTokenService';

const { listAll, revoke } = vi.hoisted(() => ({ listAll: vi.fn(), revoke: vi.fn(async () => ({ ok: true })) }));
vi.mock('@/services', () => ({ consultTokenService: { listAll, revoke } }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className: string }) => <button className={className} onClick={onClick}>{children}</button>,
}));

const link = (over: Partial<ConsultToken>): ConsultToken => ({
  id: 'l1', tokenHash: 'h', scope: { caseId: 'S26-1', caseAccessionNumber: 'S26-0001' },
  issuedByUserId: 'u1', issuedByName: 'Dr. Sarah Johnson', issuedAt: '2026-10-10T10:00:00Z', expiresAt: '2099-01-01T00:00:00Z',
  isActive: true, consultantIdentifier: 'Dr. Miguel Ortega', consultantOrganization: 'Sonoran Dermatopathology', accessCount: 0, ...over,
});

afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderSection() {
  const { default: ConsultLinksAuditSection } = await import('./ConsultLinksAuditSection');
  render(<ConsultLinksAuditSection />);
  await act(async () => {});
}

describe('ConsultLinksAuditSection', () => {
  it('lists active links with the case tagged as patient data, and Revoke revokes and reloads', async () => {
    listAll.mockResolvedValue({ ok: true, data: [link({}), link({ id: 'l2', isActive: false, revokedAt: '2026-10-10T11:00:00Z', revokedByName: 'Admin' })] });
    await renderSection();
    expect(screen.getByText('Outside consult links')).not.toBeNull();
    expect(screen.getByText('S26-0001').getAttribute('data-phi')).toBe('accession');
    expect(screen.getByText('Dr. Miguel Ortega')).not.toBeNull();
    expect(screen.getAllByText('Revoke')).toHaveLength(1);
    fireEvent.click(screen.getByText('Revoke'));
    await act(async () => {});
    expect(revoke).toHaveBeenCalledWith('l1');
    expect(listAll).toHaveBeenCalledTimes(2);
  });

  it('shows revoked and expired links when "Active only" is cleared', async () => {
    listAll.mockResolvedValue({ ok: true, data: [link({ isActive: false, revokedAt: '2026-10-10T11:00:00Z', revokedByName: 'Admin' })] });
    await renderSection();
    expect(screen.getByText('No consult links are active.')).not.toBeNull();
    fireEvent.click(screen.getByLabelText('Active only'));
    expect(screen.getByText(/Revoked by Admin/)).not.toBeNull();
  });

  it('without audit:consult-links:view, says so', async () => {
    listAll.mockResolvedValue({ ok: false, error: 'CONSULT_LINK_NOT_PERMITTED' });
    await renderSection();
    expect(screen.getByText(/You don't have permission to see consult links/)).not.toBeNull();
  });
});
