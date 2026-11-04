// src/components/Config/System/HistoryExtractionSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 621: Configuration > System > AI history extraction. Whether the AI reads a historical report's Final Diagnosis and
// Microscopic text and keeps the synoptic fields it finds beside the case, for the pathologist to look at. OFF unless turned on
// for the enterprise; a performing facility may have its own setting. Advisory only: what it finds is never used by reports,
// printing, registries, billing, rules or exports. Logic: services/historyExtraction. Contract: docs/architecture/HISTORY_AI_EXTRACTION_API.md
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import './DeliverySchedulesSection.css';

import { historyExtractionService, historyExtractionSettingsService, facilityService } from '@/services';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import type { Facility } from '../../../services/facilities/IFacilityService';
import { resolveHistoryExtraction, type HistoryExtractionAccuracy, type HistoryExtractionSetting } from '../../../services/historyExtraction/historyExtraction';

export const HISTORY_EXTRACTION_CAPABILITY = 'config:history-extraction:manage' as const;

const HistoryExtractionSection: React.FC = () => {
  const { t } = useTranslation();
  const [stored, setStored] = useState<HistoryExtractionSetting[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [accuracy, setAccuracy] = useState<HistoryExtractionAccuracy | null>(null);
  const [scopeId, setScopeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'saved' | 'refused' | null>(null);

  const load = useCallback(async () => {
    const [s, f, a] = await Promise.all([historyExtractionSettingsService.getAll(), facilityService.getAll(), historyExtractionService.getAccuracy()]);
    if (s.ok) setStored(s.data);
    if (f.ok) setFacilities((f.data as Facility[]).filter(x => x.status === 'Active'));
    if (a.ok) setAccuracy(a.data);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const scope = scopeId || null;
  const own = stored.find(s => s.facilityId === scope);
  const shown = resolveHistoryExtraction(stored, scope);
  const setEnabled = async (enabled: boolean) => {
    const r = await historyExtractionSettingsService.set({ facilityId: scope, enabled });
    setStatus(r.ok ? 'saved' : 'refused');
    await load();
  };
  const remove = async () => {
    if (!scopeId) return;
    const r = await historyExtractionSettingsService.remove(scopeId);
    setStatus(r.ok ? 'saved' : 'refused');
    await load();
  };

  if (loading) return <LoadingState label={t('historyExtractionSection.loading')} />;
  return (
    <div className="ps-dsch-root">
      <div>
        <h2 className="tmpl-list-title">{t('historyExtractionSection.title')}</h2>
        <p className="tmpl-list-subtitle">{t('historyExtractionSection.subtitle')}</p>
      </div>
      <div className="ps-dsch-scope">
        <label className="ps-conf-label" htmlFor="hx-scope">{t('historyExtractionSection.scope.label')}</label>
        <select id="hx-scope" className="ps-conf-select" value={scopeId} onChange={e => { setScopeId(e.target.value); setStatus(null); }}>
          <option value="">{t('historyExtractionSection.scope.enterprise')}</option>
          {facilities.map(f => <option key={f.id as string} value={f.id as string}>{f.name}</option>)}
        </select>
      </div>
      {scopeId && !own && <p className="ps-conf-hint">{t('historyExtractionSection.followsEnterprise')}</p>}
      <div className="ps-dsch-card" data-enabled={shown.enabled ? 'on' : 'off'}>
        <div>
          <div className="ps-dsch-feed">{t(shown.enabled ? 'historyExtractionSection.state.on' : 'historyExtractionSection.state.off')}</div>
          <div className="ps-dsch-summary">{t('historyExtractionSection.advisory')}</div>
          <span className={`ps-dsch-source ps-dsch-source--${shown.source === 'facility' ? 'facility' : 'enterprise'}`}>{t(`historyExtractionSection.source.${shown.source}`)}</span>
        </div>
        <div className="ps-dsch-actions">
          <CapabilityButton capability={HISTORY_EXTRACTION_CAPABILITY} className="ps-conf-btn-primary" onClick={() => { void setEnabled(!shown.enabled); }}>
            {t(shown.enabled ? 'historyExtractionSection.turnOff' : 'historyExtractionSection.turnOn')}
          </CapabilityButton>
          {scopeId && own && (
            <CapabilityButton capability={HISTORY_EXTRACTION_CAPABILITY} className="ps-conf-btn-secondary" onClick={() => { void remove(); }}>{t('historyExtractionSection.removeButton')}</CapabilityButton>
          )}
        </div>
      </div>
      {status && <p className="ps-conf-hint" role="status">{t(`historyExtractionSection.${status}`)}</p>}
      {accuracy && (
        <div className="ps-dsch-card" data-testid="hx-accuracy">
          <div>
            <div className="ps-dsch-feed">{t('historyExtractionSection.accuracy.title')}</div>
            <div className="ps-dsch-summary">
              {t('historyExtractionSection.accuracy.summary', { extractions: accuracy.extractions, fields: accuracy.fieldsExtracted, flagged: accuracy.flagged })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryExtractionSection;
