// src/services/digitalPathology/slideImages.test.ts — Batch 750 (S10): addresses, image states and the thumbnail.
import { describe, expect, it } from 'vitest';
import {
  CYTOLOGY_WSI_SCAN, DEFAULT_SLIDE_IMAGE_SETTINGS, accessionOfSlideId, effectiveAddresses, fillTemplate, listedViewerTemplate,
  previewUrlUsable, slideImageState, slideImageView, stateHasImage, templateProblem, thumbnailUrlFor, validateSlideImageSettings,
  type SlidePreview,
} from './slideImages';

const NONE = { viewerUrlTemplate: '', thumbnailUrlTemplate: '' };
const LAB = { viewerUrlTemplate: 'https://dp.lab.example/open?slide={{slideId}}', thumbnailUrlTemplate: 'https://img.lab.example/t/{{slideId}}.jpg' };
const values = { slideId: 'S26-5404-B1-L1', accession: 'S26-5404' };

describe('address templates', () => {
  it('accepts https with {{slideId}}, and blank', () => {
    expect(templateProblem('')).toBeNull();
    expect(templateProblem(LAB.viewerUrlTemplate)).toBeNull();
    expect(templateProblem('https://dp.example.org/case/{{accession}}/slide/{{slideId}}')).toBeNull();
  });
  it('refuses http, no slide placeholder, an unknown placeholder, and credentials', () => {
    expect(templateProblem('http://dp.example.org/{{slideId}}')).toBe('notHttps');
    expect(templateProblem('/viewer/{{slideId}}')).toBe('notHttps');
    expect(templateProblem('https://localhost/{{slideId}}')).toBe('notHttps');
    expect(templateProblem('https://dp.example.org/open?case={{accession}}')).toBe('noSlidePlaceholder');
    expect(templateProblem('https://dp.example.org/{{slideId}}?p={{patientName}}')).toBe('unknownPlaceholder');
    expect(templateProblem('https://user:pw@dp.example.org/{{slideId}}')).toBe('credentials');
  });
  it('fills in encoded values, or nothing when the template or slide is missing', () => {
    expect(fillTemplate('https://dp.example.org/o?s={{slideId}}&c={{accession}}', { slideId: 'S26 1/A', accession: 'S26-1' }))
      .toBe('https://dp.example.org/o?s=S26%201%2FA&c=S26-1');
    expect(fillTemplate('', values)).toBe('');
    expect(fillTemplate(LAB.viewerUrlTemplate, { slideId: ' ', accession: '' })).toBe('');
    expect(fillTemplate('http://dp.example.org/{{slideId}}', values)).toBe('');
  });
});

describe('which address applies', () => {
  const settings = { ...LAB, facilityOverrides: { c2: { viewerUrlTemplate: 'https://dp.north.example/{{slideId}}', thumbnailUrlTemplate: '' } } };
  const deployment = { viewerUrlTemplate: 'https://dp.deploy.example/{{slideId}}', thumbnailUrlTemplate: 'https://img.deploy.example/{{slideId}}' };
  it('facility, then laboratory, then the viewer list (opening only), then the deployment', () => {
    expect(effectiveAddresses(settings, 'c2', deployment).viewerUrlTemplate).toBe('https://dp.north.example/{{slideId}}');
    expect(effectiveAddresses(settings, 'c2', deployment).thumbnailUrlTemplate).toBe(LAB.thumbnailUrlTemplate);
    expect(effectiveAddresses(settings, 'c1', deployment)).toEqual(LAB);
    expect(effectiveAddresses(undefined, 'c1', deployment, 'https://dp.list.example/{{slideId}}')).toEqual({
      viewerUrlTemplate: 'https://dp.list.example/{{slideId}}', thumbnailUrlTemplate: deployment.thumbnailUrlTemplate,
    });
    expect(effectiveAddresses(undefined, undefined, deployment)).toEqual(deployment);
    expect(effectiveAddresses(DEFAULT_SLIDE_IMAGE_SETTINGS, undefined, NONE)).toEqual(NONE);
  });
  it('passes over a template with a problem', () => {
    expect(effectiveAddresses({ ...DEFAULT_SLIDE_IMAGE_SETTINGS, viewerUrlTemplate: 'http://bad.example/{{slideId}}' }, undefined, deployment).viewerUrlTemplate)
      .toBe(deployment.viewerUrlTemplate);
  });
  it('reads the WSI Viewers list in this template’s terms, skipping entries without a usable address', () => {
    expect(listedViewerTemplate([{ launchUrlTemplate: '' }, { launchUrlTemplate: 'https://v.example.org/view?id={{wsiUniqueId}}' }]))
      .toBe('https://v.example.org/view?id={{slideId}}');
    expect(listedViewerTemplate([{ launchUrlTemplate: 'https://v.example.org/landing' }])).toBe('');
  });
});

