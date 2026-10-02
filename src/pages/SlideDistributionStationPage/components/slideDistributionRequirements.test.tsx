// @vitest-environment happy-dom
// Batch 402 (PS-359): the Slide distribution station's two confirms, the
// exception note and the label reprint take what they need from the
// organisation's Field Requirements (page "slideDistribution"). Each shows
// "Still required: …", stars required labels, keeps its button off until they
// are filled, and the voice commands do exactly what the buttons do.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/slideDistributionChecks')>('@/services/fieldRequirements/slideDistributionChecks');
  return {
    ...rules, ...checks,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import type { SlideQueueItem } from '../hooks/useSlideDistributionStation';
import type { PhysicalAssignment, ScannerAssignment } from '@/utils/slideDistributionOperations';
import DestinationControlPanel, { type DestinationMode } from './DestinationControlPanel';
import ScanCenterPanel from './ScanCenterPanel';
import SlideLabelReprintModal from './SlideLabelReprintModal';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => act(() => { listeners.forEach(cb => cb(id)); });
const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('slideDistribution', over);
const noop = () => {};
const button = (text: string) => screen.getByText(text, { exact: false }).closest('button') as HTMLButtonElement;
const status = () => screen.getByRole('status').textContent ?? '';

const item = (over: Partial<SlideQueueItem['stain']> = {}): SlideQueueItem => ({
  queueId: 'c1::b1::s1',
  caseData: { id: 'c1', order: { priority: 'Routine' } } as never,
  specimen: { id: 'sp1', label: 'A', blocks: [] } as never,
  block: { id: 'b1', label: '1' } as never,
  stain: { id: 's1', stainName: 'H&E', ...over } as never,
});
const people = [{ id: 'u1', firstName: 'Ana', lastName: 'Chen' }] as never[];
const pools = [{ id: 'derm', name: 'Dermatopathology' }] as never[];

function destination(mode: DestinationMode, over: Record<string, boolean> = {}) {
  const physical = vi.fn<(a: PhysicalAssignment) => void>();
  const digital = vi.fn<(a: ScannerAssignment) => void>();
  render(
    <DestinationControlPanel
      activeItem={item()} pathologists={people} subspecialties={pools} defaultRouting={{}}
      onAssignPhysical={physical} onAssignScanner={digital} feedback={null}
      mode={mode} onModeChange={noop} requirements={reqs(over)}
    />,
  );
  return { physical, digital };
}

describe('DestinationControlPanel — physical checkout', () => {
  it('needs a pathologist, a pool or a location, and says so', () => {
    const { physical } = destination('physical');
    expect(button('slideDistribution.destination.confirmPhysical').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.checkoutTarget');
    say('SLIDE_DIST_CONFIRM_PHYSICAL');
    expect(physical).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('slideDistribution.destination.trayNumber', { exact: false }), { target: { value: '7' } });
    expect(screen.queryByRole('status')).toBeNull();
    say('SLIDE_DIST_CONFIRM_PHYSICAL');
    expect(physical).toHaveBeenCalledWith(expect.objectContaining({ trayNumber: '7' }));
  });
  it('when the organisation requires a recipient, a location alone is not enough, and the pool counts', () => {
    const { physical } = destination('physical', { readingPathologist: true });
    fireEvent.change(screen.getByLabelText('slideDistribution.destination.trayNumber', { exact: false }), { target: { value: '7' } });
    expect(button('slideDistribution.destination.confirmPhysical').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.readingPathologist');
    fireEvent.click(screen.getByText('Dermatopathology'));
    fireEvent.click(button('slideDistribution.destination.confirmPhysical'));
    expect(physical).toHaveBeenCalledWith(expect.objectContaining({ subspecialtyId: 'derm', trayNumber: '7' }));
  });
  it('shows the doctor through a locale key, and "confirm scanner" does nothing on the physical side', () => {
    const { digital } = destination('physical');
    expect(screen.getByText('slideDistribution.destination.doctorName:{"name":"Chen"}')).not.toBeNull();
    say('SLIDE_DIST_CONFIRM_DIGITAL');
    expect(digital).not.toHaveBeenCalled();
  });
});

describe('DestinationControlPanel — scanner', () => {
  it('always needs the instrument (starred); voice confirms exactly as the button', () => {
    const { digital } = destination('digital');
    expect(button('slideDistribution.destination.confirmDigital').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.scannerInstrument');
    expect(document.querySelectorAll('.ps-conf-required').length).toBe(1);
    fireEvent.change(screen.getByLabelText('slideDistribution.destination.scannerInstrument', { exact: false }), { target: { value: 'GT450' } });
    say('SLIDE_DIST_CONFIRM_DIGITAL');
    expect(digital).toHaveBeenCalledWith({ scannerInstrumentId: 'GT450', rackId: undefined, slotPosition: undefined });
  });
  it('asks for the rack and slot when the organisation requires them', () => {
    const { digital } = destination('digital', { rackId: true, slotPosition: true });
    fireEvent.change(screen.getByLabelText('slideDistribution.destination.scannerInstrument', { exact: false }), { target: { value: 'GT450' } });
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.rackId');
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.slotPosition');
    say('SLIDE_DIST_CONFIRM_DIGITAL');
    expect(digital).not.toHaveBeenCalled();
  });
});

describe('ScanCenterPanel — exceptions', () => {
  const panel = (over: Record<string, boolean> = {}, onFlag = vi.fn(), stain: Partial<SlideQueueItem['stain']> = {}) => {
    const it = item(stain);
    render(
      <ScanCenterPanel
        queue={[it]} activeItem={it} activeQueueId={it.queueId} onSelect={noop} splitWarning={null} scanExceptions={[]}
        onFlagException={onFlag} onResolveException={noop} onRequestReprint={noop} reprintFeedback={null} requirements={reqs(over)}
      />,
    );
    return onFlag;
  };
  it('by default a reason is one touch, and a typed note goes with it', () => {
    const onFlag = panel();
    fireEvent.change(screen.getByLabelText('slideDistribution.exceptions.note', { exact: false }), { target: { value: ' Broken in tray ' } });
    fireEvent.click(button('slideDistribution.exceptions.reason.missingGlass'));
    expect(onFlag).toHaveBeenCalledWith('Missing Glass', 'Broken in tray');
  });
  it('when the organisation requires a note, the reason buttons wait for it', () => {
    const onFlag = panel({ exceptionNote: true });
    expect(button('slideDistribution.exceptions.reason.missingGlass').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.exceptionNote');
    fireEvent.click(button('slideDistribution.exceptions.reason.missingGlass'));
    expect(onFlag).not.toHaveBeenCalled();
  });
  it('shows the routing status through a locale key', () => {
    panel({}, vi.fn(), { distributionStatus: 'Checked Out' } as never);
    expect(screen.getByText('slideDistribution.status.checkedOut')).not.toBeNull();
  });
});

describe('SlideLabelReprintModal', () => {
  it('needs a reason: choosing one does not print; Reprint does', () => {
    const onReprint = vi.fn();
    render(<SlideLabelReprintModal requirements={reqs()} onReprint={onReprint} onCancel={noop} />);
    expect(button('slideDistribution.reprintReason.reprint').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.slideDistribution.reprintReason');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Smudged Print' } });
    expect(onReprint).not.toHaveBeenCalled();
    fireEvent.click(button('slideDistribution.reprintReason.reprint'));
    expect(onReprint).toHaveBeenCalledWith('Smudged Print');
  });
});
