// src/services/reports/bottomBarActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the report screen's bottom bar (BottomActionBar.tsx) decides in one place which of its buttons are
// showing, and which button a voice or keyboard command stands for. Before this, "Sign Out Case" (Alt+Shift+X),
// "Sign Out and Next", History (Alt+H) and Add Code / Go to Codes (Ctrl+Alt+H, Ctrl+Alt+G) were registered in the
// action registry but nothing on the screen listened, so saying them did nothing.
//
// The rule (Pete): a command does exactly what the visible button does, with the same checks:
//   - it acts only when its button is showing (the same decision draws the button and answers the command),
//   - it is ignored when the button is greyed out: the capability the button is greyed by (CapabilityButton), or
//     the report layout still being fitted (synopticFitPending), or no revision kind the person may release,
//   - it is ignored while a window that owns focus is open (including the sign-out window itself),
//   - it calls the button's own handler, so Sign Out Case still opens the confirmation window (the signature
//     check) and Finalise still runs the review gates; no command signs anything by itself.
// The capability is only presentation here, as on the button: the services behind the handlers (sign-out gates,
// authorizationService.enforce) check it again.
//
// Pure: the component supplies the facts, and the listener hook (useBottomBarActionEvents) acts on the answer.
// ─────────────────────────────────────────────────────────────────────────────

/** The registry ids this bar answers. */
export const BOTTOM_BAR_ACTION_IDS = ['SIGN_OUT', 'SIGNOUT_NEXT', 'OPEN_PRE_FINALISE', 'ADD_AMENDMENT', 'OPEN_HISTORY', 'GOTO_CODES', 'VOICE_ADD_CODE'] as const;
export type BottomBarActionId = (typeof BOTTOM_BAR_ACTION_IDS)[number];

/** The buttons those ids stand for. */
export type BottomBarCommand = 'signOutCase' | 'signOutAndNext' | 'finalize' | 'finalizeAndNext' | 'requestAmendment' | 'history' | 'codes';

const COMMAND_FOR_ACTION: Readonly<Record<BottomBarActionId, BottomBarCommand>> = {
  SIGN_OUT: 'signOutCase',
  SIGNOUT_NEXT: 'finalizeAndNext',
  OPEN_PRE_FINALISE: 'finalize',
  ADD_AMENDMENT: 'requestAmendment',
  OPEN_HISTORY: 'history',
  // "Go to Codes" and "Add Code" both open the Codes window, the one the Codes button opens.
  GOTO_CODES: 'codes',
  VOICE_ADD_CODE: 'codes',
};

/** The button a registry id stands for, or null when this bar does not answer it. */
export function bottomBarCommandFor(actionId: string): BottomBarCommand | null {
  return (COMMAND_FOR_ACTION as Record<string, BottomBarCommand | undefined>)[actionId] ?? null;
}

/** The case facts that decide which buttons show. */
export interface BottomBarCaseState {
  status?: string;
  reportingMode?: string;
  /** Every report on the case is finalized. */
  allFinalized: boolean;
  /** Grossing is still in progress (a grossing report still in draft). */
  hasUnfinishedGrossing: boolean;
}

export interface BottomBarVisibility {
  signOutCase: boolean;
  /** Batch 664: Orchestration's Sign Out and Next, shown with Sign Out Case. */
  signOutAndNext: boolean;
  finalize: boolean;
  finalizeAndNext: boolean;
  requestAmendment: boolean;
  history: boolean;
  codes: boolean;
}

/**
 * Which of the bar's buttons are showing. Orchestration signs out with Sign Out Case from the draft reports (Batch 658: nothing
 * finalizes an Orchestration report before sign-out, so waiting for that left the button unreachable) once grossing is
 * done and the case is not already in its recall window (a second sign-out there would skip the release buffer); Assist
 * hands over to the LIS with Finalise / Finalise & Next. A pool case shows only the claim button, and a finalized
 * case only Request Amendment.
 */
export function bottomBarVisibility(s: BottomBarCaseState): BottomBarVisibility {
  const isPool = s.status === 'pool';
  const isFinalized = s.status === 'finalized';
  const showGrossComplete = !isPool && !isFinalized && s.hasUnfinishedGrossing;
  const reporting = !isPool && !isFinalized && !showGrossComplete;
  const assist = s.reportingMode === 'assist';
  return {
    signOutCase: reporting && !assist && s.status !== 'pending-release',
    signOutAndNext: reporting && !assist && s.status !== 'pending-release',
    finalize: reporting && assist,
    finalizeAndNext: reporting && assist,
    requestAmendment: isFinalized,
    history: !isPool,
    codes: !isPool,
  };
}

export interface BottomBarCommandInputs {
  state: BottomBarCaseState;
  /** The report layout is still being fitted: Sign Out Case and Finalise are disabled on the bar. */
  synopticFitPending: boolean;
  /** Holds surgical:report:sign-out for this case and facility (the capability the sign-out buttons are greyed by). */
  signOutAllowed: boolean;
  /** The person may release at least one kind of revision (Request Amendment is disabled otherwise). */
  revisionAny: boolean;
  /** The screen supplied this button's handler. */
  hasHandler: Readonly<Partial<Record<BottomBarCommand, boolean>>>;
  /** A window that owns focus is open (utils/modalFocus: services/focus/modalFocus.ts). */
  modalOpen: boolean;
}

/**
 * The button a voice or keyboard command may press right now, or null when it is ignored. Null for an id the bar does
 * not answer, a button not showing, a button greyed out, or a window in the way.
 */
export function resolveBottomBarCommand(actionId: string, inputs: BottomBarCommandInputs): BottomBarCommand | null {
  let command = bottomBarCommandFor(actionId);
  // Batch 664: "Sign Out and Next" is Finalise & Next in Assist and Sign Out and Next in Orchestration.
  if (command === 'finalizeAndNext' && inputs.state.reportingMode !== 'assist') command = 'signOutAndNext';
  if (!command || inputs.modalOpen || !inputs.hasHandler[command]) return null;
  const visible = bottomBarVisibility(inputs.state)[command];
  if (!visible) return null;
  switch (command) {
    case 'signOutCase':
    case 'signOutAndNext':
    case 'finalize':
    case 'finalizeAndNext':
      return inputs.signOutAllowed && !inputs.synopticFitPending ? command : null;
    case 'requestAmendment':
      return inputs.revisionAny ? command : null;
    default:
      return command;
  }
}