describe('settings check', () => {
  it('trims, drops empty facilities, and reports each problem', () => {
    const ok = validateSlideImageSettings({ ...LAB, viewerUrlTemplate: ` ${LAB.viewerUrlTemplate} `, facilityOverrides: { c1: { viewerUrlTemplate: ' ', thumbnailUrlTemplate: '' } } });
    expect(ok).toEqual({ ok: true, settings: { ...LAB, facilityOverrides: {} } });
    const bad = validateSlideImageSettings({ ...LAB, thumbnailUrlTemplate: 'http://x.example/{{slideId}}', facilityOverrides: { c2: { viewerUrlTemplate: 'https://x.example/' } } });
    expect(bad).toEqual({ ok: false, errors: [
      { scope: 'lab', field: 'thumbnailUrlTemplate', problem: 'notHttps' },
      { scope: 'c2', field: 'viewerUrlTemplate', problem: 'noSlidePlaceholder' },
    ] });
  });
});

describe('image state', () => {
  it('reads the scanner status in plain words', () => {
    expect(slideImageState({})).toBe('noImageYet');
    expect(slideImageState({ distributionStatus: 'Assigned' })).toBe('noImageYet');
    expect(slideImageState({ distributionStatus: 'In Scanning Queue' })).toBe('queued');
    expect(slideImageState({ distributionStatus: 'In Scanning Queue', lastScanOutcome: 'notScanned' })).toBe('queued');
    expect(slideImageState({ distributionStatus: 'In Scanning Queue', lastScanOutcome: 'scanFailed' })).toBe('scanFailed');
    expect(slideImageState({ distributionStatus: 'In Scanning Queue', lastScanOutcome: 'imageQcFailed' })).toBe('failedImageQuality');
    expect(slideImageState({ distributionStatus: 'Loaded on Scanner' })).toBe('scanning');
    expect(slideImageState({ distributionStatus: 'Scanned' })).toBe('available');
    expect(slideImageState(CYTOLOGY_WSI_SCAN)).toBe('available');
  });
  it('a failed-quality image is still shown (marked); the others have none', () => {
    expect(['available', 'failedImageQuality'].every(s => stateHasImage(s as never))).toBe(true);
    expect(['noImageYet', 'queued', 'scanning', 'scanFailed'].some(s => stateHasImage(s as never))).toBe(false);
  });
});

describe('thumbnail', () => {
  const delivered: SlidePreview = { id: 'p1', slideDisplayId: values.slideId, imageUrl: 'https://scanner.lab.example/p1.jpg', sourceSystemId: 'scanner-1', receivedAt: '2026-10-31T10:00:00Z' };
  it('a delivered image first, as delivered; else the template; none without an image', () => {
    expect(thumbnailUrlFor('available', delivered, LAB, values)).toBe(delivered.imageUrl);
    expect(thumbnailUrlFor('available', null, LAB, values)).toBe('https://img.lab.example/t/S26-5404-B1-L1.jpg');
    expect(thumbnailUrlFor('failedImageQuality', null, LAB, values)).toBe('https://img.lab.example/t/S26-5404-B1-L1.jpg');
    expect(thumbnailUrlFor('queued', delivered, LAB, values)).toBe('');
    expect(thumbnailUrlFor('available', null, NONE, values)).toBe('');
  });
  it('a delivered address must be https or an inline JPEG or PNG', () => {
    expect(previewUrlUsable('data:image/png;base64,iVBOR')).toBe(true);
    expect(previewUrlUsable('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(previewUrlUsable('http://scanner.lab.example/p.jpg')).toBe(false);
    expect(previewUrlUsable('javascript:alert(1)')).toBe(false);
    expect(thumbnailUrlFor('available', { ...delivered, imageUrl: 'http://x.example/p.jpg' }, LAB, values)).toBe('https://img.lab.example/t/S26-5404-B1-L1.jpg');
  });
  it('the view for the screen', () => {
    expect(slideImageView({ distributionStatus: 'In Scanning Queue', lastScanOutcome: 'imageQcFailed' }, null, LAB, values))
      .toEqual({ state: 'failedImageQuality', thumbnailUrl: 'https://img.lab.example/t/S26-5404-B1-L1.jpg', failedQuality: true });
  });
  it('finds the case of a slide identifier', () => {
    expect(accessionOfSlideId('S26-5404-B1-L1')).toBe('S26-5404');
    expect(accessionOfSlideId('slide')).toBe('');
  });
});
