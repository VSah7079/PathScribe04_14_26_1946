// src/components/Config/help/AdminGuideHelpButton.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Batch 646: the Help button. Opens the Administrator Guide at the section for
// the screen it sits on, in a window that remembers its place (a new tab if the
// browser refuses; Batch 668), so unsaved edits are not lost and nobody has to search. Where the link goes is decided in services/help/adminGuideLinks.ts.
// ─────────────────────────────────────────────────────────────────────────────
import './adminGuideHelp.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminGuideAnchorFor, adminGuideAnchorForScreen, adminGuideUrl, type ConfigHelpTarget,
} from '@/services/help/adminGuideLinks';
import { useGuideWindow } from '@/hooks/useGuideWindow';

interface Props {
  /** A Configuration tab (and its open section). */
  target?: ConfigHelpTarget;
  /** A screen outside Configuration, by name (`facility-dictionary`). */
  screen?: string;
  /** Sits in the page's own header (below the description) instead of the Configuration page's top-right corner. */
  inline?: boolean;
}

const AdminGuideHelpButton: React.FC<Props> = ({ target, screen, inline }) => {
  const { t, i18n } = useTranslation();
  const guide = useGuideWindow('admin');
  const anchor = target ? adminGuideAnchorFor(target) : screen ? adminGuideAnchorForScreen(screen) : null;
  if (!anchor) return null;
  const href = adminGuideUrl(anchor, import.meta.env.BASE_URL, i18n?.language);
  return (
    <a
      className={`ps-help-btn${inline ? ' ps-help-btn--inline' : ''}`}
      href={href}
      onClick={guide.onLinkClick(href)}
      target="_blank"
      rel="noopener noreferrer"
      title={t('adminGuide.helpButton.title')}
      data-guide-anchor={anchor}
    >
      <span className="ps-help-btn-mark" aria-hidden="true">?</span>
      {t('adminGuide.helpButton.label')}
    </a>
  );
};

export default AdminGuideHelpButton;
