// @vitest-environment happy-dom
// Batch 645: the Lockbox Drop-Off screen: the three scan outcomes, Urgent, the Overnight folder and its actions, and the action events.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { LockboxFolder, LockboxReceipt } from '@/services';

const held = vi.hoisted(() => ({ caps: new Set<string>() }));
const svc = vi.hoisted(() => ({ lookupBarcode: vi.fn(), receiveSpecimen: vi.fn(), getFolder: vi.fn(), markAccessioned: vi.fn(), resolvePlaceholder: vi.fn() }));
const setContext = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
vi.mock('@/contexts/BreadcrumbContext', () => ({ useBreadcrumb: () => ({ pushCrumb: () => {} }) }));
vi.mock('@/hooks/useCapabilities', () => ({ useCapabilities: () => ({ loading: false, has: (c: string) => held.caps.has(c), decide: () => null }) }));
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, capability }: { children: React.ReactNode; onClick: () => void; capability: string }) => <button data-capability={capability} onClick={onClick}>{children}</button>,
}));
vi.mock('@/utils/formatDate', () => ({ formatDateTime: (iso?: string) => iso ?? '' }));
vi.mock('@/services', async () => {
  const rules = await import('@/services/lockbox/lockboxRules');
  return {
    lockboxService: svc,
    scanStepFor: rules.scanStepFor, normalizeBarcode: rules.normalizeBarcode, dropTimeFromLocalInput: rules.dropTimeFromLocalInput,
    localInputValueFromDate: rules.localInputValueFromDate, dwellLabel: rules.dwellLabel, accessionLinkForReceipt: rules.accessionLinkForReceipt,
    facilityService: { getAll: async () => ({ ok: true, data: [{ id: 'f1', name: 'Fenwick General', status: 'Active' }, { id: 'f2', name: 'Closed Clinic', status: 'Inactive' }] }) },
    physicianService: { getAll: async () => ({ ok: true, data: [{ id: 'p1', givenNames: 'Ada', familyNames: 'Lovelace', status: 'Active' }] }) },
    actionRegistryService: { setCurrentContext: setContext },
  };
});
import LockboxDropOffPage from './LockboxDropOffPage';

const actor = { userId: 'u1', userName: 'Night Tech' };
const matched: LockboxReceipt = { id: 'r1', barcode: 'ORD-1', state: 'matchedOrder', receivedAt: '2026-10-21T02:00:00.000Z', receivedBy: actor, urgent: false, accessionNumber: 'ORD-1', facilityName: 'Fenwick General' };
const ph: LockboxReceipt = { id: 'r2', barcode: 'ZZ9', state: 'placeholder', receivedAt: '2026-10-21T03:00:00.000Z', receivedBy: actor, urgent: false, placeholderId: 'LBX-PH-20261021-001' };
const folder = (entries: LockboxFolder['entries']): LockboxFolder => ({
  entries, asOf: '2026-10-21T08:00:00.000Z',
  summary: { accessionedCount: 2, medianMinutes: 90, meanMinutes: 100, maxMinutes: 200, urgentAccessionedCount: 1, urgentMedianMinutes: 60, waitingCount: entries.length, oldestWaitingMinutes: 300 },
});
const renderPage = () => render(<MemoryRouter><LockboxDropOffPage /></MemoryRouter>);
const scanField = () => screen.getByLabelText('lockboxDropOff.scan.label') as HTMLInputElement;
const scan = (code: string) => { fireEvent.change(scanField(), { target: { value: code } }); fireEvent.submit(scanField().closest('form')!); };

beforeEach(() => {
  cleanup();
  held.caps = new Set(['lockbox:specimen:receive']);
  Object.values(svc).forEach(f => f.mockReset());
  setContext.mockReset();
  svc.getFolder.mockResolvedValue({ ok: true, data: folder([]) });
});

