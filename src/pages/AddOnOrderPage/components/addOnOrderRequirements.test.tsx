// @vitest-environment happy-dom
// Batch 403 (PS-359): the Add-On Orders page's builder, order summary and
// tracking dashboard take what they need from the organisation's Field
// Requirements (page "addOnOrder"); a send-out line always names its reference
// lab, filled in from the test's approved labs; voice does what the buttons do.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => {
  const rules = await vi.importActual<typeof import('@/services/fieldRequirements/fieldRequirementRules')>('@/services/fieldRequirements/fieldRequirementRules');
  const checks = await vi.importActual<typeof import('@/services/fieldRequirements/addOnOrderChecks')>('@/services/fieldRequirements/addOnOrderChecks');
  return {
    ...rules, ...checks,
    actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
  };
});
// Permissions granted: the button shows as usable.
vi.mock('@/components/Common/CapabilityButton', () => ({
  CapabilityButton: ({ children, onClick, disabled, className, capability }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; className: string; capability: string }) =>
    <button className={className} disabled={disabled} data-capability={capability} onClick={onClick}>{children}</button>,
}));

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import type { StainType } from '@/services/stains/IStainService';
import type { Facility } from '@/services/facilities/IFacilityService';
import type { StainOrder } from '@/types/case/Specimen';
import OrderBuilderPanel from './OrderBuilderPanel';
import OrderSummaryRoutingPanel, { type CartLine } from './OrderSummaryRoutingPanel';
import OrderTrackingDashboard from './OrderTrackingDashboard';
import type { TrackedAddOnOrder } from '../hooks/useAddOnOrderStation';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => act(() => { listeners.forEach(cb => cb(id)); });
const reqs = (over: Record<string, boolean> = {}) => resolveFieldRequirements('addOnOrder', over);
const noop = () => {};
const button = (text: string) => screen.getByText(text, { exact: false }).closest('button') as HTMLButtonElement;
const status = () => screen.getAllByRole('status').map(s => s.textContent).join(' ');

const he = { id: 'st-he', name: 'H&E', category: 'Routine', active: true } as StainType;
const fish = { id: 'st-her2-fish', name: 'HER2 FISH', category: 'Molecular', active: true, referenceLabFacilityIds: ['lab-a', 'lab-b'], defaultReferenceLabFacilityId: 'lab-a' } as StainType;
const labs = [{ id: 'lab-a', name: 'Summit' }, { id: 'lab-b', name: 'Pacific' }, { id: 'lab-c', name: 'Great Lakes' }] as Facility[];

describe('OrderBuilderPanel', () => {
  it('a recut asks for its level depth only when required; voice adds exactly as the button', () => {
    const onAddLines = vi.fn();
    render(<OrderBuilderPanel stainTypes={[he]} onAddLines={onAddLines} requirements={reqs({ levelDepth: true })} />);
    fireEvent.click(screen.getByText('H&E'));
    fireEvent.change(screen.getByLabelText('addOnOrder.builder.levelDepth', { exact: false }), { target: { value: '' } });
    expect(button('addOnOrder.builder.addToCart').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.addOnOrder.levelDepth');
    say('ADD_ON_ADD_TO_ORDER');
    expect(onAddLines).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('addOnOrder.builder.levelDepth', { exact: false }), { target: { value: '6' } });
    say('ADD_ON_ADD_TO_ORDER');
    expect(onAddLines).toHaveBeenCalledWith([expect.objectContaining({ orderKind: 'recut', levelDepthMicrons: 6 })]);
  });
});

