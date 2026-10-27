// @vitest-environment happy-dom
// Batch 389 (PS-359): the rest of the Microtomy page's text. The label-fit
// warnings and label size are translated (the util returns the numbers, the
// screen words them), and the cytology preparation suggestions are joined the
// way the user's language does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import HardwarePrintPanel from './HardwarePrintPanel';
import CytologyPanel from './CytologyPanel';
import BatchProgressModal from './BatchProgressModal';
import UndoToast from './UndoToast';
import { computeCytologyPrepSuggestions } from '@/services/cytology/computeCytologyPrepSuggestions';
import { remainingPrepSuggestions } from '@/utils/microtomyOperations';
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

describe('CytologyPanel — Accept suggestion (ws-5)', () => {
  const suggested = computeCytologyPrepSuggestions({ totalVolumeMl: 30, yieldPelletSize: 'High' });
  const decant = (stains: unknown[]) => ({ id: 'd1', label: 'D', stains, totalVolumeMl: 30, yieldPelletSize: 'High' } as any);
  const slidesFor = (counts: typeof suggested) => counts.flatMap(s => Array.from({ length: s.count }, (_, i) => ({ id: `${s.preparationMethod}-${i}`, preparationMethod: s.preparationMethod, status: 'Pending Cut' })));
  it('offers only the suggested slides that are not on the decant yet', () => {
    const first = suggested[0];
    render(<CytologyPanel decant={decant([{ id: 'a', preparationMethod: first.preparationMethod, status: 'Pending Cut' }])} onUpdateFields={noop} onApplySuggestions={noop} />);
    expect(screen.getByText(/microtomyWorkstation\.cytology\.suggestionIntro/)).toBeTruthy();
    const remaining = remainingPrepSuggestions(decant([{ id: 'a', preparationMethod: first.preparationMethod, status: 'Pending Cut' }]).stains, suggested);
    expect(remaining.reduce((n, s) => n + s.count, 0)).toBe(suggested.reduce((n, s) => n + s.count, 0) - 1);
  });
  it('once every suggested slide is there, the button is gone and a line says so', () => {
    render(<CytologyPanel decant={decant(slidesFor(suggested))} onUpdateFields={noop} onApplySuggestions={noop} />);
    expect(screen.queryByText('microtomyWorkstation.cytology.acceptSuggestion')).toBeNull();
    expect(screen.getByText('microtomyWorkstation.cytology.suggestionAlreadyAdded')).toBeTruthy();
  });
  it('accepting passes just the missing slides', () => {
    const onApply = vi.fn();
    const have = slidesFor([suggested[0]]);
    render(<CytologyPanel decant={decant(have)} onUpdateFields={noop} onApplySuggestions={onApply} />);
    fireEvent.click(screen.getByText('microtomyWorkstation.cytology.acceptSuggestion'));
    expect(onApply).toHaveBeenCalledWith(suggested.slice(1));
  });
});

describe('UndoToast (ws-6)', () => {
  it('after Remove it names the slide and the reason and offers Undo', () => {
    const onUndo = vi.fn();
    render(<UndoToast notice={{ kind: 'removed', stainName: 'PAS', reason: 'Damaged Section' }} onUndo={onUndo} onClose={noop} />);
    expect(screen.getByRole('status').textContent).toContain('microtomyWorkstation.undo.removed');
    expect(screen.getByRole('status').textContent).toContain('"reason":"microtomyWorkstation.reasons.damagedSection"');
    fireEvent.click(screen.getByText('microtomyWorkstation.undo.button'));
    expect(onUndo).toHaveBeenCalled();
  });
  it('after an Undo it only says what was undone, with no second Undo', () => {
    render(<UndoToast notice={{ kind: 'reprintedUndone', stainName: 'PAS' }} onUndo={noop} onClose={noop} />);
    expect(screen.getByRole('status').textContent).toContain('microtomyWorkstation.undo.reprintedUndone');
    expect(screen.queryByText('microtomyWorkstation.undo.button')).toBeNull();
  });
  it('can be closed', () => {
    const onClose = vi.fn();
    render(<UndoToast notice={{ kind: 'reprinted', stainName: 'PAS', reason: 'Jam' }} onUndo={noop} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('common.close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('BatchProgressModal', () => {
  it('shows each slide with its translated status', () => {
    render(<BatchProgressModal entries={[{ stainId: 'a', stainName: 'PAS', status: 'printed' }, { stainId: 'b', stainName: 'CK7', status: 'failed', message: 'No printer' }] as any} onClose={noop} />);
    expect(screen.getByText(/batchProgress\.status\.printed/)).toBeTruthy();
    expect(screen.getByText(/batchProgress\.status\.failed/).textContent).toContain('No printer');
  });
});
