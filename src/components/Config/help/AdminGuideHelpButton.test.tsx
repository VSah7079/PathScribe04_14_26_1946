// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import AdminGuideHelpButton from './AdminGuideHelpButton';

describe('AdminGuideHelpButton (Batch 646)', () => {
  afterEach(cleanup);
  it('links a Configuration section to its place in the guide, in a new tab', () => {
    render(<AdminGuideHelpButton target={{ tab: 'system', section: 'departments' }} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toMatch(/help\/admin-guide\/go\.html#screen-departments$/);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('data-guide-anchor')).toBe('screen-departments');
  });
  it('links a screen outside Configuration by name', () => {
    render(<AdminGuideHelpButton screen="facility-dictionary" />);
    expect(screen.getByRole('link').getAttribute('data-guide-anchor')).toBe('screen-facility-dictionary');
  });
  it('shows nothing when told neither', () => {
    const { container } = render(<AdminGuideHelpButton />);
    expect(container.firstChild).toBeNull();
  });
});
