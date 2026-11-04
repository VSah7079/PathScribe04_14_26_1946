// src/components/Common/ConvertToPointsPanel.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 612: "Convert to points" for a set of report styles (the lab's, or one
// template's). Pressing the button lists each size that would change and what it
// becomes; "Convert" applies it. Nothing converts without that second press.
// Shown only while something is still in pixels. The plan, the conversion and
// the audit are in services/reportAppearance/ (fontUnits.ts, convertToPoints.ts);
// this only shows them. The list is inline, not a window to dismiss.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PointsConversionPlan, StyleCategory } from '../../services/reportAppearance/fontUnits';

interface Props {
  plan: PointsConversionPlan;
  /** True while a template or the lab still has something in pixels (otherwise nothing is shown). */
  needed: boolean;
  categoryLabel: (category: StyleCategory) => string;
  /** Applies the conversion. Resolves to an error message key, or null when it worked. */
  onConvert: () => Promise<string | null>;
}

export const ConvertToPointsPanel: React.FC<Props> = ({ plan, needed, categoryLabel, onConvert }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <div className="ps-fontunits__done" role="status">{t('fontUnits.converted')}</div>;
  if (!needed) return null;

  const confirm = async () => {
    setBusy(true);
    const error = await onConvert();
    setBusy(false);
    if (error) { setErrorKey(error); return; }
    setErrorKey(null);
    setOpen(false);
    setDone(true);
  };

  if (!open) {
    return (
      <button type="button" className="ps-fontunits__convert" onClick={() => setOpen(true)}>
        {t('fontUnits.convertButton')}
      </button>
    );
  }

  return (
    <div className="ps-fontunits__panel" role="group" aria-label={t('fontUnits.convertTitle')}>
      <div className="ps-fontunits__title">{t('fontUnits.convertTitle')}</div>
      <p className="ps-fontunits__intro">{t('fontUnits.convertIntro')}</p>
      {plan.changes.length === 0
        ? <p className="ps-fontunits__intro">{t('fontUnits.noSizes')}</p>
        : (
          <ul className="ps-fontunits__list">
            {plan.changes.map(c => (
              <li key={c.category}>
                {t(c.raisedToFloor ? 'fontUnits.changeLineFloor' : 'fontUnits.changeLine', {
                  category: categoryLabel(c.category), from: c.fromSize, fromPoints: c.fromPoints, to: c.toSize,
                })}
              </li>
            ))}
          </ul>
        )}
      {errorKey && <div className="ps-fontunits__error" role="alert">{t(errorKey)}</div>}
      <div className="ps-fontunits__actions">
        <button type="button" className="ps-fontunits__convert" disabled={busy} onClick={() => { void confirm(); }}>{t('fontUnits.confirm')}</button>
        <button type="button" className="ps-fontunits__cancel" disabled={busy} onClick={() => { setOpen(false); setErrorKey(null); }}>{t('fontUnits.cancel')}</button>
      </div>
    </div>
  );
};
