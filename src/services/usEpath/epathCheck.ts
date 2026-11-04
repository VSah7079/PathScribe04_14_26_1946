// src/services/usEpath/epathCheck.ts
// ─────────────────────────────────────────────────────────────────────
// Batch 620 (part E, PS-800): a case's ePath message checked against its state profile before release. A case that
// fails is not sent: it is parked for a person (the Outbound Queue shows it as needing review, with these codes) and
// the sign-out is never blocked. The codes are fixed text, never the message (the message carries patient data):
//   field:PID-11     a field the profile requires is empty (or missing from a repeated segment)
//   rule:finalReportOnly   a switched-on check failed
// Pure.
// ─────────────────────────────────────────────────────────────────────
import { parseHL7Message, type ParsedHL7Message } from '../hl7/hl7Parser';
import type { EpathFacts } from '../hl7/epathBuilder';
import type { EpathRuleId, EpathStateProfile } from './epathProfile';

const filled = (m: ParsedHL7Message, path: string): boolean => {
  const [id, n] = path.split('-');
  const segs = m.getAllSegments(id);
  return segs.length > 0 && segs.every(s => (s.fields[Number(n)] ?? '').trim() !== '');
};

const RULES: Record<EpathRuleId, (f: EpathFacts) => boolean> = {
  icdOMorphologyRequired: f => f.specimens.some(s => s.icdO.length > 0),
  snomedRequired: f => f.specimens.some(s => s.snomed.length > 0),
  specimenIdentifierRequired: f => f.specimens.length > 0 && f.specimens.every(s => s.id.trim() !== ''),
  finalReportOnly: f => f.reportStatus !== 'preliminary',
  providerNpiRequired: f => !!f.orderingProvider?.npi,
};

/** The codes a profile finds wrong with this message (empty = it can go). Order: required fields, extensions, then checks. */
export function checkEpathMessage(message: string, profile: Pick<EpathStateProfile, 'requiredFields' | 'extensions' | 'validationRules'>, facts: EpathFacts): string[] {
  const parsed = parseHL7Message(message);
  const fields = [...new Set([...profile.requiredFields, ...profile.extensions.filter(e => e.mode === 'required').map(e => e.field)])];
  return [
    ...fields.filter(f => !filled(parsed, f)).map(f => `field:${f}`),
    ...profile.validationRules.filter(r => !RULES[r](facts)).map(r => `rule:${r}`),
  ];
}
