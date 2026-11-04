// Batch 742: what the Attachments window lists and where an item is placed (Pete, Release 1 §2B).
import { describe, expect, it } from 'vitest';
import {
  attachmentCount, buildAttachmentRows, defaultPlacementSection, layoutSectionIds, placementItemFor, placementSections,
  placementsAtReportEnd, placementsInSection, REPORT_END_SECTION_ID, reportLayoutSections, rowsInGroup,
} from './attachmentCatalog';
import { reportEditStateFor } from './reportEditState';
import type { CaseAttachment } from '@/types/caseAttachments/CaseAttachment';
import type { CaseReportImage } from '../imageAssociation/caseReportImages';

const photo = (id: string, kind: 'gross_photo' | 'block_face_photo' | 'wsi_scan', url?: string) => ({ id, kind, url, capturedAt: '2026-10-30T09:00:00Z', capturedBy: 'Connor Whitlock' });
const CASE = {
  specimens: [{
    id: 'sp1', label: 'A',
    digitalAssets: [photo('g1', 'gross_photo', 'https://imaging.hospital.org/g1.jpg'), photo('g2', 'gross_photo'), photo('w1', 'wsi_scan', 'https://ims/1')],
    blocks: [{ id: 'b1', label: '3', digitalAssets: [photo('bf1', 'block_face_photo', '/demo/attachments/a3.png')] }],
  }],
  intraoperativeFindings: [{ intraopSpecimenId: 'is1', specimenLabel: 'Frozen A', photos: [photo('io1', 'gross_photo', 'https://imaging.hospital.org/io1.jpg')] }],
};
const ATT: CaseAttachment = {
  id: 'att1', caseId: 'C1', accession: 'S26-4680', sourceType: 'external_link', origin: 'upload', pointer: { kind: 'objectKey', storageId: 's', objectKey: 'k' },
  fileName: 'Brennick consult.pdf', mimeType: 'application/pdf', sourceSystemId: 's', createdAt: '2026-10-30T10:00:00Z', createdBy: 'Dr J', status: 'linked',
};
const placed = (over: Partial<CaseReportImage>): CaseReportImage => ({
  id: 'p1', caseId: 'C1', accession: 'S26-4680', imageType: 'Gross Specimen', caption: 'Opened colon', imageUrl: '', sourceSystemId: '', attachedAt: '', attachedBy: '', ...over,
});

describe('buildAttachmentRows', () => {
  it('lists the case photos where they are (no copy) and the attachments, in the four groups', () => {
    const rows = buildAttachmentRows(CASE, [ATT], []);
    expect(rows.map(r => [r.group, r.kind, r.ownerLabel ?? null])).toEqual([
      ['gross', 'grossPhoto', 'A'], ['gross', 'blockFacePhoto', 'A3'], ['intraop', 'intraopPhoto', 'Frozen A'], ['external', 'uploadedFile', null],
    ]);
    expect(rows[1]).toMatchObject({ imageType: 'Block Face', mimeType: 'image/png', imageUrl: '/demo/attachments/a3.png', sourceSystemId: '' });
    expect(rows[3]).toMatchObject({ fileName: 'Brennick consult.pdf', imageUrl: '', attachmentId: 'att1', mimeType: 'application/pdf' });
    expect(rowsInGroup(rows, 'slide')).toEqual([]);
    expect(attachmentCount(rows)).toBe(4);
    expect(attachmentCount(buildAttachmentRows(null, [], []))).toBe(0);
  });

  it('says where a row is in the report', () => {
    const rows = buildAttachmentRows(CASE, [ATT], [
      placed({ id: 'p1', origin: { kind: 'caseAsset', assetId: 'g1' }, sectionId: 'gross', sectionLabel: 'Gross Description' }),
      placed({ id: 'p2', origin: { kind: 'attachment', attachmentId: 'att1' }, caption: '' }),
    ]);
    expect(rows[0].placement).toEqual({ imageId: 'p1', sectionLabel: 'Gross Description', caption: 'Opened colon' });
    expect(rows[3].placement).toEqual({ imageId: 'p2', caption: '' });
    expect(rows[1].placement).toBeUndefined();
  });

  it('makes the placement for a ticked row, with its caption', () => {
    const [row] = buildAttachmentRows(CASE, [], []);
    expect(placementItemFor(row, '  Tumour at 12 cm ')).toEqual({
      origin: { kind: 'caseAsset', assetId: 'g1' }, imageUrl: 'https://imaging.hospital.org/g1.jpg', imageType: 'Gross Specimen',
      sourceSystemId: 'imaging.hospital.org', mimeType: 'image/jpeg', caption: 'Tumour at 12 cm',
    });
    expect(placementItemFor(row, ' ').caption).toBeUndefined();
  });
});

