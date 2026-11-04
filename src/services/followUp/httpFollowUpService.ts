// src/services/followUp/httpFollowUpService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 616 (PS-483): the API server's follow-up tracking, COMMAND-BASED
// (Pete, Oct 18). Contract: docs/architecture/FOLLOW_UP_API.md (section
// "Browser commands"). The browser sends the command and the key; the server
// works out the window, the status, the actor and the time. Nothing here sends
// a whole record, a status, a window, a user id or a name.
// ─────────────────────────────────────────────────────────────────────────────
import type { ApiHttpClient } from '../apiServer/apiHttpClient';
import { buildHttpService, methodPath, queryString, required, value } from '../apiServer/httpServiceKit';
import { DEFAULT_FOLLOW_UP_SETTINGS, type EffectiveFollowUpSettings } from './followUpSettings';
import type { FollowUpActionResult } from './followUpActions';
import type { IFollowUpService, LoadedFollowUps } from './IFollowUpService';
import type { FollowUpItem } from './followUpTypes';

type ListReply = { items?: FollowUpItem[]; settings?: { enterprise?: EffectiveFollowUpSettings; facilities?: Record<string, EffectiveFollowUpSettings> } };

const NO_SETTINGS: EffectiveFollowUpSettings = { ...DEFAULT_FOLLOW_UP_SETTINGS, source: 'enterprise' };

const toLoaded = (d: ListReply | null): LoadedFollowUps => ({
  items: d?.items ?? [],
  settingsFor: facilityId => d?.settings?.facilities?.[facilityId ?? ''] ?? d?.settings?.enterprise ?? NO_SETTINGS,
});

type Args<K extends keyof IFollowUpService> = Parameters<IFollowUpService[K]>;
const BASE = '/api/follow-up/follow-up';
const route = (method: string): string => methodPath(BASE, method);

export function createHttpFollowUpService(client: ApiHttpClient): IFollowUpService {
  const routes = buildHttpService<IFollowUpService>(client, {
    // The server limits the list to cases the caller can open; `allCases` and `now` are the demo's, so nothing is sent.
    loadItems: value('GET', () => route('loadItems'), { pick: (d: ListReply) => toLoaded(d), missing: toLoaded(null), fallback: toLoaded(null) }),
    getExpectation: value('GET', (caseId: Args<'getExpectation'>[0]) => `${route('getExpectation')}${queryString({ caseId })}`, { missing: null }),
    // The body is the command, the key and the one choice the user made. The window, the actor and the time are the server's.
    markExpected: required('POST', () => route('markExpected'), { body: (caseId: Args<'markExpected'>[0], opts: Args<'markExpected'>[1]) => ({ caseId, afterSignOut: opts?.afterSignOut === true }) }),
    recordDisposition: required('POST', () => route('recordDisposition'), {
      body: (ref: Args<'recordDisposition'>[0], disposition: Args<'recordDisposition'>[1], note: Args<'recordDisposition'>[2]) => (note?.trim() ? { key: ref.key, value: disposition, note: note.trim() } : { key: ref.key, value: disposition }),
    }),
    reopen: required('POST', () => route('reopen'), { body: (ref: Args<'reopen'>[0]) => ({ key: ref.key }) }),
    emailClinician: required('POST', () => route('emailClinician'), {
      body: (ref: Args<'emailClinician'>[0], draft: Args<'emailClinician'>[1]) => ({ key: ref.key, to: draft.to, subject: draft.subject, body: draft.body }),
    }),
  });
  // A refusal is the interface's own { ok: false, reason } (the reason is the server's fixed code), not a thrown error.
  const refusal = (e: unknown): { ok: false; reason: string } => ({ ok: false, reason: reasonOf(e) });
  const wrap = <A extends unknown[], T>(fn: (...a: A) => Promise<unknown>) =>
    async (...a: A): Promise<FollowUpActionResult<T>> => { try { return { ok: true, data: (await fn(...a)) as T }; } catch (e) { return refusal(e); } };
  return {
    ...routes,
    markExpected: wrap((caseId, o) => routes.markExpected(caseId, o, undefined as never)) as IFollowUpService['markExpected'],
    recordDisposition: wrap((r, v, n) => routes.recordDisposition(r, v, n, undefined as never)) as IFollowUpService['recordDisposition'],
    reopen: wrap((r) => routes.reopen(r, undefined as never)) as IFollowUpService['reopen'],
    emailClinician: wrap((r, d) => routes.emailClinician(r, d, undefined as never)) as IFollowUpService['emailClinician'],
  };
}

/** The server's fixed code, in the camel-case the screens already map (notPermitted, noDate, noSurgicalSpecimen, caseNotFound, notOpen, disabled, ...). */
function reasonOf(e: unknown): string {
  const code = (e as { code?: string })?.code ?? 'UNAVAILABLE';
  return code.toLowerCase().replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());
}
