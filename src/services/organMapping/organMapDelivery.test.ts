// src/services/organMapping/organMapDelivery.test.ts — Batch 751 (spec section 12.3): the organ map delivery rules.
import { describe, expect, it, vi } from 'vitest';
import { mockCaseService } from '../cases/mockCaseService';
import {
  DEFAULT_ORGAN_MAP_DELIVERY, organMapDeliveryChangeDetail, organMapDeliveryOf, organMapFileName, organMapFileSentAt, organMapForDelivery,
  validateOrganMapDelivery,
} from './organMapDelivery';

const t = ((k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k)) as never;

describe('organ map delivery settings', () => {
  it('off by default; a file needs a destination, and the destination never holds a sign-in', () => {
    expect(organMapDeliveryOf(undefined)).toEqual(DEFAULT_ORGAN_MAP_DELIVERY);
    expect(DEFAULT_ORGAN_MAP_DELIVERY.mode).toBe('off');
    expect(validateOrganMapDelivery({ mode: 'text', fileFormat: 'png', destination: '' })).toEqual({ ok: true, settings: { mode: 'text', fileFormat: 'png', destination: '' } });
    expect(validateOrganMapDelivery({ mode: 'textAndFile', fileFormat: 'pdf', destination: ' ' })).toEqual({ ok: false, problem: 'destinationRequired' });
    expect(validateOrganMapDelivery({ mode: 'textAndFile', fileFormat: 'png', destination: 'sftp://lis:secret@files.lab.example/maps' })).toEqual({ ok: false, problem: 'destinationCredentials' });
    expect(validateOrganMapDelivery({ mode: 'textAndFile', fileFormat: 'png', destination: 'x'.repeat(301) })).toEqual({ ok: false, problem: 'destinationTooLong' });
    expect(validateOrganMapDelivery({ mode: 'sometimes' as never, fileFormat: 'png', destination: '' })).toEqual({ ok: false, problem: 'unknownMode' });
    expect(validateOrganMapDelivery({ mode: 'textAndFile', fileFormat: 'gif' as never, destination: 'D:\\maps' })).toEqual({ ok: false, problem: 'unknownFormat' });
    expect(validateOrganMapDelivery({ mode: 'text', fileFormat: 'png', destination: 'sftp://lis:secret@files.lab.example/maps' })).toEqual({ ok: true, settings: { mode: 'text', fileFormat: 'png', destination: '' } });
    expect(validateOrganMapDelivery({ mode: 'textAndFile', fileFormat: 'png', destination: ' \\\\lis-share\\organ-maps ' })).toEqual({ ok: true, settings: { mode: 'textAndFile', fileFormat: 'png', destination: '\\\\lis-share\\organ-maps' } });
  });
  it('audit wording', () => {
    expect(organMapDeliveryChangeDetail('Desert Valley', 'c-ent-dvmc', DEFAULT_ORGAN_MAP_DELIVERY, { mode: 'textAndFile', fileFormat: 'pdf', destination: 'channel:organ-maps' }))
      .toBe('Organ map delivery for facility Desert Valley (c-ent-dvmc): off → text and PDF file to channel:organ-maps.');
  });
  it('file names carry the accession, the map type and the time, never a patient name', () => {
    expect(organMapFileName('S26-5405', 'rectalResection', '2026-10-31T18:04:05.123Z', 'png')).toBe('S26-5405_rectalResection_20261031T180405Z.png');
    expect(organMapFileName('S26/5405 A', 'mohsStages', '2026-10-31T18:04:05Z', 'pdf')).toBe('S26_5405_A_mohsStages_20261031T180405Z.pdf');
  });
  it('the panel line: only the latest file for the workup, and only once it was sent', () => {
    const e = (kind: string, instanceId: string, status: string, queuedAt: string, lastAttemptAt?: string) => ({ kind, instanceId, status, queuedAt, lastAttemptAt });
    expect(organMapFileSentAt([e('final', 'i1', 'SENT', 'a'), e('organ_map', 'i1', 'SENT', 'b', 'b2')], 'i1')).toBe('b2');
    expect(organMapFileSentAt([e('organ_map', 'i1', 'SENT', 'b'), e('organ_map', 'i1', 'FAILED', 'c')], 'i1')).toBeUndefined();
    expect(organMapFileSentAt([e('organ_map', 'i2', 'SENT', 'b')], 'i1')).toBeUndefined();
  });
});

describe('the map drawn for delivery (the Assist demo case S26-5405)', () => {
  it('Text only: the areas with findings as lines; Text and image file: a file named after the case; off: nothing', async () => {
    const c = (await mockCaseService.getCase('S26-5405'))!;
    const instance = c.synopticReports![0] as never;
    const drawFile = vi.fn(async (_svg: string, _format: string) => ({ base64: 'iVBORw0KGgo=' }));
    expect(await organMapForDelivery(c, instance, DEFAULT_ORGAN_MAP_DELIVERY, '2026-10-31T18:00:00Z', { t, drawFile })).toBeNull();
    const text = await organMapForDelivery(c, instance, { mode: 'text', fileFormat: 'png', destination: '' }, '2026-10-31T18:00:00Z', { t, drawFile });
    expect(text?.mapType).toBe('rectalResection');
    expect(text?.lines.length).toBeGreaterThan(0);
    expect(text?.file).toBeUndefined();
    expect(drawFile).not.toHaveBeenCalled();
    const withFile = await organMapForDelivery(c, instance, { mode: 'textAndFile', fileFormat: 'png', destination: 'maps' }, '2026-10-31T18:00:00Z', { t, drawFile });
    expect(withFile?.file).toMatchObject({ fileName: 'S26-5405_rectalResection_20261031T180000Z.png', contentType: 'image/png', base64: 'iVBORw0KGgo=' });
    expect(withFile?.file?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(drawFile.mock.calls[0][0]).toContain('<svg');
    const noCanvas = await organMapForDelivery(c, instance, { mode: 'textAndFile', fileFormat: 'pdf', destination: 'maps' }, '2026-10-31T18:00:00Z', { t, drawFile: async () => undefined });
    expect(noCanvas?.file).toBeUndefined();
    expect(noCanvas?.fileProblem).toBeTruthy();
  });
  it('a Mohs map sends its stage lines', async () => {
    const c = (await mockCaseService.getCase('S26-4463'))!;
    const r = await organMapForDelivery(c, c.synopticReports![0] as never, { mode: 'text', fileFormat: 'png', destination: '' }, '2026-10-31T18:00:00Z', { t, drawFile: async () => undefined });
    expect(r?.mapType).toBe('mohsStages');
    expect(r?.lines.length).toBe(2);
  });
});
