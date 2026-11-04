// @vitest-environment happy-dom
// src/components/Config/System/QaFieldSchemaEditor.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QaFieldSchemaEditor } from './QaFieldSchemaEditor';
import type { QaReviewFieldDefinition } from '@/types/quality/QaActivityType';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o?.n ? `${k}#${o.n}` : k) }),
}));
afterEach(cleanup);

const K = 'qaConfigurationCenterSection.fieldEditor';
const saved: QaReviewFieldDefinition[] = [{ id: 'notes', label: 'Notes', type: 'longtext', required: true, options: [] }];

describe('QaFieldSchemaEditor (Batch 516, PS-125)', () => {
  it('a saved field keeps its type and has no Remove button; it can be relabelled', () => {
    const onChange = vi.fn();
    render(<QaFieldSchemaEditor fields={saved} saved={saved} onChange={onChange} />);
    expect((screen.getByLabelText(`${K}.typeAria#1`) as HTMLSelectElement).disabled).toBe(true);
    expect(screen.queryByText(`${K}.removeField`)).toBeNull();
    expect(screen.getByText(`${K}.savedFieldNote`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(`${K}.labelAria#1`), { target: { value: 'Reviewer notes' } });
    expect(onChange).toHaveBeenCalledWith([{ ...saved[0], label: 'Reviewer notes' }]);
  });

  it('Add field appends a new, removable field with its own id', () => {
    const onChange = vi.fn();
    render(<QaFieldSchemaEditor fields={saved} saved={saved} onChange={onChange} />);
    fireEvent.click(screen.getByText(`${K}.addField`));
    expect(onChange).toHaveBeenCalledWith([...saved, { id: 'field', label: '', type: 'text', required: false, options: [] }]);
  });

  it('a field added in this edit can change type and be removed; the problem is shown until it has a label', () => {
    const fresh: QaReviewFieldDefinition = { id: 'field', label: '', type: 'text', required: false, options: [] };
    const onChange = vi.fn();
    render(<QaFieldSchemaEditor fields={[...saved, fresh]} saved={saved} onChange={onChange} />);
    expect((screen.getByLabelText(`${K}.typeAria#2`) as HTMLSelectElement).disabled).toBe(false);
    expect(screen.getByRole('alert').textContent).toBe(`${K}.problems.blankLabel`);
    fireEvent.click(screen.getByText(`${K}.removeField`));
    expect(onChange).toHaveBeenCalledWith(saved);
  });

  it('a Standard activity shows its fields read-only', () => {
    render(<QaFieldSchemaEditor fields={saved} saved={saved} onChange={vi.fn()} readOnly />);
    expect(screen.queryByText(`${K}.addField`)).toBeNull();
    expect(screen.getByText(/readOnlyLine/)).toBeTruthy();
  });
});
