// src/services/voice/editFieldCommand.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 664 (Pete): "Edit Field [name]" on the Report Draft: move to the named section (Microscopic, Clinical History, Gross,
// Diagnosis, Synoptic) and start dictation into it. With no name (the Alt+E key), dictation starts in the section being
// worked on. It is the Enter-... commands with a name: the section is picked by services/voice/dictationSectionPicker.ts and a
// committed (locked) section is never entered.
//
// Batch 665: a name that is not a section word is first looked up among the synoptic template's visible fields (the right-hand
// panel): one match moves focus to that field (the panel's own jump, which scrolls and focuses its input). Synoptic answers
// are choices and short entries, not dictation targets, so those get focus only. In Assist the panel answers the command
// itself; in Orchestration the Report Draft asks the panel first (requestSynopticFieldEdit) and falls back to a draft section.
// ─────────────────────────────────────────────────────────────────────────────
import type { DictationSectionRequest } from './dictationSectionPicker';
import type { DictationSectionKind } from './reportDraftVoiceActions';
import { fold, textAfterCommand } from './spokenAfterCommand';

export const EDIT_FIELD_ACTION_ID = 'EDIT_FIELD';
export const EDIT_FIELD_EVENT = 'PATHSCRIBE_EDIT_FIELD';

/** The words that mean each kind of section, in the six languages (accent-folded). */
const KIND_WORDS: ReadonlyArray<readonly [DictationSectionKind, RegExp]> = [
  ['microscopic', /micro|mikro|현미경/],
  ['gross', /gross|macro|makro|육안/],
  ['admin', /clinic|history|histor|anamnes|klinisch|임상|병력/],
  ['diagnosis', /diagnos|conclusion|진단|schlussfolgerung/],
  ['synoptic', /synopti|sinopti|시놉/],
];

export function editFieldRequest(transcript: string | undefined, phrases: readonly string[]): DictationSectionRequest {
  const spoken = textAfterCommand(transcript ?? '', phrases);
  if (!spoken) return { active: true };
  const kind = KIND_WORDS.find(([, re]) => re.test(spoken))?.[0];
  return { ...(kind ? { kind } : {}), label: spoken };
}

export interface SynopticFieldRef { fieldId: string; sectionId: string; label: string }

/** The one visible synoptic field the name points at: an exact label first, else every spoken word in the label. None or several: null. */
export function matchSynopticField(spoken: string, fields: readonly SynopticFieldRef[]): SynopticFieldRef | null {
  const q = fold(spoken);
  if (!q) return null;
  const exact = fields.filter(f => fold(f.label) === q);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const words = q.split(' ');
  const hits = fields.filter(f => { const own = new Set(fold(f.label).split(' ')); return words.every(w => own.has(w)); });
  return hits.length === 1 ? hits[0] : null;
}

/** True when the request names a synoptic field rather than a section kind (those go to the Report Draft). */
export const isFieldNameRequest = (r: DictationSectionRequest): boolean => !r.active && !r.kind && !!r.label;

export const EDIT_SYNOPTIC_FIELD_EVENT = 'PATHSCRIBE_EDIT_SYNOPTIC_FIELD';
export interface EditSynopticFieldDetail { name: string; handled: boolean }

/** Asks the synoptic panel to take the named field (synchronous: the panel sets `handled`). */
export function requestSynopticFieldEdit(name: string): boolean {
  const detail: EditSynopticFieldDetail = { name, handled: false };
  window.dispatchEvent(new CustomEvent(EDIT_SYNOPTIC_FIELD_EVENT, { detail }));
  return detail.handled;
}
