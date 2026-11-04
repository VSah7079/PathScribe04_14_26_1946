// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { NhsNumberBadge } from './NhsNumberBadge';

const id = (value: string, statusCode?: string) => [{ system: 'mrn_nhs', value, verificationStatus: 'verified' as const, ...(statusCode ? { statusCode } : {}) }];
const icon = (c: HTMLElement) => c.querySelector('.ps-nhs-badge__icon')?.textContent;

describe('NhsNumberBadge', () => {
  it('uses a different shape for each status, not just a colour', () => {
    expect(icon(render(<NhsNumberBadge identifiers={id('943 476 5919', '01')} />).container)).toBe('✓✓');
    expect(icon(render(<NhsNumberBadge identifiers={id('943 476 5919')} />).container)).toBe('◈');
    expect(icon(render(<NhsNumberBadge identifiers={id('943 476 5918')} />).container)).toBe('!');
  });
});

import { fireEvent } from '@testing-library/react';
describe('NhsNumberBadge keyboard access', () => {
  it('is focusable, shows the explanation on focus and closes on Escape', () => {
    const { container, queryByRole } = render(<NhsNumberBadge identifiers={id('943 476 5919')} />);
    const el = container.querySelector('.ps-nhs-badge__icon') as HTMLElement;
    expect(el.tabIndex).toBe(0);
    expect(queryByRole('tooltip')).toBeNull();
    fireEvent.focus(el);
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.keyDown(el, { key: 'Escape' });
    expect(queryByRole('tooltip')).toBeNull();
  });
});
