// src/services/labelDesigner/labelFieldVisibility.ts
// Batch 606 (PS-26): evaluates a field's optional showWhen rule against the
// label's own values. No rule means the field always shows.

import type { LabelLayoutField } from './ILabelLayoutService';

export function isFieldVisible(field: LabelLayoutField, values: Record<string, string>): boolean {
  const rule = field.showWhen;
  if (!rule) return true;
  const actual = (values[rule.fieldKey] ?? '').trim();
  if (rule.op === 'present') return actual.length > 0;
  if (rule.op === 'absent') return actual.length === 0;
  return actual.toLowerCase() === (rule.value ?? '').trim().toLowerCase();
}
