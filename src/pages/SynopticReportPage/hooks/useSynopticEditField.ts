// src/pages/SynopticReportPage/hooks/useSynopticEditField.ts
// Batch 665: "Edit Field [name]" for the synoptic panel's answers. The match is services/voice/editFieldCommand.ts
// (matchSynopticField); this hook only listens and calls the panel's own jump (scroll + focus). In Assist the panel hears the
// command itself; in Orchestration the Report Draft asks first (requestSynopticFieldEdit) and keeps it for a draft section if
// no field matches. Called by RightSynopticPanel on an existing line (the panel is over 1,000 lines and may not grow).
import { useEffect, useRef } from 'react';
import { actionRegistryService } from '@/services';
import { isModalOpen } from '@/utils/modalFocus';
import { isVisible } from '@/components/Config/Protocols/SynopticEditor';
import type { EditorSection } from '@/components/Config/Protocols/SynopticEditor';
import {
  EDIT_FIELD_ACTION_ID, EDIT_FIELD_EVENT, EDIT_SYNOPTIC_FIELD_EVENT, editFieldRequest, matchSynopticField,
  type EditSynopticFieldDetail, type SynopticFieldRef,
} from '@/services/voice/editFieldCommand';
import { phrasesOf } from '@/services/voice/spokenAfterCommand';

export interface SynopticEditFieldInput {
  /** Assist case: the panel answers Edit Field itself. */
  answersCommand: boolean;
  /** The template's sections and the current answers (what is visible depends on both). */
  sections: readonly EditorSection[] | undefined;
  answers: Parameters<typeof isVisible>[1];
  jumpToField: (fieldId: string, sectionId: string) => void;
}

export function useSynopticEditField(input: SynopticEditFieldInput): void {
  const latest = useRef(input);
  latest.current = input;
  useEffect(() => {
    const take = (name: string): boolean => {
      const i = latest.current;
      const fields: SynopticFieldRef[] = (i.sections ?? []).filter(s => isVisible(s.visibleWhen, i.answers))
        .flatMap(s => s.fields.filter(f => isVisible(f.visibleWhen, i.answers)).map(f => ({ fieldId: f.id, sectionId: s.id, label: f.label })));
      const hit = matchSynopticField(name, fields);
      if (hit) i.jumpToField(hit.fieldId, hit.sectionId);
      return !!hit;
    };
    const onAsked = (e: Event) => {
      const d = (e as CustomEvent<EditSynopticFieldDetail>).detail;
      if (d && !d.handled && !isModalOpen()) d.handled = take(d.name);
    };
    const onCommand = (e: Event) => {
      if (!latest.current.answersCommand || isModalOpen()) return;
      const req = editFieldRequest((e as CustomEvent<{ transcript?: string }>).detail?.transcript, phrasesOf(actionRegistryService.getActionById(EDIT_FIELD_ACTION_ID as never)));
      if (req.label) take(req.label);
    };
    window.addEventListener(EDIT_SYNOPTIC_FIELD_EVENT, onAsked);
    window.addEventListener(EDIT_FIELD_EVENT, onCommand);
    return () => { window.removeEventListener(EDIT_SYNOPTIC_FIELD_EVENT, onAsked); window.removeEventListener(EDIT_FIELD_EVENT, onCommand); };
  }, []);
}
