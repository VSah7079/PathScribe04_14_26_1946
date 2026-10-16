// src/services/quality/qaFieldSchemaRules.test.ts
import { describe, it, expect } from 'vitest';
import { qaFieldSchemaProblem, isSavedField, isSavedOption, newQaFieldId, moveQaField } from './qaFieldSchemaRules';
import type { QaReviewFieldDefinition } from '@/types/quality/QaActivityType';

const text = (id: string, label = id, required = false): QaReviewFieldDefinition => ({ id, label, type: 'text', required, options: [] });
const choice = (id: string, opts: string[]): QaReviewFieldDefinition => ({ id, label: id, type: 'dropdown', required: true, options: opts.map(o => ({ id: o, label: o.toUpperCase() })) });

describe('QA field schema rules (Batch 516, PS-125 — Pete\'s schema-evolution rules)', () => {
  const saved = [text('notes', 'Notes', true), choice('verdict', ['agree', 'disagree'])];

  it('existing fields may be relabelled or made optional', () => {
    const next = [{ ...saved[0], label: 'Reviewer notes', required: false }, { ...saved[1], options: [{ id: 'agree', label: 'Concur' }, { id: 'disagree', label: 'Do not concur' }] }];
    expect(qaFieldSchemaProblem(saved, next)).toBeNull();
  });

  it('new fields and new options may be added freely', () => {
    expect(qaFieldSchemaProblem(saved, [...saved, text('second_reviewer')])).toBeNull();
    expect(qaFieldSchemaProblem(saved, [saved[0], choice('verdict', ['agree', 'disagree', 'defer'])])).toBeNull();
  });

  it('an existing field may not be removed or retyped; an existing option may not be removed', () => {
    expect(qaFieldSchemaProblem(saved, [saved[1]])).toBe('fieldRemoved');
    expect(qaFieldSchemaProblem(saved, [{ ...saved[0], type: 'longtext' }, saved[1]])).toBe('fieldRetyped');
    expect(qaFieldSchemaProblem(saved, [saved[0], choice('verdict', ['agree'])])).toBe('optionRemoved');
  });

  it('a new activity (nothing saved yet) can be shaped freely, but must be complete', () => {
    expect(qaFieldSchemaProblem(null, [text('a')])).toBeNull();
    expect(qaFieldSchemaProblem(null, [])).toBe('noFields');
    expect(qaFieldSchemaProblem(null, [text('a', ' ')])).toBe('blankLabel');
    expect(qaFieldSchemaProblem(null, [text('a'), text('a')])).toBe('duplicateId');
    expect(qaFieldSchemaProblem(null, [choice('c', [])])).toBe('choiceWithoutOptions');
    expect(qaFieldSchemaProblem(null, [{ ...choice('c', ['x']), options: [{ id: 'x', label: '' }] }])).toBe('blankOptionLabel');
  });

  it('knows which fields and options were saved before this edit', () => {
    expect(isSavedField(saved, 'notes')).toBe(true);
    expect(isSavedField(saved, 'new_one')).toBe(false);
    expect(isSavedField(null, 'notes')).toBe(false);
    expect(isSavedOption(saved, 'verdict', 'agree')).toBe(true);
    expect(isSavedOption(saved, 'verdict', 'defer')).toBe(false);
  });

  it('makes stable, unique ids from labels', () => {
    expect(newQaFieldId('Second reviewer', [])).toBe('second_reviewer');
    expect(newQaFieldId('Second reviewer', ['second_reviewer'])).toBe('second_reviewer_2');
    expect(newQaFieldId('Éosinophiles (%)', [])).toBe('eosinophiles');
    expect(newQaFieldId('검토자', [])).toBe('field');
    expect(newQaFieldId('검토자', ['field'])).toBe('field_2');
  });

  it('moves fields up and down within bounds', () => {
    expect(moveQaField(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveQaField(['a', 'b', 'c'], 0, -1)).toEqual(['a', 'b', 'c']);
    expect(moveQaField(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'b', 'c']);
  });
});
