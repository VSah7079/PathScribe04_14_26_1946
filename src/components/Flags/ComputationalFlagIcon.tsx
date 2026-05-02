// PathScribe — ComputationalFlagIcon
// Compact worklist icon for a Computational flag.
// Visual state machine: PENDING → PRELIMINARY → FINAL (actionable | non-actionable)
// Clicking opens the Sidecar Drawer via onSelect.

import React, { useEffect, useRef } from 'react';
import { Flag } from '@/services/flags/IFlagService';
import { ResultStatus, ActionabilityLevel } from '@/types/smarttag.types';
import { useComputationalResult } from '@/hooks/useComputationalResult';
import { FlagIconGlyph } from './flagIcons';

// ─── Keyframe injection ───────────────────────────────────────────────────────
// Injected once into document.head. Non-distracting opacity pulse only —
// no scale, no color flash, no movement.

const STYLE_ID = 'ps-comp-flag-keyframes';

function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ps-pulse-subtle {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.65; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Status → visual config ───────────────────────────────────────────────────

interface VisualConfig {
  color:       string;   // icon + border color
  bgColor:     string;   // container background (tinted)
  animation:   string;   // CSS animation shorthand or 'none'
  statusLabel: string;   // accessible / tooltip text
}

const STATUS_VISUAL: Record<string, VisualConfig> = {
  PENDING: {
    color:       '#888780',
    bgColor:     'rgba(136,135,128,0.10)',
    animation:   'none',
    statusLabel: 'Pending',
  },
  PRELIMINARY: {
    color:       '#BA7517',
    bgColor:     'rgba(186,117,23,0.10)',
    animation:   'ps-pulse-subtle 3.5s ease-in-out infinite',
    statusLabel: 'Preliminary',
  },
  FINAL_ACTIONABLE: {
    color:       '#A32D2D',
    bgColor:     'rgba(163,45,45,0.10)',
    animation:   'none',
    statusLabel: 'Final — action required',
  },
  FINAL_NON_ACTIONABLE: {
    color:       '#0F6E56',
    bgColor:     'rgba(15,110,86,0.10)',
    animation:   'none',
    statusLabel: 'Final',
  },
};

const LOADING_VISUAL: VisualConfig = {
  color:       '#0891B2',
  bgColor:     'rgba(8,145,178,0.06)',
  animation:   'none',
  statusLabel: 'Loading…',
};

function resolveVisual(
  status:        ResultStatus | undefined,
  actionability: ActionabilityLevel | undefined,
): VisualConfig {
  if (!status) return LOADING_VISUAL;
  if (status === ResultStatus.PENDING)     return STATUS_VISUAL.PENDING;
  if (status === ResultStatus.PRELIMINARY) return STATUS_VISUAL.PRELIMINARY;
  if (status === ResultStatus.FINAL) {
    return actionability === ActionabilityLevel.ACTIONABLE
      ? STATUS_VISUAL.FINAL_ACTIONABLE
      : STATUS_VISUAL.FINAL_NON_ACTIONABLE;
  }
  return LOADING_VISUAL;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  flag:     Flag;
  caseId:   string;
  size?:    number;   // icon container size in px (default 28)
  onSelect: (flag: Flag) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ComputationalFlagIcon: React.FC<Props> = ({
  flag,
  caseId,
  size = 28,
  onSelect,
}) => {
  const hasInjected = useRef(false);

  useEffect(() => {
    if (!hasInjected.current) {
      injectKeyframes();
      hasInjected.current = true;
    }
  }, []);

  const { result, loading, error } = useComputationalResult(flag, caseId);

  const visual = resolveVisual(result?.status, result?.actionability);

  const tooltipLines = [
    flag.displayName ?? flag.name,
    visual.statusLabel,
    error ? `Error: ${error}` : null,
  ].filter(Boolean).join('\n');

  const iconKey = flag.iconKey ?? 'generic-lab';
  const glyphSize = Math.round(size * 0.55);

  return (
    <button
      title={tooltipLines}
      aria-label={`${flag.displayName ?? flag.name}: ${visual.statusLabel}`}
      onClick={e => { e.stopPropagation(); onSelect(flag); }}
      style={{
        // Layout
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           size,
        height:          size,
        borderRadius:    6,
        flexShrink:      0,
        position:        'relative',
        cursor:          'pointer',

        // Visuals
        background:      visual.bgColor,
        border:          `1.5px solid ${visual.color}`,
        color:           visual.color,

        // Animation (on the container — pulse the whole icon)
        animation:       visual.animation,

        // Reset button defaults
        padding:         0,
        outline:         'none',
        transition:      'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.filter = 'none';
      }}
      onFocus={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${visual.color}55`;
      }}
      onBlur={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <FlagIconGlyph iconKey={iconKey} size={glyphSize} />

      {/* Status dot — bottom-right corner */}
      <span
        aria-hidden="true"
        style={{
          position:     'absolute',
          bottom:       -3,
          right:        -3,
          width:        8,
          height:       8,
          borderRadius: '50%',
          background:   visual.color,
          border:       '1.5px solid var(--color-background-primary, #fff)',
        }}
      />
    </button>
  );
};

export default ComputationalFlagIcon;
