// @vitest-environment happy-dom
// src/pages/InterfaceEnginesSection.test.tsx (Batch 554)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k), i18n: { language: 'en' } }) }));
vi.mock('@/services', () => ({ interfaceMonitoringService: { viaServer: false } }));

import InterfaceEnginesSection from './InterfaceEnginesSection';
import { EngineStatusLine } from '@/components/Interfaces/EngineStatusLine';
import type { IInterfaceMonitoringService } from '@/services/interfaceMonitoring/interfaceMonitoringService';

afterEach(() => cleanup());
const serverTime = '2026-10-14T12:00:00.000Z';
const svc = (engines: unknown[], ok = true): IInterfaceMonitoringService => ({
  viaServer: true,
  engines: vi.fn(async () => (ok ? { ok: true as const, data: { serverTime, engines } as never } : { ok: false as const, error: 'UNAVAILABLE' as const })),
});
const metro = {
  engineInstanceId: 'eng-1', displayName: 'Metro General', hosting: 'onsite',
  lastHeartbeat: { receivedAt: '2026-10-14T11:59:30.000Z', heartbeat: { v: 1, engineInstanceId: 'eng-1', hosting: 'onsite', imageVersion: '4.5.2', apiReachable: true, diskFreePercent: 55, channels: [
    { channelId: 'ADT_IN', direction: 'inbound', state: 'stopped', queued: 0, deadLetters: 0 },
    { channelId: 'ORU_OUT', direction: 'outbound', state: 'started', queued: 3, deadLetters: 2 },
  ] } },
};

describe('InterfaceEnginesSection', () => {
  it('the demo explains that there is no engine', () => {
    render(<InterfaceEnginesSection service={{ viaServer: false, engines: vi.fn() }} />);
    expect(screen.getByText('interfaceEngines.demoNote')).toBeTruthy();
  });

  it('shows each engine with its status, a stopped listener first, and opens Outbound for dead letters', async () => {
    const open = vi.fn();
    render(<InterfaceEnginesSection service={svc([metro])} onOpenOutbound={open} />);
    expect(await screen.findByText('Metro General')).toBeTruthy();
    expect(screen.getByText('interfaceEngines.status.degraded')).toBeTruthy(); // a listener is stopped
    const rows = Array.from(document.querySelectorAll('tbody tr'));
    expect(rows[0].textContent).toContain('ADT_IN');
    expect(rows[0].textContent).toContain('interfaceEngines.channelProblem.stopped');
    expect(screen.getByText(/interfaceEngines\.totals\.listenersDown/).textContent).toContain('interfaceEngines.totals.listenersDown:{"count":1}');
    fireEvent.click(screen.getByText('interfaceEngines.openOutbound'));
    expect(open).toHaveBeenCalled();
  });

  it('says when nothing is registered, and when the status can\'t be read', async () => {
    render(<InterfaceEnginesSection service={svc([])} />);
    expect(await screen.findByText('interfaceEngines.none')).toBeTruthy();
    cleanup();
    render(<InterfaceEnginesSection service={svc([], false)} />);
    expect(await screen.findByText('interfaceEngines.problem.UNAVAILABLE')).toBeTruthy();
  });
});

describe('EngineStatusLine', () => {
  it('counts the engines, and one click opens Engines', async () => {
    const open = vi.fn();
    render(<EngineStatusLine service={svc([metro])} onOpen={open} />);
    const line = await screen.findByText(/interfaceEngines\.line/);
    expect(line.textContent).toContain('interfaceEngines.lineParts.degraded:{\\"count\\":1}');
    expect(line.textContent).toContain('interfaceEngines.lineParts.listenersDown');
    expect(line.textContent).not.toContain('lineParts.offline'); // zero counts are left out
    expect(line.closest('p')?.className).toContain('ps-ifengines-line--problem');
    fireEvent.click(screen.getByText('interfaceEngines.view'));
    expect(open).toHaveBeenCalled();
  });
  it('is hidden in the demo, without the capability, and with no engines', async () => {
    const off = svc([metro]);
    const { container } = render(<EngineStatusLine service={off} onOpen={vi.fn()} enabled={false} />);
    expect(container.textContent).toBe('');
    expect(off.engines).not.toHaveBeenCalled();
    cleanup();
    const none = svc([]);
    const r2 = render(<EngineStatusLine service={none} onOpen={vi.fn()} />);
    await waitFor(() => expect(none.engines).toHaveBeenCalled());
    expect(r2.container.textContent).toBe('');
    cleanup();
    const failing = svc([metro], false);
    const r3 = render(<EngineStatusLine service={failing} onOpen={vi.fn()} />);
    await waitFor(() => expect(failing.engines).toHaveBeenCalled());
    expect(r3.container.textContent).toBe(''); // never old counts after a failed read
  });
});
