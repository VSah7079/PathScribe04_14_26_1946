// src/components/Common/DisplayTokenPrompt.tsx
// Batch 603: shared by the two wall displays. Asks for the Display Token an
// administrator issued (Configuration), checks it with the device-binding
// registry, and hands it back only when valid. Also the blank screen shown
// when a bound display's token is revoked or has expired.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { displayAccessService } from '@/services';
import type { DisplayBindingStatus, DisplayKind } from '@/services/displayAccess/displayToken';

export interface DisplayTokenClasses {
  page: string; content: string; description: string; input: string; error: string; actions: string; secondary: string; primary: string;
}

export const DisplayTokenPrompt: React.FC<{
  kind: DisplayKind;
  subjectId: string;
  displayName: string;
  classes: DisplayTokenClasses;
  onAccepted: (token: string) => void;
  onBack?: () => void;
  /** Why the prompt is showing again (shown above the field). */
  reason?: DisplayBindingStatus;
}> = ({ kind, subjectId, displayName, classes, onAccepted, onBack, reason }) => {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [failure, setFailure] = useState<DisplayBindingStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const status = await displayAccessService.verify(kind, subjectId, token);
    setBusy(false);
    if (status === 'valid') onAccepted(token.trim());
    else setFailure(status);
  };

  const shown = failure ?? reason;
  return (
    <div className={classes.page} data-testid="display-token-prompt">
      <div className={classes.content}>
        <h1>{t('displayAccess.promptTitle')}</h1>
        <p className={classes.description}>{t('displayAccess.promptDescription', { name: displayName })}</p>
        {shown && shown !== 'valid' && <p className={classes.error} role="alert">{t(`displayAccess.status.${shown}`)}</p>}
        <input
          className={classes.input} type="password" autoComplete="off" autoFocus value={token}
          aria-label={t('displayAccess.tokenLabel')} placeholder={t('displayAccess.tokenPlaceholder')}
          onChange={e => { setToken(e.target.value); setFailure(null); }}
        />
        <div className={classes.actions}>
          {onBack && <button className={classes.secondary} onClick={onBack}>{t('common.back')}</button>}
          <button className={classes.primary} onClick={submit} disabled={!token.trim() || busy}>{t('common.confirm')}</button>
        </div>
      </div>
    </div>
  );
};

/** Nothing about the facility or any patient is drawn while a display is refused. */
export const DisplayBlank: React.FC<{ classes: Pick<DisplayTokenClasses, 'page' | 'content' | 'description'>; status: DisplayBindingStatus; onReprovision: () => void; actionClass: string }> = ({ classes, status, onReprovision, actionClass }) => {
  const { t } = useTranslation();
  return (
    <div className={classes.page} data-testid="display-blank">
      <div className={classes.content}>
        <h1>{t('displayAccess.blankTitle')}</h1>
        <p className={classes.description}>{t(`displayAccess.status.${status}`)}</p>
        <button className={actionClass} onClick={onReprovision}>{t('displayAccess.enterNewToken')}</button>
      </div>
    </div>
  );
};
