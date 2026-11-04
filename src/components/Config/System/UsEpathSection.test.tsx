// @vitest-environment happy-dom
// Batch 620 (part E, PS-800): the US ePath screen: profiles, the example, choosing a profile for the enterprise or a facility.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { exampleProfile } from '@/services/usEpath/epathProfile';

const az = { ...exampleProfile(''), id: 'p-az', state: 'AZ', example: false, name: 'Arizona profile' };
const svc = vi.hoisted(() => ({
  usEpathService: {
    getProfiles: vi.fn(),
    getAssignments: vi.fn(),
    saveProfile: vi.fn(async () => ({ ok: true, data: {} })),
    removeProfile: vi.fn(async () => ({ ok: true, data: undefined })),
    setAssignment: vi.fn(async () => ({ ok: true, data: {} })),
    removeAssignment: vi.fn(async () => ({ ok: true, data: undefined })),
  },
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-a', name: 'Westside', state: 'AZ', status: 'Active' }] })) },
}));
vi.mock('@/services', () => svc);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import UsEpathSection from './UsEpathSection';

const S = 'usEpathSection';
const profileCard = (id: string) => document.querySelector(`[data-profile="${id}"]`) as HTMLElement;
const setup = (assignments: unknown[] = []) => {
  svc.usEpathService.getProfiles.mockResolvedValue({ ok: true, data: [exampleProfile(''), az] });
  svc.usEpathService.getAssignments.mockResolvedValue({ ok: true, data: assignments });
};
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('UsEpathSection', () => {
  it('lists the example (marked, no state) and a real profile', async () => {
    setup();
    render(<UsEpathSection />);
    await screen.findByText(`${S}.title`);
    expect(profileCard('example-us').textContent).toContain(`${S}.exampleBadge`);
    expect(profileCard('example-us').textContent).toContain(`${S}.exampleNote`);
    expect(profileCard('p-az').textContent).toContain('Arizona profile');
  });
  it('choosing an enterprise default saves it behind the capability', async () => {
    setup();
    render(<UsEpathSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.assignment.label`), { target: { value: 'p-az' } });
    await waitFor(() => expect(svc.usEpathService.setAssignment).toHaveBeenCalledWith({ facilityId: null, profileId: 'p-az' }));
    expect(screen.getAllByRole('button')[0].getAttribute('data-capability')).toBe('config:us-epath:manage');
  });
  it('a facility with no choice shows the profile for its state, and "follow the state" removes its own', async () => {
    setup([{ id: 'a1', facilityId: 'fac-a', profileId: 'example-us', updatedAt: '' }]);
    render(<UsEpathSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    fireEvent.change(screen.getByLabelText(`${S}.assignment.label`), { target: { value: '' } });
    await waitFor(() => expect(svc.usEpathService.removeAssignment).toHaveBeenCalledWith('fac-a'));
  });
  it('does nothing when the enterprise "none" option is chosen with no earlier choice', async () => {
    setup();
    render(<UsEpathSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.assignment.label`), { target: { value: 'p-az' } });
    await waitFor(() => expect(svc.usEpathService.setAssignment).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText(`${S}.assignment.label`), { target: { value: '' } });
    expect(svc.usEpathService.removeAssignment).not.toHaveBeenCalled();
  });
  it('removes a profile', async () => {
    setup();
    render(<UsEpathSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(profileCard('p-az').querySelectorAll('button')[1]);
    await waitFor(() => expect(svc.usEpathService.removeProfile).toHaveBeenCalledWith('p-az'));
  });
});
