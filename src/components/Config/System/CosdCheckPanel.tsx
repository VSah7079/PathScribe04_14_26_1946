// src/components/Config/System/CosdCheckPanel.tsx
// Batch 620 (part C, PS-800): "check a sample UK submission" and "when is a correction due". Same logic as the queue's
// (services/cosd). The preview is PathScribe's SIMPLIFIED model, not the official COSD schema, and the panel says so.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COSD_RULES_NEEDING_SPEC } from '../../../services/cosd/cosdModel';
import { checkCosdSubmission, type CosdCheckResult } from '../../../services/cosd/validateCosd';
import { addWorkingDays } from '../../../services/cosd/workingDays';
import { correctionStatus } from '../../../services/cosd/cosdFeed';
import type { CosdDestinationSettings } from '../../../services/cosd/cosdDestination';
import { samplePayload } from '../../../services/cosd/cosdSample';

const NOW = () => new Date();
const day = (d: Date) => new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', dateStyle: 'medium' }).format(d);

const CosdCheckPanel: React.FC<{ destination: CosdDestinationSettings }> = ({ destination }) => {
  const { t } = useTranslation();
  const [nhs, setNhs] = useState('');
  const [bornOn, setBornOn] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [icdO, setIcdO] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [result, setResult] = useState<CosdCheckResult | null>(null);
  const [rejected, setRejected] = useState('');

  const run = () => {
    const payload = samplePayload({ nhsNumber: nhs, dateOfBirth: bornOn, diagnosisDate, icdO, primaryDiagnosis: diagnosis }, NOW());
    setResult(checkCosdSubmission(payload, { submissionId: 'sample', messageType: 'NEW' }, NOW()));
  };
  const due = rejected ? addWorkingDays(new Date(`${rejected}T09:00:00Z`), destination.correctionWorkingDays, destination.nonWorkingDates) : null;
  const status = due ? correctionStatus(new Date(`${rejected}T09:00:00Z`), due, NOW()) : null;
  const field = (id: string, label: string, value: string, set: (v: string) => void, type = 'text') => (
    <>
      <label className="ps-conf-label" htmlFor={id}>{t(label)}</label>
      <input id={id} type={type} className="ps-conf-input" value={value} data-phi="true" onChange={e => set(e.target.value)} />
    </>
  );
  return (
    <div className="ps-dsch-test">
      <div className="ps-rr-test-title">{t('cosdDestinationSection.check.title')}</div>
      <div className="ps-rr-test-subtitle">{t('cosdDestinationSection.check.subtitle')}</div>
      {field('cosd-c-nhs', 'cosdDestinationSection.check.nhs', nhs, setNhs)}
      {field('cosd-c-birth', 'cosdDestinationSection.check.bornOn', bornOn, setBornOn, 'date')}
      {field('cosd-c-diag-date', 'cosdDestinationSection.check.diagnosisDate', diagnosisDate, setDiagnosisDate, 'date')}
      {field('cosd-c-icdo', 'cosdDestinationSection.check.icdo', icdO, setIcdO)}
      {field('cosd-c-diag', 'cosdDestinationSection.check.diagnosis', diagnosis, setDiagnosis)}
      <button className="ps-conf-btn-primary" onClick={run}>{t('cosdDestinationSection.check.run')}</button>
      {result && (
        <div className="ps-dsch-result" role="status">
          <div className="ps-dsch-result-value">{t(result.ok ? 'cosdDestinationSection.check.ok' : 'cosdDestinationSection.check.held')}</div>
          {result.findings.map(f => <div key={`${f.code}-${f.field}`}>{t(`cosdDestinationSection.check.findings.${f.code}`)}</div>)}
          <div className="ps-conf-hint">{t('cosdDestinationSection.check.previewNote')}</div>
          <pre className="ps-cosd-preview" data-phi="true">{result.xml}</pre>
        </div>
      )}
      <div className="ps-conf-hint">
        {t('cosdDestinationSection.check.needsSpec')} {COSD_RULES_NEEDING_SPEC.map(r => t(`cosdDestinationSection.check.rules.${r}`)).join(', ')}.
      </div>
      <div className="ps-rr-test-title">{t('cosdDestinationSection.correction.title')}</div>
      {field('cosd-c-rejected', 'cosdDestinationSection.correction.rejectedOn', rejected, setRejected, 'date')}
      {due && status && (
        <div className="ps-dsch-result" role="status">
          <div className="ps-dsch-result-value">{t('cosdDestinationSection.correction.dueOn', { date: day(due), days: destination.correctionWorkingDays })}</div>
          <div>{t(`cosdDestinationSection.correction.status.${status.state}`)}</div>
        </div>
      )}
    </div>
  );
};

export default CosdCheckPanel;
