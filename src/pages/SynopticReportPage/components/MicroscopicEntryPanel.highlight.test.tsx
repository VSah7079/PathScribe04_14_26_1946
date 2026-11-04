// @vitest-environment happy-dom
// Batch 453 (PS-323): the per-specimen Microscopic entry panel highlights the
// microscopic critical findings where their words appear, and the text the
// panel saves is unchanged by the highlight.
import '@/i18n/config';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
vi.mock('@/contexts/VoiceProvider', () => ({ useVoice: () => ({ startDictation: vi.fn(), stopDictation: vi.fn(), registerDictationTarget: vi.fn(), isListening: false }) }));
import MicroscopicEntryPanel from './MicroscopicEntryPanel';

afterEach(cleanup);

describe('MicroscopicEntryPanel finding highlight (PS-323, Batch 453)', () => {
  it('marks the finding in the specimen text without changing it (nothing to save)', async () => {
    const onConfirmAndSave = vi.fn(async () => true);
    const { container } = render(
      <MicroscopicEntryPanel
        specimenId="SP1" specimenLabel="A"
        instance={{ specimenId: 'SP1', text: '<p>Sections show invasive ductal carcinoma.</p>', status: 'saved' } as never}
        onSaveDraft={vi.fn()} onConfirmAndSave={onConfirmAndSave} onClearAndSave={vi.fn(async () => true)}
        highlightFindings={[{ term: 'invasive ductal carcinoma', sourceQuote: 'invasive ductal carcinoma', severity: 'Malignant' }]}
      />,
    );
    await waitFor(() => expect(container.querySelector('.ps-finding-hl--malignant')?.textContent).toBe('invasive ductal carcinoma'));
    // Drawing the highlight changed nothing: the panel has no unsaved
    // changes, so its Save button stays off, and no draft was written.
    const save = container.querySelector('button.ps-btn-primary') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(onConfirmAndSave).not.toHaveBeenCalled();
  });
});
