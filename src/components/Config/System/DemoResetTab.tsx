// PathScribe — DemoResetTab
// Mock data reset for guest testing rounds: the Full Reset clears every
// tester's demo data and restores the seed (the demo baseline, Batch 455).
// Batch 455: the "My data only" reset was removed. It re-seeded every LIS
// case for everyone (not just one hospital) and left the cases' related
// records stale, so it couldn't be kept.
//
// The reset needs a confirmation step before executing. The reset logic
// lives in services/demoReset/demoReset.ts (Batch 370); the full reset needs
// the capability config:demo-data:reset.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { IS_MOCK_BACKEND, authorizationService } from '@/services/index';
import { resetAllDemoData } from '@/services/demoReset/demoReset';
import { CapabilityButton } from '@/components/Common/CapabilityButton';

// ─── Component ────────────────────────────────────────────────────────────────

type UIState = 'idle' | 'confirm-full' | 'done';

interface ResetResult { cleared: string[]; }

const DemoResetTab: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [uiState,    setUiState]    = useState<UIState>('idle');
  const [result,     setResult]     = useState<ResetResult | null>(null);
  const [countdown,  setCountdown]  = useState(3);

  // Countdown before redirect after reset
  useEffect(() => {
    if (uiState !== 'done') return;
    if (countdown <= 0) { window.location.href = '/worklist'; return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [uiState, countdown]);

  // PS-356: the full reset (everyone's data) needs config:demo-data:reset,
  // checked and audited by the service; a refusal returns to idle.
  const handleFullReset = async () => {
    const res = await resetAllDemoData({ authorization: authorizationService });
    if (res.ok === false) { setUiState('idle'); return; }
    setResult({ cleared: res.cleared });
    setUiState('done');
  };

  // ── Confirmation dialogs ──────────────────────────────────────────────────
  const ConfirmDialog = ({
    title, description, warning, onConfirm, onCancel, confirmLabel, confirmColor,
  }: {
    title: string; description: string; warning: string;
    onConfirm: () => void; onCancel: () => void;
    confirmLabel: string; confirmColor: string;
  }) => (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="ps-demoreset__confirm-box">
      <h4 id="confirm-dialog-title" className="ps-demoreset__confirm-title">{title}</h4>
      <p className="ps-demoreset__confirm-desc">
        {description}
      </p>
      <p className="ps-demoreset__confirm-warning">
        ⚠ {warning}
      </p>
      <div className="ps-sub-footer-actions">
        <button className="ps-conf-btn-secondary" onClick={onCancel}>{t('common.cancel')}</button>
        <button
          onClick={onConfirm}
          className={confirmColor === '#dc2626' ? 'ps-btn-danger-solid' : 'ps-btn-primary'}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );

  // ── Done state ────────────────────────────────────────────────────────────
  // ── Real, critical safety gate — per direct follow-up: "The system
  //    cannot ever delete/reset a customer's actual database
  //    entries." Takes precedence over every other UI state in this
  //    component, including an in-progress confirmation dialog — if
  //    this app is ever connected to a real, non-mock backend, no
  //    path through this component should ever reach a destructive
  //    action. See services/index.ts's own IS_MOCK_BACKEND doc
  //    comment for the full reasoning. ──
  if (!IS_MOCK_BACKEND) {
    return (
      <div className="ps-demoreset__page">
        <div className="ps-reset-disabled">
          <div className="ps-reset-disabled__title">⛔ {t('demoResetTab.disabled.title')}</div>
          <p className="ps-demoreset__subtitle">
            {t('demoResetTab.disabled.description')}
          </p>
        </div>
      </div>
    );
  }

  if (uiState === 'done' && result) {
    return (
      <div className="ps-demoreset__page">
        <div className="ps-reset-success">
          <div className="ps-reset-success__title">
            ✓ {t('demoResetTab.done.fullResetComplete')}
          </div>
          <p className="ps-demoreset__result-desc">
            {t('demoResetTab.done.summary', { count: result.cleared.length, countdown })}
          </p>
          <div className="ps-demoreset__cleared-list">
            {result.cleared.map(k => <div key={k}>✓ {k}</div>)}
          </div>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="ps-demoreset__page">

      <div className="ps-demoreset__section-header">
        <h2 className="ps-demoreset__title">{t('demoResetTab.title')}</h2>
        <p className="ps-demoreset__subtitle">
          {t('demoResetTab.subtitle')}
        </p>
      </div>

      {/* ── Full reset ── */}
      <div className="comp-reset-card comp-reset-card--full">
        <div className="ps-demoreset__card-row">
          <div>
            <div className="comp-reset-card-title">
              {t('demoResetTab.fullCard.title')}
            </div>
            <div className="comp-reset-card-desc">
              {t('demoResetTab.fullCard.description')}
            </div>
            <div className="comp-reset-card-warning">
              {t('demoResetTab.fullCard.warning')}
            </div>
          </div>
          <CapabilityButton
            capability="config:demo-data:reset"
            onClick={() => setUiState('confirm-full')}
            className="ps-demoreset__btn-danger-outline"
          >
            {t('demoResetTab.fullCard.resetBtn')}
          </CapabilityButton>
        </div>

        {uiState === 'confirm-full' && (
          <ConfirmDialog
            title={t('demoResetTab.fullCard.confirmTitle')}
            description={t('demoResetTab.fullCard.confirmDescription')}
            warning={t('demoResetTab.fullCard.confirmWarning')}
            confirmLabel={t('demoResetTab.fullCard.confirmBtn')}
            confirmColor="#dc2626"
            onConfirm={() => { void handleFullReset(); }}
            onCancel={() => setUiState('idle')}
          />
        )}
      </div>

      {/* ── Testing & Demo Tools — real, direct follow-up (Sep 2026):
          "Molecular Order Queue" used to be a flat top-level Home tile;
          per direct guidance ("seems like a Testing tool"), it's a
          real demo/simulation surface (see its own page header —
          simulates ordering and inbound HPV results against a fixed
          seed case, never a production ordering workflow with a real
          staff operator), so it moved here — same roof as this tab's
          own reset tools, rather than a Home tile aimed at every
          user. Same real /molecular-order-queue route underneath. ── */}
      <div className="ps-demoreset__extra-section">
        <div className="ps-demoreset__extra-section-heading">
          <h2 className="ps-demoreset__title">{t('demoResetTab.testingTools.title')}</h2>
          <p className="ps-demoreset__subtitle">
            {t('demoResetTab.testingTools.subtitle')}
          </p>
        </div>
        <div className="comp-reset-card">
          <div className="ps-demoreset__card-row">
            <div>
              <div className="comp-reset-card-title">{t('demoResetTab.testingTools.molecularOrderQueueTitle')}</div>
              <div className="comp-reset-card-desc">
                {t('demoResetTab.testingTools.molecularOrderQueueDescription')}
              </div>
            </div>
            <button
              className="ps-conf-btn-secondary ps-demoreset__btn--nowrap"
              onClick={() => navigate('/molecular-order-queue')}
            >
              🧬 {t('demoResetTab.testingTools.openBtn')}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DemoResetTab;
