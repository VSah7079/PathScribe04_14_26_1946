// src/components/Config/System/SmartCaptureSection.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture administration.
//   • Prototype switch : whether the labelled drawer is offered in the billing review.
//   • Production gate  : the checklist that must be ticked (validation, security,
//                        privacy, legal, claims, receiver) before an export can
//                        go to a real interface engine. Ticking records that the
//                        reviews were done elsewhere; it does not make the
//                        prototype compliant. Unticking any item closes the gate.
// Every change needs config:smart-capture:manage (checked in the service).
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/components/Common/LoadingState';
import { formatDateTime } from '@/utils/formatDate';
import {
  smartCaptureSettingsService, smartCaptureChecklistComplete, SMART_CAPTURE_CHECKLIST_IDS, type SmartCaptureSettings,
} from '@/services';

const SmartCaptureSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<SmartCaptureSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await smartCaptureSettingsService.getSettings();
    if (r.ok) setSettings(r.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const run = async (op: () => Promise<{ ok: true; data: SmartCaptureSettings } | { ok: false; error: string }>) => {
    const r = await op();
    if (r.ok) { setSettings(r.data); setError(null); } else setError(r.error);
  };

  if (!settings) return <LoadingState label={t('smartCapture.admin.loading')} />;
  const complete = smartCaptureChecklistComplete(settings);

  return (
    <div className="ps-conf-section" data-testid="smart-capture-section">
      <div className="ps-conf-section-header">
        <div>
          <h3 className="ps-conf-section-title">{t('smartCapture.admin.title')}</h3>
          <p className="ps-conf-section-subtitle">{t('smartCapture.admin.subtitle')}</p>
        </div>
      </div>
      <p className="ps-conf-identity-sub"><span className="ps-simulated-badge">{t('smartCapture.prototypeLabel')}</span> {t('smartCapture.admin.note')}</p>
      {error && <div className="ps-smart-capture-refusal" role="alert" data-testid="smart-capture-admin-error">{t(`smartCapture.refusal.${error}`)}</div>}

      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" data-testid="smart-capture-prototype" checked={settings.prototypeEnabled}
          onChange={e => { void run(() => smartCaptureSettingsService.setPrototypeEnabled(e.target.checked)); }} />
        <span>{t('smartCapture.admin.prototypeToggle')}</span>
      </label>

      <h4>{t('smartCapture.admin.checklistTitle')}</h4>
      <p className="ps-conf-hint">{t('smartCapture.admin.checklistHint')}</p>
      <ul className="ps-smart-capture-checklist">
        {SMART_CAPTURE_CHECKLIST_IDS.map(id => {
          const tick = settings.checklist[id];
          return (
            <li key={id}>
              <label className="ps-conf-toggle-label-row">
                <input type="checkbox" data-testid={`smart-capture-tick-${id}`} checked={!!tick}
                  onChange={e => { void run(() => smartCaptureSettingsService.setChecklistItem(id, e.target.checked)); }} />
                <span>{t(`smartCapture.admin.items.${id}`)}</span>
              </label>
              {tick && <span className="ps-conf-hint">{t('smartCapture.admin.tickedBy', { name: tick.by, when: formatDateTime(tick.at, i18n.language) })}</span>}
            </li>
          );
        })}
      </ul>

      <label className="ps-conf-toggle-label-row">
        <input type="checkbox" data-testid="smart-capture-production" checked={settings.productionActivated} disabled={!complete && !settings.productionActivated}
          onChange={e => { void run(() => smartCaptureSettingsService.setProductionActivated(e.target.checked)); }} />
        <span>{t('smartCapture.admin.productionToggle')}</span>
      </label>
      <p className="ps-conf-hint">{complete ? t('smartCapture.admin.gateReady') : t('smartCapture.admin.gateClosed')}</p>
    </div>
  );
};

export default SmartCaptureSection;
