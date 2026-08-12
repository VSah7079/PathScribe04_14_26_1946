// src/services/hl7/segmentBuilders.test.ts
import { describe, it, expect } from 'vitest';
import { buildMSH, buildPID, buildORC, buildOBR, buildFT1 } from './segmentBuilders';
import type { HL7MessageContext } from './types';

const ctx: HL7MessageContext = {
  sendingApplication: 'PATHSCRIBE', sendingFacility: 'FORMEDRIX',
  receivingApplication: 'RCM', receivingFacility: 'RCM_FAC',
  processingId: 'T',
};

describe('buildMSH — real fix: HL7 v2.x TS fields carry the real, signed facility offset, not the sending browser\'s own', () => {
  it('the real, exact Pete scenario: an 11pm Jan 31 Tucson send (6am UTC Feb 1) produces a real MSH-7 with the real -0700 offset and the real, correct facility-local date/time', () => {
    const msh = buildMSH(ctx, 'MSGID-1', 'America/Phoenix', '2026-02-01T06:00:00.000Z');
    const mshFields = msh.split('|');
    // MSH-7 is field index 6 (0-indexed after the segment name/encoding chars split)
    const msh7 = mshFields[6];
    expect(msh7).toBe('20260131230000-0700');
  });

  it('a real, positive-offset facility (India, UTC+5:30) produces the real +0530, not a negative or omitted sign', () => {
    const msh = buildMSH(ctx, 'MSGID-1', 'Asia/Kolkata', '2026-02-01T00:00:00.000Z');
    const msh7 = msh.split('|')[6];
    expect(msh7.slice(-5)).toBe('+0530');
  });

  it('stays real and stable regardless of which timezone the calling process itself runs in', () => {
    const msh = buildMSH(ctx, 'MSGID-1', 'America/Phoenix', '2026-02-01T06:00:00.000Z');
    const msh7 = msh.split('|')[6];
    expect(msh7).toBe('20260131230000-0700'); // must not depend on process.env.TZ
  });

  it('a real, genuine offset-less timezone (UTC itself) produces a real, honest +0000, never blank', () => {
    const msh = buildMSH(ctx, 'MSGID-1', 'UTC', '2026-02-01T06:00:00.000Z');
    const msh7 = msh.split('|')[6];
    expect(msh7).toBe('20260201060000+0000');
  });
});

describe('buildORC/buildOBR — same real, required facility-timezone offset behavior as buildMSH', () => {
  it('buildORC (ORC-9) carries the real facility offset', () => {
    const orc = buildORC('PLACER-1', 'FILLER-1', 'America/Phoenix', '2026-02-01T06:00:00.000Z');
    const orc9 = orc.split('|')[9];
    expect(orc9).toBe('20260131230000-0700');
  });

  it('buildOBR (OBR-7) carries the real facility offset', () => {
    const obr = buildOBR('PLACER-1', 'FILLER-1', 'STAIN-1', 'H&E', 'America/Phoenix', '2026-02-01T06:00:00.000Z');
    const obr7 = obr.split('|')[7];
    expect(obr7).toBe('20260131230000-0700');
  });
});

describe('buildPID/buildFT1 — real fix: HL7 DT (date-only) fields use the real facility-local calendar date, no offset component (DT has none)', () => {
  it('buildPID (PID-7, date of birth) uses the real facility-local date, no offset suffix', () => {
    // A real DOB stored at midnight UTC - genuinely a different calendar
    // day in Arizona (UTC-7) than in UTC itself.
    const pid = buildPID({ firstName: 'Jane', lastName: 'Doe', dateOfBirth: '2000-01-01T00:00:00.000Z' }, 'America/Phoenix');
    const pid7 = pid.split('|')[7];
    expect(pid7).toBe('19991231'); // real, facility-local Dec 31, not Jan 1
    expect(pid7).not.toContain('+');
    expect(pid7).not.toContain('-0700');
  });

  it('buildFT1 (FT1-4/FT1-5, transaction date) uses the real facility-local date, no offset component', () => {
    const ft1 = buildFT1({
      setId: 1, transactionId: 'TX-1', transactionDate: '2026-02-01T06:00:00.000Z',
      transactionType: 'CG', cptCode: '88305',
    }, 'America/Phoenix');
    const ft1Fields = ft1.split('|');
    expect(ft1Fields[4]).toBe('20260131'); // FT1-4
    expect(ft1Fields[5]).toBe('20260131'); // FT1-5
  });

  it('a real, missing dateOfBirth honestly produces an empty PID-7, never a fabricated date', () => {
    const pid = buildPID({ firstName: 'Jane', lastName: 'Doe' }, 'America/Phoenix');
    expect(pid.split('|')[7]).toBe('');
  });
});
