// @vitest-environment happy-dom
//
// src/pages/LabelDesignerPage/LabelDesignerPage.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 451 (PS-256): the Label Designer canvas draws a real barcode SVG in
// each label type's own symbology, a payload the generator rejects never
// breaks the canvas, and Export ZPL shows the ZPL with the sample-payload
// note. The layout and facility services are mocked; the barcode generator
// runs for real (wrapped in a spy so a test can make it throw).
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import en from '@/i18n/locales/en.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: Record<string, unknown> }) => <span data-i18n-key={i18nKey}>{`${i18nKey}:${JSON.stringify(values)}`}</span>,
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const { layoutSvc } = vi.hoisted(() => ({ layoutSvc: { getByLabelType: vi.fn(), save: vi.fn(), reset: vi.fn() } }));
vi.mock('@/services', () => ({
  labelLayoutService: layoutSvc,
  facilityService: { getAll: async () => ({ ok: true, data: [] }) },
}));

const { barcodeSpy } = vi.hoisted(() => ({ barcodeSpy: vi.fn() }));
vi.mock('@/utils/labels/generateBarcodeSvg', async () => {
  const actual = await vi.importActual<typeof import('@/utils/labels/generateBarcodeSvg')>('@/utils/labels/generateBarcodeSvg');
  barcodeSpy.mockImplementation(actual.generateBarcodeSvg);
  return { ...actual, generateBarcodeSvg: barcodeSpy };
});

// Batch 500: DOMPurify doesn't work under happy-dom (it keeps event handlers
// and drops ordinary markup there), and this file needs happy-dom for its
// pointer-drag tests. The sanitiser is passed through here; it is tested on
// real barcode SVGs under jsdom in services/security/sanitizeHtml.test.ts.
vi.mock('@/services/security/sanitizeHtml', () => ({ sanitizeSvgMarkup: (s: string) => s }));

import LabelDesignerPage from './LabelDesignerPage';

const field = (id: string, fieldKey: string) => ({ id, fieldKey, xMm: 2, yMm: 2, widthMm: 30, heightMm: 10, fontSizeMm: 2.6 });
const layoutWith = (...fields: ReturnType<typeof field>[]) => ({ ok: true, data: { id: 'l1', widthMm: 50.8, heightMm: 25.4, fields, updatedAt: '' } });

