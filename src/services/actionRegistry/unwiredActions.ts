// src/services/actionRegistry/unwiredActions.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: registered voice / keyboard actions that no screen listens for, each with the reason. Registering a
// command and wiring nothing means the person says it, the system recognises it, and nothing happens, which is worse
// than not having it. actionListeners.guard.test.ts fails when a registry action has no listener on a screen and is not
// listed here; it also fails when a listed action has since been wired (so the list can only shrink).
//
// Every entry is also in docs/product/KNOWN_GAPS.md ("Voice and keyboard commands with no screen handler").
// Reasons are one of:
//   voice-engine   handled by the dictation / voice engine, not a screen (Batch 650a owns it)
//   no-feature     the registry names something the screen does not offer, so there is no button to stand for
//   needs-choice   the visible control needs a choice the command cannot make
//   needs-page     the handler needs state held in SynopticReportPage.tsx (7,000+ lines, may not grow: rule 10)
//   credentials    the visible control needs the signer's typed credentials
//   needs-navigation  opens a Configuration section: needs the screen capability check and the route (navigation owner)
// ─────────────────────────────────────────────────────────────────────────────
export type UnwiredKind = 'voice-engine' | 'no-feature' | 'needs-choice' | 'needs-page' | 'credentials' | 'needs-navigation';

export const UNWIRED_ACTIONS: Readonly<Record<string, { kind: UnwiredKind; reason: string }>> = {
  ENTER_ADDENDUM: { kind: 'voice-engine', reason: 'Dictation target (VoiceProvider / dictation services, Batch 650a).' },
  INSERT_MACRO: { kind: 'voice-engine', reason: 'Text-editor macro insertion; belongs with the editor commands the voice engine owns (Batch 650a).' },
  NEXT_FIELD: { kind: 'voice-engine', reason: 'Tab moves focus natively; the spoken form is a key-routing question for the voice engine (Batch 650a).' },
  PREVIOUS_FIELD: { kind: 'voice-engine', reason: 'Shift+Tab moves focus natively; the spoken form is a key-routing question for the voice engine (Batch 650a).' },
  FINALISE_CONFIRM: { kind: 'credentials', reason: 'The Finalise window signs with the signer\'s own typed credentials (signature check); a spoken or single-key confirm would sign without them.' },
  TABLE_SELECT: { kind: 'no-feature', reason: 'Switched off in Batch 663 (Pete): the Worklist has no multi-row selection. Back only with a built batch action and its safeguards.' },
  TABLE_SELECT_ALL: { kind: 'no-feature', reason: 'Switched off in Batch 663 (Pete): no multi-row selection or bulk action.' },
  TABLE_DESELECT_ALL: { kind: 'no-feature', reason: 'Switched off in Batch 663 (Pete): no multi-row selection or bulk action.' },
  TABLE_DELETE: { kind: 'no-feature', reason: 'Switched off in Batch 663 (Pete): a case is never deleted from the worklist. Back only as a soft-delete or cancel workflow with permission checks.' },
  DISPATCH_NOW: { kind: 'needs-choice', reason: 'Sending a held outbound message needs a message picked; the controls are per row in the dispatch trail.' },
  RETRY_DISPATCH: { kind: 'needs-choice', reason: 'Retrying needs a failed message picked; the controls are per row in the dispatch trail.' },
  OPEN_ROUTING_RULES: { kind: 'needs-navigation', reason: 'Opens Configuration at Routing Rules: needs the screen:configuration:open check and the section route, with the navigation owner.' },
  TEST_ROUTING: { kind: 'needs-navigation', reason: 'Runs the routing-rule test inside Configuration; needs the section open first.' },
  OPEN_PARTICIPATION_TYPES: { kind: 'needs-navigation', reason: 'Opens Configuration at Participation Types: needs the screen:configuration:open check and the section route.' },
  FOCUS_CASE_SEARCH: { kind: 'needs-navigation', reason: 'Focuses the case search box in the header; the box is in CaseSearchBar.tsx (scanner-aware) and needs a focus handle from AppShell.' },
};
