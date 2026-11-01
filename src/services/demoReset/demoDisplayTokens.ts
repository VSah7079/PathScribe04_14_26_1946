// src/services/demoReset/demoDisplayTokens.ts
// ─────────────────────────────────────────────────────────────────────────────
// Batch 747 (Pete's seed row S8, Video 6: "each with a documented demo token, plus a spare token and a revoked token to
// show the Display unavailable screen"; and the seed rule "No credentials in the data or in documents"). So no token is
// seeded or written down: after a Full Reset the presenter selects Configuration → Demo Reset → Issue demo display
// tokens, and this issues a fresh token for each Desert Valley wall display profile, the spare, the second facility's display and the OR
// Suite terminal,
// issues and at once revokes one for the retired display, and hands the tokens back to be shown once. Only their hashes
// are kept (displayAccess/), as with any token an administrator issues.
//
// Needs config:demo-data:reset (a demo tool, like the Full Reset); each token is then issued through the display access
// service, which checks config:display-profiles:manage or config:or-suite-terminals:manage itself. Audited without the
// tokens. The deps are passed in so it is testable without module mocks.
// ─────────────────────────────────────────────────────────────────────────────

import type { IAuthorizationService } from '../authorization/authorizationService';
import type { IDisplayAccessService } from '../displayAccess/IDisplayAccessService';
import type { DisplayKind } from '../displayAccess/displayToken';
import type { NewAuditLog } from '../auditlog/IAuditService';
import type { IDisplayProfileService } from '../facilityOpsDashboard/IDisplayProfileService';
import type { IOrSuiteTerminalService } from '../intraopDashboard/IOrSuiteTerminalService';
import { DEMO_DISPLAY_PROFILE_IDS } from '../facilityOpsDashboard/demoDisplayProfileIds';

/** The demo's OR Suite terminal (intraopDashboard/mockOrSuiteTerminalService.ts). */
export const DEMO_OR_SUITE_TERMINAL_ID = 'orterm-seed-theatre2';
/** How long the demo tokens last: long enough for a recording week, short enough to lapse on their own. */
export const DEMO_DISPLAY_TOKEN_DAYS = 30;

/** Which display each token is for, and what the presenter uses it to show. */
export type DemoDisplayTokenUse = 'rotating' | 'singleView' | 'spare' | 'revoked' | 'secondSite' | 'orSuite';

export interface DemoDisplayToken {
  kind: DisplayKind;
  subjectId: string;
  use: DemoDisplayTokenUse;
  /** The profile's or terminal's name (configuration data, shown as stored). */
  name: string;
  token: string;
}

export type DemoDisplayTokenResult =
  | { ok: true; tokens: DemoDisplayToken[] }
  | { ok: false; reason: 'notPermitted' | 'issueFailed' };

/** The displays the tool issues for, in the order the presenter needs them. */
export const DEMO_DISPLAY_TOKEN_PLAN: readonly { kind: DisplayKind; subjectId: string; use: DemoDisplayTokenUse }[] = [
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.rotating, use: 'rotating' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.grossing, use: 'singleView' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.embedding, use: 'singleView' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.staining, use: 'singleView' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.sendOut, use: 'singleView' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.signOut, use: 'singleView' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.spare, use: 'spare' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.revoked, use: 'revoked' },
  { kind: 'facility-ops', subjectId: DEMO_DISPLAY_PROFILE_IDS.secondSite, use: 'secondSite' },
  { kind: 'or-suite', subjectId: DEMO_OR_SUITE_TERMINAL_ID, use: 'orSuite' },
];

export async function issueDemoDisplayTokens(deps: {
  authorization: Pick<IAuthorizationService, 'enforce'>;
  displayAccess: Pick<IDisplayAccessService, 'issueFacilityOpsToken' | 'issueOrSuiteToken' | 'revokeFacilityOpsToken'>;
  profiles: Pick<IDisplayProfileService, 'getAll'>;
  terminals: Pick<IOrSuiteTerminalService, 'getAll'>;
  audit: { logEvent(entry: NewAuditLog): Promise<unknown> };
  user: string;
}): Promise<DemoDisplayTokenResult> {
  const decision = await deps.authorization.enforce('config:demo-data:reset');
  if (!decision.allowed) return { ok: false, reason: 'notPermitted' };

  const [profiles, terminals] = await Promise.all([deps.profiles.getAll(), deps.terminals.getAll()]);
  const names = new Map<string, string>([
    ...(profiles.ok ? profiles.data : []).map(p => [p.id, p.name] as [string, string]),
    ...(terminals.ok ? terminals.data : []).map(t => [t.id, t.name] as [string, string]),
  ]);
  const tokens: DemoDisplayToken[] = [];
  for (const entry of DEMO_DISPLAY_TOKEN_PLAN) {
    const issued = entry.kind === 'or-suite'
      ? await deps.displayAccess.issueOrSuiteToken(entry.subjectId, DEMO_DISPLAY_TOKEN_DAYS)
      : await deps.displayAccess.issueFacilityOpsToken(entry.subjectId, DEMO_DISPLAY_TOKEN_DAYS);
    if (!issued.ok) return { ok: false, reason: 'issueFailed' };
    if (entry.use === 'revoked') {
      const revoked = await deps.displayAccess.revokeFacilityOpsToken(entry.subjectId);
      if (!revoked.ok) return { ok: false, reason: 'issueFailed' };
    }
    tokens.push({ ...entry, name: names.get(entry.subjectId) ?? entry.subjectId, token: issued.data.token });
  }

  void deps.audit.logEvent({
    type: 'user', event: 'Demo Display Tokens Issued',
    detail: `Issued ${tokens.length} demo display tokens (${DEMO_DISPLAY_TOKEN_DAYS} days), one revoked at once: ${DEMO_DISPLAY_TOKEN_PLAN.map(p => p.subjectId).join(', ')}.`,
    user: deps.user, caseId: null, confidence: null,
  }).catch(() => { /* audit is best-effort here; the tokens were issued */ });
  return { ok: true, tokens };
}
