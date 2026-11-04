// src/hooks/useTouchLayout.ts
// Touch spec §5: whether this workstation's station screens use the touch layout, and its override (Auto, Always
// on, Always off). Follows the device's pointer as it changes (a tablet with a mouse attached and removed) and the
// override as it is changed from the header's station menu. Decisions: utils/touch/touchLayout.ts.
import { useCallback, useEffect, useState } from 'react';
import {
  COARSE_POINTER_QUERY, TOUCH_LAYOUT_CHANGED_EVENT, readTouchLayoutMode, touchLayoutActive, writeTouchLayoutMode,
  type TouchLayoutMode,
} from '@/utils/touch/touchLayout';

const coarseNow = (): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(COARSE_POINTER_QUERY).matches;

export function useTouchLayout(): { mode: TouchLayoutMode; active: boolean; setMode: (mode: TouchLayoutMode) => void } {
  const [mode, setModeState] = useState<TouchLayoutMode>(readTouchLayoutMode);
  const [coarse, setCoarse] = useState<boolean>(coarseNow);

  useEffect(() => {
    const onChanged = () => setModeState(readTouchLayoutMode());
    window.addEventListener(TOUCH_LAYOUT_CHANGED_EVENT, onChanged);
    const mq = typeof window.matchMedia === 'function' ? window.matchMedia(COARSE_POINTER_QUERY) : null;
    const onPointer = () => setCoarse(coarseNow());
    mq?.addEventListener?.('change', onPointer);
    return () => { window.removeEventListener(TOUCH_LAYOUT_CHANGED_EVENT, onChanged); mq?.removeEventListener?.('change', onPointer); };
  }, []);

  const setMode = useCallback((next: TouchLayoutMode) => {
    writeTouchLayoutMode(next);
    setModeState(next);
    window.dispatchEvent(new Event(TOUCH_LAYOUT_CHANGED_EVENT));
  }, []);

  return { mode, active: touchLayoutActive(mode, coarse), setMode };
}
