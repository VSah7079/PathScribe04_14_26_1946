// @vitest-environment happy-dom
// Batch 609 (#179): the English fuzzy-fallback switch and the per-language prompt review.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@/i18n/config';

const updateConfig = vi.fn();
let config = { voiceEnabled: true, voiceEnglishFuzzyFallback: true };
vi.mock('../../../contexts/SystemConfigContext', () => ({ useSystemConfig: () => ({ config, updateConfig }) }));

import { VoiceSection } from './VoiceSection';

describe('VoiceSection', () => {
  afterEach(() => { cleanup(); updateConfig.mockReset(); config = { voiceEnabled: true, voiceEnglishFuzzyFallback: true }; });

  it('the English fuzzy switch is on by default and turning it off saves the setting', () => {
    render(<VoiceSection />);
    const box = screen.getByLabelText('Match English commands loosely in other languages') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(updateConfig).toHaveBeenCalledWith({ voiceEnglishFuzzyFallback: false });
  });

  it('shows it off when the setting is off', () => {
    config = { voiceEnabled: true, voiceEnglishFuzzyFallback: false };
    render(<VoiceSection />);
    expect((screen.getByLabelText('Match English commands loosely in other languages') as HTMLInputElement).checked).toBe(false);
  });

  it('lists the instructions sent to the AI for every English convention and language, flagging the non-English ones for review', () => {
    render(<VoiceSection />);
    const review = screen.getByTestId('voice-prompt-review');
    expect(review.querySelectorAll('details')).toHaveLength(9);
    expect(review.textContent).toContain('English (Canadian spelling)');
    expect(review.textContent).toContain('English (Australia and New Zealand spelling)');
    expect(review.querySelectorAll('.ps-voice-prompt__flag')).toHaveLength(5);
    expect(review.textContent).toContain('The transcript is in German.');
  });
});
