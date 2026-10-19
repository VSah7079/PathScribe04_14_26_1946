// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@/i18n/config';
import SimulatedMailOutboxSection from './SimulatedMailOutboxSection';
import { recordSimulatedEmail, resetSimulatedMailForTests } from '@/services/communications/simulatedMailOutbox';

describe('SimulatedMailOutboxSection (Batch 604)', () => {
  beforeEach(() => resetSimulatedMailForTests());
  afterEach(cleanup);

  it('says nothing has been sent when empty', () => {
    render(<SimulatedMailOutboxSection />);
    expect(screen.getByTestId('simulated-mail-empty')).toBeTruthy();
  });

  it('lists a new simulated e-mail with the Simulated label and opens its body', () => {
    render(<SimulatedMailOutboxSection />);
    act(() => { recordSimulatedEmail({ to: ['dr@x.example'], subject: 'Follow-up', bodyText: 'Please review', bodyHtml: '<p>Please review</p>' }); });
    expect(screen.getByText('Follow-up')).toBeTruthy();
    expect(screen.getAllByText('Simulated').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Open'));
    expect(screen.getByTestId('simulated-mail-body').textContent).toBe('Please review');
  });
});
