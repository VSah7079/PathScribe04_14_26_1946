// src/pages/WindowPositionPage/WindowPositionPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 750 (Pete, Oct 31, 2026, S10 item 5: "Move this window, then Save position"). Opened from the workstation menu
// (NavBarScanStation) in the window it sets up (for now the slide image window), at /window-position?window=<name>.
// The person drags and sizes it where that window should open on this workstation, then selects Save position; the
// position is kept with the workstation's settings (useCompanionWindow.saveCompanionGeometry). Holds no patient data and
// does nothing else, so it needs no sign-in (a new window does not always share the sign-in of the one that opened it).
// Unknown window names are refused (services/windowPlacement/windowPlacement.ts WINDOW_POSITION_TARGETS).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { requestScreenPlacement, saveCompanionGeometry } from '@/hooks/useCompanionWindow';
import { WINDOW_POSITION_TARGETS, isWindowPositionTarget } from '@/services/windowPlacement/windowPlacement';
import './WindowPositionPage.css';

const WindowPositionPage: React.FC = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const name = params.get('window');
  const [result, setResult] = useState<'saved' | 'failed' | null>(null);

  if (!isWindowPositionTarget(name)) {
    return <main className="ps-winpos"><p className="ps-winpos__text" role="alert">{t('windowPosition.unknownWindow')}</p></main>;
  }

  const save = () => {
    requestScreenPlacement(); // in the click: Chrome and Edge may ask once to manage windows on all displays
    const done = saveCompanionGeometry(name, { left: window.screenX, top: window.screenY, width: window.outerWidth, height: window.outerHeight });
    setResult(done ? 'saved' : 'failed');
  };

  return (
    <main className="ps-winpos">
      <h1 className="ps-winpos__title">{t(`windowPosition.windows.${WINDOW_POSITION_TARGETS[name]}`)}</h1>
      <p className="ps-winpos__text">{t('windowPosition.instructions')}</p>
      <p className="ps-winpos__hint">{t('windowPosition.screensHint')}</p>
      <div className="ps-winpos__actions">
        <button type="button" className="ps-conf-btn-primary" onClick={save}>{t('windowPosition.save')}</button>
        <button type="button" className="ps-conf-btn-secondary" onClick={() => window.close()}>{t('windowPosition.close')}</button>
      </div>
      {result && <p className={`ps-winpos__result${result === 'failed' ? ' ps-winpos__result--failed' : ''}`} role="status">{t(`windowPosition.${result}`)}</p>}
    </main>
  );
};

export default WindowPositionPage;
