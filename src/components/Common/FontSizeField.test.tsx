// @vitest-environment happy-dom
// Batch 612: the font size box says what it prints at, and flags a size saved in pixels.
import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}|${JSON.stringify(o)}` : k) }) }));
import { FontSizeField } from './FontSizeField';

afterEach(cleanup);

describe('FontSizeField', () => {
  it('a size in points uses the screen\'s own points label and shows the printed size', () => {
    render(<FontSizeField style={{ position: 'above', fontSize: 10, units: 'pt' }} pointsLabel="Font size (pt)" fallbackSize={10} onChange={() => {}} />);
    expect(screen.getByText('Font size (pt)')).toBeTruthy();
    expect(screen.getByText('fontUnits.printsAt|{"points":"10"}')).toBeTruthy();
    expect(screen.queryByText('fontUnits.legacyHint')).toBeNull();
  });
  it('a size under 8 pt shows that it prints at 8 pt', () => {
    render(<FontSizeField style={{ position: 'above', fontSize: 6, units: 'pt' }} pointsLabel="Font size (pt)" fallbackSize={10} onChange={() => {}} />);
    expect(screen.getByText('fontUnits.printsAt|{"points":"8"}')).toBeTruthy();
  });
  it('a size saved in pixels says so, and shows what it prints at', () => {
    render(<FontSizeField style={{ position: 'above', fontSize: 10 }} pointsLabel="Font size (pt)" fallbackSize={10} onChange={() => {}} />);
    expect(screen.getByText('fontUnits.sizeLabelLegacy')).toBeTruthy();
    expect(screen.getByText('fontUnits.printsAt|{"points":"7.5"}')).toBeTruthy();
    expect(screen.getByText('fontUnits.legacyHint')).toBeTruthy();
  });
  it('a style with no units takes its template\'s', () => {
    render(<FontSizeField style={{ position: 'above', fontSize: 10 }} templateUnits="pt" pointsLabel="Font size (pt)" fallbackSize={10} onChange={() => {}} />);
    expect(screen.getByText('Font size (pt)')).toBeTruthy();
  });
});
