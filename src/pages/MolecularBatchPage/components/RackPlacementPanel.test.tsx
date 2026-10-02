// @vitest-environment happy-dom
// Batch 406 (PS-359): placing a molecular rack on an instrument's deck, per
// Pete's Rack Loading requirements. The slot list is filtered by instrument
// and assay, a deck-position scan fills the slot and warns when it is wrong,
// and voice does what the button does.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key), i18n: { language: 'en' } }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));
const { listeners } = vi.hoisted(() => ({ listeners: [] as Array<(id: string) => void> }));
vi.mock('@/services', async () => ({
  ...(await vi.importActual<typeof import('@/services/molecular/deckSlots')>('@/services/molecular/deckSlots')),
  ...(await vi.importActual<typeof import('@/services/fieldRequirements/molecularRackChecks')>('@/services/fieldRequirements/molecularRackChecks')),
  actionRegistryService: { onAction: (cb: (id: string) => void) => { listeners.push(cb); return () => { listeners.splice(listeners.indexOf(cb), 1); }; } },
}));

import { resolveFieldRequirements } from '@/services/fieldRequirements/fieldRequirementRules';
import type { Equipment } from '@/services/equipment/IEquipmentService';
import type { MolecularExtractionRack } from '@/services/molecular/IMolecularExtractionRackService';
import type { StainType } from '@/services/stains/IStainService';
import RackPlacementPanel from './RackPlacementPanel';

afterEach(() => { cleanup(); listeners.length = 0; });
const say = (id: string) => act(() => { listeners.forEach(cb => cb(id)); });
const scan = (raw: string) => act(() => { window.dispatchEvent(new CustomEvent('PATHSCRIBE_SCAN', { detail: { raw } })); });

const p1 = { id: 'e1', code: 'PANTHER_01', name: 'Panther 1', kind: 'analyser', facilityId: 'f', status: 'Active', deckSlots: [
  { id: 'SLOT_A1', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A2', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_A3', deck: 'Deck 1', rackTypes: ['sample_tube_rack'] },
  { id: 'SLOT_R1', deck: 'Reagent bay', rackTypes: ['reagent_cartridge'] },
] } as Equipment;
const p3 = { id: 'e3', code: 'PANTHER_03', name: 'Panther 3', kind: 'analyser', facilityId: 'f', status: 'Active', deckSlots: [{ id: 'SLOT_A1', rackTypes: ['sample_tube_rack'] }] } as Equipment;
const hpv = { id: 'st-hpv', name: 'HPV', category: 'Molecular', active: true } as StainType;
const rules = [{ id: 'r', assayCode: 'st-hpv', requiredControls: [], allowedSampleRackSlotIds: ['SLOT_A1', 'SLOT_A2'], createdAt: '' }];
const rack = (over: Partial<MolecularExtractionRack> = {}): MolecularExtractionRack => ({
  id: 'rk', rackBarcode: 'RK-1', rackUuid: 'u', capacity: 4, createdAt: '', createdByUserId: 'u', createdByUserName: 'U',
  positions: [{ positionLabel: '1', containerBarcode: 'T1', accessionNumber: 'S1' }, { positionLabel: '2' }], ...over,
});
const status = () => screen.queryAllByRole('status').map(s => s.textContent).join(' ');
const alert = () => screen.queryAllByRole('alert').map(s => s.textContent).join(' ');
const placeButton = () => screen.getByText('molecularRackLoadingPage.placement.place').closest('button') as HTMLButtonElement;

const renderPanel = (over: Partial<React.ComponentProps<typeof RackPlacementPanel>> = {}) => {
  const onPlace = vi.fn(async () => null);
  render(<RackPlacementPanel rack={rack()} instruments={[p1, p3]} assays={[hpv]} rules={rules} requirements={resolveFieldRequirements('molecularRack')} onPlace={onPlace} {...over} />);
  return { onPlace };
};

describe('RackPlacementPanel', () => {
  it('a multi-slot instrument needs its slot; the list holds only sample-rack slots, narrowed by the assay', () => {
    const { onPlace } = renderPanel();
    fireEvent.change(screen.getByLabelText('molecularRackLoadingPage.placement.instrument', { exact: false }), { target: { value: 'PANTHER_01' } });
    const slotOptions = () => Array.from(screen.getByLabelText('molecularRackLoadingPage.placement.deckSlot', { exact: false }).querySelectorAll('option')).map(o => (o as HTMLOptionElement).value).filter(Boolean);
    expect(slotOptions()).toEqual(['SLOT_A1', 'SLOT_A2', 'SLOT_A3']);
    expect(status()).toContain('fieldRequirements.fields.molecularRack.deckSlot');
    expect(placeButton().disabled).toBe(true);
    say('MOLECULAR_PLACE_RACK');
    expect(onPlace).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('molecularRackLoadingPage.placement.assay', { exact: false }), { target: { value: 'st-hpv' } });
    expect(slotOptions()).toEqual(['SLOT_A1', 'SLOT_A2']);
  });

  it('scanning a deck position fills the instrument and slot, and voice places the rack as the button would', async () => {
    const { onPlace } = renderPanel();
    fireEvent.click(screen.getByText('molecularRackLoadingPage.placement.scanDeck'));
    scan('LOC-INST-PANTHER_01-SLOT_A2');
    expect(status()).toContain('molecularRackLoadingPage.placement.scanFilled');
    expect(placeButton().disabled).toBe(false);
    say('MOLECULAR_PLACE_RACK');
    await waitFor(() => expect(onPlace).toHaveBeenCalledWith({ instrumentCode: 'PANTHER_01', assayCode: undefined, deckSlotId: 'SLOT_A2', via: 'deckScan' }));
  });

  it('a scanned slot that is wrong for the assay shows a warning and blocks placing', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText('molecularRackLoadingPage.placement.assay', { exact: false }), { target: { value: 'st-hpv' } });
    fireEvent.click(screen.getByText('molecularRackLoadingPage.placement.scanDeck'));
    scan('LOC-INST-PANTHER_01-SLOT_A3');
    expect(alert()).toContain('molecularRackLoadingPage.placement.slotProblem.notForAssay');
    expect(placeButton().disabled).toBe(true);
  });

  it('a tube barcode scanned by mistake is refused without changing anything', () => {
    renderPanel();
    fireEvent.click(screen.getByText('molecularRackLoadingPage.placement.scanDeck'));
    scan('SPEC-20260929-1101');
    expect(alert()).toContain('molecularRackLoadingPage.placement.scanProblem.notDeckBarcode');
    expect((screen.getByLabelText('molecularRackLoadingPage.placement.instrument', { exact: false }) as HTMLSelectElement).value).toBe('');
  });

  it('a single-slot instrument needs no slot; a tube without its accession still blocks placing', () => {
    renderPanel({ rack: rack({ positions: [{ positionLabel: '1', containerBarcode: 'T1' }] }) });
    fireEvent.change(screen.getByLabelText('molecularRackLoadingPage.placement.instrument', { exact: false }), { target: { value: 'PANTHER_03' } });
    expect(screen.getByText('molecularRackLoadingPage.placement.singleSlot')).not.toBeNull();
    expect(status()).toContain('fieldRequirements.fields.molecularRack.sampleMapping');
    expect(status()).not.toContain('fieldRequirements.fields.molecularRack.deckSlot');
    expect(placeButton().disabled).toBe(true);
  });
});
