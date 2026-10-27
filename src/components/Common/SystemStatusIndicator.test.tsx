// @vitest-environment happy-dom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
const status = vi.fn();
vi.mock('@/hooks/useSystemStatus', () => ({ useSystemStatus: () => status() }));
import SystemStatusIndicator from './SystemStatusIndicator';

afterEach(cleanup);

describe('SystemStatusIndicator', () => {
  it.each(['checking', 'operational', 'degraded', 'unavailable', 'statusUnavailable'])('prints the %s text key with a matching dot', kind => {
    status.mockReturnValue({ kind, simulated: false });
    render(<SystemStatusIndicator />);
    expect(screen.getByTestId('system-status-text').textContent).toBe(`home.status.${kind}`);
    expect(document.querySelector(`.ps-sysstatus-dot--${kind}`)).not.toBeNull();
    expect(screen.queryByText('home.status.simulatedNote')).toBeNull();
  });
  it('says so when the answer is the demo stand-in', () => {
    status.mockReturnValue({ kind: 'operational', simulated: true });
    render(<SystemStatusIndicator />);
    expect(screen.getByText('home.status.simulatedNote')).toBeTruthy();
  });
});
