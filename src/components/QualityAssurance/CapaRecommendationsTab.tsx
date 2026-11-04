// src/components/QualityAssurance/CapaRecommendationsTab.tsx
// ─────────────────────────────────────────────────────────────────────────────
// PS-144 to PS-148 (Batch 438): Quality Assurance → CAPA → Recommended. The QA
// lead's queue. Each recommendation says what raised it; Confirm opens the
// CAPA (an open deficiency in Operations, assigned to the owner chosen here);
// Dismiss needs a reason. Both need qa:capa-recommendation:decide, checked in
// services/quality/capaRecommendationService.ts. Decisions live in the service.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { capaRecommendationService, capaOwnerOptions, capaQueueOrder, capaDecisionProblem, userService, deficiencyTypeService } from '@/services';
import type { CapaRecommendation } from '@/types/quality/CapaRecommendation';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { formatDateTime } from '@/utils/formatDate';
import '@/pathscribe.css';

interface Props {
  /** Told when the pending count changes (the tile shows it). */
  onPendingCountChange?: (count: number) => void;
  /** Opens a confirmed recommendation's CAPA in Operations. */
  onOpenCapa?: (deficiencyId: string) => void;
}

type Decision = { kind: 'confirm'; rec: CapaRecommendation } | { kind: 'dismiss'; rec: CapaRecommendation };

