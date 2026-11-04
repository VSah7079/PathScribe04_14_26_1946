// src/pages/SynopticReportPage/components/CasePresenceStrip.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 573 (Pete, Oct 14, 2026): who else has this case report open, in the
// tab bar's row beside the tabs (seen on every tab; Batch 577 moved it there
// from a line of its own, so it never moves the page): their name, whether they are editing (have
// unsaved changes) or viewing, and their work email and phone when the lab
// has them, so they can be reached before two saves collide. The same person
// in another window shows as "You, in another window". Nothing to click or
// dismiss (click economy); with nobody else there it takes no space. One
// polite live region announces the latest change; the list itself is not
// re-read. From hooks/useCasePresence.ts.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CasePresence } from '@/hooks/useCasePresence';

interface Props {
  presence: CasePresence;
}

export const CasePresenceStrip: React.FC<Props> = ({ presence }) => {
  const { t } = useTranslation();
  const { others, change } = presence;
  const announce = change
    ? t(`synopticReportPage.presence.announce.${change.kind}${change.self ? 'Self' : ''}`, { name: change.name })
    : '';
  // Emptied first and filled a moment later, so the same words twice in a row ("Dr Lee is editing",
  // after a save and a new edit) are read again; the region itself stays in place.
  const [spoken, setSpoken] = useState('');
  useEffect(() => {
    setSpoken('');
    if (!announce) return;
    const timer = setTimeout(() => setSpoken(announce), 150);
    return () => clearTimeout(timer);
  }, [change?.seq, announce]);
  return (
    <div className={others.length ? 'ps-case-presence' : 'ps-case-presence-empty'}>
      <span className="ps-sr-only" role="status" aria-live="polite">{spoken}</span>
      {others.length > 0 && (
        <>
          <span className="ps-case-presence-label" id="ps-case-presence-label">{t('synopticReportPage.presence.label')}</span>
          <ul className="ps-case-presence-list" aria-labelledby="ps-case-presence-label">
            {others.map(v => {
              const name = v.self ? t('synopticReportPage.presence.youElsewhere') : v.name;
              return (
                <li key={v.presenceId} className={v.editing ? 'ps-case-presence-chip ps-case-presence-chip--editing' : 'ps-case-presence-chip'}>
                  <span className="ps-case-presence-name">{name}</span>
                  <span className="ps-case-presence-state">{t(v.editing ? 'synopticReportPage.presence.editing' : 'synopticReportPage.presence.viewing')}</span>
                  {!v.self && v.email && (
                    <a className="ps-case-presence-contact" href={`mailto:${encodeURIComponent(v.email)}`} aria-label={t('synopticReportPage.presence.emailAria', { name: v.name })}>
                      {t('synopticReportPage.presence.email')}
                    </a>
                  )}
                  {!v.self && v.phone && (
                    <a className="ps-case-presence-contact" href={`tel:${encodeURIComponent(v.phone)}`} aria-label={t('synopticReportPage.presence.callAria', { name: v.name, phone: v.phone })}>
                      {t('synopticReportPage.presence.call', { phone: v.phone })}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};
