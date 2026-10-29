// src/pages/GrossingScreenPage/hooks/useGrossingBenchEvents.ts
// Batch 720: the Grossing screen's bench actions (voice, hotkeys and foot pedals) in one place. The action registry dispatches
// PATHSCRIBE_<action id> on window; foot pedal 1 takes a photo, pedal 2 prints the cassettes (pedal 3 is left unused here).
// See constants/grossingBenchActionGroup.ts.
import { useEffect, useRef } from 'react';
import { useFootPedal } from '@/hooks/useFootPedal';

export interface GrossingBenchHandlers { printCassettes: () => void; takePhoto: () => void; assignDecal: () => void; addOnOrder: () => void }

export function useGrossingBenchEvents(handlers: GrossingBenchHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    const map: Record<string, () => void> = {
      PATHSCRIBE_GROSSING_PRINT_CASSETTES: () => ref.current.printCassettes(),
      PATHSCRIBE_GROSSING_TAKE_PHOTO: () => ref.current.takePhoto(),
      PATHSCRIBE_GROSSING_ASSIGN_DECAL: () => ref.current.assignDecal(),
      PATHSCRIBE_GROSSING_ADD_ON_ORDER: () => ref.current.addOnOrder(),
    };
    Object.entries(map).forEach(([name, fn]) => window.addEventListener(name, fn));
    return () => Object.entries(map).forEach(([name, fn]) => window.removeEventListener(name, fn));
  }, []);
  useFootPedal({ actions: { pedal1_pushToTalk: () => ref.current.takePhoto(), pedal2_nextField: () => ref.current.printCassettes() } });
}