describe('Lockbox Drop-Off: scanning', () => {
  it('starts with the scan field focused and the screen\'s voice context set', () => {
    renderPage();
    expect(document.activeElement).toBe(scanField());
    expect(setContext).toHaveBeenCalledWith('LOCKBOX');
  });

  it('state A: a pending order is received at once; the card shows the accession number (data-phi) and facility, nothing else about the order', async () => {
    svc.lookupBarcode.mockResolvedValue({ ok: true, data: { kind: 'matchedOrder', accessionNumber: 'ORD-1', facilityName: 'Fenwick General' } });
    svc.receiveSpecimen.mockResolvedValue({ ok: true, data: matched });
    renderPage();
    scan(' ord-1 ');
    await screen.findByText('lockboxDropOff.received.title');
    expect(svc.receiveSpecimen).toHaveBeenCalledWith({ barcode: 'ORD-1', urgent: false, callbackNumber: undefined, placeholder: undefined });
    const ref = screen.getAllByText('ORD-1').find(e => e.tagName === 'DD')!;
    expect(ref.getAttribute('data-phi')).toBe('true');
    expect(screen.getByText('Fenwick General')).toBeTruthy();
    expect(screen.queryByText(/lockboxDropOff\.(patient|dob|mrn)/i)).toBeNull();
    expect(scanField().value).toBe('');
  });

  it('state B: an unknown barcode asks for the placeholder details with the client and physician lists, then records the drop', async () => {
    svc.lookupBarcode.mockResolvedValue({ ok: true, data: { kind: 'unmatched' } });
    svc.receiveSpecimen.mockResolvedValue({ ok: true, data: ph });
    renderPage();
    scan('zz9');
    await screen.findByText('lockboxDropOff.placeholder.title');
    expect(svc.receiveSpecimen).not.toHaveBeenCalled();
    expect(await screen.findByText('Fenwick General')).toBeTruthy();
    expect(screen.queryByText('Closed Clinic')).toBeNull();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    const [clientSelect, physicianSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(clientSelect, { target: { value: 'f1' } });
    fireEvent.change(physicianSelect, { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText('lockboxDropOff.placeholder.clientFreeText'), { target: { value: ' Unlisted clinic ' } });
    fireEvent.submit(screen.getByText('lockboxDropOff.placeholder.save').closest('form')!);
    await screen.findByText('lockboxDropOff.received.title');
    const call = svc.receiveSpecimen.mock.calls[0][0];
    expect(call).toMatchObject({ barcode: 'ZZ9', placeholder: { facilityId: 'f1', physicianId: 'p1', clientFreeText: 'Unlisted clinic' } });
    expect(typeof call.placeholder.reportedDropAt).toBe('string');
    expect(screen.getByText('LBX-PH-20261021-001')).toBeTruthy();
  });

  it('state B can be recorded with nothing filled in, and Escape cancels without writing', async () => {
    svc.lookupBarcode.mockResolvedValue({ ok: true, data: { kind: 'unmatched' } });
    svc.receiveSpecimen.mockResolvedValue({ ok: true, data: ph });
    renderPage();
    scan('A1');
    await screen.findByText('lockboxDropOff.placeholder.title');
    fireEvent.keyDown(screen.getByText('lockboxDropOff.placeholder.title').closest('form')!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('lockboxDropOff.placeholder.title')).toBeNull());
    expect(svc.receiveSpecimen).not.toHaveBeenCalled();
    scan('A2');
    await screen.findByText('lockboxDropOff.placeholder.title');
    fireEvent.submit(screen.getByText('lockboxDropOff.placeholder.save').closest('form')!);
    await screen.findByText('lockboxDropOff.received.title');
    expect(svc.receiveSpecimen.mock.calls[0][0]).toMatchObject({ barcode: 'A2', placeholder: { facilityId: undefined, physicianId: undefined, clientFreeText: undefined } });
  });

  it('state C: Urgent with a callback number is sent on the next drop, then clears', async () => {
    svc.lookupBarcode.mockResolvedValue({ ok: true, data: { kind: 'matchedOrder', accessionNumber: 'ORD-1' } });
    svc.receiveSpecimen.mockResolvedValue({ ok: true, data: { ...matched, urgent: true, callbackNumber: '520-555-0100' } });
    renderPage();
    const toggle = screen.getByText('lockboxDropOff.urgent.toggle');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText('lockboxDropOff.urgent.callback'), { target: { value: ' 520-555-0100 ' } });
    scan('ORD-1');
    await screen.findByText('lockboxDropOff.urgent.badge');
    expect(svc.receiveSpecimen).toHaveBeenCalledWith(expect.objectContaining({ urgent: true, callbackNumber: '520-555-0100' }));
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.queryByLabelText('lockboxDropOff.urgent.callback')).toBeNull();
  });

  it('a re-scan shows the earlier receipt and writes nothing', async () => {
    svc.lookupBarcode.mockResolvedValue({ ok: true, data: { kind: 'duplicate', receipt: matched } });
    renderPage();
    scan('ORD-1');
    await screen.findByText('lockboxDropOff.duplicate.title');
    expect(svc.receiveSpecimen).not.toHaveBeenCalled();
  });

  it('a conflict on write (someone scanned it a moment earlier) shows the earlier receipt, not an error', async () => {
    svc.lookupBarcode
      .mockResolvedValueOnce({ ok: true, data: { kind: 'matchedOrder', accessionNumber: 'ORD-1' } })
      .mockResolvedValueOnce({ ok: true, data: { kind: 'duplicate', receipt: matched } });
    svc.receiveSpecimen.mockResolvedValue({ ok: false, error: 'CONFLICT' });
    renderPage();
    scan('ORD-1');
    await screen.findByText('lockboxDropOff.duplicate.title');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows a fixed message for a refusal, never server text', async () => {
    svc.lookupBarcode.mockResolvedValue({ ok: false, error: 'NOT_PERMITTED' });
    renderPage();
    scan('ORD-1');
    expect((await screen.findByRole('alert')).textContent).toBe('lockboxDropOff.error.NOT_PERMITTED');
  });

  it('does nothing for an empty scan except say so', async () => {
    renderPage();
    scan('   ');
    expect((await screen.findByRole('alert')).textContent).toBe('lockboxDropOff.error.INVALID');
    expect(svc.lookupBarcode).not.toHaveBeenCalled();
  });
});

