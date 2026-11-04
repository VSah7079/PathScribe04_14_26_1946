// Batch 552 (PS-539 phase 2d): managing site agents.
import { describe, it, expect, vi } from 'vitest';
import {
  blankAgentPrinter, blankAgentShare, checkAgentPrinters, checkAgentShares, checkUpdateWindow, engineChannelSuggestions, revokeReasonValid, newEnrollmentCode, normaliseSiteAgentConfig, siteAgentConfigValid, siteAgentCounts, siteAgentState,
  validPickupPattern, validPrinterHost, validUncPath, withKind, withProtocol,
  type SiteAgentSummary,
} from './siteAgentAdmin';
import { createDemoSiteAgentAdminApi, createHttpSiteAgentAdminApi, createSiteAgentAdminService, siteAgentHttpError, type ISiteAgentAdminApi } from './siteAgentAdminService';
import type { AgentHeartbeat, AgentPrinter } from './siteAgentContract';

const now = new Date('2026-10-13T12:00:00Z');
const hb = (over: Partial<AgentHeartbeat> = {}): AgentHeartbeat => ({ v: 1, agentVersion: '1.0.0', queuedJobs: 0, unsentResults: 0, printers: [], shares: [], certExpiresAt: '2027-01-01T00:00:00Z', diskFreePercent: 60, ...over });
const agent = (over: Partial<SiteAgentSummary> = {}): SiteAgentSummary => ({ agentId: 'a', siteId: 'S1', machineName: 'LAB-PC', agentVersion: '1.0.0', enrolledAt: 'x', certExpiresAt: '2027-01-01T00:00:00Z', ...over });

describe('agent status for the screen', () => {
  it('revoked, offline with no heartbeat for 180 s, needs attention with a printer down that has work, otherwise online', () => {
    expect(siteAgentState(agent({ revokedAt: 'x' }), now)).toBe('revoked');
    expect(siteAgentState(agent(), now)).toBe('offline');
    expect(siteAgentState(agent({ lastHeartbeat: { heartbeat: hb(), receivedAt: '2026-10-13T11:59:30Z' } }), now)).toBe('online');
    expect(siteAgentState(agent({ lastHeartbeat: { heartbeat: hb({ printers: [{ destinationId: 'p', reachable: false, pendingJobs: 2 }] }), receivedAt: '2026-10-13T11:59:30Z' } }), now)).toBe('degraded');
    expect(siteAgentCounts([agent(), agent({ revokedAt: 'x' }), agent({ lastHeartbeat: { heartbeat: hb(), receivedAt: '2026-10-13T11:59:30Z' } })], now)).toEqual({ online: 1, degraded: 0, offline: 1 });
  });
});

