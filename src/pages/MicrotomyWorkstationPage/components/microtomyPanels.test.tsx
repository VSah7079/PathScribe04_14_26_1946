// @vitest-environment happy-dom
// Batch 389 (PS-359): the rest of the Microtomy page's text. The label-fit
// warnings and label size are translated (the util returns the numbers, the
// screen words them), and the cytology preparation suggestions are joined the
// way the user's language does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import HardwarePrintPanel from './HardwarePrintPanel';
import CytologyPanel from './CytologyPanel';
import BatchProgressModal from './BatchProgressModal';
import { resolveSlideLabelFitWarnings } from '@/utils/labels/resolveSlideLabelFitWarnings';

afterEach(cleanup);
const noop = () => {};

const layout = { faceWidthMm: 3, faceHeightMm: 3, moduleSizeMm: 0.2, fontHeightMm: 1.2 };
function panel(over: Partial<React.ComponentProps<typeof HardwarePrintPanel>> = {}) {
  return render(<HardwarePrintPanel printMode="on_demand" onSetPrintMode={noop} onPrintNext={noop} batchSelectedCount={0} onPrintBatch={noop}
    printer={null} printerError={null} labelLayout={layout} fitWarnings={resolveSlideLabelFitWarnings(layout)}
    previewStain={{ id: 'o1', stainName: 'H&E' } as any} specimenLabel="A" blockLabel="1" {...over} />);
}

describe('HardwarePrintPanel (Batch 389)', () => {
  it('words each label-fit warning through t() with the numbers from the util', () => {
    panel();
    expect(screen.getByText(/microtomyWorkstation\.hardware\.fit\.height_overflow/).textContent).toContain('"required":"5.2"');
    expect(screen.getByText(/microtomyWorkstation\.hardware\.fit\.width_overflow/).textContent).toContain('"face":3');
  });
  it('shows the label size through t()', () => {
    panel();
    expect(screen.getByText(/microtomyWorkstation\.hardware\.labelSize/).textContent).toContain('"width":3');
  });
  it('shows no warning for a generous layout', () => {
    const ok = { faceWidthMm: 20, faceHeightMm: 8, moduleSizeMm: 0.2, fontHeightMm: 1.2 };
    panel({ labelLayout: ok, fitWarnings: resolveSlideLabelFitWarnings(ok) });
    expect(screen.queryByText(/hardware\.fit\./)).toBeNull();
  });
});

describe('CytologyPanel (Batch 389)', () => {
  it('lists the suggested preparations with the language\'s own "and"', () => {
    render(<CytologyPanel decant={{ id: 'd1', label: 'D', stains: [], totalVolumeMl: 30, yieldPelletSize: 'High' } as any} onUpdateFields={noop} onApplySuggestions={noop} />);
    const intro = screen.getByText(/microtomyWorkstation\.cytology\.suggestionIntro/).textContent ?? '';
    expect(intro).toContain('2×');
    expect(intro).toContain(' and ');
  });
});

describe('BatchProgressModal', () => {
  it('shows each slide with its translated status', () => {
    render(<BatchProgressModal entries={[{ stainId: 'a', stainName: 'PAS', status: 'printed' }, { stainId: 'b', stainName: 'CK7', status: 'failed', message: 'No printer' }] as any} onClose={noop} />);
    expect(screen.getByText(/batchProgress\.status\.printed/)).toBeTruthy();
    expect(screen.getByText(/batchProgress\.status\.failed/).textContent).toContain('No printer');
  });
});
