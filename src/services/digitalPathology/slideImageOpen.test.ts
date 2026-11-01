// src/services/digitalPathology/slideImageOpen.test.ts — Batch 750 (S10): permission, address and audit for opening a slide.
import { describe, expect, it, vi } from 'vitest';
import { hostOf, prepareSlideImageOpen, recordSlideImageOpened } from './slideImageOpen';

const allow = (allowed: boolean) => ({ enforce: vi.fn().mockResolvedValue({ allowed }) });
const NONE = { viewerUrlTemplate: '', thumbnailUrlTemplate: '' };
const input = { slideDisplayId: 'S26-5404-C1-L1', accession: 'S26-5404', caseId: 'S26-5404', facilityId: 'c1' };
const settings = { viewerUrlTemplate: 'https://dp.lab.example/open?slide={{slideId}}&case={{accession}}', thumbnailUrlTemplate: '', facilityOverrides: {} };

describe('prepareSlideImageOpen', () => {
  it('checks case:slide-image:open for the case and facility before building the address', async () => {
    const authorization = allow(true);
    const r = await prepareSlideImageOpen({ ...input, settings }, { authorization, deploymentDefaults: NONE });
    expect(authorization.enforce).toHaveBeenCalledWith('case:slide-image:open', { caseId: 'S26-5404', facilityId: 'c1' });
    expect(r).toEqual({ ok: true, url: 'https://dp.lab.example/open?slide=S26-5404-C1-L1&case=S26-5404' });
  });
  it('refuses without the permission, whatever is configured', async () => {
    expect(await prepareSlideImageOpen({ ...input, settings }, { authorization: allow(false), deploymentDefaults: NONE })).toEqual({ ok: false, reason: 'notPermitted' });
  });
  it('says when no address is set anywhere', async () => {
    expect(await prepareSlideImageOpen(input, { authorization: allow(true), deploymentDefaults: NONE })).toEqual({ ok: false, reason: 'noAddress' });
  });
  it('uses the WSI Viewers list when nothing else is set', async () => {
    const r = await prepareSlideImageOpen({ ...input, listedViewerTemplate: 'https://v.example.org/view?id={{slideId}}' }, { authorization: allow(true), deploymentDefaults: NONE });
    expect(r).toEqual({ ok: true, url: 'https://v.example.org/view?id=S26-5404-C1-L1' });
  });
});

describe('recordSlideImageOpened', () => {
  it('audits who, which slide, the case and the host; never a patient name', async () => {
    const audit = { logEvent: vi.fn().mockResolvedValue(undefined) };
    recordSlideImageOpened({ slideDisplayId: 'S26-5404-C1-L1', caseId: 'S26-5404', user: 'PATH-SJ-001', host: hostOf('https://dp.lab.example/open?slide=x') }, { audit });
    expect(audit.logEvent).toHaveBeenCalledWith({
      type: 'user', event: 'Slide Image Opened', caseId: 'S26-5404', user: 'PATH-SJ-001', confidence: null,
      detail: "Opened slide S26-5404-C1-L1 in the laboratory's digital pathology application (dp.lab.example).",
    });
  });
  it('a failed audit write does not throw', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const audit = { logEvent: vi.fn().mockRejectedValue(new Error('down')) };
    expect(() => recordSlideImageOpened({ slideDisplayId: 's', caseId: 'c', user: 'u', host: '' }, { audit })).not.toThrow();
    await new Promise(r => setTimeout(r, 0));
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
  it('hostOf copes with a bad address', () => { expect(hostOf('not a url')).toBe(''); });
});