describe('OrderSummaryRoutingPanel', () => {
  const summary = (cart: CartLine[], over: Partial<React.ComponentProps<typeof OrderSummaryRoutingPanel>> = {}) => {
    const onSubmit = vi.fn();
    const onLineLabChange = vi.fn();
    render(
      <OrderSummaryRoutingPanel
        cart={cart} onRemoveLine={noop} selectedBlockIds={['b1']} priority="Routine Sign-Out" onPriorityChange={noop}
        slideMediaType="Standard Charged" onSlideMediaTypeChange={noop} cuttingInstructions="" onCuttingInstructionsChange={noop}
        referenceLabs={labs} onLineLabChange={onLineLabChange} stationsForLine={() => []} performingLabResolved
        onSubmit={onSubmit} requirements={reqs()} caseId="S26-1" {...over}
      />,
    );
    return { onSubmit, onLineLabChange };
  };

  it('a send-out line offers only its test\'s approved labs; without one chosen, Submit waits (locked)', () => {
    const { onSubmit, onLineLabChange } = summary([{ cartId: 'c1', stainType: fish, orderKind: 'molecular' }]);
    const options = Array.from(screen.getByRole('combobox').querySelectorAll('option')).map(o => o.textContent);
    expect(options).toEqual(['addOnOrder.summary.selectLab', 'Summit', 'Pacific']);
    expect(screen.getByText('addOnOrder.summary.labsApprovedForTest')).not.toBeNull();
    expect(button('addOnOrder.summary.submit').disabled).toBe(true);
    expect(status()).toContain('fieldRequirements.fields.addOnOrder.sendOutLab');
    say('ADD_ON_SUBMIT_ORDER');
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'lab-b' } });
    expect(onLineLabChange).toHaveBeenCalledWith('c1', 'lab-b', 'Pacific');
  });

  it('with the lab filled in, voice submits exactly as the button', () => {
    const { onSubmit } = summary([{ cartId: 'c1', stainType: fish, orderKind: 'molecular', sendOutReferenceLabFacilityId: 'lab-a', sendOutReferenceLabName: 'Summit' }]);
    expect(button('addOnOrder.summary.submit').disabled).toBe(false);
    say('ADD_ON_SUBMIT_ORDER');
    expect(onSubmit).toHaveBeenCalledWith({ priority: 'Routine Sign-Out', slideMediaType: 'Standard Charged', cuttingInstructions: undefined });
  });

  it('needs a block and a line, and bench instructions when the organisation requires them', () => {
    summary([{ cartId: 'c1', stainType: he, orderKind: 'recut', levelDepthMicrons: 4 }], { selectedBlockIds: [], requirements: reqs({ cuttingInstructions: true }) });
    expect(status()).toContain('fieldRequirements.fields.addOnOrder.addOnBlocks');
    expect(status()).toContain('fieldRequirements.fields.addOnOrder.cuttingInstructions');
  });

  it('a test with no approved lab offers every reference lab', () => {
    summary([{ cartId: 'c1', stainType: { ...fish, referenceLabFacilityIds: undefined }, orderKind: 'molecular' }]);
    expect(screen.getByRole('combobox').querySelectorAll('option')).toHaveLength(4);
    expect(screen.getByText('addOnOrder.summary.labsAll')).not.toBeNull();
  });
});

describe('OrderTrackingDashboard', () => {
  const exceptionRow = (): TrackedAddOnOrder => ({
    specimenId: 'sp', specimenLabel: 'A', blockId: 'b2', blockLabel: '2', stage: 'Exception',
    order: {
      id: 'o1', stainName: 'PAS', status: 'Pending Cut', levelDepthMicrons: 4, cuttingInstructions: 'Face gently',
      orderedByPathologistName: 'Pete Nimmo', routedQueueLabel: 'Special Stains Bench Queue',
      exception: { reason: 'Insufficient tissue for panel', flaggedBy: 't', flaggedByName: 'Tech', flaggedAt: '2026-09-30', status: 'pending_pathologist_review' },
    } as StainOrder,
  });

  it('"Modify & Resubmit" now edits the order before resubmitting it', () => {
    const onResolve = vi.fn();
    render(<OrderTrackingDashboard orders={[exceptionRow()]} caseId="S26-1" requirements={reqs()} onMarkBlockRetrieved={noop} onFlagException={noop} onResolveException={onResolve} />);
    fireEvent.click(button('addOnOrder.tracking.modify'));
    expect((screen.getByLabelText('addOnOrder.builder.levelDepth', { exact: false }) as HTMLInputElement).value).toBe('4');
    fireEvent.change(screen.getByLabelText('addOnOrder.builder.levelDepth', { exact: false }), { target: { value: '8' } });
    fireEvent.click(button('addOnOrder.tracking.resubmit'));
    expect(onResolve).toHaveBeenCalledWith('o1', 'modify', '', { levelDepthMicrons: 8, cuttingInstructions: 'Face gently' });
  });

  it('approving destructive cutting is its own permission, and waits for a required response note', () => {
    const onResolve = vi.fn();
    render(<OrderTrackingDashboard orders={[exceptionRow()]} caseId="S26-1" requirements={reqs({ responseNote: true })} onMarkBlockRetrieved={noop} onFlagException={noop} onResolveException={onResolve} />);
    const approve = button('addOnOrder.tracking.approveDestructive');
    expect(approve.dataset.capability).toBe('add-on:exception:approve-destructive-cut');
    expect(approve.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('addOnOrder.tracking.responseNoteLabel', { exact: false }), { target: { value: 'Use it all' } });
    fireEvent.click(button('addOnOrder.tracking.approveDestructive'));
    expect(onResolve).toHaveBeenCalledWith('o1', 'approve_destructive_cut', 'Use it all', undefined);
  });

  it('shows the reason and queue through locale keys', () => {
    render(<OrderTrackingDashboard orders={[exceptionRow()]} caseId="S26-1" requirements={reqs()} onMarkBlockRetrieved={noop} onFlagException={noop} onResolveException={noop} />);
    expect(screen.getByText('addOnOrder.exceptionReasons.insufficientTissue')).not.toBeNull();
    expect(screen.getByText('addOnOrder.queues.specialStainsBench')).not.toBeNull();
  });
});
