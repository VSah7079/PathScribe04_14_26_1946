// src/services/help/adminGuideLinks.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 646 (Pete, Oct 21, 2026: "If I'm in a maintenance screen and I select a
// help button I go to that specific page in the document so I don't have to
// search"): where the Help button on a Configuration screen goes in the
// Administrator Guide.
//
// The guide (docs/admin-guide/, published to public/help/admin-guide/) gives every
// screen one anchor id, `screen-<name>`, and a small redirect page, go.html, that
// opens the right chapter page at that id. This file is the one place that turns
// "which tab and section is open" into that id, so a new screen is linked by
// documenting it under the id this returns (adminGuideAnchors.guard.test.ts fails
// when a Configuration section has no section in the guide).
//
// Id rule (docs/admin-guide/OWNERSHIP.md): a System or Cytology section is
// `screen-<section id>`; a sub-tab of another tab is `screen-<tab>-<sub-tab>`;
// a tab on its own is `screen-tab-<tab>`; any other screen is `screen-<name>`.
// ─────────────────────────────────────────────────────────────────────────────

/** Folder of the published guide under the app's base address. */
export const ADMIN_GUIDE_FOLDER = 'help/admin-guide';

/** The tabs whose section id is already unique across Configuration, so it is used as it is. */
const TABS_WITH_UNIQUE_SECTION_IDS: readonly string[] = ['system', 'cytology'];

export interface ConfigHelpTarget {
  /** Configuration tab id (`system`, `staff`, ...). */
  tab: string;
  /** The section or sub-tab open on that tab, when it has them. */
  section?: string;
}

/** The guide anchor id for the open Configuration tab and section. */
export function adminGuideAnchorFor(target: ConfigHelpTarget): string {
  const { tab, section } = target;
  if (!section) return `screen-tab-${tab}`;
  return TABS_WITH_UNIQUE_SECTION_IDS.includes(tab) ? `screen-${section}` : `screen-${tab}-${section}`;
}

/** The guide anchor id for a screen outside Configuration (`facility-dictionary`, `audit-log`, ...). */
export function adminGuideAnchorForScreen(name: string): string {
  return `screen-${name.replace(/^screen-/, '')}`;
}

/** The languages the guide is published in (Batch 647). English sits at the folder root; each other language in its own subfolder. */
export const ADMIN_GUIDE_LANGUAGES = ['en', 'fr', 'de', 'nl', 'ko', 'es'] as const;

/** The guide language for the app's language: `fr-BE` gives `fr`, `nl-BE` gives `nl`, anything else the guide lacks gives English. */
export function adminGuideLanguage(appLanguage: string | undefined): (typeof ADMIN_GUIDE_LANGUAGES)[number] {
  const base = (appLanguage ?? 'en').toLowerCase().split(/[-_]/)[0];
  return (ADMIN_GUIDE_LANGUAGES as readonly string[]).includes(base) ? (base as (typeof ADMIN_GUIDE_LANGUAGES)[number]) : 'en';
}

/** The address the Help button opens: the guide's redirect page (in the user's language), which finds the chapter holding the anchor. */
export function adminGuideUrl(anchor: string, baseUrl: string = '/', appLanguage?: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const lang = adminGuideLanguage(appLanguage);
  const folder = lang === 'en' ? ADMIN_GUIDE_FOLDER : `${ADMIN_GUIDE_FOLDER}/${lang}`;
  return `${base}${folder}/go.html#${encodeURIComponent(anchor)}`;
}

/**
 * Screens outside Configuration that have their own section in the guide (Batch 647), by address. The Help button
 * for these is one floating button (RouteHelpButton), so a page never has to carry its own. Configuration and
 * Migration Jobs keep their own buttons and are not listed here.
 */
const ROUTE_SCREENS: ReadonlyArray<readonly [prefix: string, screen: string]> = [
  ['/facility-dictionary', 'facility-dictionary'],
  ['/batch-management', 'batch-management'],
  ['/my-exports', 'my-exports'],
  ['/quality-assurance', 'quality-assurance'],
  ['/margin-exception-review', 'margin-exception-review'],
  ['/lockbox-drop-off', 'lockbox-drop-off'],
  ['/outbound-queue', 'outbound-queue'],
  ['/workstations/microtomy', 'microtomy-workstation'],
  ['/workstations/embedding', 'embedding-station'],
  ['/workstations/slide-distribution', 'slide-distribution-station'],
  ['/dev/mock-interface-engine', 'mock-interface-engine'],
  ['/mock-emr', 'mock-emr'],
];

/** The Audit Log keeps its tabs in the address (?tab=interfaces or financial); every other tab is the main log. */
const AUDIT_TABS: Readonly<Record<string, string>> = { interfaces: 'audit-interfaces', financial: 'audit-financial' };

/** The guide anchor for a screen outside Configuration, from the address; null when the screen has no guide section. */
export function adminGuideAnchorForRoute(pathname: string, search = ''): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/audit') return adminGuideAnchorForScreen(AUDIT_TABS[new URLSearchParams(search).get('tab') ?? ''] ?? 'audit-log');
  const hit = ROUTE_SCREENS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`));
  return hit ? adminGuideAnchorForScreen(hit[1]) : null;
}

/** Every address prefix above (for the guard test that each has a section in the guide). */
export const ROUTE_GUIDE_SCREENS: readonly string[] = [...ROUTE_SCREENS.map(([, screen]) => screen), 'audit-log', 'audit-interfaces', 'audit-financial'];

const PROTOCOL_SECTIONS: readonly string[] = ['active', 'review', 'all'];

/**
 * The open section the Help button should name. A tab that reports its own section wins; the Synoptic
 * Library keeps its section in the address (?section=, default Active); other tabs have none.
 */
export function configHelpSection(tab: string, registered: string | undefined, search: string): string | undefined {
  if (registered) return registered;
  if (tab !== 'protocols') return undefined;
  const fromAddress = new URLSearchParams(search).get('section') ?? '';
  return PROTOCOL_SECTIONS.includes(fromAddress) ? fromAddress : 'active';
}
