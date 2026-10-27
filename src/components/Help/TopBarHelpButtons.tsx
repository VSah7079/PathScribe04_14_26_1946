// src/components/Help/TopBarHelpButtons.tsx
// ─────────────────────────────────────────────────────────
// Batch 668: the Help buttons, in the top bar beside the microphone (they used to float over the screen's data).
// "?" opens the User Guide page for the screen; the book opens the Administrator Guide section on the screens that
// have one. Both open in a window that remembers its place, or a new tab if the browser refuses (useGuideWindow).
// Which pages open is decided in services/help/helpTargets.ts. The View Help action (F1) sends OPEN_USER_GUIDE_EVENT.
// ─────────────────────────────────────────────────────────
import './topBarHelp.css';
import React, { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { OPEN_USER_GUIDE_EVENT, resolveHelpTargets } from '@/services/help/helpTargets';
import { adminGuideUrl } from '@/services/help/adminGuideLinks';
import { usePublishedHelpAnchor } from '@/hooks/usePublishHelpAnchor';
import { useGuideWindow } from '@/hooks/useGuideWindow';

const TopBarHelpButtons: React.FC = () => {
  const { pathname, search } = useLocation();
  const { t, i18n } = useTranslation();
  const resolved = resolveHelpTargets(pathname, search, import.meta.env.BASE_URL, i18n?.language);
  // A screen that knows its own open section (Configuration) publishes it; otherwise the address decides.
  const published = usePublishedHelpAnchor();
  const adminAnchor = published ?? resolved.adminAnchor;
  const targets = { ...resolved, adminAnchor, adminUrl: adminAnchor ? adminGuideUrl(adminAnchor, import.meta.env.BASE_URL, i18n?.language) : null };
  const user = useGuideWindow('user');
  const admin = useGuideWindow('admin');

  const { open: openUser } = user;
  const { userUrl } = targets;
  useEffect(() => {
    const onHelpKey = () => openUser(userUrl);
    window.addEventListener(OPEN_USER_GUIDE_EVENT, onHelpKey);
    return () => window.removeEventListener(OPEN_USER_GUIDE_EVENT, onHelpKey);
  }, [openUser, userUrl]);

  return (
    <>
      <a className="ps-nav-btn ps-nav-help-btn" href={targets.userUrl} target="_blank" rel="noopener noreferrer"
         onClick={user.onLinkClick(targets.userUrl)} aria-label={t('userGuide.helpButton.title')} title={t('userGuide.helpButton.title')}
         data-guide-slug={targets.userSlug ?? 'contents'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </a>
      {targets.adminUrl && (
        <a className="ps-nav-btn ps-nav-help-btn" href={targets.adminUrl} target="_blank" rel="noopener noreferrer"
           onClick={admin.onLinkClick(targets.adminUrl)} aria-label={t('adminGuide.helpButton.title')} title={t('adminGuide.helpButton.title')}
           data-guide-anchor={targets.adminAnchor ?? undefined}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </a>
      )}
    </>
  );
};

export default TopBarHelpButtons;
