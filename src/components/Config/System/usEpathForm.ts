// src/components/Config/System/usEpathForm.ts
// Batch 620 (part E, PS-800): the US ePath profile editor's draft and back. Pure, so it is tested without the screen.
import { normalizeFieldList, type EpathExtension, type EpathProfileInput, type EpathRuleId, type EpathStateProfile } from '@/services/usEpath/epathProfile';

export interface ProfileDraft {
  id?: string;
  state: string;
  name: string;
  requiredText: string;
  optionalText: string;
  transport: EpathStateProfile['transport'];
  facilityBasis: EpathStateProfile['facilityBasis'];
  validationRules: EpathRuleId[];
  extensions: EpathExtension[];
}

export const emptyDraft = (): ProfileDraft => ({
  state: '', name: '', requiredText: '', optionalText: '', transport: 'phinMs', facilityBasis: 'technicalComponent', validationRules: [], extensions: [],
});

export const draftFromProfile = (p: EpathStateProfile | null): ProfileDraft => p
  ? { id: p.id, state: p.state, name: p.name, requiredText: p.requiredFields.join(', '), optionalText: p.optionalFields.join(', '), transport: p.transport,
    facilityBasis: p.facilityBasis, validationRules: [...p.validationRules], extensions: p.extensions.map(e => ({ ...e })) }
  : emptyDraft();

export const parseFields = (text: string): string[] => normalizeFieldList(text.split(/[\s,;]+/));

/** The draft as the service takes it: the text boxes parsed, a fixed value kept only on a fixed extension. */
export function toInput(d: ProfileDraft): EpathProfileInput {
  return {
    ...(d.id ? { id: d.id } : {}), state: d.state.trim().toUpperCase(), name: d.name.trim(),
    requiredFields: parseFields(d.requiredText), optionalFields: parseFields(d.optionalText), transport: d.transport,
    validationRules: d.validationRules, facilityBasis: d.facilityBasis,
    extensions: d.extensions.filter(e => e.field.trim()).map(e => ({ field: e.field.trim().toUpperCase(), mode: e.mode, ...(e.mode === 'fixed' ? { value: (e.value ?? '').trim() } : {}) })),
  };
}

export const toggleRule = (rules: readonly EpathRuleId[], rule: EpathRuleId): EpathRuleId[] =>
  rules.includes(rule) ? rules.filter(r => r !== rule) : [...rules, rule];
