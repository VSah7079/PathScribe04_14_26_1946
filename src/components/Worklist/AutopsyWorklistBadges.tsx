// src/components/Worklist/AutopsyWorklistBadges.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 477 (PS-261 follow-up, Module 5) — renders the real badges
// resolveAutopsyWorklistBadges.ts resolves, plus the jurisdiction's
// real, static TAT/SLA hint (resolveAutopsySlaHint) as a tooltip-only
// "SLA" chip (kept to one, compact word — "SLA" is a domain
// abbreviation, same treatment as "RES"/MRN/DOB already get elsewhere
// in this table, never translated on its own). Shared between the
// table row's Status cell and the card layout's body, so the same
// real badges show in both views rather than one silently
// out-pacing the other.
//
// Renders nothing at all for a case with no real `autopsy` details —
// used unconditionally in both views; a non-autopsy row simply shows
// no badges, same "never a fabricated placeholder" discipline
// resolveWorklistDpBadges.ts's own badges already follow.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { useTranslation } from 'react-i18next';
import { resolveAutopsyWorklistBadges, resolveAutopsySlaHint, type AutopsyWorklistBadgeKind } from '@/services/autopsy/resolveAutopsyWorklistBadges';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';

interface Props {
  autopsy: AutopsyCaseDetails | undefined;
}

const BADGE_HUE: Record<AutopsyWorklistBadgeKind, string> = {
  caseAuthority: '#60a5fa',
  ancillaryHold: '#ef4444',
  padSigned: '#38bdf8',
  fadSigned: '#34d399',
};

const AutopsyWorklistBadges: React.FC<Props> = ({ autopsy }) => {
  const { t } = useTranslation();
  if (!autopsy) return null;

  const badges = resolveAutopsyWorklistBadges(autopsy);
  const slaHint = resolveAutopsySlaHint(autopsy);

  return (
    <div className="wl-autopsy-badges">
      {badges.map(b => (
        <span key={b.kind} className="wl-autopsy-badge" style={{ '--ps-hue': BADGE_HUE[b.kind] } as React.CSSProperties}>
          {t(b.labelKey)}
        </span>
      ))}
      {/* "SLA" itself is a compact domain abbreviation (like "RES" on
          the Staff chip just above this file in the table) — only its
          tooltip, the real jurisdiction target, is real UI copy. */}
      <span className="wl-autopsy-badge wl-autopsy-badge--sla" style={{ '--ps-hue': '#94a3b8' } as React.CSSProperties} title={slaHint}>
        SLA
      </span>
    </div>
  );
};

export default AutopsyWorklistBadges;
