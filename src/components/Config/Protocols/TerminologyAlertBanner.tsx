/**
 * components/Config/Protocols/TerminologyAlertBanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders SNOMED CT / ICD deprecation alerts inline in SynopticEditor.
 * Also exports TerminologyAlertBadge for compact use in protocol cards.
 *
 * Drop-in path: src/components/Config/Protocols/TerminologyAlertBanner.tsx
 *
 * i18n note: `alert.system`/`alert.code`/`alert.fieldLabel`/
 * `alert.optionLabel`/`r.code`/`r.display` are real SNOMED CT/ICD
 * terminology data and real protocol field/option labels — never
 * translated. `alert.message` is a diagnostic string produced by
 * validateTerminologyCodes() (templateService.ts) — persisted
 * validation-service output, same "stays literal" rule as other
 * backend diagnostic text in this codebase.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../../../pathscribe.css';
import { TerminologyAlert } from '../../../hooks/useTerminologyAlerts';
import { clickableContainer } from '@/utils/a11y/pressable';

function alertStyles(severity: 'error' | 'warning') {
  return severity === 'error'
    ? { icon: '🚫' }
    : { icon: '⚠️' };
}

// ─── Individual alert row ─────────────────────────────────────────────────────

const AlertRow: React.FC<{
  alert:   TerminologyAlert;
  onDismiss: (id: string) => void;
}> = ({ alert, onDismiss }) => {
  const { t } = useTranslation();
  const s = alertStyles(alert.severity);
  return (
    <div className={`ps-termalert-row ps-termalert--${alert.severity}`}>
      <span className="ps-termalert-row-icon">{s.icon}</span>
      <div className="ps-termalert-row-content">
        <div className="ps-termalert-row-title">
          {alert.system.toUpperCase()} {alert.code}
          {alert.fieldLabel && (
            <span className="ps-termalert-row-field">
              {/* Batch 568: the punctuation is in the message, so each language sets its own. */}
              {alert.optionLabel
                ? t('terminologyAlertBanner.fieldOptionRef', { field: alert.fieldLabel, option: alert.optionLabel })
                : t('terminologyAlertBanner.fieldRef', { field: alert.fieldLabel })}
            </span>
          )}
        </div>
        <div className="ps-termalert-row-message">
          {alert.message}
        </div>
        {alert.replacements && alert.replacements.length > 0 && (
          <div className="ps-termalert-replacements">
            <span className="ps-termalert-replacements-label">
              {t('terminologyAlertBanner.suggestedReplacements', { count: alert.replacements.length })}
            </span>
            {alert.replacements.map(r => (
              <span key={r.code} className="ps-termalert-replacement-chip">
                {r.code} — {r.display}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        title={t('terminologyAlertBanner.dismissTooltip')}
        className="ps-termalert-dismiss-btn"
      >
        ✕
      </button>
    </div>
  );
};

// ─── Full banner (for SynopticEditor) ─────────────────────────────────────────

export const TerminologyAlertBanner: React.FC<{
  alerts:    TerminologyAlert[];
  isLoading: boolean;
  onDismiss: (id: string) => void;
  onRevalidate: () => void;
}> = ({ alerts, isLoading, onDismiss, onRevalidate }) => {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="ps-termalert-loading">
        <span className="ps-termalert-loading-icon">🔍</span>
        {t('terminologyAlertBanner.validating')}
      </div>
    );
  }

  if (alerts.length === 0) return null;

  const errorCount   = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const hasErrors    = errorCount > 0;

  return (
    <div className={`ps-termalert-banner ps-termalert--${hasErrors ? 'error' : 'warning'}`}>
      {/* Header */}
      {/* Batch 568 (axe nested-interactive): the header holds a button (Re-check), so it isn't a button itself;
          clicking it still shows or hides the list, and the title is the button that does so (aria-expanded). */}
      <div
        {...clickableContainer(() => setCollapsed(c => !c))}
        className="ps-termalert-header"
      >
        <span className="ps-termalert-header-icon">{hasErrors ? '🚫' : '⚠️'}</span>
        <div className="ps-termalert-header-text">
          <button type="button" className="ps-row-open-btn ps-termalert-header-title" aria-expanded={!collapsed}
            onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}>
            {t('terminologyAlertBanner.title')}
          </button>
          <span className="ps-termalert-header-count">
            {errorCount > 0 && warningCount > 0
              ? t('terminologyAlertBanner.countsBoth', { errors: t('terminologyAlertBanner.deprecatedCodeCount', { count: errorCount }), warnings: t('terminologyAlertBanner.warningCount', { count: warningCount }) })
              : errorCount > 0 ? t('terminologyAlertBanner.deprecatedCodeCount', { count: errorCount })
              : warningCount > 0 ? t('terminologyAlertBanner.warningCount', { count: warningCount }) : null}
          </span>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRevalidate(); }}
          className="ps-termalert-recheck-btn"
        >
          ↻ {t('terminologyAlertBanner.recheckButton')}
        </button>
        <span aria-hidden="true" className={`ps-termalert-chevron${collapsed ? ' ps-termalert-chevron--collapsed' : ''}`}>▾</span>
      </div>

      {/* Alert list */}
      {!collapsed && (
        <div className="ps-termalert-list">
          {alerts.map(alert => (
            <AlertRow key={alert.id} alert={alert} onDismiss={onDismiss} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Compact badge (for protocol cards in AllProtocolsSection) ────────────────

export const TerminologyAlertBadge: React.FC<{
  errorCount:   number;
  warningCount: number;
}> = ({ errorCount, warningCount }) => {
  const { t } = useTranslation();
  if (errorCount === 0 && warningCount === 0) return null;
  const hasErrors = errorCount > 0;
  const s = alertStyles(hasErrors ? 'error' : 'warning');
  const label = hasErrors
    ? t('terminologyAlertBanner.deprecatedCodeCount', { count: errorCount })
    : t('terminologyAlertBanner.terminologyWarningCount', { count: warningCount });

  return (
    <span className={`ps-termalert-badge ps-termalert--${hasErrors ? 'error' : 'warning'}`}>
      {s.icon} {label}
    </span>
  );
};
