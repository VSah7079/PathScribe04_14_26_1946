// Batch 661: the report screen's "open a window" voice and keyboard commands that nothing answered:
// Case Comment (Ctrl+Alt+C), Specimen Comment (Ctrl+Alt+S), Add Synoptic (Alt+Z) and Select Specimen.
// Pure decisions; hooks/useReportOpenCommands.ts only listens and calls the same handlers the sidebar buttons call.

/** Read once by the report tab's notes drawer when the tab was not showing yet (utils/uiPreferences session flag). */
export const OPEN_INTERNAL_NOTES_FLAG = 'pathscribe_open_internal_notes';

export type ReportOpenCommand = 'caseComment' | 'specimenComment' | 'addSynoptic' | 'maximise' | 'minimise' | 'preview' | 'internalNote' | 'skipField';

const COMMAND_BY_ACTION: Readonly<Record<string, ReportOpenCommand>> = {
  'VOICE_CASE_COMMENT': 'caseComment',
  'VOICE_SPECIMEN_COMMENT': 'specimenComment',
  'VOICE_ADD_SYNOPTIC': 'addSynoptic',
  // Batch 663 (Pete's definitions): Maximise collapses the specimen sidebar so the editing pane takes the room, Minimise restores
  // it; Preview shows the Report tab (the rendered report); Internal Note opens the notes drawer on that tab; Skip Field moves to
  // the next required field and changes nothing.
  'MAX_VIEW': 'maximise',
  'MIN_VIEW': 'minimise',
  'PREVIEW_REPORT': 'preview',
  'VOICE_INTERNAL_NOTE': 'internalNote',
  'SKIP_FIELD': 'skipField',
};

/** The window a command opens, or null when it is not one of these or a window is already in front. */
export function resolveReportOpenCommand(actionId: string, facts: { modalOpen: boolean; caseLoaded: boolean }): ReportOpenCommand | null {
  if (facts.modalOpen || !facts.caseLoaded) return null;
  return COMMAND_BY_ACTION[actionId] ?? null;
}

/** "Specimen two" is index 1. Out of range, or not a whole number, picks nothing (never the last or first by accident). */
export function specimenIdAtIndex(specimenIds: readonly string[], index: unknown): string | null {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= specimenIds.length) return null;
  return specimenIds[index];
}
