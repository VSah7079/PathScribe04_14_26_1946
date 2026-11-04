// src/components/Common/SystemStatusIndicator.tsx
// Batch 669h (footer): the Home footer's system status: a colour dot and words from the server's overall
// state. The colour is never the only signal. Logic is in hooks/useSystemStatus.ts.
import { useTranslation } from 'react-i18next';
import { useSystemStatus } from '@/hooks/useSystemStatus';
import './SystemStatusIndicator.css';

export default function SystemStatusIndicator() {
  const { t } = useTranslation();
  const { kind, simulated } = useSystemStatus();
  return (
    <div className="ps-sysstatus" role="status" aria-live="polite" aria-label={t('home.status.label')} data-testid="system-status">
      <span className={`ps-sysstatus-dot ps-sysstatus-dot--${kind}`} aria-hidden="true" />
      <span data-testid="system-status-text">{t(`home.status.${kind}`)}</span>
      {simulated && <span className="ps-sysstatus-demo">{t('home.status.simulatedNote')}</span>}
    </div>
  );
}