describe('printer and share checks', () => {
  const printer = (over: Partial<AgentPrinter> = {}): AgentPrinter => ({ destinationId: 'p1', kind: 'report', protocol: 'IPPS', host: '10.20.30.40', port: 631, ...over });
  it('a printer needs a unique id, a valid address and port; a label printer uses Raw 9100', () => {
    expect(checkAgentPrinters([printer(), printer({ destinationId: 'P1' })])).toEqual({ 1: 'idDuplicate' });
    expect(checkAgentPrinters([printer({ destinationId: ' ' })])).toEqual({ 0: 'idRequired' });
    expect(checkAgentPrinters([printer({ host: '' })])).toEqual({ 0: 'hostRequired' });
    expect(checkAgentPrinters([printer({ host: 'http://x' })])).toEqual({ 0: 'hostInvalid' });
    expect(checkAgentPrinters([printer({ host: 'printer-3.lab.hospital.example' })])).toEqual({});
    expect(checkAgentPrinters([printer({ port: 70000 })])).toEqual({ 0: 'portInvalid' });
    expect(checkAgentPrinters([printer({ kind: 'label', protocol: 'IPP' })])).toEqual({ 0: 'labelNeedsRaw' });
    expect(checkAgentPrinters([printer({ kind: 'label', protocol: 'RAW_9100' })])).toEqual({ 0: 'labelNeedsRaw' }); // no ZPL
    expect(checkAgentPrinters([printer({ host: 'fe80::1' })])).toEqual({ 0: 'ipv6NotSupported' });
  });
  it('addresses Windows would read as other addresses are refused (review, Batch 552)', () => {
    for (const bad of ['999.1.1.1', '10.1.1', '0x7f.0.0.1', '2130706433', '10.0.0.01', 'printer..lab', '-x.lab', 'lab.123']) expect(validPrinterHost(bad), bad).toBe(false);
    for (const ok of ['10.20.30.40', 'printer-3', 'printer-3.lab.hospital.example', '192.168.0.1']) expect(validPrinterHost(ok), ok).toBe(true);
  });
  it('share paths: a real server and share, not this machine, a device path or a drive\'s admin share', () => {
    for (const bad of ['\\\\.\\PhysicalDrive0', '\\\\.\\pipe\\x', '\\\\localhost\\c$', '\\\\127.0.0.1\\share', '\\\\srv\\C$', '\\\\srv\\share\\ \\x', '\\\\srv\\share\\.\\x', '\\\\srv', 'C:\\out']) expect(validUncPath(bad), bad).toBe(false);
    for (const ok of ['\\\\files\\pathology$\\out', '\\\\files.lab.example\\in\\orders\\', '\\\\10.0.0.5\\drop']) expect(validUncPath(ok), ok).toBe(true);
    expect(validPickupPattern('*.hl7')).toBe(true);
    for (const bad of ['in\\*.hl7', '../x', '*.pdf', 'scan.TIFF', '']) expect(validPickupPattern(bad), bad).toBe(false);
  });
  it('values are saved trimmed, so a printer id matches exactly', () => {
    const c = normaliseSiteAgentConfig({ siteId: 'S1', printers: [{ ...printer(), destinationId: ' p1 ', host: ' 10.0.0.5 ', displayName: '  ' }], shares: [] });
    expect(c.printers[0]).toMatchObject({ destinationId: 'p1', host: '10.0.0.5' });
    expect(c.printers[0].displayName).toBeUndefined();
  });
  it('a share needs a \\\\server\\share path; a pickup share a pattern and somewhere to hand files to', () => {
    const write = { shareId: 's1', uncPath: '\\\\files\\pathology$\\out', direction: 'write' as const };
    expect(checkAgentShares([write])).toEqual({});
    expect(checkAgentShares([{ ...write, uncPath: 'C:\\out' }])).toEqual({ 0: 'uncInvalid' });
    expect(checkAgentShares([{ ...write, uncPath: '\\\\files\\share\\..\\x' }])).toEqual({ 0: 'uncInvalid' });
    const pickup = blankAgentShare([], 'pickup');
    expect(checkAgentShares([{ ...pickup, uncPath: '\\\\files\\in' }])).toEqual({ 0: 'patternRequired' });
    expect(checkAgentShares([{ ...pickup, uncPath: '\\\\files\\in', pickup: { ...pickup.pickup!, pattern: '*.hl7' } }])).toEqual({ 0: 'handToRequired' });
    expect(checkAgentShares([{ ...pickup, uncPath: '\\\\files\\in', pickup: { ...pickup.pickup!, pattern: '*.hl7', handTo: { kind: 'engineChannel', channelId: 'ORM_IN' }, maxFileMegabytes: 900 } }])).toEqual({ 0: 'numbersInvalid' });
    expect(siteAgentConfigValid({ printers: [printer()], shares: [write] })).toBe(true);
  });
  it('new rows and protocol changes keep sensible defaults', () => {
    expect(blankAgentPrinter([{ ...printer(), destinationId: 'printer-1' }])).toMatchObject({ destinationId: 'printer-2', protocol: 'IPPS', port: 631 }); // IPPS uses 631 (RFC 7472)
    expect(withProtocol(printer({ port: 631 }), 'LPR_LPD')).toMatchObject({ protocol: 'LPR_LPD', port: 515 });
    expect(withProtocol(printer({ port: 443 }), 'IPP').port).toBe(443); // set by hand: kept
    expect(withKind(printer(), 'label')).toMatchObject({ kind: 'label', protocol: 'RAW_9100', port: 9100, labelLanguage: 'ZPL' });
    expect(withKind(withKind(printer(), 'label'), 'report').labelLanguage).toBeUndefined();
  });
  it('a demo enrolment code has 160 random bits in groups of four, without look-alike letters', () => {
    const code = newEnrollmentCode(n => new Uint8Array(n).fill(255));
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){7}$/);
    // Every symbol is reachable: across many random codes all 32 appear.
    const seen = new Set(Array.from({ length: 200 }, () => newEnrollmentCode(n => globalThis.crypto.getRandomValues(new Uint8Array(n)))).join('').replace(/-/g, ''));
    expect(seen.size).toBe(32);
  });
});

