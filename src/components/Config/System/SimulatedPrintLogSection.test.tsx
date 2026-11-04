// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@/i18n/config';
import SimulatedPrintLogSection from './SimulatedPrintLogSection';
import { getSimulatedPrintFailure, recordSimulatedPrint, resetSimulatedPrintForTests } from '@/services/printing/simulatedPrint';

describe('SimulatedPrintLogSection (Batch 606)', () => {
  beforeEach(() => resetSimulatedPrintForTests());
  afterEach(cleanup);

  it('says nothing has been printed when empty', () => {
    render(<SimulatedPrintLogSection />);
    expect(screen.getByTestId('simulated-print-empty')).toBeTruthy();
  });

  it('lists a new simulated print with the Simulated label', () => {
    render(<SimulatedPrintLogSection />);
    act(() => { recordSimulatedPrint({ kind: 'label', transport: 'bartender_rest', destination: 'LAB-1' }); });
    expect(screen.getByText('LAB-1')).toBeTruthy();
    expect(screen.getAllByText('Simulated').length).toBeGreaterThan(0);
    expect(screen.getByText('Simulated: sent to printer')).toBeTruthy();
  });

  it('the failure switch makes the next simulated send fail', () => {
    render(<SimulatedPrintLogSection />);
    fireEvent.click(screen.getByTestId('simulated-print-failure'));
    expect(getSimulatedPrintFailure()).toBe(true);
    act(() => { recordSimulatedPrint({ kind: 'report', transport: 'site agent', destination: 'Front desk' }); });
    expect(screen.getByText('Simulated: failed')).toBeTruthy();
  });
});
