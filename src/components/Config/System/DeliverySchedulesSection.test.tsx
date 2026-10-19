// @vitest-environment happy-dom
// Batch 619 (PS-800): the Delivery Schedules screen: enterprise view, a facility's override and inheritance, saving, the live test.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { IMMEDIATE_SCHEDULE } from '@/services/deliverySchedules/deliverySchedule';

const svc = vi.hoisted(() => ({
  deliveryScheduleService: {
    getAll: vi.fn(),
    set: vi.fn(async () => ({ ok: true, data: {} })),
    remove: vi.fn(async () => ({ ok: true, data: undefined })),
  },
  facilityService: { getAll: vi.fn(async () => ({ ok: true, data: [{ id: 'fac-a', name: 'Westside', status: 'Active' }] })) },
}));
vi.mock('@/services', () => svc);
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; capability: string }) =>
    <button data-capability={capability} disabled={disabled} onClick={onClick}>{children}</button>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}${JSON.stringify(o)}` : k), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
import DeliverySchedulesSection from './DeliverySchedulesSection';

const S = 'deliverySchedulesSection';
const entries = [
  { id: 'e1', feed: 'billing_delivery', facilityId: null, registryKey: null, schedule: { ...IMMEDIATE_SCHEDULE, kind: 'hold_until_sign_out' }, updatedAt: '' },
  { id: 'f1', feed: 'results', facilityId: 'fac-a', registryKey: null, schedule: { ...IMMEDIATE_SCHEDULE, kind: 'windows', timeZone: 'America/New_York', windows: [{ days: [1], start: '08:00', end: '17:00' }] }, updatedAt: '' },
];
const card = (feed: string) => document.querySelector(`[data-feed="${feed}"]`) as HTMLElement;
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('DeliverySchedulesSection', () => {
  it('enterprise view: each feed shows its schedule and where it comes from', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: entries });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    expect(card('billing_delivery').textContent).toContain(`${S}.summary.hold_until_sign_out`);
    expect(card('billing_delivery').textContent).toContain(`${S}.source.enterprise`);
    expect(card('adt').textContent).toContain(`${S}.source.default`);
    expect(card('results').textContent).toContain(`${S}.source.default`); // the facility's override is not shown at enterprise level
  });
  it('a facility shows its own override and inherits the rest, and can go back to the enterprise', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: entries });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    expect(card('results').textContent).toContain(`${S}.source.facility`);
    expect(card('billing_delivery').textContent).toContain(`${S}.source.enterprise`);
    fireEvent.click(card('results').querySelectorAll('button')[1]);
    await waitFor(() => expect(svc.deliveryScheduleService.remove).toHaveBeenCalledWith('results', 'fac-a', null));
  });
  it('saves a new schedule for the chosen scope, behind the capability', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: entries });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.scope.label`), { target: { value: 'fac-a' } });
    const edit = card('billing_delivery').querySelector('button') as HTMLButtonElement;
    expect(edit.getAttribute('data-capability')).toBe('config:delivery-schedules:manage');
    fireEvent.click(edit);
    fireEvent.change(await screen.findByLabelText(`${S}.editor.kind`), { target: { value: 'batch' } });
    fireEvent.click(screen.getByText(`${S}.editor.save`));
    await waitFor(() => expect(svc.deliveryScheduleService.set).toHaveBeenCalled());
    const arg = (svc.deliveryScheduleService.set.mock.calls[0] as unknown[])[0] as { feed: string; facilityId: string; schedule: { kind: string; batchTimes: string[] } };
    expect(arg).toMatchObject({ feed: 'billing_delivery', facilityId: 'fac-a', registryKey: null, schedule: { kind: 'batch', batchTimes: ['22:00'] } });
  });
  it('will not save a schedule that has problems', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: entries });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(card('adt').querySelector('button') as HTMLButtonElement);
    fireEvent.change(await screen.findByLabelText(`${S}.editor.kind`), { target: { value: 'windows' } });
    fireEvent.change(screen.getByLabelText(`${S}.editor.timeZone`), { target: { value: 'Mars/Base' } });
    expect(screen.getByText(`${S}.problems.timeZoneInvalid`)).toBeTruthy();
    expect((screen.getByText(`${S}.editor.save`) as HTMLButtonElement).disabled).toBe(true);
  });
  it('every registry has its own card, defaulting to a short review hold; saving one names the registry', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: [
      { id: 'r1', feed: 'registry', facilityId: null, registryKey: 'cancer:naaccr_us', schedule: { ...IMMEDIATE_SCHEDULE, kind: 'review_hold', reviewHoldMinutes: 60, amendmentRequeues: true, reportingDeadlineDays: 14 }, updatedAt: '' },
    ] });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    const registryCards = document.querySelectorAll('[data-feed*=":"]');
    expect(registryCards.length).toBeGreaterThan(5);
    expect(card('cancer:naaccr_us').textContent).toContain(`${S}.summary.review_hold{"minutes":60}`);
    expect(card('cancer:naaccr_us').textContent).toContain(`${S}.summary.deadline{"days":14}`);
    expect(card('cancer:naaccr_us').textContent).toContain(`${S}.source.enterprise`);
    expect(card('cancer:cosd_uk').textContent).toContain(`${S}.summary.review_hold{"minutes":240}`);
    expect(card('cancer:cosd_uk').textContent).toContain(`${S}.source.default`);
    fireEvent.click(card('cancer:cosd_uk').querySelector('button') as HTMLButtonElement);
    fireEvent.change(await screen.findByLabelText(`${S}.editor.deadline`), { target: { value: '30' } });
    fireEvent.click(screen.getByText(`${S}.editor.save`));
    await waitFor(() => expect(svc.deliveryScheduleService.set).toHaveBeenCalled());
    expect((svc.deliveryScheduleService.set.mock.calls[0] as unknown[])[0]).toMatchObject({ feed: 'registry', facilityId: null, registryKey: 'cancer:cosd_uk', schedule: { kind: 'review_hold', reviewHoldMinutes: 240, reportingDeadlineDays: 30, amendmentRequeues: true } });
  });
  it('a monthly batch with a cutoff is saved from the editor', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: [] });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.click(card('cancer:cosd_uk').querySelector('button') as HTMLButtonElement);
    fireEvent.change(await screen.findByLabelText(`${S}.editor.kind`), { target: { value: 'batch' } });
    fireEvent.change(screen.getByLabelText(`${S}.editor.frequency`), { target: { value: 'monthly' } });
    fireEvent.change(screen.getByLabelText(`${S}.editor.monthDays`), { target: { value: '1, 15' } });
    fireEvent.change(screen.getByLabelText(`${S}.editor.cutoff`), { target: { value: '17:00' } });
    fireEvent.click(screen.getByText(`${S}.editor.save`));
    await waitFor(() => expect(svc.deliveryScheduleService.set).toHaveBeenCalled());
    expect((svc.deliveryScheduleService.set.mock.calls[0] as unknown[])[0]).toMatchObject({ registryKey: 'cancer:cosd_uk', schedule: { kind: 'batch', batchFrequency: 'monthly', batchMonthDays: [1, 15], cutoffTime: '17:00' } });
  });
  it('the test panel says whether it goes out and when it next can', async () => {
    svc.deliveryScheduleService.getAll.mockResolvedValue({ ok: true, data: entries });
    render(<DeliverySchedulesSection />);
    await screen.findByText(`${S}.title`);
    fireEvent.change(screen.getByLabelText(`${S}.test.feed`), { target: { value: 'billing_delivery' } });
    fireEvent.click(screen.getByText(`${S}.test.run`));
    expect(screen.getByText(`${S}.test.waits`)).toBeTruthy();
    expect(screen.getByText(`${S}.reasons.awaiting_sign_out`)).toBeTruthy();
    fireEvent.click(screen.getByLabelText(`${S}.test.signedOut`));
    fireEvent.click(screen.getByText(`${S}.test.run`));
    expect(screen.getByText(`${S}.test.goesOut`)).toBeTruthy();
  });
});
