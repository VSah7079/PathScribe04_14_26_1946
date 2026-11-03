// Batch 762: the ingestion rules (spec §2.1, §2.2), and the page images of the demo scans.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { barcodeLookupKeys, groupPages, inFacility, isIngestiblePdf, latestRunPerSource, pageAddress, pagesInRange, requisitionSourceProblems, runOutcome, sourceFacilityIds, sourceLocationValid, requisitionOriginOf, expectationFor, requisitionIsMissing, unmatchedIsOverdue, DEFAULT_REQUISITION_EXPECTATION } from './requisitionRules';
import { luminanceOf } from './demoRequisitionEngine';
import { pageJpegs } from './requisitionPages';

describe('requisition rules (Batch 762)', () => {
  it('takes PDFs only', () => {
    expect(isIngestiblePdf('REQ-1.pdf', 'application/pdf')).toBe(true);
    expect(isIngestiblePdf('REQ-1.PDF')).toBe(true);
    expect(isIngestiblePdf('REQ-1.tif', 'image/tiff')).toBe(false);
    expect(isIngestiblePdf('REQ-1.pdf', 'image/jpeg')).toBe(false);
  });

  it('groups pages: a continuation page joins the requisition before it, a separator ends it, a new barcode starts one', () => {
    expect(groupPages([['S26-0001'], [], ['PATHSCRIBE-SEPARATOR'], ['S26-4403']])).toEqual([
      { barcode: 'S26-0001', pages: { from: 1, to: 2 } },
      { barcode: 'S26-4403', pages: { from: 4, to: 4 } },
    ]);
    expect(groupPages([['S26-0001'], ['S26-4403'], ['S26-4403']])).toEqual([
      { barcode: 'S26-0001', pages: { from: 1, to: 1 } },
      { barcode: 'S26-4403', pages: { from: 2, to: 3 } },
    ]);
    // Pages before any barcode, or after a separator with no barcode, are a group with none (they go to the Unmatched queue).
    expect(groupPages([[], ['SEP'], []], 'sep')).toEqual([{ pages: { from: 1, to: 1 } }, { pages: { from: 3, to: 3 } }]);
  });

  it('looks a label up as given, then without its container suffix', () => {
    expect(barcodeLookupKeys(' s26-4403-a ')).toEqual(['S26-4403-A', 'S26-4403']);
    expect(barcodeLookupKeys('S26-4403')).toEqual(['S26-4403']);
  });

  it('opens a PDF at the first page of the range', () => {
    expect(pageAddress('/x.pdf#zoom=2', { from: 3, to: 4 })).toBe('/x.pdf#page=3');
  });

  it('takes one JPEG page image out of each page of the demo scans', async () => {
    const dir = join(__dirname, '../../../public/demo-requisitions');
    const one = await pageJpegs(readFileSync(join(dir, 'REQ-BATCH-0001.pdf')));
    expect(one).toHaveLength(4);
    for (const img of one) expect(img && [img[0], img[1]]).toEqual([0xff, 0xd8]);
    expect(await pageJpegs(readFileSync(join(dir, 'REQ-BATCH-0002.pdf')))).toHaveLength(3);
    await expect(pageJpegs(new TextEncoder().encode('not a pdf'))).rejects.toThrow();
  });

  it('takes the pages of a range, says how a run went, and checks a source', () => {
    expect(pagesInRange(['p1', 'p2', 'p3', 'p4'], { from: 2, to: 3 })).toEqual(['p2', 'p3']);
    expect(runOutcome({ files: 2, matched: 2, unmatched: 0, rejected: [] })).toBe('allLinked');
    expect(runOutcome({ files: 0, matched: 0, unmatched: 0, rejected: [] })).toBe('nothingNew');
    expect(runOutcome({ files: 3, matched: 1, unmatched: 0, rejected: [{}] })).toBe('needsAttention');
    expect(requisitionSourceProblems({ name: 'Scanner', location: '\\\\s\\in', separatorBarcode: 'SEP', scheduleMinutes: 15 })).toEqual([]);
    expect(requisitionSourceProblems({ name: ' ', location: '', separatorBarcode: '', scheduleMinutes: 1.5 })).toEqual(['name', 'location', 'separatorBarcode', 'scheduleMinutes']);
  });

  it('turns page pixels into the grey levels the barcode reader reads', () => {
    expect([...luminanceOf(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255]))]).toEqual([255, 0, 76]);
  });
  it('takes a folder, a third-party system or a sending system as a source location (Pete: the folder URL or the 3rd party system)', () => {
    expect(sourceLocationValid('fileShare', '\\\\lab-scan01\\requisitions\\inbox')).toBe(true);
    expect(sourceLocationValid('fileShare', 'smb://nas.hospital.example/requisitions')).toBe(true);
    expect(sourceLocationValid('fileShare', 'https://files.hospital.example/requisitions/inbox')).toBe(true);
    expect(sourceLocationValid('fileShare', 'requisitions')).toBe(false);
    expect(sourceLocationValid('documentSystem', 'https://ecm.hospital.example/api/requisitions')).toBe(true);
    expect(sourceLocationValid('documentSystem', 'http://ecm.hospital.example/api')).toBe(false);
    expect(sourceLocationValid('api', 'Epic OnBase')).toBe(true);
    expect(sourceLocationValid('api', ' ')).toBe(false);
  });

  it('shows the latest run of each source, and narrows lists to one facility', () => {
    const runs = [{ sourceId: 'a', at: '1' }, { sourceId: 'b', at: '3' }, { sourceId: 'a', at: '2' }];
    expect(latestRunPerSource(runs)).toEqual([{ sourceId: 'b', at: '3' }, { sourceId: 'a', at: '2' }]);
    const items = [{ facilityId: 'f1' }, { facilityId: 'f2' }, { facilityId: null }];
    expect(inFacility(items, 'f1')).toEqual([{ facilityId: 'f1' }]);
    expect(inFacility(items, '')).toHaveLength(3);
    expect(sourceFacilityIds([{ facilityId: 'f2' }, { facilityId: null }, { facilityId: 'f2' }, { facilityId: 'f1' }])).toEqual(['f2', 'f1']);
  });

  it('tells how an order reached the lab, and whether its requisition is missing', () => {
    expect(requisitionOriginOf({})).toBe('electronic'); // from the laboratory system's feed
    expect(requisitionOriginOf({ order: { intakeType: 'standard', externalOrderId: 'ORD-1' } })).toBe('electronic');
    expect(requisitionOriginOf({ order: { intakeType: 'standard' } })).toBe('manual');
    expect(requisitionOriginOf({ order: { intakeType: 'outside' } })).toBe('outside');
    expect(requisitionOriginOf({ order: { intakeType: 'downtime' } })).toBe('downtime');
    expect(requisitionOriginOf({ lockboxReceiptId: 'L1', order: { intakeType: 'standard', externalOrderId: 'O' } })).toBe('lockbox');
    const own = { facilityId: 'f1', expected: { ...DEFAULT_REQUISITION_EXPECTATION.expected, electronic: true }, graceHours: 2, unmatchedAlertHours: 24 };
    expect(expectationFor([own], 'f1')).toBe(own);
    expect(expectationFor([own], 'f2')).toBe(DEFAULT_REQUISITION_EXPECTATION);
    const now = new Date('2026-11-02T10:00:00Z');
    const c = (h: number, origin: 'manual' | 'electronic' = 'manual') => ({ origin, accessionedAt: new Date(now.getTime() - h * 3_600_000).toISOString() });
    expect(requisitionIsMissing(c(25), DEFAULT_REQUISITION_EXPECTATION, false, now)).toBe(true);
    expect(requisitionIsMissing(c(23), DEFAULT_REQUISITION_EXPECTATION, false, now)).toBe(false);
    expect(requisitionIsMissing(c(25), DEFAULT_REQUISITION_EXPECTATION, true, now)).toBe(false);
    expect(requisitionIsMissing(c(25, 'electronic'), DEFAULT_REQUISITION_EXPECTATION, false, now)).toBe(false);
    expect(unmatchedIsOverdue({ status: 'open', receivedAt: c(25).accessionedAt }, 24, now)).toBe(true);
    expect(unmatchedIsOverdue({ status: 'linked', receivedAt: c(25).accessionedAt }, 24, now)).toBe(false);
  });
});
