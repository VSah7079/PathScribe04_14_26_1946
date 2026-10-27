// src/services/coding/suggestionOrigin.ts
// Batch 696 (Intended Use Statement, AI Output Governance): where an AI-suggested code came from.
// The AI is asked which part of the case a code was taken from, and which specimen. The answer is a claim, so it is
// checked here before it is shown: the part must be one we know and must actually hold text, and a specimen label is kept
// only when the case text names that specimen. Anything that fails the check is left out and the screen says
// "Source not stated" instead of showing a guess.

export const CODE_SOURCE_SECTIONS = ['narrative', 'gross', 'microscopic', 'ancillary', 'synoptic'] as const;
export type CodeSourceSection = typeof CODE_SOURCE_SECTIONS[number];

export interface OriginTexts { gross: string; microscopic: string; ancillary: string; narrative?: string; hasSynoptic?: boolean }

function sectionHasText(section: CodeSourceSection, t: OriginTexts): boolean {
  if (section === 'synoptic') return !!t.hasSynoptic;
  return ((t[section] ?? '') as string).trim().length > 0;
}

/** True when the case text names this specimen: "Specimen A", or the label followed by a colon, full stop, bracket or dash ("A:", "A.", "B)"). */
export function specimenNamedIn(label: string, t: OriginTexts): boolean {
  if (!/^[A-Za-z0-9]{1,3}$/.test(label)) return false;
  const re = new RegExp(`(?:specimen\\s+${label}\\b|(?:^|[\\s(])${label}\\s*[:.)\\u2013-])`, 'i');
  return [t.gross, t.microscopic, t.ancillary, t.narrative ?? ''].some(x => re.test(x ?? ''));
}

/** The checked origin of one suggestion: only the parts that passed the check are returned. */
export function normaliseSuggestionOrigin(rawSection: unknown, rawSpecimen: unknown, texts: OriginTexts): { sourceSection?: CodeSourceSection; specimenLabel?: string } {
  const section = typeof rawSection === 'string' ? rawSection.trim().toLowerCase() : '';
  if (!(CODE_SOURCE_SECTIONS as readonly string[]).includes(section)) return {};
  const sourceSection = section as CodeSourceSection;
  if (!sectionHasText(sourceSection, texts)) return {};
  const label = typeof rawSpecimen === 'string' || typeof rawSpecimen === 'number' ? String(rawSpecimen).trim() : '';
  return label && specimenNamedIn(label, texts) ? { sourceSection, specimenLabel: label.toUpperCase() } : { sourceSection };
}
