// src/components/InterfaceDictionary/ProfileTestPanel.tsx
// ─────────────────────────────────────────────────
// Batch 612: paste a sample vendor message, run the working copy against it and see
// what each mapping found. Simulated: nothing is received from the vendor. The sample
// and the values it produced are shown here once and are not stored; the profile keeps
// only the counts of the run.
// ─────────────────────────────────────────────────
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileTestReport } from '@/services';
import { codeKey } from '@/services';

export interface ProfileTestPanelProps {
  sample: string;
  onSampleChange: (v: string) => void;
  onRun: () => void;
  busy: boolean;
  canRun: boolean;
  report: ProfileTestReport | null;
}

export const ProfileTestPanel: React.FC<ProfileTestPanelProps> = ({ sample, onSampleChange, onRun, busy, canRun, report }) => {
  const { t } = useTranslation();
  return (
    <div className="ps-idict-test" data-testid="idict-test">
      <h4>{t('interfaceDictionary.test.title')} <span className="ps-simulated-badge">{t('interfaceDictionary.simulated')}</span></h4>
      <p className="ps-conf-hint">{t('interfaceDictionary.test.hint')}</p>
      <label className="ps-idict-field" htmlFor="idict-sample">
        <span>{t('interfaceDictionary.test.sampleLabel')}</span>
        <textarea id="idict-sample" className="ps-conf-input ps-idict-mono ps-idict-sample" data-testid="idict-sample" data-phi="true"
          rows={7} value={sample} onChange={e => onSampleChange(e.target.value)} />
      </label>
      <button type="button" className="ps-btn ps-btn-primary" disabled={!canRun || busy || !sample.trim()} data-testid="idict-run-test" onClick={onRun}>
        {t('interfaceDictionary.test.run')}
      </button>
      {report && (
        <div className="ps-idict-report" data-testid="idict-report">
          <p className={report.result.passed ? 'ps-idict-pass' : 'ps-idict-fail'} role="status" data-testid="idict-report-verdict">
            {t(report.result.passed ? 'interfaceDictionary.test.passed' : 'interfaceDictionary.test.failed')}{' '}
            {t('interfaceDictionary.test.summary', { mapped: report.result.mapped, missing: report.result.missingRequired, problems: report.result.problems })}
          </p>
          <table className="ps-conf-table">
            <thead>
              <tr>
                <th>{t('interfaceDictionary.test.colTarget')}</th>
                <th>{t('interfaceDictionary.test.colResult')}</th>
                <th>{t('interfaceDictionary.test.colValue')}</th>
              </tr>
            </thead>
            <tbody>
              {report.apply.outcomes.map(o => (
                <tr key={o.mappingId} data-testid={`idict-outcome-${o.mappingId}`}>
                  <td className="ps-idict-mono">{o.target}</td>
                  <td>
                    {t(`interfaceDictionary.test.status.${o.status}`)}
                    {o.problem && <> — {t(`interfaceDictionary.test.problemDetail.${codeKey(o.problem)}`)}</>}
                  </td>
                  <td data-phi="true">{o.value ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
