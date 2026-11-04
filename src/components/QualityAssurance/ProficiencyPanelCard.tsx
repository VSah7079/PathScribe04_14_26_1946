// src/components/QualityAssurance/ProficiencyPanelCard.tsx
// Batch 608 (#77): build a proficiency test panel (the lab's answers to the
// provider's challenge slides), submit it, and apply a SIMULATED graded result.
// The result is marked simulated everywhere it shows and is not counted in the
// PT rates; a real provider's grade arrives through the interface engine.

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { cytologyProficiencyPanelService } from '@/services';
import { getSessionUser } from '@/services/auth/caseAccessControl';
import { PT_RESPONSES, ptPanelProblem, type PtPanelChallenge, type PtPanelSubmission } from '@/services/cytology/proficiencyPanel';

const NEW_CHALLENGES = (): PtPanelChallenge[] => Array.from({ length: 5 }, (_, i) => ({ slideId: `SLIDE-${i + 1}`, labResponse: '' }));

export function ProficiencyPanelCard({ onChanged }: { onChanged: () => void }) {
  const { t } = useTranslation();
  const [panels, setPanels] = useState<PtPanelSubmission[]>([]);
  const [provider, setProvider] = useState('CAP');
  const [eventReference, setEventReference] = useState('');
  const [challenges, setChallenges] = useState<PtPanelChallenge[]>(NEW_CHALLENGES);
  const [problem, setProblem] = useState<string | null>(null);
  const session = getSessionUser();
  const actor = { id: session?.id ?? '', name: `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim() };

  const refresh = useCallback(async () => {
    const r = await cytologyProficiencyPanelService.getAll();
    if (r.ok) setPanels(r.data);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async () => {
    const p = ptPanelProblem({ provider, eventReference, challenges });
    if (p) { setProblem(p); return; }
    setProblem(null);
    const r = await cytologyProficiencyPanelService.submit({ provider, eventReference, challenges }, actor);
    if (r.ok) { toast.success(t('ptPanel.submitted')); setEventReference(''); setChallenges(NEW_CHALLENGES()); await refresh(); }
  };
  const grade = async (id: string) => {
    const r = await cytologyProficiencyPanelService.applySimulatedResult(id, actor);
    if (r.ok) { toast.info(t('ptPanel.gradedToast')); await refresh(); onChanged(); }
  };

  return (
    <div className="ps-conf-card ps-conf-card--spaced">
      <div className="ps-conf-card-title">{t('ptPanel.title')}</div>
      <p className="ps-conf-hint">{t('ptPanel.help')}</p>
      <div className="ps-ptpanel-fields">
        <label className="ps-conf-label" htmlFor="pt-provider">{t('ptPanel.provider')}</label>
        <input id="pt-provider" className="ps-conf-input" value={provider} onChange={e => setProvider(e.target.value)} />
        <label className="ps-conf-label" htmlFor="pt-event">{t('ptPanel.eventReference')}</label>
        <input id="pt-event" className="ps-conf-input" value={eventReference} onChange={e => setEventReference(e.target.value)} />
      </div>
      {challenges.map((c, i) => (
        <div key={i} className="ps-ptpanel-row">
          <input aria-label={t('ptPanel.slide')} className="ps-conf-input" value={c.slideId}
            onChange={e => setChallenges(cs => cs.map((x, j) => (j === i ? { ...x, slideId: e.target.value } : x)))} />
          <select aria-label={t('ptPanel.response')} className="ps-conf-select" value={c.labResponse}
            onChange={e => setChallenges(cs => cs.map((x, j) => (j === i ? { ...x, labResponse: e.target.value as PtPanelChallenge['labResponse'] } : x)))}>
            <option value="">{t('ptPanel.choose')}</option>
            {PT_RESPONSES.map(r => <option key={r} value={r}>{t(`ptPanel.responses.${r}`)}</option>)}
          </select>
        </div>
      ))}
      {problem && <div className="ps-conf-hint" role="alert">{t(`ptPanel.problem.${problem}`)}</div>}
      <div className="ps-conf-row-actions">
        <button type="button" className="ps-conf-btn-primary" onClick={() => void submit()}>{t('ptPanel.submit')}</button>
      </div>

      {panels.length > 0 && (
        <table className="ps-conf-table">
          <thead><tr>
            <th className="ps-conf-th">{t('ptPanel.eventReference')}</th><th className="ps-conf-th">{t('ptPanel.provider')}</th>
            <th className="ps-conf-th">{t('ptPanel.status')}</th><th className="ps-conf-th" />
          </tr></thead>
          <tbody>
            {panels.map(p => (
              <tr key={p.id} className="ps-conf-tr">
                <td className="ps-conf-td">{p.eventReference}</td>
                <td className="ps-conf-td">{p.provider}</td>
                <td className="ps-conf-td">
                  {p.status === 'submitted'
                    ? t('ptPanel.statusSubmitted', { count: p.challenges.length })
                    : <span><span className="ps-qa-badge ps-qa-badge--warning">{t('ptPanel.simulatedBadge')}</span> {t(`ptPanel.outcome.${p.outcome}`)} ({Math.round(p.scorePercent ?? 0)}%)</span>}
                </td>
                <td className="ps-conf-td">
                  {p.status === 'submitted' && <button type="button" className="ps-conf-btn-secondary" onClick={() => void grade(p.id)}>{t('ptPanel.applySimulated')}</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