export const CapaRecommendationsTab: React.FC<Props> = ({ onPendingCountChange, onOpenCapa }) => {
  const { t, i18n } = useTranslation();
  const K = 'qualityAssurance.capaRecommendations';
  const [recs, setRecs] = useState<CapaRecommendation[]>([]);
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [typeNames, setTypeNames] = useState<Record<string, string>>({});
  const [showDecided, setShowDecided] = useState(false);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await capaRecommendationService.getAll();
    if (res.ok) {
      setRecs(res.data);
      onPendingCountChange?.(res.data.filter(r => r.status === 'pending').length);
    }
  }, [onPendingCountChange]);

  useEffect(() => {
    void load();
    userService.getAll().then(r => { if (r.ok) setOwners(capaOwnerOptions(r.data)); });
    deficiencyTypeService.getAll().then(r => { if (r.ok) setTypeNames(Object.fromEntries(r.data.map(d => [d.id, d.name]))); });
  }, [load]);

  const rows = useMemo(() => capaQueueOrder(recs, showDecided), [recs, showDecided]);

  const open = (d: Decision) => { setDecision(d); setOwnerId(''); setText(''); setError(null); };
  const close = () => setDecision(null);

  const submit = async () => {
    if (!decision) return;
    const draft = decision.kind === 'confirm' ? { kind: 'confirm' as const, assignedTo: ownerId } : { kind: 'dismiss' as const, reason: text };
    const problem = capaDecisionProblem(decision.rec, draft);
    if (problem) { setError(t(`${K}.errors.${problem}`)); return; }
    const res = decision.kind === 'confirm'
      ? await capaRecommendationService.confirm(decision.rec.id, { assignedTo: ownerId, assignedToName: owners.find(o => o.id === ownerId)?.name ?? ownerId, note: text })
      : await capaRecommendationService.dismiss(decision.rec.id, text);
    if (res.ok === false) { setError(t(`${K}.errors.${res.error}`, { defaultValue: t(`${K}.errors.failed`) })); return; }
    close();
    await load();
  };

  const statusLabel = (r: CapaRecommendation) => t(`${K}.status.${r.status}`);

  return (
    <div className="ps-capa-rec">
      <div className="ps-capa-rec__intro">
        <p className="ps-conf-card-description--tight">{t(`${K}.intro`)}</p>
        <label className="ps-conf-toggle-label-row">
          <input type="checkbox" checked={showDecided} onChange={e => setShowDecided(e.target.checked)} className="ps-conf-radio-input" />
          <span className="ps-conf-option-text">{t(`${K}.showDecided`)}</span>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="ps-conf-empty">{t(`${K}.empty`)}</div>
      ) : (
        <div className="ps-conf-table-wrap">
          <div className="ps-conf-table-scroll">
            <table className="ps-conf-table">
              <thead className="ps-conf-thead-sticky">
                <tr>
                  <th className="ps-conf-th">{t(`${K}.columns.status`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.case`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.source`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.capaType`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.why`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.recommended`)}</th>
                  <th className="ps-conf-th">{t(`${K}.columns.decision`)}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="ps-conf-tr">
                    <td className="ps-conf-td">
                      <span className={`ps-capa-rec__status ps-capa-rec__status--${r.status}`}>{statusLabel(r)}</span>
                    </td>
                    <td className="ps-conf-td"><span data-phi="accession">{r.caseId}</span></td>
                    <td className="ps-conf-td">{t(`${K}.sources.${r.source}`)}</td>
                    <td className="ps-conf-td">{typeNames[r.deficiencyTypeId] ?? r.deficiencyTypeId}</td>
                    <td className="ps-conf-td">
                      <div className="ps-specreq-meta">{r.summary}</div>
                      {(r.linkedEvents ?? []).map(e => (
                        <div key={e.sourceRecordId} className="ps-capa-rec__linked">{t(`${K}.linked`, { source: t(`${K}.sources.${e.source}`) })}: {e.summary}</div>
                      ))}
                    </td>
                    <td className="ps-conf-td">{formatDateTime(r.createdAt, i18n.language)}</td>
                    <td className="ps-conf-td">
                      {r.status === 'pending' ? (
                        <div className="ps-qa-inline-actions">
                          <CapabilityButton capability="qa:capa-recommendation:decide" context={{ caseId: r.caseId }} className="ps-conf-btn-primary" onClick={() => open({ kind: 'confirm', rec: r })}>{t(`${K}.confirm`)}</CapabilityButton>
                          <CapabilityButton capability="qa:capa-recommendation:decide" context={{ caseId: r.caseId }} className="ps-conf-btn-secondary" onClick={() => open({ kind: 'dismiss', rec: r })}>{t(`${K}.dismiss`)}</CapabilityButton>
                        </div>
                      ) : (
                        <div className="ps-specreq-meta">
                          {r.status === 'confirmed'
                            ? t(`${K}.confirmedLine`, { name: r.decidedByName ?? '', owner: r.assignedToName ?? '', date: formatDateTime(r.decidedAt, i18n.language) })
                            : t(`${K}.dismissedLine`, { name: r.decidedByName ?? '', date: formatDateTime(r.decidedAt, i18n.language), reason: r.dismissReason ?? '' })}
                          {r.status === 'confirmed' && r.deficiencyId && onOpenCapa && (
                            <button className="ps-conf-btn-row" onClick={() => onOpenCapa(r.deficiencyId!)}>{t(`${K}.openCapa`)}</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {decision && (
        <div className="ps-ms-overlay">
          <div className="ps-ms-modal">
            <div className="ps-ms-header">{decision.kind === 'confirm' ? t(`${K}.confirmTitle`) : t(`${K}.dismissTitle`)}</div>
            <div className="ps-ms-body">
              <p className="ps-specreq-meta">
                <span data-phi="accession">{decision.rec.caseId}</span> · {t(`${K}.sources.${decision.rec.source}`)}
              </p>
              <p className="ps-specreq-meta">{decision.rec.summary}</p>
              {decision.kind === 'confirm' && (
                <div className="ps-conf-form-field">
                  <label className="ps-conf-label" htmlFor="capa-owner">{t(`${K}.ownerLabel`)} <span className="ps-conf-required">*</span></label>
                  <select id="capa-owner" className="ps-conf-select" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                    <option value="">{t(`${K}.ownerPlaceholder`)}</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
              <div className="ps-conf-form-field">
                <label className="ps-conf-label" htmlFor="capa-decision-text">
                  {decision.kind === 'confirm' ? t(`${K}.noteLabel`) : <>{t(`${K}.reasonLabel`)} <span className="ps-conf-required">*</span></>}
                </label>
                <textarea id="capa-decision-text" className="ps-conf-input ps-capa-rec__textarea" value={text} onChange={e => setText(e.target.value)}
                  placeholder={decision.kind === 'confirm' ? t(`${K}.notePlaceholder`) : t(`${K}.reasonPlaceholder`)} />
                {decision.kind === 'dismiss' && <span className="ps-conf-field-hint">{t(`${K}.reasonHint`)}</span>}
              </div>
              {error && <div className="ps-conf-error-text">{error}</div>}
            </div>
            <div className="ps-ms-footer">
              <button className="ps-ms-btn-cancel" onClick={close}>{t('common.cancel')}</button>
              <button className="ps-ms-btn-apply" onClick={() => { void submit(); }}>
                {decision.kind === 'confirm' ? t(`${K}.confirmButton`) : t(`${K}.dismissButton`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapaRecommendationsTab;
