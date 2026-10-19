// src/components/Interfaces/EngineStatusLine.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 554 (PS-539 phase 2d; readiness review §9 item 4): one line above the
// Interfaces view's sub-tabs, "Interface engines: 1 offline, 1 listener down
// and 2 online", so a stopped listener or an offline engine is seen without
// opening Engines. Zero counts are left out. Shown with the API server and
// the capability only, and not while the last read failed; one click opens
// Engines.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useInterfaceEngines } from '@/hooks/useInterfaceEngines';
import { engineLineIsProblem, engineLineParts } from '@/services/interfaceMonitoring/interfaceMonitoringContract';
import { formatList } from '@/utils/formatList';
import type { IInterfaceMonitoringService } from '@/services/interfaceMonitoring/interfaceMonitoringService';

export const EngineStatusLine: React.FC<{ onOpen: () => void; service?: IInterfaceMonitoringService; enabled?: boolean }> = ({ onOpen, service, enabled = true }) => {
  const { t, i18n } = useTranslation();
  const e = useInterfaceEngines(service, enabled);
  if (!e.viaServer || e.simulated || !enabled || e.problem || !e.counts || (e.views?.length ?? 0) === 0) return null;
  const parts = engineLineParts(e.counts).map(p => t(`interfaceEngines.lineParts.${p.key}`, { count: p.count }));
  return (
    <p className={`ps-ifengines-line${engineLineIsProblem(e.counts) ? ' ps-ifengines-line--problem' : ''}`} role="status">
      <span>{t('interfaceEngines.line', { parts: formatList(parts, i18n.language) })}</span>
      <button type="button" className="ps-conf-btn-secondary" onClick={onOpen}>{t('interfaceEngines.view')}</button>
    </p>
  );
};
