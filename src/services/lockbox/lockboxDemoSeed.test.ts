// @vitest-environment happy-dom
// Batch 648: the Lockbox demo seed cases: what they show, that they stay consistent with the order seeds and the folder
// rules, and that Demo Reset puts them back.
import { describe, expect, it, beforeEach } from 'vitest';
import { buildLockboxDemoSeed, LOCKBOX_DEMO_LIVE_BARCODES } from './lockboxDemoSeed';
import { buildFolder, folderStatusOf, matchPendingOrder, normalizeBarcode } from './lockboxRules';
import { mockLockboxStore } from './mockLockboxService';
import { resetAllDemoData } from '../demoReset/demoReset';
import { orderIntakeService } from '../orderIntake/orderIntakeInstance';

const NOW = new Date('2026-10-21T15:00:00.000Z');
const allow = { authorization: { enforce: async (c: string) => ({ capability: c, allowed: true, grantedBy: [], missingRequirements: [], context: {} }) } };

describe('buildLockboxDemoSeed', () => {
  const seed = buildLockboxDemoSeed(NOW);
  const folder = buildFolder(seed.receipts, seed.resolutions, NOW.toISOString());

  it('covers every state a demo needs', () => {
    expect(seed.receipts.filter(r => r.state === 'matchedOrder').length).toBeGreaterThanOrEqual(3);
    expect(seed.receipts.filter(r => r.state === 'placeholder').length).toBeGreaterThanOrEqual(3);
    expect(seed.receipts.filter(r => r.urgent).length).toBe(2);
    const statuses = folder.entries.map(e => e.status);
    expect(statuses).toEqual(expect.arrayContaining(['matched', 'placeholderOpen', 'placeholderLinked']));
    expect(folder.summary.accessionedCount).toBe(1);
    expect(folder.summary.medianMinutes).not.toBeNull();
  });

  it('puts the urgent drops first in the folder, then the longest waiting', () => {
    const urgentCount = seed.receipts.filter(r => r.urgent).length;
    expect(folder.entries.slice(0, urgentCount).every(e => e.receipt.urgent)).toBe(true);
    const routine = folder.entries.slice(urgentCount).map(e => e.dwellMinutes);
    expect([...routine].sort((a, b) => b - a)).toEqual(routine);
  });

  it('has unique ids and barcodes, placeholder ids in the LBX-PH form, and every time before now', () => {
    expect(new Set(seed.receipts.map(r => r.id)).size).toBe(seed.receipts.length);
    expect(new Set(seed.receipts.map(r => r.barcode)).size).toBe(seed.receipts.length);
    const ph = seed.receipts.filter(r => r.state === 'placeholder').map(r => r.placeholderId as string);
    expect(ph.every(id => /^LBX-PH-\d{8}-\d{3}$/.test(id))).toBe(true);
    expect(new Set(ph).size).toBe(ph.length);
    for (const r of seed.receipts) expect(r.receivedAt < NOW.toISOString()).toBe(true);
    for (const r of seed.resolutions) expect(r.at < NOW.toISOString()).toBe(true);
    for (const r of seed.receipts) expect(normalizeBarcode(r.barcode)).toBe(r.barcode);
  });

  it('holds no patient identifier and a placeholder never carries an accession number', () => {
    const text = JSON.stringify(seed);
    expect(text).not.toMatch(/mrn|dateOfBirth|patientName|Whitfield|Palowski|Marchetti/i);
    for (const r of seed.receipts.filter(x => x.state === 'placeholder')) expect(r.accessionNumber).toBeUndefined();
  });

  it('links the placeholder to the number it was resolved to', () => {
    const linked = seed.receipts.find(r => r.barcode === 'LBXDEMO-0003')!;
    expect(folderStatusOf(linked, seed.resolutions)).toEqual({ status: 'placeholderLinked', linkedAccessionNumber: 'FGH-ORD-88322' });
  });
});

describe('the seed against the demo orders', () => {
  it('matched receipts name real pending orders, and the live-scan barcodes still match one', async () => {
    const r = await orderIntakeService.listPendingOrders();
    expect(r.ok).toBe(true);
    const orders = r.ok === true ? r.data : [];
    for (const rec of buildLockboxDemoSeed(NOW).receipts.filter(x => x.state === 'matchedOrder')) {
      expect(orders.find(o => o.id === rec.orderId)?.externalOrderNumber).toBe(rec.accessionNumber);
    }
    for (const b of LOCKBOX_DEMO_LIVE_BARCODES) {
      expect(matchPendingOrder(b, orders), b).not.toBeNull();
      expect(buildLockboxDemoSeed(NOW).receipts.some(x => x.barcode === b), b).toBe(false);
    }
    expect(orders.find(o => o.id === 'ord-006')?.externalOrderNumber).toBe('FGH-ORD-88322');
  });
});

describe('Demo Reset and the Lockbox seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('a fresh browser starts with the seed cases', async () => {
    const receipts = await mockLockboxStore.receipts();
    expect(receipts.map(r => r.barcode)).toEqual(expect.arrayContaining(['FGH-ORD-88301', 'SCUH-ORD-22014', 'LBXDEMO-0001']));
  });

  it('puts the seed back after a drop was received and a placeholder was linked', async () => {
    const before = (await mockLockboxStore.receipts()).map(r => r.barcode);
    const resolutionsBefore = (await mockLockboxStore.resolutions()).length;
    await mockLockboxStore.appendReceipt({ id: 'extra', barcode: 'EXTRA-1', state: 'placeholder', receivedAt: new Date().toISOString(), receivedBy: { userId: 'u', userName: 'N' }, urgent: false, placeholderId: 'LBX-PH-X-001' });
    await mockLockboxStore.appendResolution({ id: 'extra-res', receiptId: 'extra', kind: 'placeholderResolved', at: new Date().toISOString(), by: { userId: 'u', userName: 'N' }, accessionNumber: 'A1' });
    expect((await mockLockboxStore.receipts()).length).toBe(before.length + 1);

    const res = await resetAllDemoData(allow);
    expect(res.ok).toBe(true);
    expect(localStorage.getItem('pathscribe_mock_lockbox_receipts_v1')).toBeNull();
    expect(localStorage.getItem('pathscribe_mock_lockbox_resolutions_v1')).toBeNull();

    expect((await mockLockboxStore.receipts()).map(r => r.barcode)).toEqual(before);
    expect((await mockLockboxStore.resolutions()).length).toBe(resolutionsBefore);
  });
});
