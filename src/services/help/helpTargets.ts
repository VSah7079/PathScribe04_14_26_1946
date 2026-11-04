// src/services/help/helpTargets.ts
// ─────────────────────────────────────────────────────────
// Batch 668 (Pete, Oct 24, 2026: the floating Help buttons sat over data; they now live in the top bar beside the
// microphone). Decides which guide pages the Help buttons open for the screen a person is on: the User Guide article
// (userGuideLinks.ts) and, on screens that also have a section in the Administrator Guide (adminGuideLinks.ts), that
// section. Pure, so the top bar only renders what this returns.
// ─────────────────────────────────────────────────────────
import { adminGuideAnchorForRoute, adminGuideUrl } from './adminGuideLinks';
import { userGuideSlugForRoute, userGuideUrl } from './userGuideLinks';

export interface HelpTargets {
  /** The User Guide article for the screen, or null when none covers it (no button is shown then). */
  userSlug: string | null;
  /** The article's address, or the guide's contents page when no article covers the screen (the F1 key still opens something). */
  userUrl: string;
  /** The Administrator Guide anchor for the screen, or null when it has no section of its own. */
  adminAnchor: string | null;
  adminUrl: string | null;
}

export function resolveHelpTargets(pathname: string, search: string, baseUrl: string, language?: string): HelpTargets {
  const userSlug = userGuideSlugForRoute(pathname);
  const adminAnchor = adminGuideAnchorForRoute(pathname, search);
  return {
    userSlug,
    userUrl: userGuideUrl(userSlug, baseUrl),
    adminAnchor,
    adminUrl: adminAnchor ? adminGuideUrl(adminAnchor, baseUrl, language) : null,
  };
}

/** A click that should open the guide in the remembered window: a plain left click. Ctrl, Cmd, Shift and middle clicks keep the browser's own link behaviour. */
export function isPlainLeftClick(e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button: number }): boolean {
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0);
}

/** The window event the View Help action (F1) sends; the top bar's Help button opens the User Guide when it hears it. */
export const OPEN_USER_GUIDE_EVENT = 'PATHSCRIBE_OPEN_USER_GUIDE';
