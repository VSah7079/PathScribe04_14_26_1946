// src/components/PatientHistory/HistoryExtractionPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 621: beside a historical report's text in the history view, what the AI read from its Final Diagnosis and Microscopic
// text as synoptic fields. Always labelled "AI-extracted, not verified"; advisory only, for the pathologist to look at, and never
// used by reports, printing, registries, billing, rules or exports. "Flag as wrong" records a miss for accuracy measurement.
// Shown only when the setting is on for the case's facility and the user holds ai:history-extraction:run.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import './HistoryExtractionPanel.css';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { flagHistoryExtractionWrong } from '@/services/historyExtraction/historyExtractionRuntime';
import { useHistoryExtraction, type HistoryExtractionCase } from './useHistoryExtraction';

export const HistoryExtractionPanel: React.FC<{ item: HistoryExtractionCase; userName: string }> = ({ item, userName }) => {
  const { t } = useTranslation();
  const { view, refresh } = useHistoryExtraction(item, userName);
  const [flagged, setFlagged] = useState<ReadonlySet<string>>(new Set());
  const [refused, setRefused] = useState(false);
  if (view.state === 'hidden') return null;
  const x = view.extraction;
  const working = view.state === 'working';

  const flag = async (fieldId: string | null) => {
    if (!x) return;
    const ok = await flagHistoryExtractionWrong({ sourceCaseId: x.sourceCaseId, fieldId, templateId: x.templateId ?? null, sourceTextHash: x.sourceTextHash, userName });
    setRefused(!ok);
    if (ok) setFlagged(prev => new Set(prev).add(fieldId ?? ''));
  };

  return (
    <section className="ps-hx-panel" aria-label={t('historyExtraction.region')} data-testid="history-extraction-panel">
      <div className="ps-hx-head">
        <span className="ps-hx-label">{t('historyExtraction.aiLabel')}</span>
        <button type="button" className="ps-conf-btn-secondary" onClick={refresh} disabled={working}>{t('historyExtraction.refresh')}</button>
      </div>
      <p className="ps-hx-note">{t('historyExtraction.advisory')}</p>
      {working && !x && <p className="ps-hx-note" role="status">{t('historyExtraction.working')}</p>}
      {x && x.status === 'extracted' && (
        <>
          <p className="ps-hx-meta">
            {t('historyExtraction.template', { name: x.templateName ?? '', version: x.templateVersion ?? '' })}
            {x.aiService ? ` · ${t('historyExtraction.service', { provider: x.aiService.provider, model: x.aiService.model })}` : ''}
          </p>
          {x.fields.length === 0 && <p className="ps-hx-note">{t('historyExtraction.noFields')}</p>}
          <ul className="ps-hx-fields">
            {x.fields.map(f => (
              <li key={f.fieldId} className="ps-hx-field">
                <span className="ps-hx-field-label">{f.label}</span>
                <span className="ps-hx-field-value" data-phi="diagnosis">{f.display}</span>
                <CapabilityButton capability="ai:history-extraction:flag" className="ps-conf-btn-secondary" disabled={flagged.has(f.fieldId)} onClick={() => { void flag(f.fieldId); }}>
                  {t(flagged.has(f.fieldId) ? 'historyExtraction.flagged' : 'historyExtraction.flagField')}
                </CapabilityButton>
              </li>
            ))}
          </ul>
          <CapabilityButton capability="ai:history-extraction:flag" className="ps-conf-btn-secondary" disabled={flagged.has('')} onClick={() => { void flag(null); }}>
            {t(flagged.has('') ? 'historyExtraction.flagged' : 'historyExtraction.flagAll')}
          </CapabilityButton>
        </>
      )}
      {x && x.status !== 'extracted' && <p className="ps-hx-note" role="status">{t(`historyExtraction.status.${x.status === 'failed' ? `failed.${x.failure ?? 'aiError'}` : x.status}`)}</p>}
      {refused && <p className="ps-hx-note" role="alert">{t('historyExtraction.refused')}</p>}
    </section>
  );
};
