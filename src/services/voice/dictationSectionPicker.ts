// src/services/voice/dictationSectionPicker.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: which Report Draft section "Enter Gross", "Enter Microscopic", "Enter Diagnosis" and the "dictate ..."
// commands move dictation into. Pure.
//
// Sections are found by the stable report-part id (sourcePartId), never by the section's own id (a fresh UUID each
// time a template is resolved), then by the words in the label, then by position. A committed (locked) section is
// never picked. When a case has one Gross Description per specimen, the one being worked on (the active section)
// wins if it is of that kind, otherwise the first one that is still open.
// ─────────────────────────────────────────────────────────────────────────────
import type { DictationSectionKind } from './reportDraftVoiceActions';
import { fold } from './spokenAfterCommand';

export interface PickableSection { id: string; label: string; sourcePartId?: string; committed?: boolean }

export const SECTION_PART_IDS: Record<DictationSectionKind, string | undefined> = {
  admin: 'std_body_demographics',
  gross: 'std_body_gross',
  microscopic: 'std_body_microscopic',
  synoptic: 'std_body_synoptic',
  diagnosis: 'std_body_diagnosis',
};

const KNOWN_PART_IDS: ReadonlySet<string> = new Set(Object.values(SECTION_PART_IDS).filter((v): v is string => !!v));

const LABEL_WORDS: Record<DictationSectionKind, RegExp> = {
  admin: /admin|clinical|header/i,
  gross: /gross|macro|specimen/i,
  microscopic: /micro/i,
  synoptic: /synoptic/i,
  diagnosis: /diagnos|conclusion|ancillary/i,
};

/** `active`: the section being worked on (Batch 664, Edit Field without a name). */
export interface DictationSectionRequest { kind?: DictationSectionKind; sectionIndex?: number; sectionId?: string; label?: string; active?: boolean }

export function pickDictationSection<S extends PickableSection>(
  sections: readonly S[], request: DictationSectionRequest, activeId?: string,
): S | undefined {
  if (request.sectionId) return sections.find(s => s.id === request.sectionId);
  if (request.active) return sections.find(s => s.id === activeId);
  if (request.kind) {
    const partId = SECTION_PART_IDS[request.kind];
    const ofKind = sections.filter(s => !s.committed && ((partId && s.sourcePartId === partId) || ((!s.sourcePartId || !KNOWN_PART_IDS.has(s.sourcePartId)) && LABEL_WORDS[request.kind!].test(s.label))));
    const hit = ofKind.find(s => s.id === activeId) ?? ofKind[0];
    if (hit) return hit;
  }
  if (request.label) {
    const q = fold(request.label);
    const byLabel = q ? sections.find(s => !s.committed && fold(s.label).includes(q)) : undefined;
    if (byLabel) return byLabel;
  }
  return request.sectionIndex !== undefined ? sections[request.sectionIndex] : undefined;
}

/** The dictation kind an Enter-... command points at. */
export const ENTER_COMMAND_KIND: Readonly<Record<string, DictationSectionKind>> = {
  ENTER_GROSS: 'gross',
  ENTER_MICRO: 'microscopic',
  ENTER_DIAGNOSIS: 'diagnosis',
};