describe('Lockbox Drop-Off: the Overnight folder', () => {
  it('has no Overnight tab without lockbox:folder:review', () => {
    renderPage();
    expect(screen.queryByText('lockboxDropOff.tabs.folder')).toBeNull();
    expect(svc.getFolder).not.toHaveBeenCalled();
  });

  it('lists the folder with state, dwell, reference (data-phi) and the QA summary', async () => {
    held.caps = new Set(['lockbox:specimen:receive', 'lockbox:folder:review']);
    svc.getFolder.mockResolvedValue({ ok: true, data: folder([
      { receipt: { ...matched, urgent: true }, status: 'matched', dwellMinutes: 125 },
      { receipt: ph, status: 'placeholderOpen', dwellMinutes: 20 },
    ]) });
    renderPage();
    fireEvent.click(screen.getByText('lockboxDropOff.tabs.folder'));
    await screen.findByText('ORD-1');
    expect(screen.getByText('ORD-1').getAttribute('data-phi')).toBe('true');
    expect(screen.getByText('lockboxDropOff.folder.status.matched')).toBeTruthy();
    expect(screen.getByText('lockboxDropOff.folder.status.placeholderOpen')).toBeTruthy();
    expect(screen.getByText('lockboxDropOff.folder.dwell.hoursMinutes {"hours":2,"minutes":5}')).toBeTruthy();
    expect(screen.getByText('lockboxDropOff.folder.summary.title')).toBeTruthy();
    expect(screen.getAllByText('Night Tech').length).toBe(2);
  });

  it('marks a matched receipt accessioned and refreshes', async () => {
    held.caps = new Set(['lockbox:specimen:receive', 'lockbox:folder:review']);
    svc.getFolder.mockResolvedValue({ ok: true, data: folder([{ receipt: matched, status: 'matched', dwellMinutes: 5 }]) });
    svc.markAccessioned.mockResolvedValue({ ok: true, data: {} });
    renderPage();
    fireEvent.click(screen.getByText('lockboxDropOff.tabs.folder'));
    fireEvent.click(await screen.findByText('lockboxDropOff.folder.markAccessioned'));
    await waitFor(() => expect(svc.markAccessioned).toHaveBeenCalledWith('r1'));
    await waitFor(() => expect(svc.getFolder.mock.calls.length).toBeGreaterThan(1));
  });

  it('links a placeholder to the real number (a new entry), and Escape closes the form', async () => {
    held.caps = new Set(['lockbox:specimen:receive', 'lockbox:folder:review', 'lockbox:placeholder:resolve']);
    svc.getFolder.mockResolvedValue({ ok: true, data: folder([{ receipt: ph, status: 'placeholderOpen', dwellMinutes: 5 }]) });
    svc.resolvePlaceholder.mockResolvedValue({ ok: true, data: {} });
    renderPage();
    fireEvent.click(screen.getByText('lockboxDropOff.tabs.folder'));
    fireEvent.click(await screen.findByText('lockboxDropOff.folder.resolve'));
    const input = screen.getByLabelText('lockboxDropOff.folder.resolveLabel');
    expect(screen.getByText('lockboxDropOff.folder.resolveSave').hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByLabelText('lockboxDropOff.folder.resolveLabel')).toBeNull();
    fireEvent.click(screen.getByText('lockboxDropOff.folder.resolve'));
    fireEvent.change(screen.getByLabelText('lockboxDropOff.folder.resolveLabel'), { target: { value: 'S26-77' } });
    fireEvent.submit(screen.getByText('lockboxDropOff.folder.resolveSave').closest('form')!);
    await waitFor(() => expect(svc.resolvePlaceholder).toHaveBeenCalledWith('r2', 'S26-77'));
  });

  it('shows what is waiting when the folder is empty, and a fixed message on a refusal', async () => {
    held.caps = new Set(['lockbox:specimen:receive', 'lockbox:folder:review']);
    renderPage();
    fireEvent.click(screen.getByText('lockboxDropOff.tabs.folder'));
    await screen.findByText('lockboxDropOff.folder.empty');
    svc.markAccessioned.mockResolvedValue({ ok: false, error: 'PLACEHOLDER_UNRESOLVED' });
    svc.getFolder.mockResolvedValue({ ok: true, data: folder([{ receipt: matched, status: 'matched', dwellMinutes: 1 }]) });
    fireEvent.click(screen.getByText('lockboxDropOff.folder.refresh'));
    fireEvent.click(await screen.findByText('lockboxDropOff.folder.markAccessioned'));
    expect((await screen.findByRole('alert')).textContent).toBe('lockboxDropOff.error.PLACEHOLDER_UNRESOLVED');
  });
});

