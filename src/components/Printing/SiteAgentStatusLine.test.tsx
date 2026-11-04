// @vitest-environment happy-dom
// Batch 552 (PS-539 phase 2d): the site agents line in the Print Queue.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }) }));
vi.mock('@/services', () => ({ siteAgentAdminService: { viaServer: false } }));

import { SiteAgentStatusLine } from './SiteAgentStatusLine';
import type { ISiteAgentAdminService } from '@/services/siteAgent/siteAgentAdminService';

const svc = (viaServer: boolean, allRevoked = false): ISiteAgentAdminService => ({
  viaServer,
  listAgents: vi.fn(async () => ({ ok: true as const, data: [{ agentId: 'a', siteId: 'S1', machineName: 'PC', agentVersion: '1', enrolledAt: 'x', certExpiresAt: 'y', ...(allRevoked ? { revokedAt: 'x' } : {}) }] })),
  createEnrollmentCode: vi.fn(), revoke: vi.fn(), getConfig: vi.fn(), saveConfig: vi.fn(), reportPrinters: vi.fn(),
});
afterEach(() => cleanup());

describe('SiteAgentStatusLine (Batch 552)', () => {
  it('in the demo shows nothing', () => {
    const { container } = render(<MemoryRouter><SiteAgentStatusLine service={svc(false)} /></MemoryRouter>);
    expect(container.textContent).toBe('');
  });
  it('with only revoked agents shows nothing', async () => {
    const service = svc(true, true);
    const { container } = render(<MemoryRouter><SiteAgentStatusLine service={service} /></MemoryRouter>);
    await vi.waitFor(() => expect(service.listAgents).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
  it('with the server counts the agents and links to the Site agents section', async () => {
    render(<MemoryRouter><SiteAgentStatusLine service={svc(true)} /></MemoryRouter>);
    expect(await screen.findByText(/siteAgents.line:\{"online":0,"degraded":0,"offline":1\}/)).toBeTruthy();
    expect(screen.getByText('siteAgents.lineLink').getAttribute('href')).toBe('/configuration?tab=system&section=site_agents');
  });
});
