// src/services/externalResources/externalResourceUrl.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 652: External Resources accept https links only.
//
// The admin screen used to accept http:// as well as https://. A reference link is opened from a clinical
// workstation, and a plain-http page can be altered on the way, so only https is accepted now.
//   - New and edited links: checked here, in the service layer (withSecureUrls wraps the app's service, whichever
//     backend is behind it), so the rule holds for every caller and not only for the form. The API server must refuse
//     them as well (docs/architecture/CONFIG_DICTIONARIES_API.md).
//   - Links saved before this change are kept, not deleted: the admin list marks them "insecure link" and the
//     Resources panel shows them as plain text with a warning, never as something that opens.
// ─────────────────────────────────────────────────────────────────────────────
import type { ExternalResource, ExternalResourceCategory, IExternalResourceService } from './IExternalResourceService';

export type ExternalResourceUrlProblem = 'invalid' | 'insecure';

export type ExternalResourceUrlCheck =
  | { ok: true; url: string }
  | { ok: false; problem: ExternalResourceUrlProblem };

/** Accepts an https URL (returned in its normal form); http is 'insecure', anything else that is not a web URL 'invalid'. */
export function checkExternalResourceUrl(raw: string): ExternalResourceUrlCheck {
  let parsed: URL;
  try { parsed = new URL(raw.trim()); } catch { return { ok: false, problem: 'invalid' }; }
  if (parsed.protocol === 'https:') return parsed.hostname ? { ok: true, url: parsed.toString() } : { ok: false, problem: 'invalid' };
  if (parsed.protocol === 'http:') return { ok: false, problem: 'insecure' };
  return { ok: false, problem: 'invalid' };
}

/** True for a stored link that may be opened (https). */
export const isSecureResourceUrl = (url: string): boolean => {
  const check = checkExternalResourceUrl(url);
  return check.ok;
};

export class ExternalResourceUrlError extends Error {
  readonly problem: ExternalResourceUrlProblem;
  constructor(problem: ExternalResourceUrlProblem) {
    super(problem === 'insecure' ? 'External resource links must use https.' : 'External resource link is not a valid web address.');
    this.name = 'ExternalResourceUrlError';
    this.problem = problem;
  }
}

/** Wraps a service so create() and update() (when it changes the link) refuse anything but https, by throwing ExternalResourceUrlError. */
export function withSecureUrls(service: IExternalResourceService): IExternalResourceService {
  const assertSecure = (url: string) => { const c = checkExternalResourceUrl(url); if (!c.ok) throw new ExternalResourceUrlError(c.problem); };
  return {
    ...service,
    listForOrganisation: o => service.listForOrganisation(o),
    resolveForViewer: c => service.resolveForViewer(c),
    remove: id => service.remove(id),
    create: async input => { assertSecure(input.url); return service.create(input); },
    update: async (id, changes) => { if (changes.url !== undefined) assertSecure(changes.url); return service.update(id, changes); },
  };
}

/** What the Resources panel needs for each link: a stored http link is flagged and must not be opened. */
export interface ResourceQuickLink { title: string; url: string; insecure?: boolean }

export function toQuickLinks(grouped: Record<ExternalResourceCategory, ExternalResource[]>): Record<ExternalResourceCategory, ResourceQuickLink[]> {
  const map = (list: ExternalResource[]): ResourceQuickLink[] => list.map(r => ({ title: r.title, url: r.url, insecure: !isSecureResourceUrl(r.url) }));
  return { protocols: map(grouped.protocols), references: map(grouped.references), systems: map(grouped.systems) };
}
