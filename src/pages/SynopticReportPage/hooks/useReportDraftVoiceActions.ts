// src/pages/SynopticReportPage/hooks/useReportDraftVoiceActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: registers the Report Draft's spoken commands while the Report Draft (orchestration mode) is open, and
// carries the three Enter-... dictation commands to the section editor.
//
//  • The phrases are data (services/voice/reportDraftVoiceActions.ts) registered with
//    actionRegistryService.registerTransientActions; the page used to call a method the registry did not have, so
//    none registered.
//  • "Open report draft / full report / sequencer" change the page's left tab; this hook listens for that event.
//  • ENTER_GROSS, ENTER_MICRO and ENTER_DIAGNOSIS (Batch 650: they dispatched PATHSCRIBE_ENTER_* with no listener)
//    show the Report Draft if another tab is showing, then ask OrchestratorSectionEditor to move dictation into the
//    section of that kind (services/voice/dictationSectionPicker.ts).
//  • EDIT_FIELD (Batch 664) does the same with the section named: "edit field microscopic" (services/voice/editFieldCommand.ts).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { actionRegistryService } from '@/services';
import { ORCH_EVENT, REPORT_DRAFT_VOICE_ACTIONS } from '@/services/voice/reportDraftVoiceActions';
import { ENTER_COMMAND_KIND } from '@/services/voice/dictationSectionPicker';
import { EDIT_FIELD_ACTION_ID, EDIT_FIELD_EVENT, editFieldRequest, isFieldNameRequest, requestSynopticFieldEdit } from '@/services/voice/editFieldCommand';
import { phrasesOf } from '@/services/voice/spokenAfterCommand';

/** Time for the Report Draft to mount before the section editor is asked to take dictation. */
const DRAFT_TAB_MOUNT_MS = 80;

export function useReportDraftVoiceActions(opts: { enabled: boolean; leftTab: string; setLeftTab: (tab: 'draft' | 'report' | 'sequencer') => void }) {
  const { enabled, setLeftTab } = opts;
  const leftTabRef = useRef(opts.leftTab);
  leftTabRef.current = opts.leftTab;

  useEffect(() => {
    if (!enabled) return;
    const unregister = actionRegistryService.registerTransientActions(REPORT_DRAFT_VOICE_ACTIONS);

    const onTab = (e: Event) => setLeftTab((e as CustomEvent).detail?.tab);
    window.addEventListener(ORCH_EVENT.tab, onTab);

    const enterListeners = Object.entries(ENTER_COMMAND_KIND).map(([actionId, kind]) => {
      const listener = () => {
        const dictate = () => window.dispatchEvent(new CustomEvent(ORCH_EVENT.dictate, { detail: { kind } }));
        if (leftTabRef.current === 'draft') { dictate(); return; }
        setLeftTab('draft');
        window.setTimeout(dictate, DRAFT_TAB_MOUNT_MS);
      };
      window.addEventListener(`PATHSCRIBE_${actionId}`, listener);
      return [`PATHSCRIBE_${actionId}`, listener] as const;
    });

    // Batch 664: "Edit Field [name]" is the same move with the section named (Alt+E alone: the section being worked on).
    const onEditField = (e: Event) => {
      const detail = editFieldRequest((e as CustomEvent<{ transcript?: string }>).detail?.transcript, phrasesOf(actionRegistryService.getActionById(EDIT_FIELD_ACTION_ID as never)));
      // Batch 665: a name that is not a section word may be a synoptic field; the panel takes it if exactly one matches.
      if (isFieldNameRequest(detail) && requestSynopticFieldEdit(detail.label ?? '')) return;
      const dictate = () => window.dispatchEvent(new CustomEvent(ORCH_EVENT.dictate, { detail }));
      if (leftTabRef.current === 'draft') { dictate(); return; }
      setLeftTab('draft');
      window.setTimeout(dictate, DRAFT_TAB_MOUNT_MS);
    };
    window.addEventListener(EDIT_FIELD_EVENT, onEditField);

    return () => {
      window.removeEventListener(EDIT_FIELD_EVENT, onEditField);
      unregister();
      window.removeEventListener(ORCH_EVENT.tab, onTab);
      enterListeners.forEach(([name, fn]) => window.removeEventListener(name, fn));
    };
  }, [enabled, setLeftTab]);
}
