// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@/i18n/config';
import { RegistryCheckNote } from './RegistryCheckNote';

describe('RegistryCheckNote (Batch 605, #58)', () => {
  afterEach(cleanup);
  it('says reportable for a malignant behaviour digit', () => {
    render(<RegistryCheckNote code="8140/3" />);
    expect(screen.getByTestId('registry-check').textContent).toBe('Registry: reportable');
  });
  it('says not reportable for a benign one', () => {
    render(<RegistryCheckNote code="8140/0" />);
    expect(screen.getByTestId('registry-check').textContent).toBe('Registry: not reportable');
  });
  it('shows nothing for a topography code', () => {
    const { container } = render(<RegistryCheckNote code="C53.9" />);
    expect(container.textContent).toBe('');
  });
});