describe('where to place', () => {
  const layout = [{ id: 'gross', label: 'Gross Description' }, { id: 'syn', label: 'Synoptic', type: 'synoptic' }, { id: 'dx', label: 'Diagnosis' }];

  it('offers the narrative sections and the end of the report text; none for a report that prints images after its pages', () => {
    expect(placementSections(layout, true, 'End of the report text')).toEqual([
      { id: 'gross', label: 'Gross Description' }, { id: 'dx', label: 'Diagnosis' }, { id: REPORT_END_SECTION_ID, label: 'End of the report text' },
    ]);
    expect(placementSections([], true, 'End')).toEqual([{ id: REPORT_END_SECTION_ID, label: 'End' }]);
    expect(placementSections(layout, false, 'End')).toEqual([]);
  });

  it('pre-selects the section being worked in, then the last one used, then the first', () => {
    const options = placementSections(layout, true, 'End');
    expect(defaultPlacementSection(options, 'dx', 'gross')).toBe('dx');
    expect(defaultPlacementSection(options, 'syn', 'gross')).toBe('gross');
    expect(defaultPlacementSection(options, null, 'gone')).toBe('gross');
    expect(defaultPlacementSection([], 'dx', null)).toBeNull();
  });

  it('finds the layout sections and what prints at the end (placed there, or under a section the layout lacks)', () => {
    const ids = layoutSectionIds([{ nodes: [{ type: 'section', id: 'gross' }, { type: 'if-block', children: [{ type: 'section', id: 'micro' }], elseChildren: [{ type: 'section', id: 'alt' }] }] }]);
    expect([...ids].sort()).toEqual(['alt', 'gross', 'micro']);
    const list = [placed({ id: 'a', sectionId: 'gross' }), placed({ id: 'b', sectionId: REPORT_END_SECTION_ID }), placed({ id: 'c', sectionId: 'old' }), placed({ id: 'd' })];
    expect(placementsInSection(list, 'gross').map(p => p.id)).toEqual(['a']);
    expect(placementsAtReportEnd(list, ids).map(p => p.id)).toEqual(['b', 'c']);
  });
});

describe('reportLayoutSections', () => {
  it('lists each section node once, with its printed heading, however deep', () => {
    expect(reportLayoutSections([{ nodes: [
      { type: 'section', id: 'gross', label: 'gross_description', printHeading: 'Gross Description' },
      { type: 'if-block', children: [{ type: 'section', id: 'micro', label: 'Microscopic Description' }] },
      { type: 'section', id: 'blank', label: ' ' }, { type: 'section', id: 'gross', printHeading: 'Again' },
    ] }])).toEqual([{ id: 'gross', label: 'Gross Description' }, { id: 'micro', label: 'Microscopic Description' }]);
    expect(reportLayoutSections(undefined)).toEqual([]);
  });
});

describe('reportEditStateFor', () => {
  it('a signed report changes only with an amendment or addendum in draft', () => {
    expect(reportEditStateFor('draft', [])).toEqual({ signed: false, amendmentOpen: false });
    expect(reportEditStateFor('finalized', [{ status: 'released' }])).toEqual({ signed: true, amendmentOpen: false });
    expect(reportEditStateFor('pending-release', [{ status: 'draft' }])).toEqual({ signed: true, amendmentOpen: true });
    expect(reportEditStateFor('draft', [], 'assist')).toEqual({ signed: false, amendmentOpen: false, lisOwnsReport: true });
    expect(reportEditStateFor('draft', [], 'orchestrator').lisOwnsReport).toBeUndefined();
  });
});
