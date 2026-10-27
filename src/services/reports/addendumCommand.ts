// src/services/reports/addendumCommand.ts
// Batch 663 (Pete's definition): "Add Addendum" opens a new addendum on a report that has been signed out. Pure decision for
// the voice and keyboard command (ADD_ADDENDUM); the screen opens the same window the Request Amendment button opens, set to
// Addendum. The service behind it checks the revision capability again at save.

export interface AddendumCommandFacts {
  caseStatus?: string;
  /** A window that owns focus is open (utils/modalFocus). */
  modalOpen: boolean;
  /** The person may release at least one kind of revision (the Request Amendment button is disabled otherwise). */
  revisionAny: boolean;
}

export const ADD_ADDENDUM_ACTION_ID = 'ADD_ADDENDUM';

/** True when "Add Addendum" may open the window now: a finalized case, nothing in front, and permission to release a revision. */
export function addendumCommandAllowed(f: AddendumCommandFacts): boolean {
  return f.caseStatus === 'finalized' && !f.modalOpen && f.revisionAny;
}
