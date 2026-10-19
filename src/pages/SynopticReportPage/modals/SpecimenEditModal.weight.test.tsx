// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@/i18n/config';

const h = vi.hoisted(() => ({ capture: vi.fn(), audit: vi.fn() }));
vi.mock('@/services/grossingHardware/captureGrossWeight', () => ({ captureGrossWeight: h.capture, auditGrossWeight: h.audit }));
vi.mock('@/components/GrossingHardware/CameraCaptureControl', () => ({
  default: ({ onCapture }: { onCapture: (a: unknown) => void }) => <button onClick={() => onCapture({ id: 'a1', kind: 'gross_photo', url: 'https://x/p.jpg' })}>fake-camera</button>,
}));
vi.mock('@/components/Config/System/useSpecimenDictionary', () => ({ useSpecimenDictionary: () => ({ dictionary: [] }) }));
vi.mock('@/hooks/useFieldRequirements', () => ({ useFieldRequirements: () => [] }));
vi.mock('@/services', () => ({
  containerTypeService: { getAll: async () => ({ ok: true, data: [] }) },
  actionRegistryService: { onAction: () => () => {} },
  specimenEditProblems: () => ({ missing: [], invalid: [] }),
  reportFieldRequired: () => false,
}));

import SpecimenEditModal from './SpecimenEditModal';

const props = { specimen: null, nextLabel: 'A', existingSpecimens: [], isOrchestrationMode: false, onClose: () => {} };

describe('SpecimenEditModal gross weight and photo (Batch 606, PS-13)', () => {
  beforeEach(() => { h.capture.mockReset(); h.audit.mockReset(); });
  afterEach(cleanup);

  it('Capture weight fills the weight and marks a simulated reading', async () => {
    h.capture.mockResolvedValue({ ok: true, grams: 42.5, source: 'simulated_scale' });
    render(<SpecimenEditModal {...props} onSave={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByText('Capture weight')); });
    expect((screen.getByLabelText('Gross weight (g)') as HTMLInputElement).value).toBe('42.5');
    expect(screen.getByText('Simulated scale reading')).toBeTruthy();
  });

  it('shows why a capture failed and leaves the weight alone', async () => {
    h.capture.mockResolvedValue({ ok: false, reason: 'unstable_reading' });
    render(<SpecimenEditModal {...props} onSave={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByText('Capture weight')); });
    expect(screen.getByText(/not steady yet/)).toBeTruthy();
    expect((screen.getByLabelText('Gross weight (g)') as HTMLInputElement).value).toBe('');
  });

  it('saves the typed weight as manual, and a captured gross photo on the specimen', async () => {
    const onSave = vi.fn();
    render(<SpecimenEditModal {...props} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Gross weight (g)'), { target: { value: '12.3' } });
    fireEvent.click(screen.getByText('Capture gross photo'));
    fireEvent.click(screen.getByText('fake-camera'));
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Skin, punch' } });
    fireEvent.click(document.querySelector('.ps-btn-primary') as HTMLElement);
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved).toMatchObject({ grossWeightG: 12.3, grossWeightSource: 'manual' });
    expect(saved.digitalAssets).toHaveLength(1);
    expect(h.audit).toHaveBeenCalledWith('manual', 12.3, expect.any(String));
  });
});
