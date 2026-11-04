// src/components/Autopsy/AutopsyTatChip.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 610 (#60, #88): the autopsy turnaround verdict as a chip: On track,
// Due soon, Overdue, Met or Met late, for the report the case is working
// towards (the PAD until it is signed, then the FAD). The tooltip gives the
// numbers behind it and where the target came from. The verdict itself is
// decided in services/autopsy/resolveAutopsyTatStatus.ts; this only renders it.
// Used on the worklist (both layouts) and on the report page.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AutopsyCaseDetails } from '@/types/autopsy/AutopsyCaseDetails';
import {
  AUTOPSY_TAT_STATE_LABEL_KEY,
  resolveAutopsyClockStart,
  resolveAutopsyTatSummary,
  type AutopsyClockSource,
} from '@/services/autopsy/resolveAutopsyTatStatus';
import { formatDateTime } from '@/utils/formatDate';
import { useTatEntries } from '@/hooks/useTatEntries';

interface Props {
  autopsy: AutopsyCaseDetails | undefined;
  /** The case, for the body-arrival time and facility. */
  caseSource: AutopsyClockSource;
  /** Test seam: the time the verdict is computed for. */
  now?: Date;
}

const AutopsyTatChip: React.FC<Props> = ({ autopsy, caseSource, now }) => {
  const { t, i18n } = useTranslation();
  const tatEntries = useTatEntries();
  const summary = useMemo(() => {
    const startedAt = resolveAutopsyClockStart(caseSource);
    if (!autopsy || !startedAt) return null;
    return resolveAutopsyTatSummary({ autopsy, startedAt, facilityId: caseSource.order?.facilityId, tatEntries, now });
  }, [autopsy, caseSource, tatEntries, now]);

  if (!summary) return null;
  const r = summary.current;
  const title = [
    t('autopsyTat.tooltip', {
      tier: r.tier,
      elapsed: r.elapsedHours,
      target: r.targetHours,
      source: t(r.source === 'override' ? 'autopsyTat.source.override' : 'autopsyTat.source.jurisdiction'),
      deadline: formatDateTime(r.deadline, i18n.language),
    }),
    r.holdHours > 0 ? t('autopsyTat.holdNote', { hours: r.holdHours }) : '',
  ].filter(Boolean).join(' ');

  return (
    <span
      className={`wl-autopsy-badge wl-autopsy-badge--tat wl-autopsy-badge--tat-${r.state}`}
      title={title}
      data-testid="autopsy-tat-chip"
    >
      {t(AUTOPSY_TAT_STATE_LABEL_KEY[r.state])}
    </span>
  );
};

export default AutopsyTatChip;
