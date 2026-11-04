#!/usr/bin/env node
// scripts/remove-demo-checklists.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Batch 754 (Pete, Oct 31, 2026): removes the 19 demonstration checklists ("Generic Template", see
// src/services/templates/demoChecklists.ts) from one customer organisation's synoptic library on a PathScribe API
// server. For ForMedrixAI support: the token must belong to someone holding platform:demo-checklists:remove (and
// config:protocol:retire). The server archives each checklist (not offered for new reports; a report already made
// with one still opens) and writes the audit entries.
//
// A dry run is the default; nothing changes without --apply.
//
//   PS_API_TOKEN=<token> node scripts/remove-demo-checklists.mjs --api https://pathscribe.customer.example --organisation ORG-123
//   PS_API_TOKEN=<token> node scripts/remove-demo-checklists.mjs --api https://pathscribe.customer.example --organisation ORG-123 --apply
//
// The endpoint is the contract in docs/architecture/DEMO_CHECKLISTS.md (POST /api/templates/remove-demo-checklists).
// It is Planned: until the API server implements it, this script reports that the server does not offer it. A
// customer build (npm run build:server) already leaves the checklists out, so a customer that starts on one never has
// them; this script is for an organisation on a deployment that had them. The token is read from the environment
// and never printed or written anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const ENDPOINT = '/api/templates/remove-demo-checklists';

/** Reads the command line (pure). */
export function parseArgs(argv) {
  const value = flag => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined; };
  const api = value('--api');
  const organisationId = value('--organisation');
  const problems = [];
  if (!api) problems.push('--api <server address> is required');
  else if (!/^https:\/\//.test(api) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(api)) problems.push('--api must be an https address (http only for localhost)');
  if (!organisationId) problems.push('--organisation <organisation id> is required');
  return { api: api?.replace(/\/+$/, ''), organisationId, apply: argv.includes('--apply'), problems };
}

/** The request the server receives (pure). */
export function buildRequest({ api, organisationId, apply }, token) {
  return {
    url: `${api}${ENDPOINT}`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ organisationId, dryRun: !apply }),
    },
  };
}

/** What to print for the server's answer (pure). */
export function describeResult(status, body, apply) {
  if (status === 404) return { ok: false, lines: ['This server does not offer the removal yet (the endpoint is Planned; docs/architecture/DEMO_CHECKLISTS.md).'] };
  if (status === 401 || status === 403) return { ok: false, lines: ['Refused: the token does not hold platform:demo-checklists:remove (and config:protocol:retire) for this organisation.'] };
  if (status < 200 || status >= 300 || !body) return { ok: false, lines: [`The server answered ${status}.`] };
  const names = list => (list ?? []).map(e => `  ${e.name ?? e.id} (${e.id})`);
  const plan = body.plan ?? {};
  if (!apply) {
    return { ok: true, lines: [
      `Dry run: ${plan.toRemove?.length ?? 0} would be removed, ${plan.alreadyRemoved?.length ?? 0} already removed, ${plan.notInLibrary?.length ?? 0} not in this library.`,
      ...names(plan.toRemove), 'Nothing was changed. Add --apply to remove them.',
    ] };
  }
  return { ok: (body.failed?.length ?? 0) === 0, lines: [
    `Removed ${body.removed?.length ?? 0}; already removed ${plan.alreadyRemoved?.length ?? 0}; could not remove ${body.failed?.length ?? 0}.`,
    ...names(body.removed), ...(body.failed ?? []).map(f => `  NOT REMOVED ${f.entry?.id}: ${f.message}`),
  ] };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (args.problems.length) { for (const p of args.problems) console.error(p); process.exit(2); }
  const token = process.env.PS_API_TOKEN;
  if (!token) { console.error('Set PS_API_TOKEN to a token for a ForMedrixAI support account (it is not printed or saved).'); process.exit(2); }
  const { url, init } = buildRequest(args, token);
  console.log(`${args.apply ? 'Removing' : 'Checking (dry run)'}: organisation ${args.organisationId} at ${args.api}`);
  let status = 0; let body = null;
  try { const res = await fetch(url, init); status = res.status; body = await res.json().catch(() => null); }
  catch (e) { console.error(`Could not reach ${args.api}: ${e.message}`); process.exit(1); }
  const out = describeResult(status, body, args.apply);
  for (const line of out.lines) (out.ok ? console.log : console.error)(line);
  process.exit(out.ok ? 0 : 1);
}
