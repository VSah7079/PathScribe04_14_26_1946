// src/hooks/useRequisitionActionEvents.ts
// Batch 762: the Requisition Inbox's voice and shortcut action. The action registry dispatches PATHSCRIBE_<action id> on
// window (CUSTOM_EVENT_ACTIONS); this hook turns it into the screen call, and sets the screen's voice context while open.
// See constants/requisitionActionGroup.ts.
import { useEffect, useRef } from 'react';
import { actionRegistryService } from '@/services';
import { VOICE_CONTEXT } from '@/constants/systemActions';
import { REQUISITION_VOICE_CONTEXT } from '@/constants/requisitionActionGroup';

export function useRequisitionActionEvents(handlers: { runNow: () => void }): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    actionRegistryService.setCurrentContext(REQUISITION_VOICE_CONTEXT);
    const run = () => ref.current.runNow();
    window.addEventListener('PATHSCRIBE_REQUISITION_RUN_NOW', run);
    return () => {
      window.removeEventListener('PATHSCRIBE_REQUISITION_RUN_NOW', run);
      actionRegistryService.setCurrentContext(VOICE_CONTEXT.WORKLIST);
    };
  }, []);
}
