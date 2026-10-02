// src/components/Config/System/SurgicalPeerReviewRiskWeights.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 432: per-subspecialty risk weights for surgical peer review sampling,
// in the QA Configuration Center's Surgical Peer Review type. A weight
// multiplies the type's sampling percentage for that subspecialty's cases
// (capped at 100%, resolveEffectiveSurgicalPeerReviewSamplingRate.ts). No
// weight means 1×. Saved as each field is left; the service checks
// config:qa-types:manage.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { subspecialtyService, surgicalPeerReviewRiskWeightService } from '../../../services';
import type { Subspecialty } from '@/services';
import type { QaSubspecialtyRiskWeight } from '@/types/quality/QaSubspecialtyRiskWeight';
import { useAuth } from '@/contexts/AuthContext';
import { parseRiskWeightInput } from '@/services/quality/riskWeightInput';

export const SurgicalPeerReviewRiskWeights: React.FC<{ basePercentage?: number }> = ({ basePercentage }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>([]);
  const [weights, setWeights] = useState<QaSubspecialtyRiskWeight[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const [subs, ws] = await Promise.all([subspecialtyService.getAll(), surgicalPeerReviewRiskWeightService.getAll()]);
    if (subs.ok) setSubspecialties(subs.data.filter(s => s.status !== 'Inactive'));
    if (ws.ok) setWeights(ws.data);
  };
  useEffect(() => { void load(); }, []);

  const weightFor = (id: string) => weights.find(w => w.subspecialtyId === id)?.multiplier;

  const save = async (subspecialtyId: string) => {
    const raw = drafts[subspecialtyId];
    if (raw === undefined) return;
    const parsed = parseRiskWeightInput(raw);
    if (parsed === 'invalid') { setError(t('qaConfigurationCenterSection.riskWeights.invalid')); return; }
    setError(null);
    const res = parsed === null
      ? await surgicalPeerReviewRiskWeightService.removeWeight(subspecialtyId)
      : await surgicalPeerReviewRiskWeightService.setWeight(subspecialtyId, parsed, user?.name ?? user?.id ?? 'Unknown');
    if (res.ok) { setDrafts(d => { const n = { ...d }; delete n[subspecialtyId]; return n; }); await load(); }
  };

  return (
    <div className="ps-conf-form-field ps-qa-risk-weights">
      <label className="ps-conf-label">{t('qaConfigurationCenterSection.riskWeights.title')}</label>
      <p className="ps-conf-section-subtitle">{t('qaConfigurationCenterSection.riskWeights.hint')}</p>
      {error && <div className="ps-qa-risk-weights-error" role="alert">{error}</div>}
      <table className="ps-qa-risk-weights-table">
        <thead>
          <tr>
            <th>{t('qaConfigurationCenterSection.riskWeights.colSubspecialty')}</th>
            <th>{t('qaConfigurationCenterSection.riskWeights.colMultiplier')}</th>
            <th>{t('qaConfigurationCenterSection.riskWeights.colEffective')}</th>
          </tr>
        </thead>
        <tbody>
          {subspecialties.map(s => {
            const current = weightFor(s.id);
            const value = drafts[s.id] ?? (current !== undefined ? String(current) : '');
            const multiplier = current ?? 1;
            return (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>
                  <input className="ps-conf-input ps-qa-risk-weights-input" type="number" min={0.1} step={0.1}
                    placeholder="1" value={value} aria-label={t('qaConfigurationCenterSection.riskWeights.inputAria', { name: s.name })}
                    onChange={e => setDrafts(d => ({ ...d, [s.id]: e.target.value }))}
                    onBlur={() => void save(s.id)} />
                </td>
                <td className="ps-qa-risk-weights-effective">
                  {basePercentage !== undefined ? `${Math.min(100, Math.round(basePercentage * multiplier * 10) / 10)}%` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SurgicalPeerReviewRiskWeights;
