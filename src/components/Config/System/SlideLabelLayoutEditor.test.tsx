// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@/i18n/config';

vi.mock('@/services/index', () => ({ printerProfileService: { getAll: async () => ({ ok: true, data: [] }) } }));

import SlideLabelLayoutEditor from './SlideLabelLayoutEditor';
import { DEFAULT_SLIDE_LABEL_LAYOUT } from '@/services/printSettings/IPrintSettingsService';

afterEach(cleanup);

describe('SlideLabelLayoutEditor (Batch 606, PS-15 / PS-165)', () => {
  it('shows the four fields and reports a change', () => {
    const onChange = vi.fn();
    render(<SlideLabelLayoutEditor value={DEFAULT_SLIDE_LABEL_LAYOUT} onChange={onChange} readOnly={false} />);
    fireEvent.change(screen.getByLabelText('Barcode module size (mm)'), { target: { value: '0.25' } });
    expect(onChange).toHaveBeenCalledWith({ moduleSizeMm: 0.25 });
    expect(screen.getByText(/fit the face/)).toBeTruthy();
  });

  it('warns when the barcode is too big for the face', () => {
    render(<SlideLabelLayoutEditor value={{ ...DEFAULT_SLIDE_LABEL_LAYOUT, moduleSizeMm: 0.6 }} onChange={() => {}} readOnly={false} />);
    expect(screen.queryByText(/fit the face/)).toBeNull();
    expect(document.querySelectorAll('.ps-cassette-layout-warning').length).toBeGreaterThan(0);
  });

  it('is read-only when asked', () => {
    render(<SlideLabelLayoutEditor value={DEFAULT_SLIDE_LABEL_LAYOUT} onChange={() => {}} readOnly />);
    expect((screen.getByLabelText('Face width (mm)') as HTMLInputElement).disabled).toBe(true);
  });
});
