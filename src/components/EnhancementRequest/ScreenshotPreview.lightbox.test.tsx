// @vitest-environment happy-dom
// src/components/EnhancementRequest/ScreenshotPreview.lightbox.test.tsx
// Batch 570 (covers Batch 568's change; WCAG 2.1.2, 2.4.3, 4.1.2): the screenshot's full-size view is a dialog,
// not a button holding its Close button. Close takes focus; Escape or a click closes it; focus goes back.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import { ScreenshotPreview } from './EnhancementRequestModal';

const SHOT = { dataUrl: 'data:image/png;base64,AA==', redactedCount: 0, pdfRedactedCount: 0, captureHideCount: 0, timestamp: '2026-10-14T00:00:00Z', width: 10, height: 10 };
afterEach(cleanup);

describe('ScreenshotPreview full-size view (Batch 568 / 570)', () => {
  it('opens as a dialog with focus on Close; Escape closes it and focus goes back to the picture', () => {
    render(<ScreenshotPreview screenshot={SHOT} included onToggle={() => {}} />);
    const frame = document.querySelector('.erm-shot-frame') as HTMLElement;
    frame.focus();
    fireEvent.click(frame);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.querySelector('[role="button"] button, button button')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /enhancementRequestModal\.close/ }));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(frame);
  });
  it('Close closes it; a click on the backdrop closes it', () => {
    render(<ScreenshotPreview screenshot={SHOT} included onToggle={() => {}} />);
    const frame = document.querySelector('.erm-shot-frame') as HTMLElement;
    fireEvent.click(frame);
    fireEvent.click(screen.getByRole('button', { name: /enhancementRequestModal\.close/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(frame);
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
