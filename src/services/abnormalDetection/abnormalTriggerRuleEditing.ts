// src/services/abnormalDetection/abnormalTriggerRuleEditing.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 450 (PS-129): what the Configuration screen's Abnormal Trigger Rules
// section does when an admin saves a rule (add or edit) or switches one
// active/inactive. Moved out of AbnormalTriggerRulesSection.tsx unchanged:
//   • the field label is required, and at least one trigger value
//     (comma-separated, trimmed, blanks dropped);
//   • a rule for the same field label in the same scope (the same lab, or
//     both Global) blocks the save; an edit doesn't collide with itself;
//   • Add carries a duplicated rule's synthetic coding (the form doesn't
//     show it); Edit writes the form's fields only.
//   • Batch 623 (PS-130): the form's optional real codes (SNOMED CT, ICD-O-3) are
//     checked for shape and stored as the rule's licensedCoding; they are only
//     used while the customer's licence is on (resolveFindingCoding.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { findDuplicate } from '@/utils/validateUnique';
import { parseRuleCoding, EMPTY_RULE_CODING_DRAFT, type RuleCodingDraft, type RuleCodingError } from '../terminologyLicence/terminologyLicence';
import type { AbnormalSeverity, AbnormalTriggerRule, IAbnormalTriggerRuleService } from './IAbnormalTriggerRuleService';

export interface AbnormalTriggerRuleDraft {
  fieldLabel: string;
  /** As typed: comma-separated. */
  triggerValues: string;
  severity: AbnormalSeverity;
  description: string;
  active: boolean;
  /** '' = Global. */
  performingLabFacilityId: string;
  /** Batch 623: the optional real codes. */
  coding?: RuleCodingDraft;
}

export interface AbnormalTriggerRuleEdit {
  mode: 'add' | 'edit';
  /** The rule being edited, or the copy an Add was started from. */
  item?: AbnormalTriggerRule;
}

export type AbnormalTriggerRuleSaveOutcome =
  | { kind: 'invalid'; error: 'fieldLabelRequired' | 'triggerValueRequired' | RuleCodingError }
  | { kind: 'duplicate'; scope: 'lab' | 'global'; label: string }
  /** `rule` is the stored rule, or undefined when the service refused the write. */
  | { kind: 'saved'; mode: 'add' | 'edit'; rule?: AbnormalTriggerRule };

export async function saveAbnormalTriggerRule(
  draft: AbnormalTriggerRuleDraft,
  edit: AbnormalTriggerRuleEdit | null,
  existing: AbnormalTriggerRule[],
  service: Pick<IAbnormalTriggerRuleService, 'add' | 'update'>,
): Promise<AbnormalTriggerRuleSaveOutcome> {
  const fieldLabel = draft.fieldLabel.trim();
  if (!fieldLabel) return { kind: 'invalid', error: 'fieldLabelRequired' };
  const triggerValues = draft.triggerValues.split(',').map(v => v.trim()).filter(Boolean);
  if (triggerValues.length === 0) return { kind: 'invalid', error: 'triggerValueRequired' };

  const parsed = parseRuleCoding(draft.coding ?? EMPTY_RULE_CODING_DRAFT);
  if (!parsed.ok) return { kind: 'invalid', error: parsed.errors[0] };

  const excludeId = edit?.mode === 'edit' ? edit.item?.id : undefined;
  const collision = findDuplicate(existing, { performingLabFacilityId: draft.performingLabFacilityId || undefined, fieldLabel }, ['performingLabFacilityId', 'fieldLabel'], excludeId);
  if (collision) return { kind: 'duplicate', scope: draft.performingLabFacilityId ? 'lab' : 'global', label: collision.fieldLabel };

  const payload = {
    fieldLabel, triggerValues, severity: draft.severity,
    description: draft.description.trim() || undefined,
    status: (draft.active ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
    performingLabFacilityId: draft.performingLabFacilityId || undefined,
    licensedCoding: parsed.coding,
  };
  if (edit?.mode === 'add') {
    const res = await service.add({ ...payload, syntheticCoding: edit.item?.syntheticCoding });
    return { kind: 'saved', mode: 'add', rule: res.ok ? res.data : undefined };
  }
  if (edit?.item) {
    const res = await service.update(edit.item.id, payload);
    return { kind: 'saved', mode: 'edit', rule: res.ok ? res.data : undefined };
  }
  return { kind: 'saved', mode: 'edit' };
}

/** Deactivates an active rule, reactivates an inactive one. Returns the stored rule, or undefined on refusal. */
export async function toggleAbnormalTriggerRule(
  item: AbnormalTriggerRule,
  service: Pick<IAbnormalTriggerRuleService, 'deactivate' | 'reactivate'>,
): Promise<AbnormalTriggerRule | undefined> {
  const res = item.status === 'Active' ? await service.deactivate(item.id) : await service.reactivate(item.id);
  return res.ok ? res.data : undefined;
}
