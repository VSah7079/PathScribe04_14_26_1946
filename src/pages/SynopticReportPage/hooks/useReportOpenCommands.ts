// Batch 661: listens for the report screen's open-a-window commands (Case Comment, Specimen Comment, Add Synoptic) and
// Select Specimen. The decisions are services/reports/reportOpenCommands.ts; the handlers are the sidebar's own.
import { useEffect, useRef } from 'react';
import { actionRegistryService } from '@/services';
import { isModalOpen } from '@/utils/modalFocus';
import { setSessionFlag } from '@/utils/uiPreferences';
import { resolveReportOpenCommand, specimenIdAtIndex, OPEN_INTERNAL_NOTES_FLAG } from '@/services/reports/reportOpenCommands';

export interface ReportOpenCommandsInput {
  caseLoaded: boolean;
  specimenIds: readonly string[];
  activeSpecimenId: string;
  openCaseComment: () => void;
  openSpecimenComment: (specimenId: string) => void;
  openAddSynoptic: () => void;
  selectSpecimen: (specimenId: string) => void;
  /** Batch 663: the left tab now showing, and how to change it (the 'report' tab is the rendered report). */
  leftTab: string;
  showReportTab: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}


export function useReportOpenCommands(input: ReportOpenCommandsInput): void {
  const latest = useRef(input);
  latest.current = input;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    const i = latest.current;
    const command = resolveReportOpenCommand(actionId, { modalOpen: isModalOpen(), caseLoaded: i.caseLoaded });
    if (command === 'caseComment') i.openCaseComment();
    else if (command === 'addSynoptic') i.openAddSynoptic();
    else if (command === 'specimenComment' && i.activeSpecimenId) i.openSpecimenComment(i.activeSpecimenId);
    else if (command === 'maximise') i.setSidebarCollapsed(true);
    else if (command === 'minimise') i.setSidebarCollapsed(false);
    else if (command === 'preview') i.showReportTab();
    else if (command === 'skipField') window.dispatchEvent(new Event('PATHSCRIBE_NEXT_REQUIRED'));
    else if (command === 'internalNote') {
      // Already on the report tab: its drawer hears the same action. Otherwise leave a note for it to read when it opens.
      if (i.leftTab !== 'report') { setSessionFlag(OPEN_INTERNAL_NOTES_FLAG, '1'); i.showReportTab(); }
    }
  }), []);
  useEffect(() => {
    const onSelect = (e: Event) => {
      const i = latest.current;
      if (isModalOpen()) return;
      const id = specimenIdAtIndex(i.specimenIds, (e as CustomEvent<{ index?: unknown }>).detail?.index);
      if (id) i.selectSpecimen(id);
    };
    window.addEventListener('PATHSCRIBE_SELECT_SPECIMEN', onSelect);
    return () => window.removeEventListener('PATHSCRIBE_SELECT_SPECIMEN', onSelect);
  }, []);
}