describe('the service checks capabilities at the site', () => {
  const api = (): ISiteAgentAdminApi => ({
    listAgents: vi.fn(async () => ({ ok: true as const, data: [agent({ siteId: 'S1' }), agent({ agentId: 'b', siteId: 'S2' })] })),
    createEnrollmentCode: vi.fn(async siteId => ({ ok: true as const, data: { code: 'X', siteId, expiresAt: 'later' } })),
    revoke: vi.fn(async () => ({ ok: true as const, data: agent({ revokedAt: 'now' }) })),
    getConfig: vi.fn(async siteId => ({ ok: true as const, data: { siteId, printers: [], shares: [] } })),
    saveConfig: vi.fn(async c => ({ ok: true as const, data: c })),
    listPrinters: vi.fn(async () => ({ ok: true as const, data: [] })),
  });
  const auth = (granted: string[], sites: string[] = ['S1']) => ({
    // Like the real check: a facility-limited user is refused "all facilities".
    enforce: vi.fn(async (c: string, ctx: { facilityId?: string | null; allFacilities?: boolean } = {}) => ({ allowed: granted.includes(c) && !ctx.allFacilities && (!ctx.facilityId || sites.includes(ctx.facilityId)) }) as never),
    evaluate: vi.fn(async (c: string, ctx: { facilityId?: string | null; allFacilities?: boolean } = {}) => ({ allowed: granted.includes(c) && !ctx.allFacilities && (!ctx.facilityId || sites.includes(ctx.facilityId)) }) as never),
  });
  it('enrolment codes and revoking need config:site-agents:enroll at the site; revoking needs a reason', async () => {
    const a = api();
    const s = createSiteAgentAdminService({ api: a, viaServer: true, authorization: auth(['config:site-agents:enroll']) });
    expect((await s.createEnrollmentCode('S1')).ok).toBe(true);
    expect(await s.createEnrollmentCode('S2')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await s.revoke('a', { code: 'other', note: ' ' }, 'S1')).toEqual({ ok: false, error: 'INVALID' }); // "other" needs a note
    expect(await s.revoke('a', { code: 'nope' as never }, 'S1')).toEqual({ ok: false, error: 'INVALID' });
    expect((await s.revoke('a', { code: 'replaced', note: '  ' }, 'S1')).ok).toBe(true);
    expect(await s.revoke('a', { code: 'replaced' })).toEqual({ ok: false, error: 'NOT_PERMITTED' }); // no site: every facility
    expect(a.revoke).toHaveBeenCalledWith('a', { code: 'replaced' }); // a blank note isn't sent
    expect((await s.revoke('a', { code: 'other', note: ' Lab closed ' }, 'S1')).ok).toBe(true);
    expect(a.revoke).toHaveBeenLastCalledWith('a', { code: 'other', note: 'Lab closed' });
  });
  it('saving printers and shares needs config:site-agent-config:manage and a valid configuration', async () => {
    const a = api();
    const s = createSiteAgentAdminService({ api: a, viaServer: true, authorization: auth(['config:site-agent-config:manage']) });
    expect(await s.saveConfig({ siteId: 'S1', printers: [{ destinationId: '', kind: 'report', protocol: 'IPPS', host: 'x', port: 443 }], shares: [] })).toEqual({ ok: false, error: 'INVALID' });
    expect((await s.saveConfig({ siteId: 'S1', printers: [], shares: [] })).ok).toBe(true);
    expect(await s.saveConfig({ siteId: 'S2', printers: [], shares: [] })).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
  it('seeing agents needs either capability at the site; across sites, only the sites the user may see', async () => {
    const s = createSiteAgentAdminService({ api: api(), viaServer: true, authorization: auth(['config:site-agent-config:manage']) });
    expect((await s.listAgents('S1')).ok).toBe(true);
    expect(await s.listAgents('S2')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const all = await s.listAgents();
    expect(all.ok && all.data.map(x => x.siteId)).toEqual(['S1']);
    const none = createSiteAgentAdminService({ api: api(), viaServer: true, authorization: auth([]) });
    expect(await none.getConfig('S1')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
  });
});

describe('the demo and the server', () => {
  it('the demo keeps the configuration, makes a code that expires in 24 hours, and has no agents', async () => {
    let stored: unknown = null;
    const demo = createDemoSiteAgentAdminApi({ read: () => stored as never, write: c => { stored = c; }, random: n => new Uint8Array(n), now: () => now, userName: () => 'Dr A' });
    expect(await demo.listAgents()).toEqual({ ok: true, data: [] });
    const code = await demo.createEnrollmentCode('S1');
    expect(code.ok && code.data.expiresAt).toBe('2026-10-14T12:00:00.000Z');
    expect(await demo.getConfig('S1')).toEqual({ ok: true, data: { siteId: 'S1', printers: [], shares: [] } });
    await demo.saveConfig({ siteId: 'S1', printers: [], shares: [] });
    expect(stored).toMatchObject({ siteId: 'S1', updatedBy: 'Dr A' });
  });
  it('the HTTP client: paths and errors', async () => {
    const fetchFn = vi.fn(async () => new Response('{}', { status: 200 }));
    const h = createHttpSiteAgentAdminApi({ baseUrl: 'https://api.example/', fetch: fetchFn as never, accessToken: async () => 't' });
    await h.listAgents('S 1'); await h.listAgents(); await h.createEnrollmentCode('S1'); await h.revoke('a1', { code: 'other', note: 'r' }); await h.getConfig('S1'); await h.saveConfig({ siteId: 'S1', printers: [], shares: [] }); await h.listPrinters('S1');
    expect(fetchFn.mock.calls.map(c => { const [u, i] = (c as unknown) as [string, RequestInit]; return `${i.method} ${u}`; })).toEqual([
      'GET https://api.example/api/sites/S%201/agents', 'GET https://api.example/api/agents', 'POST https://api.example/api/sites/S1/agent-enrollment-codes',
      'POST https://api.example/api/agents/a1/revoke', 'GET https://api.example/api/sites/S1/agent-config', 'PUT https://api.example/api/sites/S1/agent-config',
      'GET https://api.example/api/sites/S1/agent-printers',
    ]);
    const revokeBody = JSON.parse(((fetchFn.mock.calls[3] as unknown) as [string, RequestInit])[1].body as string);
    expect(revokeBody).toEqual({ reasonCode: 'other', note: 'r' });
    expect([401, 403, 404, 422, 500].map(siteAgentHttpError)).toEqual(['SIGNED_OUT', 'NOT_PERMITTED', 'NOT_FOUND', 'INVALID', 'UNAVAILABLE']);
  });
});

describe('Batch 553: report printers for routing, the facility default and Redirect', () => {
  const printers = [
    { destinationId: 'rep-1', kind: 'report' as const, protocol: 'IPPS' as const, host: 'p1', port: 631, displayName: 'Front desk' },
    { destinationId: 'lab-1', kind: 'label' as const, protocol: 'RAW_9100' as const, host: 'p2', port: 9100, labelLanguage: 'ZPL' as const },
  ];
  const apiWith = () => ({
    listAgents: vi.fn(), createEnrollmentCode: vi.fn(), revoke: vi.fn(), saveConfig: vi.fn(),
    getConfig: vi.fn(), listPrinters: vi.fn(async () => ({ ok: true as const, data: printers })),
  });
  const evalOnly = (granted: string[]) => ({
    enforce: vi.fn(async () => ({ allowed: false }) as never),
    evaluate: vi.fn(async (c: string, ctx: { facilityId?: string } = {}) => ({ allowed: granted.includes(c) && ctx.facilityId === 'S1' }) as never),
  });
  it('each screen needs its own capability at the site, and only report printers are offered', async () => {
    const routing = createSiteAgentAdminService({ api: apiWith() as never, viaServer: true, authorization: evalOnly(['config:print-routing:manage']) });
    expect(await routing.reportPrinters('S1', 'routing')).toEqual({ ok: true, data: [printers[0]] });
    expect(await routing.reportPrinters('S2', 'routing')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await routing.reportPrinters('S1', 'redirect')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    expect(await routing.reportPrinters('', 'routing')).toEqual({ ok: false, error: 'NOT_PERMITTED' });
    const redirect = createSiteAgentAdminService({ api: apiWith() as never, viaServer: true, authorization: evalOnly(['print:job:redirect']) });
    expect((await redirect.reportPrinters('S1', 'redirect')).ok).toBe(true);
    const facilityDefault = createSiteAgentAdminService({ api: apiWith() as never, viaServer: true, authorization: evalOnly(['config:print-settings:manage']) });
    expect((await facilityDefault.reportPrinters('S1', 'facilityDefault')).ok).toBe(true);
  });
});

describe('Batch 553: update window, revoke reasons, hand-over', () => {
  it('the update window: none, or both times, valid and different', () => {
    expect(checkUpdateWindow(undefined)).toBeNull();
    expect(checkUpdateWindow({ start: '', end: '' })).toBeNull();
    expect(checkUpdateWindow({ start: '02:00', end: '' })).toBe('bothRequired');
    expect(checkUpdateWindow({ start: '2am', end: '04:00' })).toBe('timeInvalid');
    expect(checkUpdateWindow({ start: '24:00', end: '04:00' })).toBe('timeInvalid');
    expect(checkUpdateWindow({ start: '03:00', end: '03:00' })).toBe('sameTimes');
    expect(checkUpdateWindow({ start: '23:00', end: '02:00' })).toBeNull(); // across midnight
    expect(siteAgentConfigValid({ printers: [], shares: [], updateWindow: { start: '02:00', end: '' } })).toBe(false);
    expect(normaliseSiteAgentConfig({ siteId: 'S1', printers: [], shares: [], updateWindow: { start: ' ', end: '' } }).updateWindow).toBeUndefined();
    expect(normaliseSiteAgentConfig({ siteId: 'S1', printers: [], shares: [], updateWindow: { start: ' 02:00', end: '04:00 ' } }).updateWindow).toEqual({ start: '02:00', end: '04:00' });
  });
  it('revoke reasons: a listed code; a note only for "other", at most 500 characters', () => {
    expect(revokeReasonValid({ code: 'retired' })).toBe(true);
    expect(revokeReasonValid({ code: 'other' })).toBe(false);
    expect(revokeReasonValid({ code: 'other', note: 'Closed' })).toBe(true);
    expect(revokeReasonValid({ code: 'retired', note: 'x'.repeat(501) })).toBe(false);
    expect(revokeReasonValid(undefined)).toBe(false);
  });
  it('a pickup share hands to a listed import; the channels already used are suggested', () => {
    const share = (handTo: { kind: 'engineChannel'; channelId: string } | { kind: 'apiImport'; importKind: string }, id = 's1') => ({
      shareId: id, uncPath: '\\\\fs\\in', direction: 'pickup' as const,
      pickup: { pattern: '*.hl7', minStableSeconds: 30, maxFileMegabytes: 50, afterHandover: 'moveToProcessed' as const, rejectedFolder: 'rejected', handTo },
    });
    expect(checkAgentShares([share({ kind: 'apiImport', importKind: 'orders' })])).toEqual({});
    expect(checkAgentShares([share({ kind: 'apiImport', importKind: 'images' })])).toEqual({ 0: 'handToRequired' });
    expect(engineChannelSuggestions([share({ kind: 'engineChannel', channelId: 'ORM_IN' }), share({ kind: 'engineChannel', channelId: ' ADT_IN ' }, 's2'), share({ kind: 'engineChannel', channelId: 'ORM_IN' }, 's3'), share({ kind: 'apiImport', importKind: 'orders' }, 's4')]))
      .toEqual(['ADT_IN', 'ORM_IN']);
  });
});

describe('Batch 562: the sites the Print Queue line follows', () => {
  it('each site with an agent not revoked, once, sorted, blanks dropped', async () => {
    const { agentSiteIds } = await import('./siteAgentAdmin');
    expect(agentSiteIds([{ siteId: 'B' }, { siteId: 'A' }, { siteId: 'B' }, { siteId: ' ' }, { siteId: 'C', revokedAt: '2026-10-01T00:00:00Z' }])).toEqual(['A', 'B']);
  });
});
