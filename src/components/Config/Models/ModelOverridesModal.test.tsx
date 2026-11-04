// @vitest-environment happy-dom
// Batch 609 (#173): the model settings window.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@/i18n/config';
import type { AIModel } from '@/services/models/IModelService';

const update = vi.fn();
vi.mock('@/services', () => ({ modelService: { update: (...a: unknown[]) => update(...a) } }));

import { ModelOverridesModal } from './ModelOverridesModal';

const model = (extra: Partial<AIModel> = {}): AIModel => ({
  id: 'psv32', name: 'PathScribe', version: 'v3.2', type: 'Gross + Micro', accuracy: 94, casesProcessed: 1, releaseDate: '2025-06-01',
  status: 'Active', subspecialtyIds: [], notes: '', isDefault: true, vendor: 'anthropic', requestFormat: 'structured_messages', apiModelId: 'x', ...extra,
});

describe('ModelOverridesModal', () => {
  beforeEach(() => { update.mockReset(); update.mockResolvedValue({ ok: true, data: model() }); });
  afterEach(cleanup);

  it('starts blank, shows the organisation threshold as the fallback, and saves what is typed', async () => {
    const onClose = vi.fn();
    render(<ModelOverridesModal model={model()} organisationThreshold={75} onClose={onClose} />);
    const [tokens, confidence] = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(tokens.value).toBe('');
    expect(confidence.placeholder).toBe('Organisation setting: 75');
    fireEvent.change(tokens, { target: { value: '400' } });
    fireEvent.change(confidence, { target: { value: '88' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(update).toHaveBeenCalledWith('psv32', { configOverrides: { maxTokens: 400 }, thresholdOverrides: { confidenceThreshold: 88 } });
  });

  it('shows existing overrides and clears them when the fields are emptied', async () => {
    const onClose = vi.fn();
    render(<ModelOverridesModal model={model({ configOverrides: { maxTokens: 300 }, thresholdOverrides: { confidenceThreshold: 90 } })} organisationThreshold={75} onClose={onClose} />);
    const [tokens, confidence] = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect([tokens.value, confidence.value]).toEqual(['300', '90']);
    fireEvent.change(tokens, { target: { value: '' } });
    fireEvent.change(confidence, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));
    expect(update).toHaveBeenCalledWith('psv32', { configOverrides: {}, thresholdOverrides: {} });
  });

  it('refuses text and out-of-range numbers without calling the service', () => {
    render(<ModelOverridesModal model={model()} organisationThreshold={75} onClose={vi.fn()} />);
    const [tokens, confidence] = screen.getAllByRole('textbox') as HTMLInputElement[];
    fireEvent.change(tokens, { target: { value: '12x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert').textContent).toContain('whole numbers');
    fireEvent.change(tokens, { target: { value: '' } });
    fireEvent.change(confidence, { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(update).not.toHaveBeenCalled();
  });

  it('reports a refused save and Cancel closes without saving', async () => {
    update.mockResolvedValue({ ok: false, error: 'MODEL_NOT_FOUND' });
    const onClose = vi.fn();
    render(<ModelOverridesModal model={model()} organisationThreshold={75} onClose={onClose} />);
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect((await screen.findByRole('alert')).textContent).toContain('couldn’t be saved');
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