describe('Lockbox Drop-Off: voice and shortcut actions', () => {
  const fire = (name: string) => act(() => { window.dispatchEvent(new CustomEvent(name)); });

  it('Show the Overnight folder switches tab only with the capability; Show Drop-Off returns and focuses the scan field', async () => {
    renderPage();
    fire('PATHSCRIBE_LOCKBOX_SHOW_FOLDER');
    expect(screen.queryByText('lockboxDropOff.folder.title')).toBeNull();
    cleanup();
    held.caps = new Set(['lockbox:specimen:receive', 'lockbox:folder:review']);
    renderPage();
    fire('PATHSCRIBE_LOCKBOX_SHOW_FOLDER');
    await screen.findByText('lockboxDropOff.folder.title');
    fire('PATHSCRIBE_LOCKBOX_SHOW_DROP_OFF');
    await waitFor(() => expect(document.activeElement).toBe(scanField()));
  });

  it('Mark urgent toggles Urgent, and Focus scan field moves the cursor back', () => {
    renderPage();
    fire('PATHSCRIBE_LOCKBOX_MARK_URGENT');
    expect(screen.getByText('lockboxDropOff.urgent.toggle').getAttribute('aria-pressed')).toBe('true');
    screen.getByText('lockboxDropOff.urgent.toggle').focus();
    fire('PATHSCRIBE_LOCKBOX_FOCUS_SCAN');
    expect(document.activeElement).toBe(scanField());
    fire('PATHSCRIBE_LOCKBOX_MARK_URGENT');
    expect(screen.getByText('lockboxDropOff.urgent.toggle').getAttribute('aria-pressed')).toBe('false');
  });
});
