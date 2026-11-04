// src/pages/SynopticReportPage/components/SmartCaptureLauncher.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 611 (queue entry #189): the Smart Capture drawer in the billing review.
// PROTOTYPE, NOT COMPLIANCE-REVIEWED, SIMULATED. It lists suggested charge
// lines with the rule and evidence behind each, a person accepts or rejects each
// one, a pathologist confirms, and only then can the approved lines be exported
// (to the simulated engine in the demo). The rules, states and refusals live in
// services/smartCapture; this component renders and dispatches.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CapabilityButton } from '@/components/Common/CapabilityButton';
import { LoadingState } from '@/components/Common/LoadingState';
import {
  smartCaptureService, smartCaptureSettingsService,
  type SmartCaptureView, type SmartCaptureLine, type SmartCapturePayload, type SmartCaptureEvidence,
} from '@/services';

const evidenceText = (t: (k: string, o?: Record<string, unknown>) => string, e: SmartCaptureEvidence) =>
  t(`smartCapture.evidence.${e.kind}`, { value: e.value });

const SmartCaptureLauncher: React.FC<{ caseId: string }> = ({ caseId }) => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<SmartCaptureView | null>(null);
  const [payload, setPayload] = useState<SmartCapturePayload | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void smartCaptureSettingsService.getSettings().then(r => { if (live && r.ok) setEnabled(r.data.prototypeEnabled); });
    return () => { live = false; };
  }, []);

  const showPreview = useCallback(async () => {
    const r = await smartCaptureService.preview(caseId);
    setPayload(r.ok ? r.data : null);
  }, [caseId]);

  const apply = useCallback(async (run: () => Promise<{ ok: true; data: SmartCaptureView } | { ok: false; error: string }>) => {
    setBusy(true);
    const r = await run();
    if (r.ok) { setView(r.data); setRefusal(null); await showPreview(); } else setRefusal(r.error);
    setBusy(false);
  }, [showPreview]);

  const openDrawer = async () => {
    setOpen(true);
    setConfirmed(false);
    await apply(() => smartCaptureService.suggest(caseId));
  };

  if (!enabled) return null;

  const record = view?.record ?? null;
  const locked = view?.state === 'approved' || view?.state === 'exported';
  const rowStateKey = (l: SmartCaptureLine) => (l.decision ? `smartCapture.decision.${l.decision}` : 'smartCapture.decision.undecided');

  return (
    <div className="ps-smart-capture" data-testid="smart-capture">
      <div className="ps-smart-capture-head">
        <button type="button" className="ps-conf-btn-secondary" data-testid="smart-capture-open" aria-expanded={open}
          onClick={() => { if (open) setOpen(false); else void openDrawer(); }}>
          ✦ {t('smartCapture.title')}
        </button>
        <span className="ps-simulated-badge" data-testid="smart-capture-badge">{t('smartCapture.prototypeLabel')}</span>
      </div>
      {open && (
        <div className="ps-smart-capture-body" role="region" aria-label={t('smartCapture.title')}>
          <p className="ps-conf-hint">{t('smartCapture.intro')}</p>
          {refusal && <div className="ps-smart-capture-refusal" role="alert" data-testid="smart-capture-refusal">{t(`smartCapture.refusal.${refusal}`)}</div>}
          {!view && <LoadingState label={t('smartCapture.loading')} />}
          {view?.cptOff && <p className="ps-conf-hint" data-testid="smart-capture-cpt-off">{t('smartCapture.cptOff')}</p>}
          {view?.stale && <p className="ps-conf-hint" data-testid="smart-capture-stale">{t('smartCapture.stale')}</p>}
          {record && record.lines.length === 0 && <p className="ps-conf-hint">{t('smartCapture.nothingSuggested')}</p>}
          {record && record.lines.length > 0 && (
            <>
              <p className="ps-conf-identity-sub" data-testid="smart-capture-state">
                {t('smartCapture.stateLine', { state: t(`smartCapture.state.${view?.state ?? 'none'}`), version: record.ruleVersion })}
              </p>
              <ul className="ps-smart-capture-lines">
                {record.lines.map(l => (
                  <li key={l.key} className="ps-smart-capture-line" data-testid={`smart-capture-line-${l.key}`}>
                    <div>
                      <strong>{l.cpt}</strong> {t(`smartCapture.cpt.c${l.cpt}`)} × {l.units}
                      <div className="ps-conf-hint">{t('smartCapture.lineMeta', { specimen: l.specimenLabel, rule: l.ruleId })}</div>
                      <div className="ps-conf-hint">{l.evidence.map(e => evidenceText(t, e)).join(' · ')}</div>
                    </div>
                    <div className="ps-smart-capture-actions">
                      <span className="ps-conf-badge">{t(rowStateKey(l))}</span>
                      {!locked && (
                        <>
                          <CapabilityButton capability="billing:smart-capture:review" className="ps-conf-btn-row" disabled={busy}
                            onClick={() => { void apply(() => smartCaptureService.review(caseId, l.key, 'accepted')); }}>{t('smartCapture.accept')}</CapabilityButton>
                          <CapabilityButton capability="billing:smart-capture:review" className="ps-conf-btn-row" disabled={busy}
                            onClick={() => { void apply(() => smartCaptureService.review(caseId, l.key, 'rejected')); }}>{t('smartCapture.reject')}</CapabilityButton>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {!locked && (
                <label className="ps-conf-toggle-label-row">
                  <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} data-testid="smart-capture-confirm" />
                  <span>{t('smartCapture.confirmStatement')}</span>
                </label>
              )}
              <div className="ps-smart-capture-actions">
                {!locked && (
                  <CapabilityButton capability="billing:smart-capture:approve" className="ps-conf-btn-primary" disabled={busy}
                    onClick={() => { void apply(() => smartCaptureService.approve(caseId, { confirmed })); }}>{t('smartCapture.approve')}</CapabilityButton>
                )}
                {view?.state === 'approved' && (
                  <CapabilityButton capability="billing:smart-capture:send" className="ps-conf-btn-primary" disabled={busy}
                    onClick={() => { void apply(() => smartCaptureService.exportLines(caseId)); }}>{t('smartCapture.export')}</CapabilityButton>
                )}
                {locked && (
                  <CapabilityButton capability="billing:smart-capture:review" className="ps-conf-btn-secondary" disabled={busy}
                    onClick={() => { setConfirmed(false); void apply(() => smartCaptureService.restart(caseId)); }}>{t('smartCapture.restart')}</CapabilityButton>
                )}
              </div>
              {view?.state === 'exported' && <p className="ps-conf-hint" data-testid="smart-capture-exported">{record.exportSimulated ? t('smartCapture.exportedSimulated') : t('smartCapture.exported')}</p>}
              {payload && (
                <details className="ps-smart-capture-payload" open>
                  <summary>{t('smartCapture.payloadTitle')}</summary>
                  <pre data-phi="accession" data-testid="smart-capture-payload">{JSON.stringify(payload, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartCaptureLauncher;
