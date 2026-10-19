// src/components/MockInterfaceEngine/RegistryAnswerSimulatorPanel.tsx
// Batch 605: "receive registry acknowledgement" for sent submissions, labelled Simulated.
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { registryAckDeps } from '@/services/registrySubmission/recordRegistryAcknowledgementDeps';
import {
  listSimulatableSubmissions, simulateRegistryAcknowledgement, SIMULATED_REGISTRY_ANSWERS, type SimulatableSubmission, type SimulatedRegistryAnswer,
} from '@/services/registrySubmission/simulateRegistryAcknowledgement';
import { readSessionProfile } from '@/services/auth/sessionProfile';

const RegistryAnswerSimulatorPanel: React.FC = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState<SimulatableSubmission[]>([]);
  const [pick, setPick] = useState<Record<string, SimulatedRegistryAnswer>>({});
  const [note, setNote] = useState<string | null>(null);
  const load = useCallback(() => { void listSimulatableSubmissions(registryAckDeps).then(setItems); }, []);
  useEffect(load, [load]);

  const apply = async (s: SimulatableSubmission) => {
    const answer = pick[s.submissionGuid] ?? 'accepted';
    const r = await simulateRegistryAcknowledgement(s.submissionGuid, answer, registryAckDeps, readSessionProfile()?.name ?? 'system');
    setNote(r.outcome === 'silent' ? t('registryAnswerSimulator.silentNote') : t('registryAnswerSimulator.appliedNote', { outcome: r.outcome, status: r.registryStatus ?? '-' }));
    toast.info(t('registryAnswerSimulator.toast'));
    load();
  };

  return (
    <div className="ps-panel-box ps-mt-20" data-testid="registry-answer-simulator">
      <h3 className="ps-panel-heading"><span className="ps-conf-badge">{t('registryAnswerSimulator.badge')}</span> {t('registryAnswerSimulator.title')}</h3>
      <p className="ps-helper-text">{t('registryAnswerSimulator.explain')}</p>
      {items.length === 0 ? <p className="ps-helper-text" data-testid="registry-answer-empty">{t('registryAnswerSimulator.empty')}</p> : (
        <table className="ps-conf-table">
          <thead><tr><th>{t('registryAnswerSimulator.registry')}</th><th>{t('registryAnswerSimulator.status')}</th><th>{t('registryAnswerSimulator.answer')}</th><th /></tr></thead>
          <tbody>
            {items.map(s => (
              <tr key={s.submissionGuid}>
                <td>{s.registryId} ({s.queue})</td>
                <td>{s.registryStatus ?? '-'}</td>
                <td>
                  <select className="ps-input-dark" aria-label={t('registryAnswerSimulator.answer')} value={pick[s.submissionGuid] ?? 'accepted'}
                    onChange={e => setPick(p => ({ ...p, [s.submissionGuid]: e.target.value as SimulatedRegistryAnswer }))}>
                    {SIMULATED_REGISTRY_ANSWERS.map(a => <option key={a} value={a}>{t(`registryAnswerSimulator.answers.${a}`)}</option>)}
                  </select>
                </td>
                <td><button className="ps-conf-btn-secondary" onClick={() => apply(s)}>{t('registryAnswerSimulator.receive')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {note && <p className="ps-helper-text" data-testid="registry-answer-note">{note}</p>}
    </div>
  );
};

export default RegistryAnswerSimulatorPanel;