beforeEach(() => {
  layoutSvc.getByLabelType.mockResolvedValue(layoutWith(field('f-bc', 'barcode'), field('f-acc', 'fullAccession')));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function renderPage() {
  const view = render(<LabelDesignerPage />);
  await act(async () => {});
  return view;
}
const canvasBarcode = (container: HTMLElement) => container.querySelector('.ps-designer-canvas .ps-designer-field-barcode-fill') as HTMLElement;

describe('LabelDesignerPage (PS-256) — the canvas barcode', () => {
  it('draws a real SVG barcode in the label type\'s own symbology: Code 128 for a requisition, DataMatrix for a specimen label', async () => {
    const { container } = await renderPage();
    expect(layoutSvc.getByLabelType).toHaveBeenCalledWith('requisition', undefined);
    const req = canvasBarcode(container);
    expect(req.querySelector('svg')).not.toBeNull();
    expect(req.textContent).not.toContain('barcodeRenderFailed');
    expect(barcodeSpy).toHaveBeenLastCalledWith(expect.any(String), 'code128');
    const code128Svg = req.innerHTML;

    fireEvent.change(container.querySelector('#ld-label-type')!, { target: { value: 'specimen' } });
    await act(async () => {});
    expect(layoutSvc.getByLabelType).toHaveBeenLastCalledWith('specimen', undefined);
    const spec = canvasBarcode(container);
    expect(spec.querySelector('svg')).not.toBeNull();
    expect(barcodeSpy).toHaveBeenLastCalledWith(expect.any(String), 'datamatrix');
    expect(spec.innerHTML).not.toBe(code128Svg);
  });

  it('a non-barcode field shows its sample text, not an SVG', async () => {
    const { container } = await renderPage();
    const fields = Array.from(container.querySelectorAll('.ps-designer-canvas .ps-designer-field'));
    expect(fields).toHaveLength(2);
    expect(fields[1].querySelector('svg')).toBeNull();
    expect(fields[1].textContent).toBe('DVMC26-0001');
  });

  it('a payload the generator rejects never breaks the canvas: the barcode shows the translated placeholder and the rest still renders', async () => {
    barcodeSpy.mockImplementation(() => { throw new Error('bwip-js: bar code text not specified.'); });
    const { container } = await renderPage();
    const bc = canvasBarcode(container);
    expect(bc.querySelector('svg')).toBeNull();
    expect(bc.querySelector('.ps-designer-barcode-error')?.textContent).toBe('labelDesignerPage.barcodeRenderFailed');
    expect(screen.getByText('DVMC26-0001')).not.toBeNull();
    expect(screen.getByText('labelDesignerPage.exportZplButton', { exact: false })).not.toBeNull();
  });
});

describe('LabelDesignerPage (PS-256) — Export ZPL', () => {
  it('Export ZPL opens a panel with the layout\'s ZPL and the instructions that state the sample-payload limit; Close hides it', async () => {
    const { container } = await renderPage();
    expect(screen.queryByText('labelDesignerPage.exportedZplHeading')).toBeNull();

    fireEvent.click(screen.getByText('labelDesignerPage.exportZplButton', { exact: false }));
    expect(screen.getByText('labelDesignerPage.exportedZplHeading')).not.toBeNull();
    const zpl = (container.querySelector('textarea.ps-designer-zpl-textarea') as HTMLTextAreaElement).value;
    expect(zpl.startsWith('^XA')).toBe(true);
    expect(zpl.endsWith('^XZ')).toBe(true);
    expect(zpl).toContain('^FDDVMC26-0001^FS');
    expect(zpl).toContain('^BC'); // requisition: Code 128 barcode command

    const note = container.querySelector('[data-i18n-key="labelDesignerPage.exportInstructions"]');
    expect(note?.textContent).toBe('labelDesignerPage.exportInstructions:{"dpi":203,"width":50.8,"height":25.4}');
    // The instructions' own text names Labelary and says the barcode payload is a sample, not production encoding.
    const instructions = (en as { labelDesignerPage: { exportInstructions: string } }).labelDesignerPage.exportInstructions;
    expect(instructions).toContain('labelary.com/viewer.html');
    expect(instructions).toMatch(/illustrative sample value/);
    expect(instructions).toMatch(/not a byte-for-byte production replica/);

    fireEvent.click(screen.getByText('common.close', { exact: false }));
    expect(screen.queryByText('labelDesignerPage.exportedZplHeading')).toBeNull();
  });
});

describe('LabelDesignerPage (Batch 460, PS-245) — resize handles and the label edge', () => {
  const fieldEl = (container: HTMLElement, id: string) => container.querySelector(`[data-field-id="${id}"]`) as HTMLElement;
  it('dragging the selected field\'s corner handle resizes it, stopping at the label edge', async () => {
    const { container } = await renderPage();
    fireEvent.click(fieldEl(container, 'f-acc'));
    const handle = fieldEl(container, 'f-acc').querySelector('[data-handle="se"]') as HTMLElement;
    expect(handle).not.toBeNull();
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 140, clientY: 108 }); // +10 mm, +2 mm at 4 px/mm
    expect(fieldEl(container, 'f-acc').style.getPropertyValue('--field-w')).toBe(`${40 * 4}px`);
    expect(fieldEl(container, 'f-acc').style.getPropertyValue('--field-h')).toBe(`${12 * 4}px`);
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 1000, clientY: 1000 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    // x stays at 2 mm, so the width stops at 50.8 - 2 = 48.8 mm; the height at 25.4 - 2 = 23.4 mm.
    expect(fieldEl(container, 'f-acc').style.getPropertyValue('--field-w')).toBe(`${48.8 * 4}px`);
    expect(fieldEl(container, 'f-acc').style.getPropertyValue('--field-h')).toBe(`${23.4 * 4}px`);
  });
  it('only the selected field has handles', async () => {
    const { container } = await renderPage();
    expect(container.querySelectorAll('[data-handle]').length).toBe(0);
    fireEvent.click(fieldEl(container, 'f-bc'));
    expect(fieldEl(container, 'f-bc').querySelectorAll('[data-handle]').length).toBe(8);
  });
  it('a typed width is kept inside the label', async () => {
    const { container } = await renderPage();
    fireEvent.click(fieldEl(container, 'f-acc'));
    const inputs = container.querySelectorAll('.ps-panel-box input[type="number"]');
    fireEvent.change(inputs[2], { target: { value: '' } });
    fireEvent.change(inputs[2], { target: { value: '1' } }); // half-typed: not applied yet
    expect(fieldEl(container, 'f-acc').style.getPropertyValue('--field-w')).toBe(`${30 * 4}px`);
    fireEvent.change(inputs[2], { target: { value: '500' } });
    fireEvent.blur(inputs[2]);
    expect(fieldEl(container, 'f-acc').style.getPropertyValue('--field-w')).toBe(`${48.8 * 4}px`);
    fireEvent.change(inputs[2], { target: { value: '' } });
    fireEvent.keyDown(inputs[2], { key: 'Enter' }); // a blank box puts the value back
    expect((inputs[2] as HTMLInputElement).value).toBe('48.8');
  });
  it('a saved layout with a field past the edge is flagged and fitted in one click; the refusal is translated', async () => {
    layoutSvc.getByLabelType.mockResolvedValue(layoutWith({ ...field('f-out', 'fullAccession'), xMm: 40 }));
    layoutSvc.save.mockResolvedValue({ ok: false, error: 'fieldsOutOfBounds' });
    const { container } = await renderPage();
    expect(fieldEl(container, 'f-out').classList.contains('ps-designer-field--outside')).toBe(true);
    expect(screen.getByRole('alert').textContent).toContain('labelDesignerPage.outOfBoundsWarning');
    await act(async () => { fireEvent.click(screen.getByText('labelDesignerPage.saveLayoutButton')); });
    expect(screen.getByText('labelDesignerPage.saveMessages.outOfBounds')).toBeTruthy();
    fireEvent.click(screen.getByText('labelDesignerPage.fitToLabelButton'));
    expect(fieldEl(container, 'f-out').classList.contains('ps-designer-field--outside')).toBe(false);
    expect(fieldEl(container, 'f-out').style.getPropertyValue('--field-x')).toBe(`${20.8 * 4}px`);
  });
});
