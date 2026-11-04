import { describe, expect, it } from 'vitest';
import {
  addDays, boundPrinterFor, checkPresentedToken, checkWorkstationDraft, hashWorkstationToken, looksLikeWorkstationToken,
  newWorkstationToken, printRoutingInputFor, sortWorkstations, tokenHintOf, workstationState,
  WORKSTATION_NAME_MAX, WORKSTATION_TOKEN_LIFETIME_DAYS, type WorkstationRecord,
} from './workstationRegistryRules';

const rec = (over: Partial<WorkstationRecord> = {}): WorkstationRecord => ({
  id: 'ws-1', name: 'Grossing Station A', facilityId: 'f1', status: 'active', createdAt: '2026-01-01T00:00:00.000Z', createdBy: 'Admin',
  tokenHash: 'h1', tokenHint: 'abcd', tokenIssuedAt: '2026-01-01T00:00:00.000Z', tokenExpiresAt: '2027-01-01T00:00:00.000Z', ...over,
});
const fixedRandom = (n: number) => Uint8Array.from({ length: n }, (_, i) => i);

describe('tokens', () => {
  it('make a prefixed 48-character hex secret and a four-character hint', () => {
    const t = newWorkstationToken(fixedRandom);
    expect(t).toMatch(/^pswt_[0-9a-f]{48}$/);
    expect(looksLikeWorkstationToken(t)).toBe(true);
    expect(tokenHintOf(t)).toHaveLength(4);
  });
  it('refuse a string that is not shaped like a token', () => {
    expect(looksLikeWorkstationToken('hello')).toBe(false);
    expect(looksLikeWorkstationToken('pswt_xyz')).toBe(false);
  });
  it('hash to a stable 64-character digest that does not contain the token', async () => {
    const t = newWorkstationToken(fixedRandom);
    const h = await hashWorkstationToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hashWorkstationToken(t));
    expect(h).not.toContain(t.slice(5));
  });
});

describe('checkPresentedToken', () => {
  const now = '2026-06-01T00:00:00.000Z';
  it('accepts the current token', () => expect(checkPresentedToken(rec(), 'h1', now)).toBe('ok'));
  it('does not know a different token', () => expect(checkPresentedToken(rec(), 'zzz', now)).toBe('unknown'));
  it('refuses an expired token', () => expect(checkPresentedToken(rec(), 'h1', '2027-02-01T00:00:00.000Z')).toBe('expired'));
  it('refuses everything once revoked', () => {
    expect(checkPresentedToken(rec({ status: 'revoked' }), 'h1', now)).toBe('revoked');
  });
  it('accepts the previous token only during its grace period', () => {
    const w = rec({ tokenHash: 'h2', previousTokenHash: 'h1', previousValidUntil: '2026-06-02T00:00:00.000Z' });
    expect(checkPresentedToken(w, 'h1', now)).toBe('ok');
    expect(checkPresentedToken(w, 'h1', '2026-06-03T00:00:00.000Z')).toBe('unknown');
    expect(checkPresentedToken(w, 'h2', now)).toBe('ok');
  });
});

describe('workstationState', () => {
  it('is active, expiring soon, expired or revoked', () => {
    expect(workstationState(rec(), '2026-06-01T00:00:00.000Z')).toBe('active');
    expect(workstationState(rec(), addDays('2027-01-01T00:00:00.000Z', -10))).toBe('expiringSoon');
    expect(workstationState(rec(), '2027-03-01T00:00:00.000Z')).toBe('expired');
    expect(workstationState(rec({ status: 'revoked' }), '2026-06-01T00:00:00.000Z')).toBe('revoked');
  });
  it('treats a token as lasting a year', () => expect(WORKSTATION_TOKEN_LIFETIME_DAYS).toBe(365));
});

describe('checkWorkstationDraft', () => {
  const base = { name: 'Grossing Station A', facilityId: 'f1' };
  it('passes a plain draft', () => expect(checkWorkstationDraft(base, [])).toEqual([]));
  it('needs a name and a facility', () => {
    expect(checkWorkstationDraft({ name: '  ', facilityId: '' }, [])).toEqual(['NAME_REQUIRED', 'FACILITY_REQUIRED']);
  });
  it('limits the name length', () => {
    expect(checkWorkstationDraft({ ...base, name: 'x'.repeat(WORKSTATION_NAME_MAX + 1) }, [])).toContain('NAME_TOO_LONG');
  });
  it('refuses a name already used by an active workstation at the same facility, ignoring case and spacing', () => {
    expect(checkWorkstationDraft({ ...base, name: 'grossing  station a' }, [rec()])).toEqual(['NAME_TAKEN']);
  });
  it('allows the same name at another facility, after a revocation, or when editing itself', () => {
    expect(checkWorkstationDraft({ ...base, facilityId: 'f2' }, [rec()])).toEqual([]);
    expect(checkWorkstationDraft(base, [rec({ status: 'revoked' })])).toEqual([]);
    expect(checkWorkstationDraft(base, [rec()], 'ws-1')).toEqual([]);
  });
  it('needs a functional area to belong to the chosen discipline', () => {
    expect(checkWorkstationDraft({ ...base, discipline: 'HISTOLOGY', functionalArea: 'Grossing' }, [])).toEqual([]);
    expect(checkWorkstationDraft({ ...base, discipline: 'CYTOLOGY', functionalArea: 'Grossing' }, [])).toEqual(['AREA_NOT_IN_DISCIPLINE']);
    expect(checkWorkstationDraft({ ...base, functionalArea: 'Grossing' }, [])).toEqual(['AREA_NOT_IN_DISCIPLINE']);
  });
});

describe('print routing', () => {
  it('gives the workstation tier its id, facility and point of care', () => {
    expect(printRoutingInputFor(rec({ pointOfCare: 'GROSS-1' }))).toEqual({ workstationId: 'ws-1', facilityId: 'f1', pointOfCare: 'GROSS-1' });
  });
  it('gives nothing for an unknown or revoked workstation', () => {
    expect(printRoutingInputFor(undefined)).toEqual({});
    expect(printRoutingInputFor(rec({ status: 'revoked' }))).toEqual({});
  });
  it('names the bound printer for a purpose, only while active', () => {
    const w = rec({ reportPrinterId: 'p-report', labelPrinterId: 'p-label' });
    expect(boundPrinterFor(w, 'report')).toBe('p-report');
    expect(boundPrinterFor(w, 'label')).toBe('p-label');
    expect(boundPrinterFor({ ...w, status: 'revoked' }, 'report')).toBeUndefined();
  });
});

describe('sortWorkstations', () => {
  it('lists active ones first, then by facility and name', () => {
    const list = [rec({ id: 'a', name: 'B', status: 'revoked' }), rec({ id: 'b', name: 'Z' }), rec({ id: 'c', name: 'A' })];
    expect(sortWorkstations(list).map(w => w.id)).toEqual(['c', 'b', 'a']);
  });
});
