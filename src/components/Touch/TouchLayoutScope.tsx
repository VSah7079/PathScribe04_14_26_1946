// src/components/Touch/TouchLayoutScope.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Touch spec T2 and §5 (Batch 735): wraps a station screen. When the touch layout is on for this workstation
// (useTouchLayout: Auto on a touch device, or the workstation's override), the screen gets the `ps-touch` class,
// and touchLayout.css sizes its targets (44 px, 48 px for primary actions), gaps (8 px) and field text (16 px) once
// for every station screen. While it is on, the page's header and breadcrumb get their touch sizes too
// (`ps-touch-on` on the page), the field being typed in stays visible with its Save button when the keyboard is
// up (useKeyboardKeepVisible), and tapping an information element with a tooltip shows the tooltip (tapTitle.ts).
// The wrapper itself takes no space (display: contents).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTouchLayout } from '@/hooks/useTouchLayout';
import { useKeyboardKeepVisible } from '@/hooks/useKeyboardKeepVisible';
import { tapTitleFor } from '@/utils/touch/tapTitle';
import './touchLayout.css';

const BUBBLE_MS = 4000;

export function TouchLayoutScope({ children }: { children: ReactNode }) {
  const { active } = useTouchLayout();
  // T6: the field being typed in and its Save button stay above the on-screen keyboard.
  const { dock, pressDock } = useKeyboardKeepVisible(active);
  const ref = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add('ps-touch-on');
    return () => root.classList.remove('ps-touch-on');
  }, [active]);

  useEffect(() => {
    if (!bubble) return;
    const timer = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    return () => window.clearTimeout(timer);
  }, [bubble]);

  const onPointerUp = (e: React.PointerEvent) => {
    if (!active) return;
    const text = tapTitleFor(e.target as Element, ref.current);
    setBubble(text ? { text, x: e.clientX, y: e.clientY } : null);
  };

  return (
    <div ref={ref} className={`ps-touch-scope${active ? ' ps-touch' : ''}`} onPointerUp={onPointerUp} data-touch-layout={active ? 'on' : 'off'}>
      {children}
      {dock && (
        <div className="ps-touch-save-dock" style={{ '--dock-bottom': `${dock.bottomPx}px` } as React.CSSProperties}>
          {/* Pressing keeps focus in the field (no keyboard flicker); the click presses the form's real Save button. */}
          <button type="button" className="ps-btn-primary" disabled={dock.disabled}
            onPointerDown={e => e.preventDefault()} onMouseDown={e => e.preventDefault()} onClick={pressDock}>
            {dock.label}
          </button>
        </div>
      )}
      {bubble && (
        <div className="ps-touch-tip" role="tooltip"
          style={{ '--tip-x': `${bubble.x}px`, '--tip-y': `${bubble.y}px` } as React.CSSProperties}
          onPointerUp={() => setBubble(null)}>
          {bubble.text}
        </div>
      )}
    </div>
  );
}

export default TouchLayoutScope;
