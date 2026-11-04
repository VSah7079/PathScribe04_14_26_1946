// Shows the case's queued registry reports and lets the user hand them to the simulated registry.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import type { CancerRegistryOutboundQueueEntry } from '@/types/case/CancerRegistryOutboundQueueEntry';
import { listCaseRegistryReports, submitQueuedRegistryReportsSimulated } from '@/services/registrySubmission/simulateRegistrySubmission';

const CaseRegistryReportPanel: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<CancerRegistryOutboundQueueEntry[]>([]);
  const load = useCallback(() => { void listCaseRegistryReports(caseId).then(setEntries); }, [caseId]);
  useEffect(load, [load]);
  if (entries.length === 0) return null;
  const queued = entries.filter(e => e.status === 'QUEUED').length;
  const send = async () => {
    const r = await submitQueuedRegistryReportsSimulated(caseId);
    toast.info(t('caseRegistryReport.submitted', { count: r.submitted }));
    load();
  };
  return (
    <section className="ps-registry-case-panel" data-testid="case-registry-report">
      <h4>{t('caseRegistryReport.title')} <span className="ps-simulated-badge">{t('caseRegistryReport.simulated')}</span></h4>
      <ul>
        {entries.map(e => (
          <li key={e.id}>{t('caseRegistryReport.row', { registry: e.registryId, status: e.registryStatus ?? e.status })}{e.errorMessage ? `: ${e.errorMessage}` : ''}</li>
        ))}
      </ul>
      {queued > 0 && <button type="button" className="ps-btn-secondary" onClick={send}>{t('caseRegistryReport.submit', { count: queued })}</button>}
    </section>
  );
};

export default CaseRegistryReportPanel;
