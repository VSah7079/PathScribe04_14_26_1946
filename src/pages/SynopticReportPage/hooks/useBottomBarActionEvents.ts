// src/pages/SynopticReportPage/hooks/useBottomBarActionEvents.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 650: the bottom bar's voice and keyboard commands (Sign Out Case, Sign Out and Next, Finalise, Request
// Amendment, History, Go to Codes / Add Code). Registered in the action registry, but nothing on the screen listened.
// The decision is services/reports/bottomBarActions.ts (resolveBottomBarCommand); this hook only listens and calls the
// button's own handler. The listener follows AmendmentModal's REVISION_SAVE pattern: a ref holds the latest facts, so
// the subscription is made once.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react';
import { actionRegistryService } from '@/services';
import { isModalOpen } from '@/utils/modalFocus';
import { resolveBottomBarCommand, type BottomBarCaseState, type BottomBarCommand } from '@/services/reports/bottomBarActions';

export interface BottomBarActionEventsInput {
  state: BottomBarCaseState;
  synopticFitPending: boolean;
  signOutAllowed: boolean;
  revisionAny: boolean;
  /** The bar's own button handlers, the same functions the buttons call. A missing one means that button is not offered. */
  handlers: Readonly<Partial<Record<BottomBarCommand, (() => void) | undefined>>>;
}

export function useBottomBarActionEvents(input: BottomBarActionEventsInput): void {
  const latest = useRef(input);
  latest.current = input;
  useEffect(() => actionRegistryService.onAction((actionId: string) => {
    const { handlers, ...facts } = latest.current;
    const command = resolveBottomBarCommand(actionId, {
      ...facts,
      hasHandler: Object.fromEntries(Object.entries(handlers).map(([k, h]) => [k, !!h])),
      modalOpen: isModalOpen(),
    });
    if (command) handlers[command]?.();
  }), []);
}
