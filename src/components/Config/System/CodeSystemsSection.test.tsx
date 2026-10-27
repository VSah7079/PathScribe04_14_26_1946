// @vitest-environment happy-dom
// Batch 595: the Code Systems screen against the real services (localStorage), with the permission check allowed.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({ t: (key: string, p?: Record<string, unknown>) => (p && 'system' in p ? `${key}:${p.system}:${p.role}` : key), i18n: { language: 'en' } }),
}));
vi.mock('@/services/authorization/defaultAuthorizationService', () => ({
  authorizationService: { enforce: async () => ({ allowed: true }), evaluate: async () => ({ allowed: true }), grantedCapabilities: async () => new Set<string>() },
}));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) =>
    <button type="button" disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('./TerminologyLicencesCard', () => ({ default: () => <div data-testid="licences-card" /> })); // Batch 623: has its own test
import CodeSystemsSection from './CodeSystemsSection';
import { codeSystemPolicyService } from '@/services';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('CodeSystemsSection (Batch 595)', () => {
  it('shows the laboratory jurisdiction with the default policy', async () => {
    render(<CodeSystemsSection />);
    expect((await screen.findAllByText('codeSystemsSection.source.default')).length).toBeGreaterThan(0);
    expect(screen.queryByText('codeSystemsSection.source.custom')).toBeNull();
    expect(screen.getAllByText('codeSystemsSection.summary:addCodeModal.systemLabel.ICD10:codeSystemsSection.role.optional').length).toBeGreaterThan(0);
    expect(screen.queryByText('codeSystemsSection.summary:addCodeModal.systemLabel.ICD11:codeSystemsSection.role.off')).toBeNull();
  });

  it('edits the rules, saves them, and the row then says it was set here', async () => {
    render(<CodeSystemsSection />);
    fireEvent.click((await screen.findAllByText('codeSystemsSection.edit'))[0]);
    fireEvent.click(screen.getByText('codeSystemsSection.addRule'));
    const systems = screen.getAllByLabelText('codeSystemsSection.systemLabel') as HTMLInputElement[];
    const roles = screen.getAllByLabelText('codeSystemsSection.roleLabel') as HTMLSelectElement[];
    const dates = screen.getAllByLabelText('codeSystemsSection.fromLabel') as HTMLInputElement[];
    const last = systems.length - 1;
    fireEvent.change(systems[last], { target: { value: 'ICD11' } });
    fireEvent.change(roles[last], { target: { value: 'required' } });
    fireEvent.change(dates[last], { target: { value: '2028-07-01' } });
    fireEvent.click(screen.getByText('codeSystemsSection.save'));
    expect((await screen.findAllByText('codeSystemsSection.source.custom')).length).toBe(1);
    const saved = await codeSystemPolicyService.list();
    expect(saved.ok && saved.data[0].rules.some(r => r.system === 'ICD11' && r.role === 'required' && r.from === '2028-07-01')).toBe(true);
  });

  it('shows the problem when the same system has two rules starting the same day, and saves nothing', async () => {
    render(<CodeSystemsSection />);
    fireEvent.click((await screen.findAllByText('codeSystemsSection.edit'))[0]);
    fireEvent.click(screen.getByText('codeSystemsSection.addRule'));
    const systems = screen.getAllByLabelText('codeSystemsSection.systemLabel') as HTMLInputElement[];
    fireEvent.change(systems[systems.length - 1], { target: { value: 'ICD11' } });
    fireEvent.click(screen.getByText('codeSystemsSection.save'));
    expect((await screen.findByRole('alert')).textContent).toBe('codeSystemsSection.problems.DUPLICATE');
    const saved = await codeSystemPolicyService.list();
    expect(saved.ok && saved.data).toEqual([]);
  });

  it('resets a set policy back to the default', async () => {
    await codeSystemPolicyService.save({ jurisdiction: 'US', rules: [{ system: 'ICD10', role: 'required' }] });
    render(<CodeSystemsSection />);
    fireEvent.click(await screen.findByText('codeSystemsSection.reset'));
    await waitFor(() => expect(screen.queryByText('codeSystemsSection.source.custom')).toBeNull());
  });
});
